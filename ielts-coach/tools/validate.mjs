#!/usr/bin/env node
// Validates IELTS Coach content files against CONTENT_SCHEMA.md.
// Usage: node ielts-coach/tools/validate.mjs <file.json> [more.json ...]
import { readFileSync } from 'node:fs';

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const norm = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9£$%'\-. ]+/g, ' ').replace(/\s+/g, ' ').trim();
const hasArabic = (s) => /[؀-ۿ]/.test(s || '');
const NO_MARKUP = /<[a-z/][^>]*>|\*\*|__[a-z]/i;

const WORD_LIMITS = {
  'ONE WORD ONLY': [1, false],
  'ONE WORD AND/OR A NUMBER': [1, true],
  'NO MORE THAN TWO WORDS': [2, false],
  'NO MORE THAN TWO WORDS AND/OR A NUMBER': [2, true],
  'NO MORE THAN THREE WORDS': [3, false],
  'NO MORE THAN THREE WORDS AND/OR A NUMBER': [3, true],
};
const ACCENTS = ['en-GB', 'en-US', 'en-AU', 'en-IE', 'en-NZ', 'en-IN', 'en-ZA', 'en-CA'];
const TOPICS_RL = ['technology', 'education', 'work', 'science', 'environment', 'health', 'society', 'history', 'business'];
const VOCAB_TOPICS = ['general', 'technology', 'education', 'work', 'environment', 'health', 'society', 'economy', 'science'];
const ESSAY_TYPES = ['opinion', 'discussion', 'problem_solution', 'adv_disadv', 'two_part', 'positive_negative'];

function checkText(where, s) {
  if (typeof s === 'string' && NO_MARKUP.test(s)) err(where, 'contains HTML/Markdown markup');
}

function withinLimit(ans, limit) {
  const [max, num] = WORD_LIMITS[limit];
  const toks = String(ans).trim().split(/\s+/).filter(Boolean);
  const isNum = (t) => /^[£$]?\d[\d,.:/]*(%|am|pm|th|st|nd|rd)?$/i.test(t);
  const nonNum = toks.filter((t) => !(num && isNum(t)));
  const nums = toks.filter((t) => num && isNum(t));
  return nonNum.length <= max && nums.length <= 1;
}

function checkGroups(where, groups, sourceText, { listening = false } = {}) {
  if (!Array.isArray(groups) || groups.length === 0) return err(where, 'groups missing'), 0;
  let expectN = 1;
  const corpus = norm(sourceText);
  groups.forEach((g, gi) => {
    const gw = `${where} group ${gi + 1} (${g.type})`;
    const types = ['tfng', 'ynng', 'headings', 'matching_info', 'matching_features', 'sentence_endings', 'summary_bank', 'mcq', 'mcq_multi', 'gap', 'short_answer'];
    if (!types.includes(g.type)) err(gw, `unknown type "${g.type}"`);
    if (!isStr(g.instructions)) err(gw, 'instructions missing');
    checkText(gw, g.instructions);
    const needsOpts = ['headings', 'matching_info', 'matching_features', 'sentence_endings', 'summary_bank'];
    const optKeys = Array.isArray(g.options) ? g.options.map((o) => o.key) : [];
    if (needsOpts.includes(g.type)) {
      if (!Array.isArray(g.options) || g.options.length < 2) err(gw, 'group options missing');
      else g.options.forEach((o, i) => { if (!isStr(o.key) || !isStr(o.text)) err(gw, `option ${i} needs key and text`); });
      if (new Set(optKeys).size !== optKeys.length) err(gw, 'duplicate option keys');
    }
    if (['gap', 'short_answer'].includes(g.type)) {
      if (!WORD_LIMITS[g.wordLimit]) err(gw, `wordLimit "${g.wordLimit}" not allowed`);
    }
    if (!Array.isArray(g.questions) || g.questions.length === 0) return err(gw, 'questions missing');
    if (g.type === 'headings' && optKeys.length < g.questions.length + 2) err(gw, 'need at least 2 more headings than questions');
    if (g.type === 'sentence_endings' && optKeys.length < g.questions.length + 2) err(gw, 'need at least 2 more endings than questions');
    if (g.type === 'summary_bank' && optKeys.length < g.questions.length + 3) err(gw, 'need at least 3 more bank words than questions');
    g.questions.forEach((q) => {
      const qw = `${where} Q${q.n}`;
      if (q.n !== expectN) err(qw, `expected question number ${expectN}, got ${q.n}`);
      expectN += g.type === 'mcq_multi' ? (q.count || 2) : 1;
      if (!isStr(q.prompt)) err(qw, 'prompt missing');
      if (!isStr(q.explanation)) err(qw, 'explanation missing');
      checkText(qw, q.prompt); checkText(qw, q.explanation);
      const alts = Array.isArray(q.answer) ? q.answer : [q.answer];
      switch (g.type) {
        case 'tfng': if (!['TRUE', 'FALSE', 'NOT GIVEN'].includes(q.answer)) err(qw, `tfng answer "${q.answer}"`); break;
        case 'ynng': if (!['YES', 'NO', 'NOT GIVEN'].includes(q.answer)) err(qw, `ynng answer "${q.answer}"`); break;
        case 'headings': case 'matching_info': case 'matching_features': case 'sentence_endings': case 'summary_bank':
          if (!optKeys.includes(q.answer)) err(qw, `answer "${q.answer}" not among option keys`);
          if (g.type === 'summary_bank' && !String(q.prompt).includes('____')) err(qw, 'summary_bank prompt needs ____');
          break;
        case 'mcq': {
          const keys = (q.options || []).map((o) => o.key);
          if (keys.length < 3) err(qw, 'mcq needs its own options (A-D)');
          if (!keys.includes(q.answer)) err(qw, `answer "${q.answer}" not among options`);
          (q.options || []).forEach((o) => { if (!isStr(o.text)) err(qw, 'option text missing'); });
          break;
        }
        case 'mcq_multi': {
          const keys = (q.options || []).map((o) => o.key);
          if (keys.length < 5) err(qw, 'mcq_multi needs 5 options A-E');
          if (!Array.isArray(q.answers) || q.answers.length !== (q.count || 2)) err(qw, 'mcq_multi needs answers array of length count');
          else q.answers.forEach((a) => { if (!keys.includes(a)) err(qw, `answer ${a} not in options`); });
          break;
        }
        case 'gap': case 'short_answer': {
          if (g.type === 'gap' && (String(q.prompt).match(/____/g) || []).length !== 1) err(qw, 'gap prompt must contain ____ exactly once');
          if (!alts.length || !alts.every(isStr)) err(qw, 'answer missing');
          alts.forEach((a) => { if (WORD_LIMITS[g.wordLimit] && !withinLimit(a, g.wordLimit)) err(qw, `answer "${a}" breaks word limit ${g.wordLimit}`); });
          if (!listening && alts[0] && !corpus.includes(norm(alts[0]))) err(qw, `first answer "${alts[0]}" does not appear word for word in the passage`);
          if (listening && alts[0] && !corpus.includes(norm(alts[0]))) warn(qw, `first answer "${alts[0]}" not found verbatim in script (fine only if the script says it in spoken form, e.g. numbers or spelling)`);
          break;
        }
      }
    });
  });
  return expectN - 1;
}

function validateReading(file, data) {
  data.items.forEach((p) => {
    const w = `${file} ${p.id}`;
    if (!/^r(p|\d\d)$/.test(p.id || '')) err(w, 'id must be rp or rNN');
    if (!isStr(p.title)) err(w, 'title missing');
    if (![1, 2, 3].includes(p.level)) err(w, 'level must be 1, 2 or 3');
    if (!TOPICS_RL.includes(p.topic)) err(w, `topic "${p.topic}" not allowed`);
    if (!Array.isArray(p.paragraphs) || p.paragraphs.length < 3) return err(w, 'paragraphs missing');
    p.paragraphs.forEach((para, i) => {
      const exp = String.fromCharCode(65 + i);
      if (para.label !== exp) err(w, `paragraph ${i + 1} label should be ${exp}`);
      checkText(`${w} para ${para.label}`, para.text);
    });
    const text = p.paragraphs.map((x) => x.text).join(' ');
    const wc = words(text);
    const [lo, hi] = p.placement ? [330, 500] : [620, 950];
    if (wc < lo || wc > hi) err(w, `passage has ${wc} words; expected ${lo}-${hi}`);
    const labels = p.paragraphs.map((x) => x.label);
    (p.groups || []).forEach((g) => {
      if (g.type === 'matching_info') g.options?.forEach((o) => { if (!labels.includes(o.key)) err(w, `matching_info option ${o.key} is not a paragraph`); });
      if (g.type === 'headings') g.questions?.forEach((q) => { if (!/^Paragraph [A-Z]$/.test(q.prompt) || !labels.includes(q.prompt.slice(-1))) err(w, `headings prompt "${q.prompt}" must be "Paragraph X" for an existing paragraph`); });
    });
    const total = checkGroups(w, p.groups, text);
    const [qlo, qhi] = p.placement ? [8, 10] : [12, 14];
    if (total < qlo || total > qhi) err(w, `${total} questions; expected ${qlo}-${qhi}`);
    console.log(`  ${p.id} L${p.level} "${p.title}": ${wc} words, ${total} questions`);
  });
}

function validateListening(file, data) {
  data.items.forEach((s) => {
    const w = `${file} ${s.id}`;
    if (!/^l(p|\d\d)$/.test(s.id || '')) err(w, 'id must be lp or lNN');
    if (![1, 2, 3, 4].includes(s.section)) err(w, 'section must be 1-4');
    if (!isStr(s.title)) err(w, 'title missing');
    const sp = s.speakers || {};
    if (!sp.N) err(w, 'narrator N missing');
    Object.entries(sp).forEach(([k, v]) => {
      if (!ACCENTS.includes(v.accent)) err(w, `speaker ${k} accent "${v.accent}" not allowed`);
      if (!['male', 'female'].includes(v.voice)) err(w, `speaker ${k} voice must be male/female`);
      if (!isStr(v.role)) err(w, `speaker ${k} role missing`);
    });
    if (sp.N && sp.N.accent !== 'en-GB') err(w, 'narrator must be en-GB');
    if (!Array.isArray(s.script) || s.script.length < 5) return err(w, 'script missing');
    let pauses = 0;
    s.script.forEach((l, i) => {
      if (l.pause !== undefined) { pauses++; if (typeof l.pause !== 'number' || l.pause < 5 || l.pause > 60) err(w, `script ${i} pause must be 5-60 s`); return; }
      if (!sp[l.s]) err(w, `script ${i} speaker "${l.s}" not defined`);
      if (!isStr(l.t)) err(w, `script ${i} text missing`);
      else if (l.t.length > 300) err(w, `script ${i} longer than 300 characters`);
      checkText(`${w} script ${i}`, l.t);
    });
    if (pauses < 1) err(w, 'needs at least one {pause} reading-time item');
    const text = s.script.filter((l) => l.t).map((l) => l.t).join(' ');
    const wc = words(text);
    const [lo, hi] = s.placement ? [320, 560] : [520, 880];
    if (wc < lo || wc > hi) err(w, `script has ${wc} words; expected ${lo}-${hi}`);
    const total = checkGroups(w, s.groups, text, { listening: true });
    const expected = s.placement ? 8 : 10;
    if (total !== expected) err(w, `${total} questions; expected ${expected}`);
    console.log(`  ${s.id} S${s.section} "${s.title}": ${wc} words, ${total} questions`);
  });
}

function validateChart(w, c, depth = 0) {
  if (!c || typeof c !== 'object') return err(w, 'chart missing');
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  switch (c.type) {
    case 'line': case 'bar': {
      const xs = c.type === 'line' ? c.xLabels : c.categories;
      if (!Array.isArray(xs) || xs.length < 2) err(w, `${c.type} needs ${c.type === 'line' ? 'xLabels' : 'categories'}`);
      if (!Array.isArray(c.series) || c.series.length < 1 || c.series.length > 4) err(w, `${c.type} needs 1-4 series`);
      (c.series || []).forEach((s) => {
        if (!isStr(s.name)) err(w, 'series name missing');
        if (!Array.isArray(s.values) || s.values.length !== (xs || []).length) err(w, `series "${s.name}" length must match labels`);
        (s.values || []).forEach((v) => { if (v !== null && !num(v)) err(w, `series "${s.name}" has non-number`); if (num(v) && num(c.yMax) && v > c.yMax) err(w, `value ${v} above yMax`); });
      });
      if (!num(c.yMax)) err(w, 'yMax missing');
      break;
    }
    case 'pie':
      if (!Array.isArray(c.pies) || c.pies.length < 1 || c.pies.length > 3) err(w, 'pie needs 1-3 pies');
      (c.pies || []).forEach((p) => {
        const sum = (p.slices || []).reduce((a, s) => a + (s.value || 0), 0);
        if (Math.abs(sum - 100) > 0.6) err(w, `pie "${p.title}" sums to ${sum}`);
        if (!p.slices || p.slices.length < 3 || p.slices.length > 6) err(w, `pie "${p.title}" needs 3-6 slices`);
      });
      break;
    case 'table':
      if (!Array.isArray(c.columns) || !Array.isArray(c.rows)) err(w, 'table needs columns and rows');
      (c.rows || []).forEach((r, i) => { if (r.length !== c.columns.length) err(w, `table row ${i} length mismatch`); });
      break;
    case 'process':
      if (!Array.isArray(c.steps) || c.steps.length < 5 || c.steps.length > 10) err(w, 'process needs 5-10 steps');
      break;
    case 'map':
      if (!Array.isArray(c.maps) || c.maps.length !== 2) err(w, 'map needs 2 maps');
      (c.maps || []).forEach((m) => (m.features || []).forEach((f) => {
        if (!['building', 'green', 'water', 'road', 'parking', 'sports', 'path'].includes(f.kind)) err(w, `map feature kind "${f.kind}"`);
        if (![f.x, f.y, f.w, f.h].every(num) || f.x < 0 || f.y < 0 || f.x + f.w > 100 || f.y + f.h > 100) err(w, `map feature "${f.label}" outside 0-100 grid`);
      }));
      break;
    case 'mixed':
      if (depth > 0 || !Array.isArray(c.parts) || c.parts.length !== 2) err(w, 'mixed needs exactly 2 parts');
      (c.parts || []).forEach((p) => validateChart(w, p, depth + 1));
      break;
    default: err(w, `unknown chart type "${c.type}"`);
  }
}

function validateTask1(file, data) {
  data.items.forEach((t) => {
    const w = `${file} ${t.id}`;
    ['id', 'chartType', 'title', 'prompt', 'modelAnswer'].forEach((k) => { if (!isStr(t[k])) err(w, `${k} missing`); });
    if (t.chart?.type !== t.chartType) err(w, 'chart.type must equal chartType');
    validateChart(w, t.chart);
    if (!Array.isArray(t.keyFeatures) || t.keyFeatures.length < 2) err(w, 'keyFeatures missing');
    const wc = words(t.modelAnswer);
    if (wc < 160 || wc > 220) err(w, `model answer ${wc} words; expected 160-220`);
    checkText(w, t.modelAnswer);
    console.log(`  ${t.id} ${t.chartType} "${t.title}": model ${wc} words`);
  });
}

function validateTask2(file, data) {
  data.items.forEach((t) => {
    const w = `${file} ${t.id}`;
    ['id', 'prompt', 'modelAnswer', 'topic'].forEach((k) => { if (!isStr(t[k])) err(w, `${k} missing`); });
    if (!ESSAY_TYPES.includes(t.essayType)) err(w, `essayType "${t.essayType}"`);
    const wc = words(t.modelAnswer);
    if (wc < 260 || wc > 330) err(w, `model answer ${wc} words; expected 260-330`);
    if (!Array.isArray(t.ideas) || t.ideas.length < 3) err(w, 'ideas missing');
    if (!Array.isArray(t.usefulVocab) || t.usefulVocab.length < 4) err(w, 'usefulVocab missing');
    checkText(w, t.modelAnswer);
    console.log(`  ${t.id} ${t.essayType}/${t.topic}: model ${wc} words`);
  });
}

function validateSpeaking(file, data) {
  (data.part1 || []).forEach((p) => {
    const w = `${file} ${p.id}`;
    if (!isStr(p.topic) || !Array.isArray(p.questions) || p.questions.length < 3) err(w, 'part1 needs topic and 3+ questions');
  });
  (data.part2 || []).forEach((p) => {
    const w = `${file} ${p.id}`;
    if (!isStr(p.cue) || !Array.isArray(p.bullets) || p.bullets.length < 3 || !isStr(p.finalBullet)) err(w, 'part2 needs cue, 3 bullets, finalBullet');
    if (!p.part3 || !Array.isArray(p.part3.questions) || p.part3.questions.length < 4) err(w, 'part3 needs 4+ questions');
  });
  console.log(`  part1 topics: ${(data.part1 || []).length}, part2 cards: ${(data.part2 || []).length}`);
}

function validateGrammar(file, data) {
  data.items.forEach((g) => {
    const w = `${file} ${g.id}`;
    if (!isStr(g.title) || !isStr(g.why) || !Array.isArray(g.rule) || !hasArabic(g.ar)) err(w, 'title/why/rule/ar missing');
    if (!Array.isArray(g.examples) || g.examples.length < 3) err(w, 'need 3+ examples');
    if (!Array.isArray(g.exercise) || g.exercise.length < 4) err(w, 'need 4+ exercise items');
    (g.exercise || []).forEach((x, i) => {
      if (!Array.isArray(x.options) || typeof x.answer !== 'number' || x.answer < 0 || x.answer >= x.options.length) err(w, `exercise ${i} answer index invalid`);
      if (!hasArabic(x.explainAr)) err(w, `exercise ${i} explainAr missing`);
    });
  });
  console.log(`  grammar lessons: ${data.items.length}`);
}

const seenWords = new Map();
function validateVocab(file, data) {
  data.items.forEach((v, i) => {
    const w = `${file} #${i} ${v.w}`;
    ['w', 'pos', 'def', 'ex', 'ar'].forEach((k) => { if (!isStr(v[k])) err(w, `${k} missing`); });
    if (![1, 2, 3].includes(v.lvl)) err(w, 'lvl must be 1-3');
    if (!VOCAB_TOPICS.includes(v.topic)) err(w, `topic "${v.topic}"`);
    if (!hasArabic(v.ar)) err(w, 'ar has no Arabic');
    if (!Array.isArray(v.col) || v.col.length < 1) err(w, 'col missing');
    const key = String(v.w).toLowerCase().trim();
    if (seenWords.has(key)) err(w, `duplicate of ${seenWords.get(key)}`);
    else seenWords.set(key, file);
  });
  const lv = [1, 2, 3].map((l) => data.items.filter((v) => v.lvl === l).length);
  console.log(`  vocab: ${data.items.length} words (lvl1 ${lv[0]}, lvl2 ${lv[1]}, lvl3 ${lv[2]})`);
}

function validateLinking(file, data) {
  (data.linking || []).forEach((grp) => (grp.items || []).forEach((it) => {
    if (!isStr(it.phrase) || !isStr(it.ex) || !hasArabic(it.ar)) err(`${file} ${grp.function}`, `item "${it.phrase}" incomplete`);
  }));
  (data.collocations || []).forEach((grp) => (grp.items || []).forEach((it) => {
    if (!isStr(it.c) || !isStr(it.ex) || !hasArabic(it.ar)) err(`${file} ${grp.topic}`, `collocation "${it.c}" incomplete`);
  }));
  const n1 = (data.linking || []).reduce((a, g) => a + g.items.length, 0);
  const n2 = (data.collocations || []).reduce((a, g) => a + g.items.length, 0);
  console.log(`  linking phrases: ${n1}, collocations: ${n2}`);
}

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: validate.mjs <file.json> ...'); process.exit(2); }
for (const file of files) {
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { err(file, `invalid JSON: ${e.message}`); continue; }
  console.log(`${file} (${data.kind})`);
  const ids = new Set();
  (data.items || []).forEach((it) => { if (it.id) { if (ids.has(it.id)) err(file, `duplicate id ${it.id}`); ids.add(it.id); } });
  switch (data.kind) {
    case 'reading': validateReading(file, data); break;
    case 'listening': validateListening(file, data); break;
    case 'writing_task1': validateTask1(file, data); break;
    case 'writing_task2': validateTask2(file, data); break;
    case 'speaking': validateSpeaking(file, data); break;
    case 'grammar': validateGrammar(file, data); break;
    case 'vocab': validateVocab(file, data); break;
    case 'linking': validateLinking(file, data); break;
    default: err(file, `unknown kind "${data.kind}"`);
  }
}
warnings.forEach((w) => console.log(`WARN  ${w}`));
errors.forEach((e) => console.log(`ERROR ${e}`));
console.log(errors.length ? `\n${errors.length} error(s)` : '\nOK');
process.exit(errors.length ? 1 : 0);
