<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Struggle prediction uses a logistic regression trained offline by scripts/train_model.py on data/student_math_learning_dataset.csv, exported to src/lib/model.json and run in the browser; why: simple, explainable, matched gradient boosting on held-out students.
- Student progress is stored as one JSON row per user in student_profiles (Lovable Cloud, RLS own-row), loaded/saved via src/lib/store.ts; why: keeps existing Student shape while adding real accounts.
- Village placement previews are transient UI state; only explicit confirmation saves a structure and spends coins, so exploring plots cannot purchase accidentally.
