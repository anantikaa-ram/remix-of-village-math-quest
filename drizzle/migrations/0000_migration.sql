CREATE TABLE public.student_profiles (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.student_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.student_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.student_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile delete" ON public.student_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);