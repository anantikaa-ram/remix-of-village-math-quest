CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher manages own classes" ON public.classes FOR ALL TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE TABLE public.class_members (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);
GRANT SELECT, DELETE ON public.class_members TO authenticated;
GRANT ALL ON public.class_members TO service_role;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_class_teacher(_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class AND teacher_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.teaches_student(_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members m JOIN public.classes c ON c.id = m.class_id
    WHERE m.student_id = _student AND c.teacher_id = auth.uid())
$$;

CREATE POLICY "student sees own memberships" ON public.class_members FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "teacher sees class members" ON public.class_members FOR SELECT TO authenticated USING (public.is_class_teacher(class_id));
CREATE POLICY "student leaves" ON public.class_members FOR DELETE TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "teacher removes" ON public.class_members FOR DELETE TO authenticated USING (public.is_class_teacher(class_id));

CREATE POLICY "teacher reads class student profiles" ON public.student_profiles FOR SELECT TO authenticated
  USING (public.teaches_student(user_id));

CREATE OR REPLACE FUNCTION public.join_class(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.classes;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO c FROM public.classes WHERE code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'No class with that code'; END IF;
  INSERT INTO public.class_members(class_id, student_id) VALUES (c.id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN c.name;
END $$;

CREATE OR REPLACE FUNCTION public.my_classes()
RETURNS TABLE(class_id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name FROM public.class_members m JOIN public.classes c ON c.id = m.class_id WHERE m.student_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.join_class(text), public.my_classes() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_class(text), public.my_classes(), public.is_class_teacher(uuid), public.teaches_student(uuid) TO authenticated;