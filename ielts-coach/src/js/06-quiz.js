/* ---------- IELTS question types: render, collect, score ---------- */
const QTYPES = {
  tfng: { label: 'True / False / Not Given' },
  ynng: { label: 'Yes / No / Not Given' },
  headings: { label: 'Matching headings' },
  matching_info: { label: 'Matching information' },
  matching_features: { label: 'Matching features' },
  sentence_endings: { label: 'Matching sentence endings' },
  summary_bank: { label: 'Summary completion (word bank)' },
  mcq: { label: 'Multiple choice' },
  mcq_multi: { label: 'Multiple choice (choose two)' },
  gap: { label: 'Sentence / note / summary completion' },
  short_answer: { label: 'Short-answer questions' },
};
const ESSAY_LABEL = { opinion: 'Opinion', discussion: 'Discussion', problem_solution: 'Problem & solution', adv_disadv: 'Advantages & disadvantages', two_part: 'Two-part question', positive_negative: 'Positive or negative' };
const CHART_LABEL = { line: 'Line graph', bar: 'Bar chart', pie: 'Pie charts', table: 'Table', process: 'Process diagram', map: 'Maps', mixed: 'Mixed charts' };

/* A quiz is one or more items (passages or listening sections) answered together. */
function makeQuiz(items) {
  let offset = 0;
  const parts = items.map((item, i) => {
    const p = { item, idx: i, offset };
    offset += countQuestions(item);
    return p;
  });
  return { parts, total: offset, answers: {}, submitted: false, result: null };
}
function countQuestions(item) {
  return sum((item.groups || []).map((g) => sum((g.questions || []).map((q) => (g.type === 'mcq_multi' ? (q.count || 2) : 1)))));
}
const qkey = (p, q) => `${p.idx}:${q.n}`;

function groupRange(g, offset) {
  const first = g.questions[0].n + offset;
  const lastQ = g.questions[g.questions.length - 1];
  const last = lastQ.n + offset + (g.type === 'mcq_multi' ? (lastQ.count || 2) - 1 : 0);
  return first === last ? `Question ${first}` : `Questions ${first}–${last}`;
}
function optText(g, q, key) {
  const o = (q.options || g.options || []).find((x) => x.key === key);
  return o ? `${key} — ${o.text}` : key;
}
function expectedText(g, q) {
  if (g.type === 'mcq_multi') return q.answers.map((k) => optText(g, q, k)).join('; ');
  if (Array.isArray(q.answer)) return q.answer.join(' / ');
  if (['tfng', 'ynng', 'gap', 'short_answer'].includes(g.type)) return q.answer;
  return optText(g, q, q.answer);
}

function renderQuizPart(quiz, p) {
  const { item, offset } = p;
  const res = quiz.result;
  return (item.groups || []).map((g) => {
    const head = `<div class="q-head">${groupRange(g, offset)}</div>
      <div class="q-instr">${esc(g.instructions)}${g.wordLimit ? ` <b>Write ${esc(g.wordLimit)} for each answer.</b>` : ''}</div>
      ${g.title ? `<div><b>${esc(g.title)}</b></div>` : ''}
      ${g.options && g.type !== 'matching_info' ? `<div class="q-options">${g.options.map((o) => `<div><b>${esc(o.key)}</b><span>${esc(o.text)}</span></div>`).join('')}</div>` : ''}`;
    const qs = g.questions.map((q) => {
      const key = qkey(p, q);
      const val = quiz.answers[key];
      const r = res && res.perQ[key];
      const num = q.n + offset;
      const dis = quiz.submitted ? 'disabled' : '';
      let ctrl = '';
      switch (g.type) {
        case 'tfng': case 'ynng': {
          const opts = g.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN'];
          ctrl = `<div class="choice-row" role="group" aria-label="Answer ${num}">${opts.map((o) => `<button class="choice" data-act="qpick" data-k="${key}" data-v="${o}" aria-pressed="${val === o}" ${dis}>${o}</button>`).join('')}</div>`;
          break;
        }
        case 'headings': case 'matching_info': case 'matching_features': case 'sentence_endings': case 'summary_bank': {
          const opts = g.options || [];
          ctrl = `<select class="input" style="max-width:320px" data-q="${key}" aria-label="Answer ${num}" ${dis}><option value="">Choose…</option>${opts.map((o) => `<option value="${esc(o.key)}" ${val === o.key ? 'selected' : ''}>${esc(o.key)}${g.type === 'matching_info' ? '' : ` — ${esc(o.text.length > 60 ? o.text.slice(0, 58) + '…' : o.text)}`}</option>`).join('')}</select>`;
          break;
        }
        case 'mcq':
          ctrl = `<div class="radio-list">${q.options.map((o) => `<label><input type="radio" name="r-${key}" data-q="${key}" value="${esc(o.key)}" ${val === o.key ? 'checked' : ''} ${dis}><span><b class="mono">${esc(o.key)}</b> ${esc(o.text)}</span></label>`).join('')}</div>`;
          break;
        case 'mcq_multi': {
          const arr = Array.isArray(val) ? val : [];
          ctrl = `<div class="radio-list">${q.options.map((o) => `<label><input type="checkbox" data-multi="${key}" data-max="${q.count || 2}" value="${esc(o.key)}" ${arr.includes(o.key) ? 'checked' : ''} ${dis}><span><b class="mono">${esc(o.key)}</b> ${esc(o.text)}</span></label>`).join('')}</div>`;
          break;
        }
        case 'gap': case 'short_answer':
          ctrl = `<input class="input gap-input" data-q="${key}" value="${esc(val || '')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Answer ${num}" ${dis}>`;
          break;
        default: break;
      }
      const prompt = g.type === 'gap' || g.type === 'summary_bank'
        ? esc(q.prompt).replace('____', `<b class="mono">(${num})</b> ______`)
        : esc(q.prompt);
      const numLabel = g.type === 'mcq_multi' ? `${num}–${num + (q.count || 2) - 1}` : num;
      const fb = r ? `<div class="feedback">
          <div>${r.ok ? '<span class="ans-right">Correct.</span>' : `<span class="ans-wrong">${r.partial ? `${r.partial} of ${q.count || 2} correct.` : 'Incorrect.'}</span> Your answer: <b>${esc(r.givenText || '(blank)')}</b>`}</div>
          <div>Answer: <b>${esc(expectedText(g, q))}</b></div>
          <div class="muted">${esc(q.explanation)}</div></div>` : '';
      return `<div class="q ${r ? (r.ok ? 'right' : 'wrong') : ''}" id="q-${key.replace(':', '-')}"><div class="qn" ${g.type === 'mcq_multi' ? 'style="font-size:.7rem"' : ''}>${numLabel}</div><div class="q-body"><div class="q-prompt">${prompt}</div>${ctrl}${fb}</div></div>`;
    }).join('');
    return `<section class="qgroup">${head}${qs}</section>`;
  }).join('');
}

function quizInputHandler(quiz, el) {
  if (quiz.submitted) return;
  if (el.dataset.multi) {
    const key = el.dataset.multi; const max = +el.dataset.max || 2;
    const arr = new Set(Array.isArray(quiz.answers[key]) ? quiz.answers[key] : []);
    if (el.checked) arr.add(el.value); else arr.delete(el.value);
    if (arr.size > max) { el.checked = false; arr.delete(el.value); toast(`Choose ${max} answers only.`); }
    quiz.answers[key] = [...arr];
  } else if (el.dataset.q) {
    quiz.answers[el.dataset.q] = el.value;
  }
  updateAnsweredCount(quiz);
}
function quizPick(quiz, btn) {
  if (quiz.submitted) return;
  quiz.answers[btn.dataset.k] = btn.dataset.v;
  $$(`[data-act="qpick"][data-k="${btn.dataset.k}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  updateAnsweredCount(quiz);
}
function answeredCount(quiz) {
  let n = 0;
  quiz.parts.forEach((p) => p.item.groups.forEach((g) => g.questions.forEach((q) => {
    const v = quiz.answers[qkey(p, q)];
    if (g.type === 'mcq_multi') n += Array.isArray(v) ? v.length : 0;
    else if (v != null && String(v).trim() !== '') n++;
  })));
  return n;
}
function updateAnsweredCount(quiz) {
  const el = $('#answered');
  if (el) el.textContent = `${answeredCount(quiz)}/${quiz.total} answered`;
}

function scoreQuiz(quiz) {
  const perQ = {}; const byType = {}; let correct = 0;
  quiz.parts.forEach((p) => p.item.groups.forEach((g) => g.questions.forEach((q) => {
    const key = qkey(p, q);
    const given = quiz.answers[key];
    const bt = byType[g.type] || (byType[g.type] = { c: 0, t: 0 });
    if (g.type === 'mcq_multi') {
      const cnt = q.count || 2;
      const arr = Array.isArray(given) ? given : [];
      const hits = arr.filter((k) => q.answers.includes(k)).length;
      correct += hits; bt.c += hits; bt.t += cnt;
      perQ[key] = { ok: hits === cnt, partial: hits && hits < cnt ? hits : 0, givenText: arr.join(', ') };
      return;
    }
    let ok;
    if (['gap', 'short_answer'].includes(g.type)) ok = isRightText(given, q.answer);
    else ok = given === q.answer;
    if (ok) correct++;
    bt.c += ok ? 1 : 0; bt.t += 1;
    perQ[key] = { ok, givenText: given ? (['tfng', 'ynng', 'gap', 'short_answer'].includes(g.type) ? given : optText(g, q, given)) : '' };
  })));
  return { correct, total: quiz.total, perQ, byType };
}
function recordQTypeStats(byType) {
  Object.entries(byType).forEach(([k, v]) => { const s = S.qstats[k] || (S.qstats[k] = { c: 0, t: 0 }); s.c += v.c; s.t += v.t; });
}
function byTypeHtml(byType) {
  const rows = Object.entries(byType).map(([k, v]) => `<tr><td>${esc(QTYPES[k]?.label || k)}</td><td class="n">${v.c}/${v.t}</td></tr>`).join('');
  return `<table class="results-table"><thead><tr><th>Question type</th><th style="text-align:right">Score</th></tr></thead><tbody>${rows}</tbody></table>`;
}
