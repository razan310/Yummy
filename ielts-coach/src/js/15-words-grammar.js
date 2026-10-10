/* ---------- Words: flashcards, word bank, linking words, collocations ---------- */
VIEWS.words = {
  study: true,
  html({ tab = 'review', start, q = '', topic = '' }) {
    const tabs = [['review', 'Review'], ['bank', 'Word bank'], ['linking', 'Linking words'], ['colloc', 'Collocations']];
    const head = `<div class="page-head"><h1>Words</h1><p class="muted">A daily academic word list with spaced repetition, plus the linking words and collocations that lift Writing Task 2.</p></div>
      <div class="seg" role="group" aria-label="Section">${tabs.map(([k, l]) => `<button data-act="wordsTab" data-t="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div>`;
    if (tab === 'bank') return head + wordBankHtml(q, topic);
    if (tab === 'linking') return head + linkingHtml();
    if (tab === 'colloc') return head + collocHtml();
    return head + `<div id="flash-root">${flashHomeHtml()}</div>`;
  },
  mount({ tab = 'review', start }) { if (tab === 'review' && start) ACT.flashStart(); },
};
ACT.wordsTab = (el) => go('words', { tab: el.dataset.t });

function vocabStats() {
  const cards = Object.values(SRS.cards);
  return { learned: cards.length, mature: cards.filter((c) => c.ivl >= 21).length, due: dueWords().length, fresh: newWordsToday().length, total: VOCAB_ORDER.length };
}
function flashHomeHtml() {
  const s = vocabStats();
  const todays = newWordsToday();
  return `<div class="card hero"><div class="row-between"><div><div class="eyebrow">Today</div><h2>${s.fresh} new · ${s.due} due for review</h2></div>
      <button class="btn" data-act="flashStart" ${s.fresh + s.due ? '' : 'disabled'}>${s.fresh + s.due ? 'Start session' : 'All done for today'}</button></div>
      <div class="progress"><i style="width:${s.total ? (s.learned / s.total) * 100 : 0}%"></i></div>
      <div class="small muted">${s.learned} of ${s.total} words started · ${s.mature} known well (next review 3+ weeks away)</div>
      ${todays.length ? `<div class="small"><b>Today’s new words:</b> ${todays.map((w) => esc(w.w)).join(', ')}</div>` : ''}</div>
    <p class="small muted">Grade each card honestly. <b>Again</b> brings it back in this session; <b>Hard</b>, <b>Good</b> and <b>Easy</b> space the next review further apart.</p>`;
}
ACT.flashStart = () => {
  const due = dueWords().map((w) => ({ w, isNew: false }));
  const fresh = newWordsToday().map((v) => ({ w: v.w, isNew: true }));
  // New words first (to learn), then reviews, interleaved a little.
  const queue = [...fresh, ...due].filter((x) => wordData(x.w));
  if (!queue.length) { toast('Nothing due right now.'); return; }
  RUN = {
    kind: 'vocab', queue, idx: 0, shown: false, reviewed: 0,
    dirty: () => false, cleanup() { if (this.reviewed) { completeTask('vocab'); save(); } }, keepAlive: () => true,
  };
  paintFlash();
};
function paintFlash() {
  const R = RUN; const root = $('#flash-root'); if (!root || !R || R.kind !== 'vocab') return;
  if (R.idx >= R.queue.length) {
    completeTask('vocab'); save();
    RUN = null;
    root.innerHTML = `<div class="card hero"><h2>Session complete</h2><p class="muted">${R.reviewed} cards reviewed. Come back tomorrow for the next set; reviews are spaced so you see each word just before you would forget it.</p><div class="btn-row"><button class="btn" data-act="nav" data-to="today">Back to today</button></div></div>`;
    return;
  }
  const item = R.queue[R.idx]; const v = wordData(item.w);
  const card = SRS.cards[v.w];
  const arOn = S.profile.autoArabic ? 'show-ar' : '';
  root.innerHTML = `<div class="card hero flash ${arOn}" data-ar-scope="1">
      <div class="row-between"><span class="xs faint mono">${R.idx + 1} / ${R.queue.length}</span>${item.isNew ? '<span class="pill accent">New word</span>' : '<span class="pill">Review</span>'}</div>
      <div><div class="flash-word">${esc(v.w)}</div><div class="flash-pos">${esc(v.pos)}${v.fam ? ` · ${esc(v.fam)}` : ''}</div></div>
      ${R.shown || item.isNew ? `<div class="stack">
          <p><b>${esc(v.def)}</b></p>
          <p class="essay-view" style="font-size:1.05rem"><i>${esc(v.ex)}</i></p>
          <div class="chips">${(v.col || []).map((c) => `<span class="pill">${esc(c)}</span>`).join('')}</div>
          <div class="row-between"><span class="xs faint">${esc(v.topic)} · level ${v.lvl}</span><button class="btn ghost small ar-btn" data-act="toggleAr">عربي</button></div>
          <div class="ar ar-inline ar-box" lang="ar">${esc(v.ar)}</div>
        </div>
        <div class="grade-row">${[0, 1, 2, 3].map((q) => `<button class="btn ${q === 2 ? '' : 'ghost'}" data-act="flashGrade" data-q="${q}">${SRS_LABEL[q]}<small>${fmtIvl(srsPreview(card, q))}</small></button>`).join('')}</div>`
    : `<p class="muted">Say the meaning and use it in a sentence, then check.</p><div><button class="btn" data-act="flashShow">Show answer</button></div>`}
    </div>`;
}
ACT.flashShow = () => { RUN.shown = true; paintFlash(); };
ACT.flashGrade = (el) => {
  const R = RUN; if (!R || R.kind !== 'vocab') return;
  const q = +el.dataset.q; const item = R.queue[R.idx];
  if (item.isNew) {
    const pos = VOCAB_ORDER.findIndex((v) => v.w === item.w);
    if (S.vocab.newDate !== today()) { S.vocab.newDate = today(); S.vocab.newCount = 0; }
    S.vocab.newCount++;
    if (pos >= S.vocab.cursor) S.vocab.cursor = pos + 1;
    item.isNew = false;
  }
  srsGrade(item.w, q);
  R.reviewed++;
  if (q === 0) R.queue.splice(Math.min(R.idx + 4, R.queue.length), 0, { w: item.w, isNew: false });
  R.idx++; R.shown = false;
  saveSrs(); save({ cloud: false });
  paintFlash();
};

function wordBankHtml(q, topic) {
  const topics = ['', 'general', 'technology', 'work', 'economy', 'education', 'society', 'health', 'science', 'environment'];
  const ql = q.toLowerCase();
  const list = VOCAB_ORDER.filter((v) => (!topic || v.topic === topic) && (!ql || v.w.toLowerCase().includes(ql) || v.def.toLowerCase().includes(ql) || v.ar.includes(q)));
  const status = (w) => { const c = SRS.cards[w]; if (!c) return '<span class="pill">New</span>'; if (c.ivl >= 21) return '<span class="pill good">Known</span>'; return `<span class="pill accent">Next ${esc(fmtDate(c.due, { day: 'numeric', month: 'short' }))}</span>`; };
  return `<div class="card"><div class="row"><input class="input grow" id="wb-q" placeholder="Search a word, a meaning or Arabic" value="${esc(q)}" data-ch="wbSearch" style="min-width:200px"><select class="input" id="wb-topic" data-ch="wbTopic" style="width:auto">${topics.map((t) => `<option value="${t}" ${t === topic ? 'selected' : ''}>${t ? t[0].toUpperCase() + t.slice(1) : 'All topics'}</option>`).join('')}</select></div>
    <div class="small muted">${list.length} words</div>
    <div class="word-list" data-ar-scope="1" id="wb-list">${list.slice(0, 120).map((v) => `<details class="word-item"><summary class="row-between" style="list-style:none"><span><b>${esc(v.w)}</b> <span class="faint small">${esc(v.pos)}</span></span>${status(v.w)}</summary>
      <div class="stack" style="gap:6px;padding-top:6px"><div>${esc(v.def)}</div><div class="small"><i>${esc(v.ex)}</i></div><div class="chips">${(v.col || []).map((c) => `<span class="pill">${esc(c)}</span>`).join('')}</div><div class="ar small" lang="ar">${esc(v.ar)}</div></div></details>`).join('')}
    ${list.length > 120 ? `<p class="small muted">Showing the first 120. Search to narrow the list.</p>` : ''}</div></div>`;
}
const wbRerender = debounce(() => {
  const q = $('#wb-q')?.value || ''; const topic = $('#wb-topic')?.value || '';
  ROUTE.params = { tab: 'bank', q, topic };
  const list = $('#wb-list'); if (!list) return;
  const tmp = document.createElement('div'); tmp.innerHTML = wordBankHtml(q, topic);
  list.replaceWith(tmp.querySelector('#wb-list'));
  const count = $('#wb-list')?.previousElementSibling; if (count) count.textContent = tmp.querySelector('.small.muted').textContent;
}, 200);
CHG.wbSearch = () => wbRerender();
CHG.wbTopic = () => wbRerender();

function linkingHtml() {
  const arOn = S.profile.autoArabic ? 'show-ar' : '';
  return `<div class="card ${arOn}" data-ar-scope="1"><div class="row-between"><p class="small muted">Use linking words to show the logic between ideas, not to decorate every sentence. Examiners mark mechanical over-use down in Coherence and Cohesion.</p><button class="btn ghost small ar-btn" data-act="toggleAr">عربي · Arabic</button></div>
    ${CONTENT.linking.linking.map((g) => `<details class="stack"><summary>${esc(g.function)} <span class="faint small">· ${g.items.length}</span></summary>
      ${g.items.map((it) => `<div class="mistake"><b>${esc(it.phrase)}</b><div class="small muted">${esc(it.use)}</div><div class="small"><i>${esc(it.ex)}</i></div>${it.note ? `<div class="xs" style="color:var(--warn)">${esc(it.note)}</div>` : ''}<div class="ar ar-inline small" lang="ar">${esc(it.ar)}</div></div>`).join('')}</details>`).join('<hr class="divider">')}</div>`;
}
function collocHtml() {
  const arOn = S.profile.autoArabic ? 'show-ar' : '';
  return `<div class="card ${arOn}" data-ar-scope="1"><div class="row-between"><p class="small muted">Natural word partnerships score higher for Lexical Resource than single advanced words.</p><button class="btn ghost small ar-btn" data-act="toggleAr">عربي · Arabic</button></div>
    ${CONTENT.linking.collocations.map((g) => `<details><summary>${esc(g.topic[0].toUpperCase() + g.topic.slice(1))} <span class="faint small">· ${g.items.length}</span></summary>
      ${g.items.map((it) => `<div class="mistake"><b>${esc(it.c)}</b><div class="small"><i>${esc(it.ex)}</i></div><div class="ar ar-inline small" lang="ar">${esc(it.ar)}</div></div>`).join('')}</details>`).join('<hr class="divider">')}</div>`;
}

/* ---------- Grammar repair ---------- */
VIEWS.grammar = {
  html() {
    return `<div class="page-head">${backBtn('practice', 'Practice')}<h1>Grammar repair</h1><p class="muted">Fourteen lessons on the errors that most often keep Arabic speakers at 6.0 in Writing and Speaking. Each has an Arabic explanation and a 5-question check.</p></div>
      <div class="card">${CONTENT.grammar.map((g) => { const r = S.grammar[g.id]; return `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(g.title)}</div><div class="small muted">${g.forSkill === 'writing' ? 'Writing' : 'Writing and Speaking'}</div></div>
        <div class="stack" style="justify-items:end;gap:6px">${r ? `<span class="pill ${r.score === r.total ? 'good' : r.score >= r.total - 1 ? 'accent' : 'warn'}">${r.score}/${r.total}</span>` : '<span class="pill">Not done</span>'}<button class="btn small ghost" data-act="openGrammar" data-id="${g.id}">${r ? 'Review' : 'Start'}</button></div></div>`; }).join('')}</div>`;
  },
};
ACT.openGrammar = (el) => go('grammarRun', { id: el.dataset.id });
VIEWS.grammarRun = {
  study: true,
  html({ id }) {
    const g = CONTENT.grammar.find((x) => x.id === id) || CONTENT.grammar[0];
    RUN = { kind: 'grammar', g, picks: {}, dirty: () => false, keepAlive: () => true };
    const arOn = S.profile.autoArabic ? 'show-ar' : '';
    return `${backBtn('grammar', 'Grammar')}
      <div class="page-head"><div class="eyebrow">Grammar repair · ${g.forSkill === 'writing' ? 'Writing' : 'Writing and Speaking'}</div><h1>${esc(g.title)}</h1><p class="muted">${esc(g.why)}</p></div>
      <div class="card ${arOn}" data-ar-scope="1"><div class="row-between"><h2>The rule</h2><button class="btn ghost small ar-btn" data-act="toggleAr" aria-pressed="${!!arOn}">شرح بالعربية</button></div>
        <ul class="ticks">${g.rule.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        <div class="ar ar-inline ar-box" lang="ar">${esc(g.ar)}</div></div>
      <div class="card"><h2>Examples</h2>${g.examples.map((e) => `<div class="mistake"><div><span class="m-wrong">${esc(e.wrong)}</span></div><div><span class="m-right">${esc(e.right)}</span></div>${e.note ? `<div class="small muted">${esc(e.note)}</div>` : ''}</div>`).join('')}</div>
      <div class="card" id="g-ex">${grammarExerciseHtml()}</div>`;
  },
};
function grammarExerciseHtml() {
  const R = RUN; const g = R.g;
  const answered = Object.keys(R.picks).length;
  const score = Object.entries(R.picks).filter(([i, p]) => g.exercise[i].answer === p).length;
  return `<div class="row-between"><h2>Check yourself</h2><span class="mono small">${score}/${answered} correct</span></div>
    ${g.exercise.map((x, i) => {
    const p = R.picks[i];
    return `<div class="q ${p == null ? '' : p === x.answer ? 'right' : 'wrong'}"><div class="qn">${i + 1}</div><div class="q-body"><div>${esc(x.q)}</div>
        <div class="radio-list">${x.options.map((o, j) => `<label><input type="radio" name="gx-${i}" data-ch="gpick" data-i="${i}" value="${j}" ${p === j ? 'checked' : ''} ${p != null ? 'disabled' : ''}><span>${esc(o)}</span></label>`).join('')}</div>
        ${p != null ? `<div class="feedback" data-ar-scope="1"><div>${p === x.answer ? '<span class="ans-right">Correct.</span>' : `<span class="ans-wrong">Not quite.</span> Answer: <b>${esc(x.options[x.answer])}</b>`}</div><div class="muted">${esc(x.explain)}</div><button class="btn quiet small ar-btn" data-act="toggleAr" style="justify-self:start">عربي</button><div class="ar ar-inline" lang="ar">${esc(x.explainAr)}</div></div>` : ''}
      </div></div>`;
  }).join('')}
    ${answered === g.exercise.length ? `<div class="note">Saved: ${score}/${g.exercise.length}. ${score < g.exercise.length ? 'Re-read the rule and the examples for the ones you missed.' : 'Well done. Now look for this error in your next essay.'}</div><div class="btn-row"><button class="btn" data-act="nav" data-to="today">Back to today</button><button class="btn ghost" data-act="gReset">Try again</button></div>` : ''}`;
}
CHG.gpick = (el) => {
  const R = RUN; if (!R || R.kind !== 'grammar' || el.type !== 'radio' || !el.checked) return;
  const i = +el.dataset.i; if (R.picks[i] != null) return;
  R.picks[i] = +el.value;
  const g = R.g;
  if (Object.keys(R.picks).length === g.exercise.length) {
    const score = Object.entries(R.picks).filter(([k, p]) => g.exercise[k].answer === p).length;
    S.grammar[g.id] = { score, total: g.exercise.length, date: today() };
    completeTask('grammar', g.id);
    save();
  }
  $('#g-ex').innerHTML = grammarExerciseHtml();
};
ACT.gReset = () => { RUN.picks = {}; $('#g-ex').innerHTML = grammarExerciseHtml(); };
