/* ---------- content lookup (bank + AI-generated) ---------- */
function genItems(kind) { return Object.values(DOCS).filter((d) => d.type === 'gen' && d.kind === kind).map((d) => d.item); }
function findReading(id) { return CONTENT.reading.find((x) => x.id === id) || genItems('reading').find((x) => x.id === id); }
function findListening(id) { return CONTENT.listening.find((x) => x.id === id) || genItems('listening').find((x) => x.id === id); }
const levelAdjust = (lv) => (lv === 1 ? -0.5 : 0);
const sectionAdjust = (s) => (s <= 2 ? -0.5 : 0);

/* ---------- Practice hub ---------- */
VIEWS.practice = {
  html() {
    const cnt = (k) => Object.keys(S.done).filter((x) => x.startsWith(k + ':')).length;
    const card = (to, title, skill, line, meta) => `<button class="hub-card" data-act="nav" data-to="${to}"><h3>${skillDot(skill)}${title}</h3><span class="small muted">${line}</span><span class="xs faint">${meta}</span></button>`;
    const pos = planPos(today());
    return `<div class="page-head"><h1>Practice</h1><p class="muted">Everything in your plan, available any time. Items you have not done yet come first.</p></div>
      <div class="grid-2">
        ${card('writing', 'Writing', 'W', 'Task 1 charts, processes and maps; Task 2 essays. Timed, graded on the four criteria.', `${cnt('task1')}/${CONTENT.task1.length} Task 1 · ${cnt('task2')}/${CONTENT.task2.filter((x) => !x.placement).length} Task 2 done`)}
        ${card('speaking', 'Speaking', 'S', 'Part 1 questions, Part 2 cue cards with 1-minute preparation, Part 3 discussion.', `${cnt('p1')} topics · ${cnt('p2')} cue cards done`)}
        ${card('reading', 'Reading', 'R', 'Academic passages with every IELTS question type and explanations.', `${cnt('reading')}/${CONTENT.reading.filter((x) => !x.placement).length} passages done`)}
        ${card('listening', 'Listening', 'L', 'Four section types read aloud in different accents, played once in exam mode.', `${cnt('listening')}/${CONTENT.listening.filter((x) => !x.placement).length} sections done`)}
        ${card('grammar', 'Grammar repair', 'G', 'The errors that most often hold Arabic speakers below 7, with Arabic explanations.', `${Object.keys(S.grammar).length}/${CONTENT.grammar.length} lessons done`)}
        ${card('mock', 'Mock exams', 'M', 'A full timed test once a week from week 4, split over two days.', pos.week >= 4 ? `${Object.values(S.mocks).filter((m) => m.overall != null).length} completed` : `Opens in week 4 (${esc(fmtDate(weekStart(4)))})`)}
        ${card('journal', 'Error log', 'G', 'Every graded essay and speaking session, with your mistakes and corrections.', `${S.journal.length} graded attempts`)}
      </div>`;
  },
};

/* ---------- lists ---------- */
function statusPill(kind, id) {
  const d = S.done[`${kind}:${id}`];
  if (!d) return '<span class="pill">Not done</span>';
  const band = d.band != null ? ` · ${fmtBand(d.band)}` : '';
  return `<span class="pill ${d.band >= S.profile.target ? 'good' : d.band >= S.profile.minTarget ? 'accent' : 'warn'}">${d.score != null ? `${d.score}/${d.total}` : 'Done'}${band}</span>`;
}
VIEWS.reading = {
  html({ level = 0 }) {
    const items = [...CONTENT.reading.filter((x) => !x.placement), ...genItems('reading')].filter((x) => !level || x.level === level)
      .sort((a, b) => (isDone('reading', a.id) - isDone('reading', b.id)) || a.level - b.level);
    const types = (it) => [...new Set(it.groups.map((g) => QTYPES[g.type]?.label || g.type))].join(' · ');
    return `<div class="page-head">${backBtn('practice', 'Practice')}<h1>Reading</h1><p class="muted">Allow 20 minutes per passage, as in the exam (60 minutes for three). Passage levels follow the exam: 1 is the most factual, 3 the most abstract.</p></div>
      <div class="seg" role="group" aria-label="Filter by level">${[0, 1, 2, 3].map((l) => `<button data-act="readLevel" data-l="${l}" aria-pressed="${l === level}">${l ? `Passage ${l}` : 'All'}</button>`).join('')}</div>
      <div class="card">${items.map((it) => `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(it.title)}</div><div class="small muted">Passage ${it.level} level · ${esc(it.topic)}${it.generated ? ' · made by Claude' : ''}</div><div class="xs faint">${esc(types(it))}</div></div>
        <div class="stack" style="justify-items:end;gap:6px">${statusPill('reading', it.id)}<button class="btn small ghost" data-act="openReading" data-id="${it.id}">${isDone('reading', it.id) ? 'Redo' : 'Start'}</button></div></div>`).join('')}</div>
      ${genCard('reading')}`;
  },
};
ACT.readLevel = (el) => go('reading', { level: +el.dataset.l });
ACT.openReading = (el) => go('readingRun', { ids: [el.dataset.id] });

VIEWS.listening = {
  html({ section = 0 }) {
    const items = [...CONTENT.listening.filter((x) => !x.placement), ...genItems('listening')].filter((x) => !section || x.section === section)
      .sort((a, b) => (isDone('listening', a.id) - isDone('listening', b.id)) || a.section - b.section);
    const accents = (it) => [...new Set(Object.values(it.speakers || {}).filter((s) => s.role !== 'Narrator').map((s) => ACCENT_NAME[s.accent] || s.accent))].join(', ');
    return `<div class="page-head">${backBtn('practice', 'Practice')}<h1>Listening</h1><p class="muted">Scripts are read by your device’s voices in different accents. Exam mode plays each recording once, like the real test.</p></div>
      ${!TTS.ok ? '<div class="note warn">This browser cannot play speech. You can still read the transcript after answering, but use Chrome, Safari or Edge for real listening practice.</div>' : ''}
      <div class="seg" role="group" aria-label="Filter by section">${[0, 1, 2, 3, 4].map((l) => `<button data-act="listenSec" data-l="${l}" aria-pressed="${l === section}">${l ? `Section ${l}` : 'All'}</button>`).join('')}</div>
      <div class="card">${items.map((it) => `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(it.title)}</div><div class="small muted">Section ${it.section} · ${esc(accents(it))} accent${accents(it).includes(',') ? 's' : ''}${it.generated ? ' · made by Claude' : ''}</div></div>
        <div class="stack" style="justify-items:end;gap:6px">${statusPill('listening', it.id)}<button class="btn small ghost" data-act="openListening" data-id="${it.id}">${isDone('listening', it.id) ? 'Redo' : 'Start'}</button></div></div>`).join('')}</div>
      ${genCard('listening')}`;
  },
};
ACT.listenSec = (el) => go('listening', { section: +el.dataset.l });
ACT.openListening = (el) => go('listeningRun', { ids: [el.dataset.id] });

/* ---------- AI-generated practice items ---------- */
function genCard(kind) {
  if (AI.state !== 'ready') return `<div class="card flat"><h2>Need more ${kind === 'reading' ? 'passages' : 'recordings'}?</h2>${aiStatusNote()}</div>`;
  const topics = ['technology', 'education', 'work', 'science', 'environment', 'health', 'society', 'history', 'business'];
  return `<div class="card flat"><h2>Make a new ${kind === 'reading' ? 'passage' : 'listening section'} with Claude</h2>
    <p class="small muted">Claude writes an original ${kind === 'reading' ? 'passage with 13 questions' : 'script with 10 questions'} in IELTS format. It takes about a minute. Answer keys are checked automatically for structure, but treat AI-made keys with a little more caution than the built-in set.</p>
    <div class="row">${kind === 'reading'
    ? `<select class="input" id="gen-level" style="width:auto"><option value="1">Passage 1 level</option><option value="2" selected>Passage 2 level</option><option value="3">Passage 3 level</option></select><select class="input" id="gen-topic" style="width:auto">${topics.map((t) => `<option>${t}</option>`).join('')}</select>`
    : `<select class="input" id="gen-section" style="width:auto">${[1, 2, 3, 4].map((s) => `<option value="${s}" ${s === 3 ? 'selected' : ''}>Section ${s}</option>`).join('')}</select>`}
    <button class="btn" data-act="genItem" data-kind="${kind}">Generate</button></div>
    <div id="gen-out"></div></div>`;
}
let GEN_CTL = null;
ACT.genItem = async (el) => {
  const kind = el.dataset.kind; const out = $('#gen-out');
  const args = kind === 'reading' ? { level: +$('#gen-level').value, topic: $('#gen-topic').value } : { section: +$('#gen-section').value };
  el.disabled = true;
  GEN_CTL = new AbortController();
  out.innerHTML = `<div class="ai-wait"><span class="spinner"></span>Claude is writing your ${kind === 'reading' ? 'passage' : 'script'}… <button class="btn quiet small" data-act="genStop">Stop</button></div><div class="stream-box" id="gen-stream"></div>`;
  try {
    const item = await aiJson(kind === 'reading' ? genReadingPrompt(args) : genListeningPrompt(args), {
      tier: 'default', cache: false, signal: GEN_CTL.signal,
      onText: ({ text }) => { const s = $('#gen-stream'); if (s) s.textContent = text.slice(-600); },
    });
    const problems = checkGenerated(item, kind);
    if (problems.length) throw { code: 'bad_item', problems };
    const id = `g${kind[0]}${uid()}`;
    item.id = id; item.generated = true;
    if (kind === 'reading') { item.level = args.level; item.topic = item.topic || args.topic; }
    else { item.section = args.section; item.speakers = item.speakers || { N: { role: 'Narrator', accent: 'en-GB', voice: 'female' } }; }
    saveDoc(id, { type: 'gen', kind, item, date: today() });
    S.gen.push({ id, kind, title: item.title, date: today() });
    save();
    toast('New practice item ready');
    go(kind === 'reading' ? 'readingRun' : 'listeningRun', { ids: [id] });
  } catch (e) {
    el.disabled = false;
    out.innerHTML = `<div class="note warn">${e?.code === 'bad_item' ? `The generated item failed the format check (${esc(e.problems.slice(0, 3).join('; '))}). Tap Generate to try again.` : esc(aiErrorText(e))}</div>`;
  }
};
ACT.genStop = () => { if (GEN_CTL) GEN_CTL.abort(); };

/* ---------- Reading run (1 passage, or 3 in a mock) ---------- */
VIEWS.readingRun = {
  study: true,
  html({ ids, placement, mockWeek }) {
    const items = ids.map(findReading).filter(Boolean);
    if (!items.length) return `<div class="empty">This passage is no longer available. ${backBtn('reading', 'Back to reading')}</div>`;
    const quiz = makeQuiz(items);
    const minutes = mockWeek ? 60 : placement ? 15 : 20;
    RUN = {
      kind: 'reading', items, quiz, placement, mockWeek, pi: 0, pane: 'passage',
      timer: new Countdown(minutes * 60, { id: 'run-timer', onEnd: () => toast('Time is up. Finish your answers and submit.') }),
      dirty: () => !quiz.submitted && answeredCount(quiz) > 0,
      cleanup() { this.timer.stop(); },
      keepAlive: () => RUN && RUN.timer && RUN.timer.running,
    };
    const back = mockWeek ? backBtn('mockRun', 'Mock exam', { week: mockWeek }) : placement ? backBtn('placement', 'Placement test') : backBtn('reading', 'Reading');
    return `${back}
      <div class="run-bar">${timerHtml('run-timer', 'Reading timer')}<span class="small muted" id="answered">0/${quiz.total} answered</span><div class="grow"></div><button class="btn small" data-act="submitReading" id="submit-btn">Submit answers</button></div>
      <div class="pane-tabs only-narrow" role="group" aria-label="Show"><div class="seg"><button data-act="readPane" data-p="passage" aria-pressed="true">Passage</button><button data-act="readPane" data-p="questions" aria-pressed="false">Questions 1–${quiz.total}</button></div></div>
      <div class="split wide">
        <div class="pane" id="pane-passage">${readingPassagesHtml()}</div>
        <div class="pane" id="pane-questions"><div id="read-result"></div><div class="stack-lg" id="qpane">${quiz.parts.map((p) => `${items.length > 1 ? `<h2>Passage ${p.idx + 1}</h2>` : ''}${renderQuizPart(quiz, p)}`).join('')}</div>
          <div class="btn-row" style="margin-top:16px"><button class="btn" data-act="submitReading">Submit answers</button></div></div>
      </div>`;
  },
  mount() {
    if (!RUN) return;
    RUN.timer.paint(); RUN.timer.start();
    paneLayout();
    window.addEventListener('resize', paneLayout);
    const prev = RUN.cleanup; RUN.cleanup = function () { prev.call(this); window.removeEventListener('resize', paneLayout); };
  },
};
function readingPassagesHtml() {
  const { items, pi } = RUN;
  const tabs = items.length > 1 ? `<div class="seg" role="group" aria-label="Passage">${items.map((_, i) => `<button data-act="readPassage" data-i="${i}" aria-pressed="${i === pi}">Passage ${i + 1}</button>`).join('')}</div>` : '';
  const it = items[pi];
  return `<div class="card"><div class="stack">${tabs}${selTools('explain-out')}</div>
    <article class="passage" data-explain="1"><div class="eyebrow">Reading passage${items.length > 1 ? ` ${pi + 1}` : ''} · Questions ${RUN.quiz.parts[pi].offset + 1}–${RUN.quiz.parts[pi].offset + countQuestions(it)}</div><h2>${esc(it.title)}</h2>
    ${it.paragraphs.map((p) => `<div class="para"><span class="para-label">${esc(p.label)}</span><p>${esc(p.text)}</p></div>`).join('')}</article></div>`;
}
function paneLayout() {
  if (!RUN || !RUN.quiz) return;
  const wide = window.matchMedia('(min-width: 980px)').matches;
  const pp = $('#pane-passage'), pq = $('#pane-questions');
  if (!pp || !pq) return;
  pp.hidden = !wide && RUN.pane !== 'passage';
  pq.hidden = !wide && RUN.pane !== 'questions';
}
ACT.readPane = (el) => {
  RUN.pane = el.dataset.p;
  $$('[data-act="readPane"]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
  paneLayout(); window.scrollTo(0, 0);
};
ACT.readPassage = (el) => { RUN.pi = +el.dataset.i; $('#pane-passage').innerHTML = readingPassagesHtml(); };
ACT.qpick = (el) => { if (RUN && RUN.quiz) quizPick(RUN.quiz, el); };

ACT.submitReading = () => {
  const R = RUN; if (!R || R.quiz.submitted) return;
  const unanswered = R.quiz.total - answeredCount(R.quiz);
  const doIt = () => finishReading(R);
  if (unanswered > 0) confirmModal({ title: 'Submit now?', body: `${plural(unanswered, 'question')} still unanswered. In the exam a blank scores zero, so guess if you can.`, ok: 'Submit', cancel: 'Keep working', onOk: doIt });
  else doIt();
};
function finishReading(R) {
  const quiz = R.quiz;
  quiz.submitted = true; R.timer.stop();
  quiz.result = scoreQuiz(quiz);
  const { correct, total, byType } = quiz.result;
  const full = R.items.length >= 3;
  const adj = full ? 0 : levelAdjust(R.items[0].level);
  const band = rawToBand('R', correct, total, adj);
  const repeat = !R.placement && !R.mockWeek && R.items.some((it) => isDone('reading', it.id));
  recordQTypeStats(byType);
  if (R.placement) placementRecord('R', band, `${correct}/${total}`);
  else if (R.mockWeek) mockRecord(R.mockWeek, 'R', { correct, total, band });
  else {
    addScore({ skill: 'R', band, ref: R.items[0].id, raw: `${correct}/${total}`, label: `Reading: ${R.items[0].title}${repeat ? ' (repeat)' : ''}`, weight: repeat ? 0.3 : 0.6 });
    completeTask('read', R.items[0].id);
  }
  R.items.forEach((it) => { if (!R.placement) S.done[`reading:${it.id}`] = { date: today(), score: correct, total, band }; });
  save();
  $('#qpane').innerHTML = quiz.parts.map((p) => `${R.items.length > 1 ? `<h2>Passage ${p.idx + 1}</h2>` : ''}${renderQuizPart(quiz, p)}`).join('');
  $$('#submit-btn, [data-act="submitReading"]').forEach((b) => { b.disabled = true; });
  const used = Math.round(R.timer.elapsed / 60);
  $('#read-result').innerHTML = `<div class="card hero" style="margin-bottom:16px">
    <div class="eyebrow">Result</div>
    <div class="score-hero"><div class="big-band">${correct}<small>/${total}</small></div><div><div class="mono" style="font-size:1.5rem">≈ ${fmtBand(band)}</div><div class="xs faint">estimated band${adj ? ' (−0.5 for an easier Passage 1 text)' : ''}</div></div></div>
    <p class="small muted">Time used: ${used} min. ${full ? 'Full-paper conversion.' : 'One passage is a small sample, so treat this band as a guide; a full 40-question paper is more reliable.'}${repeat ? ' You have done this passage before, so this attempt counts very little towards your estimate.' : ''}</p>
    ${byTypeHtml(byType)}
    <div class="btn-row">${R.placement ? '<button class="btn" data-act="nav" data-to="placement">Back to the placement test</button>' : R.mockWeek ? `<button class="btn" data-act="toMock" data-w="${R.mockWeek}">Back to the mock exam</button>` : '<button class="btn" data-act="nav" data-to="today">Back to today</button><button class="btn ghost" data-act="nav" data-to="reading">More reading</button>'}</div>
  </div>`;
  if (!window.matchMedia('(min-width: 980px)').matches) { R.pane = 'questions'; $$('[data-act="readPane"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === 'questions'))); paneLayout(); }
  window.scrollTo(0, 0);
}

/* ---------- Listening run (1 section, or 4 in a mock) ---------- */
VIEWS.listeningRun = {
  study: true,
  html({ ids, placement, mockWeek }) {
    const items = ids.map(findListening).filter(Boolean);
    if (!items.length) return `<div class="empty">This recording is no longer available. ${backBtn('listening', 'Back to listening')}</div>`;
    const quiz = makeQuiz(items);
    RUN = {
      kind: 'listening', items, quiz, placement, mockWeek, si: 0, exam: true, started: false, player: null,
      dirty: () => !quiz.submitted && (answeredCount(quiz) > 0 || RUN.started),
      cleanup() { if (this.player) this.player.stop(); },
      keepAlive: () => RUN && RUN.player && RUN.player.state === 'playing',
    };
    const back = mockWeek ? backBtn('mockRun', 'Mock exam', { week: mockWeek }) : placement ? backBtn('placement', 'Placement test') : backBtn('listening', 'Listening');
    return `${back}
      <div class="run-bar"><b class="grow" style="min-width:0">${items.length > 1 ? 'Listening test · 4 sections' : `Section ${items[0].section}: ${esc(items[0].title)}`}</b><span class="small muted" id="answered">0/${quiz.total} answered</span><button class="btn small" data-act="submitListening">Submit answers</button></div>
      <div class="card player" id="player"></div>
      <div id="listen-result"></div>
      <div class="card"><div class="stack-lg" id="qpane">${quiz.parts.map((p) => `${items.length > 1 ? `<h2>Section ${p.idx + 1}</h2>` : ''}${renderQuizPart(quiz, p)}`).join('')}</div>
        <div class="btn-row"><button class="btn" data-act="submitListening">Submit answers</button></div></div>
      <div id="transcript"></div>`;
  },
  mount() { renderPlayer(); },
};
function renderPlayer() {
  const R = RUN; const box = $('#player'); if (!box) return;
  const sec = R.items[R.si];
  if (!R.player || R.player.sec !== sec) {
    if (R.player) R.player.stop();
    R.player = new ScriptPlayer(sec, {
      rate: R.exam ? 1 : S.profile.ttsRate,
      onLine: (item, idx, c) => { const n = $('#now'); if (n) n.textContent = `${c.role || ''}${c.role ? ': ' : ''}${item.t}`; const cd = $('#countdown'); if (cd) cd.textContent = ''; },
      onPause: (left, label) => { const cd = $('#countdown'); if (cd) cd.textContent = `${label} · ${left}s`; const n = $('#now'); if (n) n.textContent = ''; },
      onState: () => paintControls(),
      onEnd: () => {
        if (R.si < R.items.length - 1) { R.si++; R.player = null; renderPlayer(); setTimeout(() => { if (RUN === R) R.player.play(0); }, 1500); }
        else { const n = $('#now'); if (n) n.textContent = 'The recording has finished. Check your answers, then submit.'; }
      },
    });
  }
  const cast = R.player.castList();
  const missing = cast.filter((c) => !c.exact);
  box.innerHTML = `<div class="row-between"><div><div class="eyebrow">${R.items.length > 1 ? `Section ${R.si + 1} of ${R.items.length}` : `Section ${sec.section}`}</div><b>${esc(sec.title)}</b></div>
      ${R.mockWeek || R.placement ? '<span class="pill accent">Exam mode · plays once</span>' : `<div class="seg" role="group" aria-label="Mode"><button data-act="listenMode" data-m="exam" aria-pressed="${R.exam}">Exam: once</button><button data-act="listenMode" data-m="practice" aria-pressed="${!R.exam}">Practice: replay</button></div>`}</div>
    <div class="btn-row" id="controls"></div>
    <div class="countdown" id="countdown" aria-live="polite"></div>
    <div class="player-now" id="now">${TTS.ok ? 'Press Play when you are ready. You will get reading time before each group of questions.' : 'Speech playback is not available in this browser.'}</div>
    <details><summary class="small">Voices and accents</summary><div class="cast">${cast.map((c) => `<span>${esc(c.role)}: ${esc(c.accent)} accent · <span class="faint">${esc(c.voice)}${c.exact ? '' : ' (that accent is not installed; using a substitute)'}</span></span>`).join('')}</div>
      ${missing.length ? '<p class="xs faint">Install more English voices in your phone or computer settings (Accessibility › Spoken content, or Language & speech) to hear every accent.</p>' : ''}</details>`;
  paintControls();
}
function paintControls() {
  const R = RUN; const el = $('#controls'); if (!el || !R || !R.player) return;
  const st = R.player.state;
  if (!TTS.ok) { el.innerHTML = '<span class="small muted">Answer what you can, submit, then read the transcript.</span>'; return; }
  if (R.exam) {
    el.innerHTML = st === 'idle' && !R.started ? `<button class="btn" data-act="listenPlay">${ICONS.play}Play recording</button>`
      : st === 'playing' ? `<span class="row small muted"><span class="rec-dot" style="background:var(--accent)"></span>Playing · no pausing in exam mode</span><button class="btn quiet small" data-act="listenSkip">Skip reading time</button>`
        : '<span class="small muted">Played once.</span>';
  } else {
    el.innerHTML = `${st === 'playing' ? `<button class="btn" data-act="listenPause">${ICONS.pause}Pause</button>` : `<button class="btn" data-act="listenPlay">${ICONS.play}${st === 'paused' ? 'Resume' : 'Play'}</button>`}
      <button class="btn ghost" data-act="listenRestart">${ICONS.stop}Restart</button><button class="btn quiet small" data-act="listenSkip">Skip reading time</button>`;
  }
}
ACT.listenPlay = () => {
  const R = RUN; if (!R || !R.player) return;
  if (R.exam && R.started && R.player.state !== 'paused') return;
  R.started = true;
  if (R.player.state === 'paused') R.player.resume(); else R.player.play(0);
};
ACT.listenPause = () => RUN && RUN.player && RUN.player.pause();
ACT.listenRestart = () => { if (RUN && RUN.player) { RUN.player.stop(); RUN.player.play(0); } };
ACT.listenSkip = () => RUN && RUN.player && RUN.player.skipPause();
ACT.listenMode = (el) => {
  const R = RUN; if (!R) return;
  if (R.started && el.dataset.m === 'exam') { toast('Exam mode only works before you start playing.'); return; }
  R.exam = el.dataset.m === 'exam';
  if (R.player) { R.player.stop(); R.player = null; }
  renderPlayer();
};
ACT.submitListening = () => {
  const R = RUN; if (!R || R.quiz.submitted) return;
  const unanswered = R.quiz.total - answeredCount(R.quiz);
  const playing = R.player && R.player.state === 'playing';
  const doIt = () => finishListening(R);
  if (unanswered > 0 || playing) confirmModal({ title: 'Submit now?', body: `${playing ? 'The recording is still playing. ' : ''}${unanswered ? `${plural(unanswered, 'question')} unanswered.` : ''}`, ok: 'Submit', cancel: 'Keep listening', onOk: doIt });
  else doIt();
};
function finishListening(R) {
  const quiz = R.quiz;
  if (R.player) R.player.stop();
  quiz.submitted = true;
  quiz.result = scoreQuiz(quiz);
  const { correct, total, byType } = quiz.result;
  const full = R.items.length >= 4;
  const adj = full ? 0 : sectionAdjust(R.items[0].section);
  const band = rawToBand('L', correct, total, adj);
  const repeat = !R.placement && !R.mockWeek && R.items.some((it) => isDone('listening', it.id));
  const practiceMode = !R.exam && !R.placement && !R.mockWeek;
  recordQTypeStats(byType);
  if (R.placement) placementRecord('L', band, `${correct}/${total}`);
  else if (R.mockWeek) mockRecord(R.mockWeek, 'L', { correct, total, band });
  else {
    addScore({ skill: 'L', band, ref: R.items[0].id, raw: `${correct}/${total}`, label: `Listening S${R.items[0].section}: ${R.items[0].title}${repeat ? ' (repeat)' : ''}${practiceMode ? ' (replays allowed)' : ''}`, weight: repeat ? 0.3 : practiceMode ? 0.3 : 0.6 });
    completeTask('listen', R.items[0].id);
  }
  R.items.forEach((it) => { if (!R.placement) S.done[`listening:${it.id}`] = { date: today(), score: correct, total, band }; });
  save();
  $('#qpane').innerHTML = quiz.parts.map((p) => `${R.items.length > 1 ? `<h2>Section ${p.idx + 1}</h2>` : ''}${renderQuizPart(quiz, p)}`).join('');
  $$('[data-act="submitListening"]').forEach((b) => { b.disabled = true; });
  $('#player').hidden = true;
  $('#listen-result').innerHTML = `<div class="card hero">
    <div class="eyebrow">Result</div>
    <div class="score-hero"><div class="big-band">${correct}<small>/${total}</small></div><div><div class="mono" style="font-size:1.5rem">≈ ${fmtBand(band)}</div><div class="xs faint">estimated band${adj ? ' (−0.5 for an easier Section 1–2 recording)' : ''}</div></div></div>
    <p class="small muted">${practiceMode ? 'You used practice mode with replays, so this counts less towards your estimate. ' : ''}${full ? '' : 'One section is a small sample; a full 40-question test is more reliable. '}Read the transcript below and find where each answer was said.</p>
    ${byTypeHtml(byType)}
    <div class="btn-row">${R.placement ? '<button class="btn" data-act="nav" data-to="placement">Back to the placement test</button>' : R.mockWeek ? `<button class="btn" data-act="toMock" data-w="${R.mockWeek}">Back to the mock exam</button>` : '<button class="btn" data-act="nav" data-to="today">Back to today</button><button class="btn ghost" data-act="nav" data-to="listening">More listening</button>'}</div></div>`;
  $('#transcript').innerHTML = `<div class="card"><div class="row-between"><h2>Transcript</h2></div>${selTools('explain-tr')}
    ${R.items.map((it) => `<div class="transcript" data-explain="1">${R.items.length > 1 ? `<h3>Section ${it.section}</h3>` : ''}${it.script.map((l) => (l.pause != null ? `<div class="line"><span class="who">·</span><span class="faint">[${l.pause} seconds: ${esc(l.label || 'reading time')}]</span></div>` : `<div class="line"><span class="who">${esc(it.speakers[l.s]?.role || l.s)}</span><span>${esc(l.t)}</span></div>`)).join('')}</div>`).join('')}</div>`;
  window.scrollTo(0, 0);
}
