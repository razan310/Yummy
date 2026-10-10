/* ---------- band estimates ---------- */
const KIND_WEIGHT = { exam: 3, mock: 2, placement: 1, practice: 1 };
function skillEstimate(skill) {
  const list = S.scores.filter((s) => s.skill === skill && s.band != null).sort((a, b) => a.ts - b.ts).slice(-6);
  if (!list.length) return null;
  let w = 0, t = 0;
  list.forEach((s, i) => { const k = (i + 1) * (KIND_WEIGHT[s.kind] || 1) * (s.weight || 1); w += k; t += k * s.band; });
  return t / w;
}
function estimates() { const o = {}; SKILLS.forEach((k) => { o[k] = skillEstimate(k); }); return o; }
function displayEstimates() { const e = estimates(); const o = {}; SKILLS.forEach((k) => { o[k] = e[k] == null ? null : roundHalf(e[k]); }); return o; }
function addScore({ skill, band, kind = 'practice', ref = '', raw = '', label = '', weight = 1 }) {
  S.scores.push({ id: uid(), ts: Date.now(), date: today(), skill, band, kind, ref, raw, label, weight });
}

/* ---------- plan calendar ---------- */
const PHASES = [
  { from: 1, to: 3, name: 'Foundation', focus: 'Learn every question type, repair high-frequency grammar errors, and build a daily speaking habit.' },
  { from: 4, to: 8, name: 'Build', focus: 'Timed sections, full essays every week, Part 2 and 3 fluency, and a weekly mock from week 4.' },
  { from: 9, to: 12, name: 'Exam mode', focus: 'Mocks, full timed tasks under exam conditions, and targeted repair of your weakest criteria.' },
];
const PLAN_WEEKS = 12;
const phaseOf = (week) => PHASES.find((p) => week >= p.from && week <= p.to) || PHASES[PHASES.length - 1];
function planPos(date = today()) {
  const idx = diffDays(S.profile.startDate, date);
  return { idx, week: Math.floor(idx / 7) + 1, day: (((idx % 7) + 7) % 7) + 1 };
}
const weekStart = (week) => addDays(S.profile.startDate, (week - 1) * 7);

const BLOCKS = {
  placement: { min: 75, title: 'Placement test', skill: 'M', go: 'placement' },
  vocab: { min: 15, title: 'Vocabulary flashcards', skill: 'V', go: 'words' },
  t2: { min: 50, title: 'Writing Task 2 essay', skill: 'W', go: 'writing' },
  t1: { min: 30, title: 'Writing Task 1 report', skill: 'W', go: 'writing' },
  speak: { min: 25, title: 'Speaking Part 2 + Part 3', skill: 'S', go: 'speaking' },
  speak1: { min: 15, title: 'Speaking Part 1 fluency', skill: 'S', go: 'speaking' },
  read: { min: 25, title: 'Reading passage (timed)', skill: 'R', go: 'reading' },
  listen: { min: 20, title: 'Listening section', skill: 'L', go: 'listening' },
  grammar: { min: 15, title: 'Grammar repair lesson', skill: 'G', go: 'grammar' },
  review: { min: 15, title: 'Review your error log', skill: 'G', go: 'journal' },
  mockLR: { min: 95, title: 'Mock exam, part 1: Listening + Reading', skill: 'M', go: 'mock' },
  mockWS: { min: 75, title: 'Mock exam, part 2: Writing + Speaking', skill: 'M', go: 'mock' },
  exam: { min: 0, title: 'Exam day', skill: 'M', go: null },
  result: { min: 5, title: 'Log your official result when it arrives', skill: 'M', go: 'progress' },
};

function planWeights(est) {
  const p = S.profile;
  const b = (k) => (est[k] == null ? 6 : est[k]);
  const gap = (k) => clamp(p.target - b(k), 0, 2.5) + 0.35;
  return { W: gap('W') * 1.3, S: gap('S') * 1.2, R: gap('R'), L: gap('L') };
}

/* Builds one week of tasks from frozen estimates. Pure: same inputs give the same plan. */
function buildWeek(week, est) {
  const p = S.profile;
  const start = weekStart(week);
  const phase = phaseOf(week);
  const days = Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), tasks: [], budget: p.dailyMinutes, kind: 'regular' }));
  const exam = p.examDate;
  days.forEach((d) => {
    const wd = dow(d.date);
    if (d.date === exam) { d.kind = 'exam'; d.tasks.push('exam'); return; }
    if (exam && d.date === addDays(exam, 1)) { d.kind = 'light'; d.tasks.push('vocab', 'result'); return; }
    if (exam && d.date === addDays(exam, -1)) { d.kind = 'light'; d.tasks.push('vocab', 'speak1'); return; }
    if (week >= 4 && wd === p.mockDay) { d.kind = 'mock'; d.tasks.push('vocab', 'mockLR'); return; }
    if (week >= 4 && wd === (p.mockDay + 1) % 7) { d.kind = 'mock'; d.tasks.push('vocab', 'mockWS'); return; }
    if (wd === p.lightDay) { d.kind = 'light'; d.tasks.push('vocab', 'speak1', 'review'); return; }
    d.tasks.push('vocab');
  });
  if (week === 1 && !S.placement?.done) { const d0 = days.find((d) => d.kind === 'regular'); if (d0) { d0.kind = 'placement'; d0.tasks = ['placement']; } }
  const regular = days.filter((d) => d.kind === 'regular');
  if (!regular.length) return days;
  const used = (d) => sum(d.tasks.map((t) => BLOCKS[t].min));

  const w = planWeights(est);
  const tot = w.W + w.S + w.R + w.L;
  const grammarCount = phase.name === 'Foundation' ? 3 : phase.name === 'Build' ? 2 : 1;
  const avail = sum(regular.map((d) => d.budget - used(d))) - grammarCount * BLOCKS.grammar.min;
  const share = (k) => (avail * w[k]) / tot;
  const counts = {
    t2: Math.max(2, Math.round((share('W') * 0.62) / 50)),
    t1: Math.max(1, Math.round((share('W') * 0.38) / 30)),
    speak: Math.max(2, Math.round(share('S') / 25)),
    read: Math.max(1, Math.round(share('R') / 25)),
    listen: Math.max(1, Math.round(share('L') / 20)),
    grammar: grammarCount,
  };
  const mins = { t2: 2, t1: 1, speak: 2, read: 1, listen: 1, grammar: 1 };
  const order = Object.keys(counts).sort((a, b) => (w[BLOCKS[a].skill] || 0) - (w[BLOCKS[b].skill] || 0));
  const totalMin = () => sum(Object.entries(counts).map(([k, n]) => n * BLOCKS[k].min));
  let guard = 0;
  while (totalMin() > avail + grammarCount * 15 + regular.length * 8 && guard++ < 40) {
    const k = order.find((kk) => counts[kk] > mins[kk]);
    if (!k) break;
    counts[k]--;
  }
  const queue = [];
  Object.entries(counts).forEach(([k, n]) => { for (let i = 0; i < n; i++) queue.push(k); });
  queue.sort((a, b) => BLOCKS[b].min - BLOCKS[a].min || (w[BLOCKS[b].skill] || 0) - (w[BLOCKS[a].skill] || 0));
  queue.forEach((k) => {
    const need = BLOCKS[k].min;
    const fits = (d, strict) => d.budget - used(d) >= need - (strict ? 0 : 10);
    const cands = regular.filter((d) => fits(d, false));
    const fresh = cands.filter((d) => !d.tasks.includes(k) && !(k === 't1' && d.tasks.includes('t2')) && !(k === 't2' && d.tasks.includes('t1')));
    const pool = fresh.length ? fresh : cands.filter((d) => !d.tasks.includes(k));
    if (!pool.length) return;
    pool.sort((a, b) => (b.budget - used(b)) - (a.budget - used(a)) || a.date.localeCompare(b.date));
    pool[0].tasks.push(k);
  });
  const rank = { placement: 0, vocab: 1, t2: 2, t1: 3, speak: 4, speak1: 5, read: 6, listen: 7, grammar: 8, review: 9 };
  regular.forEach((d) => d.tasks.sort((a, b) => (rank[a] ?? 5) - (rank[b] ?? 5)));
  return days;
}

/* ---------- concrete content for a task ---------- */
function isDone(kind, id) { return !!S.done[`${kind}:${id}`]; }
function plannedRefs() {
  const set = new Set(); const t = today();
  Object.entries(S.days).forEach(([date, d]) => { if (date >= t) d.tasks.forEach((x) => { if (x.ref && !x.done) set.add(x.ref); }); });
  return set;
}
function nextReading(est, week) {
  const r = est.R ?? 6;
  const levels = week <= 3 ? (r < 6 ? [1, 2] : [2, 1, 3]) : week <= 8 ? (r < 6.5 ? [2, 3, 1] : [3, 2, 1]) : [3, 2, 1];
  const reserved = plannedRefs();
  for (const lv of levels) {
    const it = CONTENT.reading.find((x) => !x.placement && x.level === lv && !isDone('reading', x.id) && !reserved.has(x.id));
    if (it) return it;
  }
  return CONTENT.reading.filter((x) => !x.placement).sort((a, b) => (S.done[`reading:${a.id}`]?.date || '').localeCompare(S.done[`reading:${b.id}`]?.date || ''))[0];
}
function nextListening(est, week) {
  const l = est.L ?? 6;
  const secs = week <= 3 ? (l < 6 ? [1, 2, 3] : [2, 3, 1]) : week <= 8 ? [3, 2, 4] : [4, 3, 2];
  const reserved = plannedRefs();
  for (const s of secs) {
    const it = CONTENT.listening.find((x) => !x.placement && x.section === s && !isDone('listening', x.id) && !reserved.has(x.id));
    if (it) return it;
  }
  return CONTENT.listening.filter((x) => !x.placement).find((x) => !isDone('listening', x.id) && !reserved.has(x.id))
    || CONTENT.listening.filter((x) => !x.placement)[0];
}
function nextPrompt(kind) {
  const list = (kind === 't1' ? CONTENT.task1 : CONTENT.task2).filter((x) => !x.placement);
  const reserved = plannedRefs();
  return list.find((x) => !isDone(kind === 't1' ? 'task1' : 'task2', x.id) && !reserved.has(x.id)) || list.find((x) => !isDone(kind === 't1' ? 'task1' : 'task2', x.id)) || pick(list);
}
function nextCard() {
  const list = CONTENT.speaking.part2.filter((x) => !x.placement);
  const reserved = plannedRefs();
  return list.find((x) => !isDone('p2', x.id) && !reserved.has(x.id)) || list.find((x) => !isDone('p2', x.id)) || pick(list);
}
function nextTopic() {
  const list = CONTENT.speaking.part1.filter((x) => !x.placement);
  const reserved = plannedRefs();
  return list.find((x) => !isDone('p1', x.id) && !reserved.has(x.id)) || list.find((x) => !isDone('p1', x.id)) || pick(list);
}
function nextGrammar() {
  const reserved = plannedRefs();
  return CONTENT.grammar.find((g) => !S.grammar[g.id] && !reserved.has(g.id))
    || CONTENT.grammar.find((g) => !S.grammar[g.id])
    || [...CONTENT.grammar].sort((a, b) => (S.grammar[a.id].score / S.grammar[a.id].total) - (S.grammar[b.id].score / S.grammar[b.id].total))[0];
}
const CRIT_NAME = { TA: 'Task Achievement', TR: 'Task Response', CC: 'Coherence & Cohesion', LR: 'Lexical Resource', GRA: 'Grammatical Range & Accuracy', FC: 'Fluency & Coherence' };
function weakestQType() {
  const rows = Object.entries(S.qstats).filter(([, v]) => v.t >= 3).map(([k, v]) => [k, v.c / v.t]);
  rows.sort((a, b) => a[1] - b[1]);
  return rows[0] && rows[0][1] < 0.75 ? rows[0][0] : null;
}

function materialise(key, est, week) {
  const b = BLOCKS[key];
  const t = { id: uid(), type: key, title: b.title, min: b.min, skill: b.skill, done: false, ref: '', sub: '', tip: '' };
  switch (key) {
    case 't2': { const it = nextPrompt('t2'); t.ref = it.id; t.sub = `${ESSAY_LABEL[it.essayType] || 'Essay'} · ${it.topic}`; if (S.lastCrit.W) t.tip = `Focus: ${CRIT_NAME[S.lastCrit.W]} was your weakest criterion last time.`; break; }
    case 't1': { const it = nextPrompt('t1'); t.ref = it.id; t.sub = `${CHART_LABEL[it.chartType] || it.chartType}: ${it.title}`; t.tip = 'Write the overview first; it caps your Task Achievement band if it is missing.'; break; }
    case 'speak': { const it = nextCard(); t.ref = it.id; t.sub = it.cue; if (S.lastCrit.S) t.tip = `Focus: ${CRIT_NAME[S.lastCrit.S]}.`; break; }
    case 'speak1': { const it = nextTopic(); t.ref = it.id; t.sub = it.topic; t.tip = 'Answer in 2–4 sentences: answer, reason, example.'; break; }
    case 'read': { const it = nextReading(est, week); if (it) { t.ref = it.id; t.sub = `${it.title} · Passage ${it.level} level`; } const q = weakestQType(); if (q) t.tip = `Watch: ${QTYPES[q]?.label || q} questions are your lowest accuracy so far.`; break; }
    case 'listen': { const it = nextListening(est, week); if (it) { t.ref = it.id; t.sub = `Section ${it.section}: ${it.title}`; } t.tip = 'Use exam mode: you hear it once.'; break; }
    case 'grammar': { const g = nextGrammar(); if (g) { t.ref = g.id; t.sub = g.title; } break; }
    case 'vocab': { t.sub = `${S.profile.newWords} new words + reviews due`; break; }
    case 'mockLR': case 'mockWS': t.sub = `Week ${week} mock`; t.ref = String(week); break;
    case 'review': t.sub = 'Re-read the mistakes from your recent essays and speaking feedback.'; break;
    case 'placement': t.sub = 'Reading, listening, writing and speaking. Sets your starting bands.'; break;
    case 'exam': t.sub = 'Good luck. Sleep well, eat, arrive early.'; break;
    default: break;
  }
  return t;
}

/* Today's tasks are generated once and stored; future days are a preview. */
function frozenEst(week) {
  if (!S.weekEst[week]) S.weekEst[week] = estimates();
  return S.weekEst[week];
}
function dayTasks(date, { create = false } = {}) {
  if (S.days[date]) return S.days[date].tasks;
  const pos = planPos(date);
  if (pos.idx < 0 || pos.week > PLAN_WEEKS) return [];
  if (!create) {
    const days = buildWeek(pos.week, S.weekEst[pos.week] || estimates());
    const d = days.find((x) => x.date === date);
    return d ? d.tasks.map((k) => ({ type: k, title: BLOCKS[k].title, min: BLOCKS[k].min, skill: BLOCKS[k].skill, preview: true })) : [];
  }
  const est = frozenEst(pos.week);
  const days = buildWeek(pos.week, est);
  const d = days.find((x) => x.date === date);
  const tasks = (d ? d.tasks : ['vocab']).map((k) => materialise(k, est, pos.week));
  S.days[date] = { week: pos.week, tasks };
  save();
  return tasks;
}
function regenerateToday() {
  const d = today();
  delete S.days[d];
  delete S.weekEst[planPos(d).week];
  dayTasks(d, { create: true });
}
/* Mark the first matching open task for today as done (called when an activity is finished). */
function completeTask(type, ref) {
  const d = S.days[today()];
  if (!d) return;
  const types = Array.isArray(type) ? type : [type];
  const t = d.tasks.find((x) => !x.done && types.includes(x.type) && (!ref || !x.ref || x.ref === ref))
    || d.tasks.find((x) => !x.done && types.includes(x.type));
  if (t) { t.done = true; t.doneAt = Date.now(); }
}

/* ---------- streaks ---------- */
function dayActive(date) {
  const d = S.days[date];
  return (S.studySec[date] || 0) >= 20 * 60 || !!(d && d.tasks.some((t) => t.done && t.type !== 'vocab')) || !!(d && d.tasks.length && d.tasks.every((t) => t.done));
}
function streakNow() {
  let n = 0; let d = today();
  if (!dayActive(d)) d = addDays(d, -1);
  while (dayActive(d) && n < 999) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak() {
  const dates = new Set([...Object.keys(S.studySec), ...Object.keys(S.days)]);
  const sorted = [...dates].filter(dayActive).sort();
  let best = 0, run = 0, prev = null;
  sorted.forEach((d) => { run = prev && diffDays(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return best;
}

/* ---------- spaced repetition (SM-2 style) ---------- */
let VOCAB_ORDER = [];
function buildVocabOrder() {
  // Interleave the three banks so each day mixes general, technology/work and education/society words.
  const banks = [[], [], []];
  CONTENT.vocab.forEach((v) => { banks[v.bank || 0].push(v); });
  const out = [];
  for (let i = 0; out.length < CONTENT.vocab.length; i++) banks.forEach((b) => { if (b[i]) out.push(b[i]); });
  VOCAB_ORDER = out;
}
const SRS_LABEL = ['Again', 'Hard', 'Good', 'Easy'];
function srsPreview(card, q) {
  const c = card || { ivl: 0, ease: 2.5, reps: 0 };
  if (q === 0) return 0;
  if (c.reps === 0) return q === 3 ? 4 : q === 2 ? 1 : 1;
  if (c.reps === 1) return q === 3 ? 6 : q === 2 ? 3 : 2;
  return Math.max(1, Math.round(c.ivl * (q === 1 ? 1.2 : q === 2 ? c.ease : c.ease * 1.3)));
}
function srsGrade(word, q) {
  const c = SRS.cards[word] || { ivl: 0, ease: 2.5, reps: 0, lapses: 0, added: today() };
  const ivl = srsPreview(c, q);
  if (q === 0) { c.reps = 0; c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = 0; c.due = today(); }
  else { c.ease = clamp(c.ease + (q === 1 ? -0.15 : q === 3 ? 0.15 : 0), 1.3, 3); c.reps++; c.ivl = ivl; c.due = addDays(today(), ivl); }
  c.last = today();
  SRS.cards[word] = c;
}
const fmtIvl = (d) => (d === 0 ? '<10 min' : d === 1 ? '1 day' : d < 30 ? `${d} days` : `${Math.round(d / 30)} mo`);
function dueWords() { const t = today(); return Object.entries(SRS.cards).filter(([, c]) => c.due <= t).map(([w]) => w); }
function newWordsToday() {
  const v = S.vocab;
  const already = v.newDate === today() ? v.newCount : 0;
  const left = Math.max(0, S.profile.newWords - already);
  const out = [];
  for (let i = v.cursor; i < VOCAB_ORDER.length && out.length < left; i++) if (!SRS.cards[VOCAB_ORDER[i].w]) out.push(VOCAB_ORDER[i]);
  return out;
}
const WORD_INDEX = {};
function wordData(w) { return WORD_INDEX[w.toLowerCase()]; }
