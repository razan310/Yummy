# Band Seven: IELTS Academic coach

A single-page IELTS Academic trainer: placement test, adaptive 12-week plan, timed Writing
Task 1/Task 2 and Speaking with AI grading, original Reading and Listening tests (text-to-speech
in several accents), spaced-repetition vocabulary, grammar repair lessons with Arabic
explanations, weekly mock exams and a progress dashboard.

- `band-seven.html` is the page published as a Claude artifact (AI grading and saving to the
  Claude account work there). `index.html` is the same app as a standalone page. On the hosted
  site (Vercel) learners can create an account so progress syncs across devices; AI grading is
  only available inside Claude, so the hosted site offers self-assessment instead.
- `content/` holds all practice material as JSON (format in `CONTENT_SCHEMA.md`). Everything is
  original.
- `src/` holds the styles, page template and app scripts.

- `api/` is the account API for the hosted site (Vercel functions). Accounts and progress are
  stored in a private Vercel Blob store; passwords are kept as scrypt hashes and sessions in an
  HttpOnly cookie. Set the environment variable `SIGNUPS=closed` to stop new sign-ups.

```sh
node ielts-coach/tools/validate.mjs ielts-coach/content/*.json   # check content
node ielts-coach/tools/build.mjs                                  # rebuild the HTML files
```

Vercel project settings: Root Directory `ielts-coach`, Framework Preset "Other", Output
Directory `public` (the build script writes it), and a Blob store connected to the project.
