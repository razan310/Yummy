#!/usr/bin/env node
// Builds the single-file IELTS app from src/ and content/.
// Outputs:
//   band-seven.html  page body for publishing as a Claude artifact (no <html>/<head> skeleton)
//   index.html       the same app as a standalone HTML document
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (name) => JSON.parse(read(`content/${name}.json`));

const seen = new Set();
const vocab = [];
['vocab-a', 'vocab-b', 'vocab-c'].forEach((f, bank) => {
  json(f).items.forEach((v) => {
    const key = v.w.toLowerCase().trim();
    if (seen.has(key)) return;
    seen.add(key);
    vocab.push({ ...v, bank });
  });
});
const speaking = json('speaking');
const content = {
  reading: ['reading-a', 'reading-b', 'reading-c'].flatMap((f) => json(f).items),
  listening: ['listening-a', 'listening-b', 'listening-c'].flatMap((f) => json(f).items),
  task1: json('writing-task1').items,
  task2: json('writing-task2').items,
  speaking: { part1: speaking.part1, part2: speaking.part2 },
  grammar: json('grammar').items,
  vocab,
  linking: { linking: json('linking').linking, collocations: json('linking').collocations },
};

const css = read('src/styles.css');
const js = readdirSync(join(root, 'src/js')).filter((f) => f.endsWith('.js')).sort().map((f) => read(`src/js/${f}`)).join('\n');
const data = `const CONTENT = ${JSON.stringify(content).replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--')};`;
const body = read('src/app.html')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__CONTENT__*/', () => data)
  .replace('/*__JS__*/', () => js);

writeFileSync(join(root, 'band-seven.html'), body);
const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>
`;
writeFileSync(join(root, 'index.html'), standalone);
if (process.env.CHECK_OUT) writeFileSync(process.env.CHECK_OUT, `${data}\n${js}`);
console.log(`Built band-seven.html (${(body.length / 1024).toFixed(0)} KB): ${content.reading.length} passages, ${content.listening.length} listening sections, ${content.task1.length + content.task2.length} writing prompts, ${content.speaking.part2.length} cue cards, ${vocab.length} words, ${content.grammar.length} grammar lessons.`);
