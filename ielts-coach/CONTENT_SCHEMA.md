# IELTS Coach content schema

All practice content lives in `ielts-coach/content/*.json` and is inlined into the
single-page app by `tools/build.mjs`. Validate every file with:

    node ielts-coach/tools/validate.mjs ielts-coach/content/<file>.json

## Ground rules for every file

- **Everything is original.** Never copy or closely paraphrase Cambridge IELTS books,
  official IELTS sample material, textbooks, websites or any other published text.
  Invent people, organisations, towns and studies (give them clearly fictional names).
  When writing about real phenomena, stay general and accurate; do not invent precise
  statistics and attribute them to real institutions.
- **Real exam difficulty.** The learner is an Arabic speaker at B2 (IELTS 6.0) aiming
  for 7.0 in IELTS **Academic**. Material must match genuine IELTS style and difficulty,
  including realistic distractors. Don't make it easier than the real exam.
- British spelling throughout (organise, colour, programme, centre).
- Plain text only inside strings: no HTML, no Markdown, no emoji.
- Valid JSON (double quotes, no trailing commas, no comments).

## Shared question format (reading and listening)

A **group** is one block of questions under one instruction:

```json
{
  "type": "tfng",
  "instructions": "Do the following statements agree with the information given in the passage? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.",
  "title": "optional heading, e.g. the title of a summary, form, table or notes",
  "wordLimit": "only for gap and short_answer, e.g. NO MORE THAN TWO WORDS AND/OR A NUMBER",
  "options": [{ "key": "A", "text": "..." }],
  "questions": [
    { "n": 1, "prompt": "...", "answer": "TRUE", "explanation": "..." }
  ]
}
```

Group `type` values and what each needs:

| type | prompt is | options (group level) | answer |
|---|---|---|---|
| `tfng` | a statement | none | `"TRUE"`, `"FALSE"` or `"NOT GIVEN"` |
| `ynng` | a statement about the writer's views | none | `"YES"`, `"NO"` or `"NOT GIVEN"` |
| `headings` | `"Paragraph B"` | list of headings, keys `i`,`ii`,`iii`… (at least 2 more headings than questions) | a heading key, e.g. `"iv"` |
| `matching_info` | a piece of information | paragraph letters, e.g. `{"key":"C","text":"Paragraph C"}` | a paragraph letter |
| `matching_features` | a statement / finding | people, places, dates etc. keys `A`,`B`… | an option key |
| `sentence_endings` | the first half of a sentence | endings, keys `A`,`B`… (at least 2 more than questions) | an option key |
| `summary_bank` | a sentence containing `____` | word bank, keys `A`,`B`… (at least 3 more than questions) | an option key |
| `mcq` | a question or sentence stem; needs its **own** `options` array on the question (keys `A`–`D`) | none | one key |
| `mcq_multi` | "Which TWO …?"; own `options` (`A`–`E`); add `"count": 2` | none | use `"answers": ["B","D"]` instead of `answer` |
| `gap` | a sentence/note/form line containing `____` exactly once | none; group needs `wordLimit` | string, or array of accepted alternatives |
| `short_answer` | a question | none; group needs `wordLimit` | string, or array of accepted alternatives |

Rules:

- `n` numbers run 1, 2, 3 … across the whole passage/section with no gaps. A
  `mcq_multi` question with `count: 2` uses two numbers (n and n+1); the next question
  starts at n+2.
- **Every question needs an `explanation`** (1–3 sentences) that points to the exact
  place in the text (paragraph letter, or the speaker's words in quotation marks) and
  explains why the answer is right and, where useful, why the tempting distractor is
  wrong. NOT GIVEN explanations must say what the text does and does not say.
- For `gap` and `short_answer`, every accepted answer must obey the word limit and the
  first alternative must appear **word for word** in the passage or script. List
  sensible alternatives (e.g. `["14", "fourteen"]`, `["data centre", "data center"]`).
- `wordLimit` must be one of: `ONE WORD ONLY`, `ONE WORD AND/OR A NUMBER`,
  `NO MORE THAN TWO WORDS`, `NO MORE THAN TWO WORDS AND/OR A NUMBER`,
  `NO MORE THAN THREE WORDS`, `NO MORE THAN THREE WORDS AND/OR A NUMBER`.

## reading-*.json

```json
{
  "kind": "reading",
  "items": [
    {
      "id": "r01",
      "title": "Passage title",
      "level": 1,
      "topic": "technology",
      "placement": false,
      "paragraphs": [ { "label": "A", "text": "..." } ],
      "groups": [ ... ]
    }
  ]
}
```

- `level`: 1 = like IELTS Passage 1 (most factual), 2 = Passage 2, 3 = Passage 3
  (most abstract and argumentative, with writer's views, suitable for `ynng`).
- Full passages: 650–900 words in 5–8 lettered paragraphs; 13 questions (12–14 ok) in
  2–3 groups of different types. Placement passage: 350–480 words, 8–10 questions.
- `topic` one of: technology, education, work, science, environment, health, society,
  history, business.

## listening-*.json

```json
{
  "kind": "listening",
  "items": [
    {
      "id": "l01",
      "section": 1,
      "title": "Enrolling on an evening course",
      "topic": "education",
      "placement": false,
      "speakers": {
        "N": { "role": "Narrator", "accent": "en-GB", "voice": "female" },
        "A": { "role": "Course adviser", "accent": "en-AU", "voice": "female" },
        "B": { "role": "Karim", "accent": "en-GB", "voice": "male" }
      },
      "script": [
        { "s": "N", "t": "You will hear a telephone conversation between..." },
        { "pause": 20, "label": "Look at questions 1 to 6" },
        { "s": "A", "t": "Good evening, Westbrook College..." }
      ],
      "groups": [ ... ]
    }
  ]
}
```

- `section`: 1 = everyday conversation (two speakers, form/note completion),
  2 = everyday monologue, 3 = academic discussion (2–3 speakers), 4 = academic lecture.
- `accent` one of: en-GB, en-US, en-AU, en-IE, en-NZ, en-IN, en-ZA, en-CA. Narrator is
  always en-GB. Vary accents across sections. `voice` is `male` or `female`.
- The narrator opens the section, announces each question block with a
  `{"pause": seconds, "label": "..."}` item (20–30 s of reading time), and closes with
  "That is the end of section N." Put the pauses where IELTS would.
- Script lines are spoken by text-to-speech, so write numbers, dates and spellings the
  way a speaker says them in the script (`"two hundred and forty pounds"`,
  `"the fourteenth of March"`, `"That's K, A, R, I, M"`, `"oh seven nine double four..."`),
  but write the **answer** in normal written form with alternatives
  (`["240", "£240"]`). Keep each line under 300 characters.
- Include real IELTS distractors: speakers correcting themselves, options mentioned
  and rejected, numbers that change.
- 10 questions per section (placement section: 8). Questions follow the order of the
  script. Script length: 550–800 words for full sections, 350–500 for placement.

## writing-task1.json

```json
{
  "kind": "writing_task1",
  "items": [
    {
      "id": "t1-01",
      "chartType": "line",
      "title": "Short name",
      "prompt": "The graph below shows ... Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      "chart": { ...chart spec... },
      "keyFeatures": ["overview point 1", "..."],
      "usefulLanguage": ["peaked at", "..."],
      "modelAnswer": "A band 8 response, 170-200 words, paragraphs separated by \\n\\n"
    }
  ]
}
```

Chart specs (all numbers must be internally consistent with the prompt and model answer):

- `{"type":"line","title":"...","xLabels":["2012",...],"yLabel":"Percentage of adults","unit":"%","yMin":0,"yMax":60,"series":[{"name":"18-29","values":[12,15,...]}]}` (1–4 series, values may be `null`)
- `{"type":"bar","title":"...","categories":["Country A",...],"yLabel":"...","unit":"","yMax":100,"series":[{"name":"2010","values":[...]}]}` (1–3 series, ≤ 7 categories)
- `{"type":"pie","title":"...","pies":[{"title":"2015","slices":[{"label":"Meetings","value":32}]}]}` (1–3 pies, 3–6 slices, each pie sums to 100)
- `{"type":"table","title":"...","columns":["Country","2005","2025"],"rows":[["Norvia","12.4","30.1"]],"note":"Figures in millions"}`
- `{"type":"process","title":"...","steps":[{"label":"Short step name","detail":"optional short detail"}],"cyclic":false}` (5–10 steps)
- `{"type":"map","title":"...","maps":[{"title":"2005","features":[{"label":"Library","kind":"building","x":10,"y":10,"w":20,"h":15}]}]}` (2 maps; coordinates on a 100 × 100 grid; `kind` one of building, green, water, road, parking, sports, path; features must not overlap except roads/paths)
- `{"type":"mixed","title":"...","parts":[ chart, chart ]}` (two of the above)

## writing-task2.json

```json
{
  "kind": "writing_task2",
  "items": [
    {
      "id": "t2-01",
      "essayType": "opinion",
      "topic": "technology",
      "placement": false,
      "prompt": "Full prompt text, ending with: Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
      "ideas": ["brainstorm idea", "..."],
      "usefulVocab": ["phrase", "..."],
      "modelAnswer": "A band 8 response, 270-310 words, paragraphs separated by \\n\\n"
    }
  ]
}
```

`essayType`: opinion, discussion, problem_solution, adv_disadv, two_part, positive_negative.

## speaking.json

```json
{
  "kind": "speaking",
  "part1": [ { "id": "p1-01", "topic": "Your work or studies", "placement": false, "questions": ["...", "..."] } ],
  "part2": [
    {
      "id": "p2-01",
      "topic": "technology",
      "placement": false,
      "cue": "Describe an app or website you use almost every day.",
      "bullets": ["what it is", "how you first found it", "what you use it for"],
      "finalBullet": "and explain why it is important to you.",
      "part3": { "theme": "Technology in daily life", "questions": ["...", "..."] },
      "usefulPhrases": ["..."]
    }
  ]
}
```

## grammar.json

```json
{
  "kind": "grammar",
  "items": [
    {
      "id": "g01",
      "title": "Articles: a, an, the and no article",
      "forSkill": "both",
      "why": "Why Arabic speakers find this hard (English, 1-3 sentences)",
      "rule": ["rule bullet", "..."],
      "ar": "شرح القاعدة بالعربية الفصحى المبسطة",
      "examples": [ { "wrong": "...", "right": "...", "note": "..." } ],
      "exercise": [ { "q": "...", "options": ["...", "..."], "answer": 0, "explain": "...", "explainAr": "..." } ]
    }
  ]
}
```

## vocab-*.json

```json
{
  "kind": "vocab",
  "items": [
    {
      "w": "allocate",
      "pos": "verb",
      "lvl": 1,
      "topic": "general",
      "def": "to give a particular amount of something to someone for a purpose",
      "ex": "The university allocated extra funding to its online learning platform.",
      "col": ["allocate resources", "allocate funding to sth"],
      "fam": "allocation (n)",
      "ar": "يُخصِّص"
    }
  ]
}
```

`lvl`: 1 = high-value B2/C1 academic word, 2 = C1, 3 = C2/advanced. `topic` one of:
general, technology, education, work, environment, health, society, economy, science.
`ex` must be an original sentence useful in IELTS Writing or Speaking.

## linking.json

```json
{
  "kind": "linking",
  "linking": [
    { "function": "Adding a point", "items": [ { "phrase": "Furthermore,", "use": "...", "ex": "...", "ar": "...", "note": "punctuation / register note" } ] }
  ],
  "collocations": [
    { "topic": "technology", "items": [ { "c": "rapid technological change", "ex": "...", "ar": "..." } ] }
  ]
}
```
