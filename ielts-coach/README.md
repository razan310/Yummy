# Band Seven: IELTS Academic coach

A single-page IELTS Academic trainer: placement test, adaptive 12-week plan, timed Writing
Task 1/Task 2 and Speaking with AI grading, original Reading and Listening tests (text-to-speech
in several accents), spaced-repetition vocabulary, grammar repair lessons with Arabic
explanations, weekly mock exams and a progress dashboard.

- `band-seven.html` is the page published as a Claude artifact (AI grading and cloud saving
  work there). `index.html` is the same app as a standalone page; outside Claude it saves to
  the browser and offers self-assessment instead of AI grading.
- `content/` holds all practice material as JSON (format in `CONTENT_SCHEMA.md`). Everything is
  original.
- `src/` holds the styles, page template and app scripts.

```sh
node ielts-coach/tools/validate.mjs ielts-coach/content/*.json   # check content
node ielts-coach/tools/build.mjs                                  # rebuild both HTML files
```
