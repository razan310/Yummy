/* ---------- Speaking ---------- */
const findTopic = (id) => CONTENT.speaking.part1.find((x) => x.id === id);
const findCard = (id) => CONTENT.speaking.part2.find((x) => x.id === id);
const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
function defaultMethod() { return Rec.supported && !Rec.blocked ? 'speech' : isTouch() ? 'dictation' : 'typed'; }

VIEWS.speaking = {
  html({ tab = 'p2' }) {
    const p1 = CONTENT.speaking.part1.filter((x) => !x.placement);
    const p2 = CONTENT.speaking.part2.filter((x) => !x.placement);
    const list = tab === 'p1'
      ? p1.map((t) => `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(t.topic)}</div><div class="small muted">${plural(Math.min(5, t.questions.length), 'question')} · about 4 minutes</div></div><div class="stack" style="justify-items:end;gap:6px">${statusPill('p1', t.id)}<button class="btn small ghost" data-act="openSpeak" data-mode="p1" data-id="${t.id}">Start</button></div></div>`).join('')
      : p2.map((c) => `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(c.cue)}</div><div class="small muted">Part 2 + ${Math.min(4, c.part3.questions.length)} Part 3 questions on ${esc(c.part3.theme.toLowerCase())}</div></div><div class="stack" style="justify-items:end;gap:6px">${statusPill('p2', c.id)}<button class="btn small ghost" data-act="openSpeak" data-mode="p23" data-id="${c.id}">Start</button></div></div>`).join('');
    return `<div class="page-head">${backBtn('practice', 'Practice')}<h1>Speaking</h1><p class="muted">The examiner’s questions are read aloud. You answer with your microphone, or with your phone keyboard’s dictation if the microphone is blocked, and Claude grades the transcript on Fluency, Vocabulary and Grammar.</p></div>
      ${aiStatusNote()}
      <div class="card tint"><div class="row-between"><div><h2>Full speaking test</h2><p class="small muted">Part 1 (4 questions), Part 2 cue card with 1 minute to prepare and 2 minutes to talk, then Part 3 (4 questions). About 12 minutes.</p></div><button class="btn" data-act="openSpeak" data-mode="full">Start full test</button></div></div>
      <div class="seg" role="group" aria-label="Part"><button data-act="speakTab" data-t="p1" aria-pressed="${tab === 'p1'}">Part 1 topics</button><button data-act="speakTab" data-t="p2" aria-pressed="${tab === 'p2'}">Part 2 + 3 cue cards</button></div>
      <div class="card">${list}</div>`;
  },
};
ACT.speakTab = (el) => go('speaking', { tab: el.dataset.t });
ACT.openSpeak = (el) => go('speakingRun', { mode: el.dataset.mode, topic: el.dataset.mode === 'p1' ? el.dataset.id : undefined, card: el.dataset.mode === 'p23' ? el.dataset.id : undefined });

function buildSpeakSteps({ mode, topic, card, mockWeek }) {
  const unseen = (list, kind) => list.find((x) => !x.placement && !isDone(kind, x.id)) || pick(list.filter((x) => !x.placement));
  if (mode === 'placement') {
    const t = CONTENT.speaking.part1.find((x) => x.placement); const c = CONTENT.speaking.part2.find((x) => x.placement);
    return { steps: [...t.questions.slice(0, 3).map((q) => ({ part: 1, q })), { part: 2, card: c }], topic: t, card: c };
  }
  if (mode === 'p1') { const t = findTopic(topic) || unseen(CONTENT.speaking.part1, 'p1'); return { steps: t.questions.slice(0, 5).map((q) => ({ part: 1, q })), topic: t }; }
  if (mode === 'p23') { const c = findCard(card) || unseen(CONTENT.speaking.part2, 'p2'); return { steps: [{ part: 2, card: c }, ...c.part3.questions.slice(0, 4).map((q) => ({ part: 3, q }))], card: c }; }
  const t = (mockWeek && findTopic(S.mocks[mockWeek]?.content?.P1)) || unseen(CONTENT.speaking.part1, 'p1');
  const c = (mockWeek && findCard(S.mocks[mockWeek]?.content?.P2)) || unseen(CONTENT.speaking.part2, 'p2');
  return { steps: [...t.questions.slice(0, 4).map((q) => ({ part: 1, q })), { part: 2, card: c }, ...c.part3.questions.slice(0, 4).map((q) => ({ part: 3, q }))], topic: t, card: c };
}

VIEWS.speakingRun = {
  study: true,
  html(params) {
    const { steps, topic, card } = buildSpeakSteps(params);
    RUN = {
      kind: 'speaking', mode: params.mode, mockWeek: params.mockWeek, placement: params.mode === 'placement',
      steps, topic, card, i: -1, phase: 'intro', method: defaultMethod(), notes: '',
      answers: steps.map(() => ({ a: '', sec: 0, first: 0, last: 0 })),
      timer: null, recStart: 0, recording: false,
      dirty: () => RUN.i >= 0 && RUN.phase !== 'done',
      leaveText: 'Your answers in this speaking session will be lost.',
      cleanup() { if (this.timer) this.timer.stop(); if (this.recording) Rec.stop(); clearInterval(this.clock); if (this.ctl) this.ctl.abort(); TTS.stop(); },
      keepAlive: () => true,
    };
    const back = params.mockWeek ? backBtn('mockRun', 'Mock exam', { week: params.mockWeek }) : RUN.placement ? backBtn('placement', 'Placement test') : backBtn('speaking', 'Speaking');
    return `${back}<div class="steps" id="sp-steps" aria-hidden="true"></div><div id="sp-body" class="stack-lg"></div>`;
  },
  mount() { paintSpeak(); },
};

function paintSpeak() {
  const R = RUN; if (!R || R.kind !== 'speaking') return;
  const bar = $('#sp-steps');
  if (bar) bar.innerHTML = R.steps.map((_, i) => `<i class="${i < R.i ? 'done' : i === R.i ? 'on' : ''}"></i>`).join('');
  const body = $('#sp-body'); if (!body) return;
  if (R.phase === 'intro') body.innerHTML = speakIntroHtml();
  else if (R.phase === 'review') body.innerHTML = speakReviewHtml();
  else if (R.phase === 'grading' || R.phase === 'done') return;
  else body.innerHTML = speakStepHtml();
  const live = $('#sp-text'); if (live && R.phase !== 'intro') { live.focus({ preventScroll: true }); }
}

function methodSeg() {
  const R = RUN;
  const opts = [['speech', 'Microphone'], ['dictation', 'Phone dictation'], ['typed', 'Type']];
  return `<div class="seg" role="group" aria-label="How you answer">${opts.map(([k, l]) => `<button data-act="spMethod" data-m="${k}" aria-pressed="${R.method === k}" ${k === 'speech' && (!Rec.supported || Rec.blocked) ? 'disabled title="The microphone is not available here"' : ''}>${l}</button>`).join('')}</div>`;
}
const METHOD_HELP = {
  speech: 'Tap Start answer and speak. Your words appear as a live transcript. Do not stop to correct yourself on screen; just keep talking, as in the exam.',
  dictation: 'Tap in the answer box, then tap the microphone key on your phone keyboard and speak your answer aloud. Do not edit what it types. The timer measures how long you speak.',
  typed: 'Type what you would say. This is the weakest option: typing hides hesitation, so your estimate is less reliable and counts less.',
};
function speakIntroHtml() {
  const R = RUN;
  const parts = [...new Set(R.steps.map((s) => s.part))];
  return `<div class="card hero">
      <div class="eyebrow">Speaking · ${parts.map((p) => `Part ${p}`).join(', ')}</div>
      <h1>${R.mode === 'p1' ? esc(R.topic.topic) : R.mode === 'p23' ? 'Cue card and discussion' : R.placement ? 'Speaking sample' : 'Full speaking test'}</h1>
      <p class="muted">${plural(R.steps.length, 'question')}. ${parts.includes(2) ? 'For Part 2 you get 1 minute to prepare and up to 2 minutes to talk. ' : ''}Answer every question fully: in Part 1 give 2–4 sentences; in Part 3 give a reason and an example.</p>
      <div class="field"><span class="label">How you will answer</span>${methodSeg()}<p class="small muted" id="method-help">${METHOD_HELP[R.method]}</p></div>
      ${!Rec.supported ? '<p class="xs faint">This browser has no built-in speech recognition, so phone dictation or typing is used.</p>' : Rec.blocked ? '<p class="xs faint">The microphone was blocked for this page, so dictation or typing is used.</p>' : ''}
      <div class="btn-row"><button class="btn" data-act="spBegin">Begin</button></div></div>`;
}
ACT.spMethod = (el) => {
  const R = RUN; if (!R) return;
  R.method = el.dataset.m;
  $$('[data-act="spMethod"]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
  const h = $('#method-help'); if (h) h.textContent = METHOD_HELP[R.method];
  if (R.phase !== 'intro') paintSpeak();
};
function askQuestion() {
  const R = RUN; const st = R.steps[R.i];
  if (!S.profile.readQuestions || !TTS.ok) return;
  const text = st.part === 2 ? `Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. ${st.card.cue}` : st.q;
  TTS.speak(text, { accent: 'en-GB', gender: 'female', rate: 0.95 });
}
ACT.spBegin = () => { const R = RUN; R.i = 0; R.phase = R.steps[0].part === 2 ? 'cue' : 'q'; paintSpeak(); askQuestion(); };
ACT.spHear = () => askQuestion();

function speakStepHtml() {
  const R = RUN; const st = R.steps[R.i]; const ans = R.answers[R.i];
  const nPart = R.steps.filter((s) => s.part === st.part).length;
  const kPart = R.steps.slice(0, R.i + 1).filter((s) => s.part === st.part).length;
  const isLast = R.i === R.steps.length - 1;
  let examiner;
  if (st.part === 2) {
    const c = st.card;
    examiner = `<div class="cue-card"><div class="eyebrow">Part 2 · cue card</div><b>${esc(c.cue)}</b><div>You should say:</div><ul>${c.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul><div>${esc(c.finalBullet)}</div></div>`;
  } else {
    examiner = `<div class="examiner"><div class="row-between"><div class="eyebrow">Part ${st.part} · question ${kPart} of ${nPart}</div>${TTS.ok ? `<button class="btn quiet small" data-act="spHear">${ICONS.speaker}Hear again</button>` : ''}</div><div class="examiner-q">${esc(st.q)}</div></div>`;
  }
  let answer = '';
  if (st.part === 2 && R.phase === 'cue') {
    answer = `<div class="card"><p>You have one minute to prepare. You can make notes.</p><div class="btn-row"><button class="btn" data-act="spPrep">Start 1-minute preparation</button><button class="btn quiet" data-act="spTalk">Skip preparation</button></div></div>`;
  } else if (st.part === 2 && R.phase === 'prep') {
    answer = `<div class="card"><div class="row-between"><b>Preparation</b>${timerHtml('sp-timer', 'Preparation timer')}</div>
      <textarea class="input" id="sp-notes" data-ch="spNotes" rows="4" placeholder="Notes (key words only)">${esc(R.notes)}</textarea>
      <div class="btn-row"><button class="btn" data-act="spTalk">I’m ready to talk</button></div></div>`;
  } else {
    const guide = st.part === 1 ? 'Aim for 20–40 seconds.' : st.part === 2 ? 'Keep talking for the full 2 minutes; the examiner stops you at 2:00.' : 'Aim for 40–70 seconds: answer, reason, example.';
    const notes = st.part === 2 && R.notes ? `<div class="note small"><b>Your notes:</b> ${esc(R.notes)}</div>` : '';
    if (R.method === 'speech') {
      const recBtn = R.recording
        ? `<button class="btn danger" data-act="spStop">${ICONS.stop}Stop</button>`
        : `<button class="btn" data-act="spRecord" ${st.part === 2 && R.phase === 'talk-done' ? 'disabled' : ''}>${ICONS.mic}${ans.a ? 'Re-record' : st.part === 2 ? 'Start talking' : 'Start answer'}</button>`;
      answer = `<div class="card">${notes}<div class="row-between"><div class="row">${R.recording ? '<span class="rec-dot"></span><b>Recording</b>' : `<span class="small muted">${guide}</span>`}</div>${st.part === 2 ? timerHtml('sp-timer', 'Talk timer') : `<span class="mono" id="sp-clock">${fmtClock(ans.sec)}</span>`}</div>
        <div class="live-transcript" id="sp-live" aria-live="polite">${esc(ans.a) || '<span class="interim">Your words will appear here.</span>'}</div>
        <div class="btn-row">${recBtn}${!R.recording && ans.a ? `<button class="btn ghost" data-act="spNext">${isLast ? 'Finish' : 'Next question'}</button>` : ''}</div></div>`;
    } else {
      answer = `<div class="card">${notes}<div class="row-between"><span class="small muted">${guide}</span>${st.part === 2 ? timerHtml('sp-timer', 'Talk timer') : `<span class="mono" id="sp-clock">${fmtClock(ans.sec)}</span>`}</div>
        <textarea class="input" id="sp-text" data-ch="spText" rows="${st.part === 2 ? 9 : 5}" placeholder="${R.method === 'dictation' ? 'Tap here, then the microphone key on your keyboard, and speak' : 'Type your answer as you would say it'}" autocapitalize="sentences">${esc(ans.a)}</textarea>
        <div class="btn-row"><button class="btn" data-act="spNext" ${ans.a.trim() ? '' : 'disabled'} id="sp-next">${isLast ? 'Finish' : 'Next question'}</button></div>
        <p class="xs faint">${esc(METHOD_HELP[R.method])}</p></div>`;
    }
  }
  return `${examiner}${answer}<div class="row-between"><span class="xs faint">Answering by: ${R.method === 'speech' ? 'microphone' : R.method}</span><details><summary class="xs">Change</summary>${methodSeg()}</details></div>`;
}
CHG.spNotes = (el) => { if (RUN) RUN.notes = el.value; };
CHG.spText = (el) => {
  const R = RUN; if (!R || R.kind !== 'speaking') return;
  const ans = R.answers[R.i]; const now = Date.now();
  if (!ans.first) ans.first = now;
  ans.last = now; ans.a = el.value;
  ans.sec = Math.max(ans.sec, (ans.last - ans.first) / 1000 + 2);
  const c = $('#sp-clock'); if (c) c.textContent = fmtClock(ans.sec);
  const n = $('#sp-next'); if (n) n.disabled = !el.value.trim();
  const st = R.steps[R.i];
  if (st.part === 2 && R.timer && !R.timer.running && !R.timer.ended) R.timer.start();
};
ACT.spPrep = () => {
  const R = RUN; R.phase = 'prep';
  R.timer = new Countdown(60, { id: 'sp-timer', onEnd: () => { toast('Preparation time is over. Start talking.'); ACT.spTalk(); } });
  paintSpeak(); R.timer.paint(); R.timer.start();
};
ACT.spTalk = () => {
  const R = RUN; if (!R) return;
  if (R.timer) R.timer.stop();
  R.phase = 'talk';
  R.timer = new Countdown(120, { id: 'sp-timer', onEnd: () => { toast('Two minutes. The examiner stops you here.'); if (R.recording) ACT.spStop(); R.phase = 'talk-done'; paintSpeak(); } });
  paintSpeak(); R.timer.paint();
  if (R.method === 'speech') ACT.spRecord();
};
ACT.spRecord = () => {
  const R = RUN; if (!R) return;
  TTS.stop();
  const ans = R.answers[R.i];
  const st = R.steps[R.i];
  ans.a = ''; ans.sec = 0;
  const ok = Rec.start({
    onText: (fin, interim) => { ans.a = fin.trim(); const l = $('#sp-live'); if (l) l.innerHTML = `${esc(fin)}<span class="interim">${esc(interim)}</span>`; },
    onFail: () => {
      R.recording = false; clearInterval(R.clock);
      R.method = isTouch() ? 'dictation' : 'typed';
      paintSpeak();
      $('#sp-body').insertAdjacentHTML('afterbegin', `<div class="note warn">The microphone is blocked in this view, so live transcription is off. ${R.method === 'dictation' ? 'Use your keyboard’s dictation key to speak your answer into the box.' : 'Type your answer, or open the page on your phone and use keyboard dictation.'}</div>`);
    },
  });
  if (!ok) return;
  R.recording = true; R.recStart = Date.now();
  clearInterval(R.clock);
  R.clock = setInterval(() => { const c = $('#sp-clock'); if (c) c.textContent = fmtClock((Date.now() - R.recStart) / 1000); }, 500);
  if (st.part === 2 && R.timer && !R.timer.running) R.timer.start();
  paintSpeak();
};
ACT.spStop = () => {
  const R = RUN; if (!R || !R.recording) return;
  const text = Rec.stop();
  R.recording = false; clearInterval(R.clock);
  const ans = R.answers[R.i];
  ans.a = text || ans.a; ans.sec = (Date.now() - R.recStart) / 1000;
  if (R.timer && R.steps[R.i].part === 2) R.timer.pause();
  if (!ans.a) toast('Nothing was heard. Check the microphone and try again.');
  paintSpeak();
};
ACT.spNext = () => {
  const R = RUN; if (!R) return;
  if (R.recording) ACT.spStop();
  if (R.timer) { R.timer.stop(); R.timer = null; }
  if (R.i < R.steps.length - 1) {
    R.i++; R.phase = R.steps[R.i].part === 2 ? 'cue' : 'q';
    paintSpeak(); askQuestion();
  } else { R.phase = 'review'; paintSpeak(); }
  window.scrollTo(0, 0);
};

/* Typed answers have no real speaking time, and a pasted or instantly-dictated answer gives an impossible
   rate; such timings are dropped so they never reach the examiner prompt. */
function validSec(R, a) {
  if (R.method === 'typed' || !a.sec) return 0;
  const w = wordCount(a.a);
  return w / (a.sec / 60) <= 260 ? a.sec : 0;
}
function speakStats(R) {
  const words = sum(R.answers.map((a) => wordCount(a.a)));
  const timed = R.answers.filter((a) => validSec(R, a) > 0);
  const secs = sum(timed.map((a) => validSec(R, a)));
  const timedWords = sum(timed.map((a) => wordCount(a.a)));
  return { words, secs, wpm: secs > 20 ? Math.round(timedWords / (secs / 60)) : null };
}
function speakReviewHtml() {
  const R = RUN; const st = speakStats(R);
  return `<div class="card hero"><h1>Check before grading</h1>
      <p class="muted">${st.words} words${st.secs ? ` in ${fmtClock(st.secs)} of timed speaking` : ''}${st.wpm ? `, about ${st.wpm} words per minute` : ''}. ${aiReady() ? 'Claude grades the transcript; pronunciation cannot be judged from text, so it is not scored.' : ''}</p>
      ${aiStatusNote()}
      <div class="btn-row">${aiReady() ? '<button class="btn" data-act="spGrade">Get feedback from Claude</button>' : '<button class="btn" data-act="spSelf">Assess myself</button>'}</div></div>
    <div class="card">${R.steps.map((s, i) => `<div class="mistake"><div class="xs faint">Part ${s.part} · ${R.answers[i].sec ? fmtClock(R.answers[i].sec) : 'time not measured'} · ${wordCount(R.answers[i].a)} words</div><b>${esc(s.part === 2 ? s.card.cue : s.q)}</b><div>${esc(R.answers[i].a) || '<span class="faint">(no answer)</span>'}</div></div>`).join('')}</div>`;
}

ACT.spGrade = async () => {
  const R = RUN; if (!R) return;
  R.phase = 'grading';
  R.ctl = new AbortController();
  const st = speakStats(R);
  $('#sp-body').innerHTML = `<div class="card hero"><div class="ai-wait"><span class="spinner"></span>Claude is assessing Fluency, Vocabulary and Grammar. This usually takes 30–60 seconds.</div><div class="stream-box" id="sp-stream"></div><div><button class="btn quiet small" data-act="spStopGrade">Stop</button></div></div>`;
  try {
    const parts = R.steps.map((s, i) => ({ part: s.part, q: s.part === 2 ? `${s.card.cue} You should say: ${s.card.bullets.join('; ')}; ${s.card.finalBullet}` : s.q, a: R.answers[i].a, sec: validSec(R, R.answers[i]) }));
    const fb = await aiJson(speakingGradePrompt({ parts, method: R.method, totalWords: st.words, totalSec: st.secs }), {
      tier: 'complex', signal: R.ctl.signal, onText: ({ text }) => { const s = $('#sp-stream'); if (s) s.textContent = text.slice(-500); },
    });
    if (!fb || !fb.criteria) throw { code: 'invalid_json' };
    finishSpeaking(R, fb, st);
  } catch (e) {
    if (RUN !== R) return;
    R.phase = 'review'; paintSpeak();
    $('#sp-body').insertAdjacentHTML('afterbegin', `<div class="note warn">${esc(aiErrorText(e))}</div>`);
  }
};
ACT.spStopGrade = () => { if (RUN && RUN.ctl) RUN.ctl.abort(); };

function finishSpeaking(R, fb, st) {
  R.phase = 'done';
  const crit = {};
  ['FC', 'LR', 'GRA'].forEach((k) => { const c = fb.criteria[k] || {}; crit[k] = { band: clamp(Math.round(Number(c.band) || 0), 0, 9), comment: String(c.comment || ''), fix: String(c.fix || '') }; });
  const band = floorHalf((crit.FC.band + crit.LR.band + crit.GRA.band) / 3);
  const a = {
    id: `att_${uid()}`, type: 'att', kind: 'speaking', mode: R.mode, date: today(), ts: Date.now(), method: R.method,
    answers: R.steps.map((s, i) => ({ part: s.part, q: s.part === 2 ? s.card.cue : s.q, a: R.answers[i].a, sec: Math.round(R.answers[i].sec || 0) })),
    stats: st, band,
    feedback: {
      criteria: crit, summary: String(fb.summary || ''), fluencyNotes: (fb.fluencyNotes || []).map(String),
      mistakes: (fb.mistakes || []).filter((m) => m && m.quote).map((m) => ({ quote: String(m.quote), correction: String(m.correction || ''), explanation: String(m.explanation || ''), ar: String(m.ar || '') })),
      betterAnswers: (fb.betterAnswers || []).map((b) => ({ q: String(b.q || ''), answer: String(b.answer || '') })),
      nextSteps: (fb.nextSteps || []).map(String),
    },
  };
  saveDoc(a.id, a);
  const title = R.mode === 'p1' ? R.topic.topic : R.card ? R.card.cue : 'Speaking';
  S.journal.unshift({ id: a.id, kind: 'speaking', ref: R.card?.id || R.topic?.id, title, date: a.date, band, crit: { FC: crit.FC.band, LR: crit.LR.band, GRA: crit.GRA.band }, top: a.feedback.mistakes.slice(0, 5).map((m) => ({ quote: m.quote, correction: m.correction })), mock: R.mockWeek || null });
  S.lastCrit.S = weakestCrit(crit);
  if (R.topic && !R.topic.placement) S.done[`p1:${R.topic.id}`] = { date: a.date, band };
  if (R.card && !R.card.placement) S.done[`p2:${R.card.id}`] = { date: a.date, band };
  const typed = R.method === 'typed';
  if (R.placement) placementRecord('S', band, `${st.words} words${typed ? ', typed' : ''}`);
  else if (R.mockWeek) mockRecord(R.mockWeek, 'S', { band, att: a.id, method: R.method });
  else {
    const w = (R.mode === 'p1' ? 0.5 : R.mode === 'p23' ? 0.8 : 1) * (typed ? 0.5 : 1);
    addScore({ skill: 'S', band, ref: a.id, raw: `${st.words} words`, label: `Speaking ${R.mode === 'p1' ? 'Part 1' : R.mode === 'p23' ? 'Parts 2–3' : 'full test'}${typed ? ' (typed)' : ''}`, weight: w });
    completeTask(R.mode === 'p1' ? 'speak1' : R.mode === 'p23' ? 'speak' : ['speak', 'speak1']);
  }
  save();
  $('#sp-body').innerHTML = speakingFeedbackHtml(a) + `<div class="btn-row">${R.placement ? '<button class="btn" data-act="nav" data-to="placement">Back to the placement test</button>' : R.mockWeek ? `<button class="btn" data-act="toMock" data-w="${R.mockWeek}">Back to the mock exam</button>` : '<button class="btn" data-act="nav" data-to="today">Back to today</button><button class="btn ghost" data-act="nav" data-to="speaking">More speaking</button>'}</div>`;
  window.scrollTo(0, 0);
}

function speakingFeedbackHtml(a) {
  const fb = a.feedback; const arOn = S.profile.autoArabic ? 'show-ar' : '';
  const methodNote = a.method === 'typed' ? 'You typed these answers, so this estimate is only indicative.' : a.method === 'dictation' ? 'Dictation removes hesitations, so fluency is judged from length, speed and development.' : 'Speech recognition can mishear words; obvious recognition errors were ignored.';
  return `<div class="stack-lg">
    <div class="card hero"><div class="eyebrow">Speaking · ${esc(fmtDate(a.date))} · ${a.stats.words} words${a.stats.wpm ? ` · ${a.stats.wpm} wpm` : ''}</div>
      <div class="score-hero"><div class="big-band">${fmtBand(a.band)}<small> estimated band (3 of 4 criteria)</small></div></div>
      <p>${esc(fb.summary)}</p>
      <div class="table-wrap"><table class="crit-table"><thead><tr><th>Criterion</th><th>Band</th><th>Evidence and next step</th></tr></thead><tbody>
        ${['FC', 'LR', 'GRA'].map((k) => `<tr><td><b>${esc(CRIT_NAME[k])}</b></td><td class="crit-band">${fb.criteria[k].band}</td><td>${esc(fb.criteria[k].comment)}${fb.criteria[k].fix ? `<div class="small" style="margin-top:4px"><b>Do next:</b> ${esc(fb.criteria[k].fix)}</div>` : ''}</td></tr>`).join('')}
        <tr><td><b>Pronunciation</b></td><td class="crit-band faint">–</td><td class="muted">Not assessed: a transcript cannot show pronunciation. Record yourself on your phone and compare with a model speaker.</td></tr>
      </tbody></table></div>
      <p class="xs faint">${esc(methodNote)} Band = average of the three criteria, rounded down to the half band.</p>
      ${fb.fluencyNotes.length ? `<div class="small"><b>Fluency notes:</b><ul class="ticks">${fb.fluencyNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    </div>
    <div class="card ${arOn}" data-ar-scope="1"><div class="row-between"><h2>Mistakes (${fb.mistakes.length})</h2><button class="btn ghost small ar-btn" data-act="toggleAr" aria-pressed="${!!arOn}">عربي · Arabic</button></div>
      ${fb.mistakes.map((m) => `<div class="mistake"><div><span class="m-wrong">${esc(m.quote)}</span> → <span class="m-right">${esc(m.correction)}</span></div><div class="small muted">${esc(m.explanation)}</div>${m.ar ? `<div class="ar ar-inline small" lang="ar">${esc(m.ar)}</div>` : ''}</div>`).join('') || '<p class="muted">No significant mistakes listed.</p>'}</div>
    ${fb.betterAnswers.length ? `<div class="card"><h2>Stronger versions of your answers</h2>${fb.betterAnswers.map((b) => `<div class="mistake"><b>${esc(b.q)}</b><div class="essay-view" data-explain="1">${paras(b.answer)}</div></div>`).join('')}</div>` : ''}
    <details class="card flat"><summary>Your transcript</summary>${a.answers.map((x) => `<div class="mistake"><div class="xs faint">Part ${x.part} · ${x.sec ? fmtClock(x.sec) : ''}</div><b>${esc(x.q)}</b><div>${esc(x.a) || '<span class="faint">(no answer)</span>'}</div></div>`).join('')}</details>
    ${fb.nextSteps.length ? `<div class="card tint"><h2>Next steps</h2><ul class="ticks">${fb.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
  </div>`;
}

ACT.spSelf = () => {
  const R = RUN;
  $('#sp-body').innerHTML = `<div class="card"><h2>Assess yourself</h2>${aiStatusNote()}
    <ul class="ticks small"><li>Band 7 fluency: you kept talking without long pauses, and Part 2 lasted close to 2 minutes.</li><li>Band 7 vocabulary: you used some less common words and collocations correctly, and paraphrased the question.</li><li>Band 7 grammar: you mixed complex sentences (although, which, if) with frequent error-free sentences.</li></ul>
    ${R.card ? `<div class="small"><b>Useful phrases for this card:</b> ${esc((R.card.usefulPhrases || []).join(' · '))}</div>` : ''}
    <div class="field"><label for="sp-selfband">My honest band</label><select class="input" id="sp-selfband" style="max-width:160px">${bandOptions(5.5)}</select></div>
    <div class="btn-row"><button class="btn" data-act="spSelfSave">Save</button></div></div>`;
};
ACT.spSelfSave = () => {
  const R = RUN; const band = +$('#sp-selfband').value;
  if (R.placement) placementRecord('S', band, 'self-assessed', true);
  else if (R.mockWeek) mockRecord(R.mockWeek, 'S', { band, self: true });
  else { addScore({ skill: 'S', band, label: 'Speaking (self-assessed)', weight: 0.3 }); completeTask(R.mode === 'p1' ? 'speak1' : R.mode === 'p23' ? 'speak' : ['speak', 'speak1']); }
  if (R.topic && !R.topic.placement) S.done[`p1:${R.topic.id}`] = { date: today(), band };
  if (R.card && !R.card.placement) S.done[`p2:${R.card.id}`] = { date: today(), band };
  R.phase = 'done'; save(); toast('Saved');
  go(R.placement ? 'placement' : R.mockWeek ? 'mockRun' : 'speaking', R.mockWeek ? { week: R.mockWeek } : {}, { force: true });
};
