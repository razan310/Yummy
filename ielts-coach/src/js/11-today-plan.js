/* ---------- Today ---------- */
VIEWS.today = {
  html() {
    const t = today();
    const p = S.profile;
    const pos = planPos(t);
    const est = estimates();
    const head = `<div class="today-head"><div class="eyebrow">${pos.idx >= 0 && pos.week <= PLAN_WEEKS ? `Week ${pos.week} of ${PLAN_WEEKS} · ${phaseOf(pos.week).name}` : 'Your plan'}</div><h1 class="date">${esc(fmtLong(t))}</h1></div>`;
    let body = '';
    if (pos.idx < 0) {
      body = `<div class="card"><h2>Your plan starts on ${esc(fmtLong(p.startDate))}</h2><p class="muted">Change the start date in Settings if you want to begin today.</p><div><button class="btn" data-act="nav" data-to="settings">Open settings</button></div></div>`;
    } else if (pos.week > PLAN_WEEKS) {
      body = `<div class="card hero"><h2>You finished the 12-week plan</h2><p class="muted">Your estimates and history are kept. Start a new 12-week cycle aimed at ${p.target.toFixed(1)}; it will be built from your current bands.</p><div><button class="btn" data-act="newCycle">Start a new 12-week cycle</button></div></div>`;
    } else {
      const tasks = dayTasks(t, { create: true });
      const done = tasks.filter((x) => x.done).length;
      const mins = sum(tasks.map((x) => x.min));
      const doneMin = sum(tasks.filter((x) => x.done).map((x) => x.min));
      body = `<section class="stack" aria-labelledby="today-t">
        <div class="row-between"><h2 id="today-t">Today’s plan</h2><span class="small muted num">${done} of ${tasks.length} done · ${fmtMins(doneMin)} of ${fmtMins(mins)}</span></div>
        <div class="progress" aria-hidden="true"><i style="width:${tasks.length ? (done / tasks.length) * 100 : 0}%"></i></div>
        <div class="task-list">${tasks.map(taskRow).join('')}</div>
      </section>`;
    }
    const placementCard = !S.placement?.done ? `<div class="card hero tint">
        <div class="eyebrow">Start here</div>
        <h2>Take the placement test</h2>
        <p>Four short parts: Reading (15 min), Listening (10 min), a full Task 2 essay (40 min) and a Speaking sample (6 min). It sets your starting band in each skill, and your plan gives the most time to the skills furthest from ${p.target.toFixed(1)}.</p>
        <div class="btn-row"><button class="btn" data-act="nav" data-to="placement">${S.placement?.results && Object.keys(S.placement.results).length ? 'Continue the placement test' : 'Start the placement test'}</button></div>
      </div>` : '';
    const due = dueWords().length; const fresh = newWordsToday().length;
    const examIn = diffDays(t, p.examDate); const finalIn = diffDays(t, p.finalDate);
    const nextMockWeek = Math.max(4, pos.week);
    const mockDate = nextMockWeek <= PLAN_WEEKS ? buildWeek(nextMockWeek, est).find((d) => d.tasks.includes('mockLR'))?.date : null;
    const overall = overallBand(displayEstimates());
    const side = `<div class="grid-2">
      <div class="card">
        <div class="row-between"><h2>Distance to ${p.target.toFixed(1)}</h2><span class="mono">${overall == null ? '' : `Overall ${fmtBand(overall)}`}</span></div>
        ${SKILLS.map((k) => bandRuler(k, est[k])).join('')}
        <p class="xs faint">Black line: target ${p.target.toFixed(1)}. Grey line: minimum ${p.minTarget.toFixed(1)}. Estimates use your recent scores, weighting mocks most.</p>
      </div>
      <div class="stack">
        <div class="card"><div class="eyebrow">Exams</div>
          <div class="row-between"><span>First exam · ${esc(fmtDate(p.examDate, { day: 'numeric', month: 'short', year: 'numeric' }))}</span><b class="mono">${examIn >= 0 ? `${examIn} days` : 'done'}</b></div>
          <div class="row-between"><span>Deadline for ${p.target.toFixed(1)} · ${esc(fmtDate(p.finalDate, { month: 'short', year: 'numeric' }))}</span><b class="mono">${finalIn >= 0 ? `${finalIn} days` : 'passed'}</b></div>
          ${mockDate ? `<div class="row-between"><span>Next mock exam</span><b>${esc(fmtDate(mockDate))}</b></div>` : ''}
        </div>
        <div class="card"><div class="row-between"><div><div class="eyebrow">Flashcards</div><div><b class="mono">${due}</b> due · <b class="mono">${fresh}</b> new today</div></div><button class="btn ghost small" data-act="nav" data-to="words">Review</button></div></div>
        <div class="card"><div class="row-between"><div><div class="eyebrow">Streak</div><div><b class="mono">${streakNow()}</b> ${streakNow() === 1 ? 'day' : 'days'}${dayActive(t) ? '' : ' · study 20 min or finish a task to keep it going'}</div></div><span class="mono faint">${fmtMins((S.studySec[t] || 0) / 60)} today</span></div></div>
      </div></div>`;
    return `${head}${placementCard}${body}${side}`;
  },
};
function taskRow(t) {
  const startable = t.type !== 'exam';
  return `<div class="task ${t.done ? 'done' : ''}">
    <button class="check" data-act="toggleTask" data-id="${t.id}" aria-pressed="${t.done}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}: ${esc(t.title)}">${ICONS.check}</button>
    <div style="min-width:0"><div class="t-title">${esc(t.title)}</div>
      <div class="t-meta">${skillDot(t.skill)}<span>${t.min ? fmtMins(t.min) : ''}</span>${t.sub ? `<span>· ${esc(t.sub)}</span>` : ''}</div>
      ${t.tip && !t.done ? `<div class="t-tip">${esc(t.tip)}</div>` : ''}</div>
    ${startable ? `<button class="btn small ${t.done ? 'quiet' : 'ghost'}" data-act="startTask" data-id="${t.id}">${t.done ? 'Again' : 'Start'}</button>` : '<span></span>'}
  </div>`;
}
const findTodayTask = (id) => (S.days[today()]?.tasks || []).find((x) => x.id === id);
ACT.toggleTask = (el) => {
  const t = findTodayTask(el.dataset.id); if (!t) return;
  t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
  save(); render();
};
ACT.startTask = (el) => {
  const t = findTodayTask(el.dataset.id); if (!t) return;
  switch (t.type) {
    case 'placement': return go('placement');
    case 'vocab': return go('words', { start: true });
    case 't2': return go('writingRun', { ids: [t.ref] });
    case 't1': return go('writingRun', { ids: [t.ref] });
    case 'speak': return go('speakingRun', { mode: 'p23', card: t.ref });
    case 'speak1': return go('speakingRun', { mode: 'p1', topic: t.ref });
    case 'read': return go('readingRun', { ids: [t.ref] });
    case 'listen': return go('listeningRun', { ids: [t.ref] });
    case 'grammar': return go('grammarRun', { id: t.ref });
    case 'review': return go('journal');
    case 'mockLR': case 'mockWS': return go('mock');
    case 'result': return go('progress');
    default: return null;
  }
};
ACT.newCycle = () => {
  confirmModal({
    title: 'Start a new 12-week cycle?', body: 'Your scores, flashcards and history stay. The plan restarts today with week 1 built from your current bands.', ok: 'Start new cycle',
    onOk: () => { S.profile.startDate = today(); S.days = Object.fromEntries(Object.entries(S.days).filter(([d]) => d < today())); S.weekEst = {}; save(); render(); },
  });
};

/* ---------- Plan ---------- */
VIEWS.plan = {
  html({ week }) {
    const pos = planPos(today());
    const cur = clamp(pos.week, 1, PLAN_WEEKS);
    const wk = clamp(week || cur, 1, PLAN_WEEKS);
    const est = S.weekEst[wk] || estimates();
    const w = planWeights(est);
    const tot = w.W + w.S + w.R + w.L;
    const days = buildWeek(wk, est);
    const ph = phaseOf(wk);
    const chips = Array.from({ length: PLAN_WEEKS }, (_, i) => i + 1).map((n) => `<button class="week-chip ${n === cur ? 'now' : ''}" data-act="planWeek" data-w="${n}" aria-pressed="${n === wk}">W${n}</button>`).join('');
    const phases = PHASES.map((p) => `<div class="${p === ph ? 'on' : ''}"><b>${p.name}</b><span class="faint">Weeks ${p.from}–${p.to}</span></div>`).join('');
    const dayHtml = days.map((d) => {
      const stored = S.days[d.date];
      const isToday = d.date === today();
      const past = d.date < today();
      const tasks = stored ? stored.tasks : d.tasks.map((k) => ({ type: k, title: BLOCKS[k].title, min: BLOCKS[k].min, skill: BLOCKS[k].skill }));
      const total = sum(tasks.map((x) => x.min));
      const label = d.kind === 'mock' ? '<span class="pill accent">Mock</span>' : d.kind === 'light' ? '<span class="pill">Light day</span>' : d.kind === 'exam' ? '<span class="pill warn">Exam</span>' : '';
      const status = stored ? (stored.tasks.every((x) => x.done) ? '<span class="pill good">Done</span>' : past ? `<span class="pill bad">${stored.tasks.filter((x) => !x.done).length} missed</span>` : '') : past ? '<span class="pill">No record</span>' : '';
      return `<div class="day-card ${isToday ? 'is-today' : ''}">
        <div class="row-between"><b>${esc(fmtDate(d.date))}${isToday ? ' · Today' : ''}</b><span class="row" style="gap:6px">${label}${status}<span class="xs faint mono">${fmtMins(total)}</span></span></div>
        <div class="day-tasks">${tasks.map((x) => `<span class="${x.done ? 'done' : ''}">${skillDot(x.skill)}${esc(x.title)}${x.sub ? ` <span class="faint">· ${esc(x.sub.length > 60 ? x.sub.slice(0, 58) + '…' : x.sub)}</span>` : ''}</span>`).join('')}</div></div>`;
    }).join('');
    const pct = (k) => Math.round((w[k] / tot) * 100);
    return `<div class="page-head"><div class="eyebrow">12-week plan · ${esc(fmtDate(S.profile.startDate, { day: 'numeric', month: 'short' }))} to ${esc(fmtDate(addDays(S.profile.startDate, PLAN_WEEKS * 7 - 1), { day: 'numeric', month: 'short', year: 'numeric' }))}</div><h1>Week ${wk}: ${ph.name}</h1><p class="muted">${esc(ph.focus)}</p></div>
      <div class="phase-bar">${phases}</div>
      <div class="week-chips" role="group" aria-label="Choose a week">${chips}</div>
      <div class="card">
        <div class="row-between"><h2>${esc(fmtDate(days[0].date, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(days[6].date, { day: 'numeric', month: 'short' }))}</h2><span class="small muted">${wk > cur ? 'Preview: rebuilt from your latest scores when the week starts' : wk === cur ? 'This week' : 'Past week'}</span></div>
        <div>${dayHtml}</div>
      </div>
      <div class="card flat">
        <h2>How this week was weighted</h2>
        <p class="small muted">Each skill gets time in proportion to its distance from ${S.profile.target.toFixed(1)}, with Writing and Speaking weighted up as your weakest areas. Vocabulary runs every day; one light day and, from week 4, a two-day mock exam are fixed.</p>
        <div class="stack" style="gap:6px">${['W', 'S', 'R', 'L'].map((k) => `<div class="row" style="gap:10px"><span style="width:90px">${skillDot(k)} ${SKILL_NAME[k]}</span><div class="progress grow"><i style="width:${pct(k)}%"></i></div><span class="mono small" style="width:110px;text-align:right">${pct(k)}% · est ${fmtBand(est[k] == null ? null : roundHalf(est[k]))}</span></div>`).join('')}</div>
        <div class="btn-row"><button class="btn ghost small" data-act="rebuildToday">Rebuild today from my latest scores</button></div>
      </div>`;
  },
};
ACT.planWeek = (el) => go('plan', { week: +el.dataset.w });
ACT.rebuildToday = () => {
  confirmModal({ title: 'Rebuild today’s tasks?', body: 'Today’s task list and this week’s weighting are recalculated from your latest band estimates. Ticks on today’s tasks are cleared.', ok: 'Rebuild', onOk: () => { regenerateToday(); toast('Today’s plan rebuilt'); go('today'); } });
};

/* ---------- Placement ---------- */
const PLACEMENT_STEPS = [
  { k: 'R', title: 'Reading', min: 15, desc: 'One short academic passage, 9 questions.' },
  { k: 'L', title: 'Listening', min: 10, desc: 'One recorded conversation (played once), 8 questions.' },
  { k: 'W', title: 'Writing', min: 40, desc: 'A full Task 2 essay of at least 250 words, graded by Claude on the four criteria.' },
  { k: 'S', title: 'Speaking', min: 8, desc: 'Three Part 1 questions and a Part 2 cue card, graded by Claude from your transcript.' },
];
function placementState() {
  if (!S.placement) S.placement = { done: false, results: {} };
  return S.placement;
}
VIEWS.placement = {
  html() {
    const pl = placementState();
    const r = pl.results;
    const all = PLACEMENT_STEPS.every((s) => r[s.k]);
    const steps = PLACEMENT_STEPS.map((s, i) => `<div class="item-row"><div><div class="item-title">${i + 1}. ${s.title} <span class="faint small">· about ${s.min} min</span></div><div class="small muted">${s.desc}</div>
        ${r[s.k] ? `<div class="small">Result: <b class="mono">${fmtBand(r[s.k].band)}</b> ${r[s.k].raw ? `<span class="faint">(${esc(r[s.k].raw)})</span>` : ''}${r[s.k].self ? ' <span class="pill warn">self-assessed</span>' : ''}</div>` : ''}</div>
        <button class="btn small ${r[s.k] ? 'quiet' : ''}" data-act="placeStep" data-k="${s.k}">${r[s.k] ? 'Redo' : 'Start'}</button></div>`).join('');
    const bands = {}; SKILLS.forEach((k) => { bands[k] = r[k]?.band ?? null; });
    const overall = overallBand(bands);
    const results = all ? `<div class="card hero">
        <div class="eyebrow">Your starting point</div>
        <div class="score-hero"><div class="big-band">${fmtBand(overall)}<small> overall estimate</small></div></div>
        ${SKILLS.map((k) => bandRuler(k, bands[k])).join('')}
        <p class="small muted">These are rough estimates from short samples (±0.5 band, more for Speaking). They sharpen with every practice task and mock exam. ${placementFocus(bands)}</p>
        ${pl.done ? '<div class="btn-row"><button class="btn" data-act="nav" data-to="today">Go to today’s plan</button></div>' : '<div class="btn-row"><button class="btn" data-act="placeFinish">Build my plan</button></div>'}
      </div>` : '';
    return `<div class="page-head">${backBtn('today', 'Today')}<h1>Placement test</h1><p class="muted">Do the four parts in any order, in one sitting or across a few days. Results are saved after each part.</p></div>
      ${aiStatusNote()}
      <div class="card">${steps}</div>
      ${results}
      <details class="card flat"><summary>I already have a recent official IELTS score</summary>
        <p class="small muted">Enter it to skip the test. Use only a result from the last few months.</p>
        <div class="grid-3">${SKILLS.map((k) => `<div class="field"><label for="ps-${k}">${SKILL_NAME[k]}</label><select class="input" id="ps-${k}">${bandOptions(6)}</select></div>`).join('')}</div>
        <div><button class="btn ghost" data-act="placeManual">Use these bands</button></div>
      </details>`;
  },
};
function bandOptions(sel) { let o = ''; for (let b = 3; b <= 9; b += 0.5) o += `<option value="${b}" ${b === sel ? 'selected' : ''}>${b.toFixed(1)}</option>`; return o; }
function placementFocus(b) {
  const order = SKILLS.filter((k) => b[k] != null).sort((x, y) => b[x] - b[y]);
  if (!order.length) return '';
  return `Your plan gives extra time to ${SKILL_NAME[order[0]]} and ${SKILL_NAME[order[1]]}.`;
}
ACT.placeStep = (el) => {
  const k = el.dataset.k;
  if (k === 'R') go('readingRun', { ids: ['rp'], placement: true });
  if (k === 'L') go('listeningRun', { ids: ['lp'], placement: true });
  if (k === 'W') go('writingRun', { ids: ['t2-00'], placement: true });
  if (k === 'S') go('speakingRun', { mode: 'placement' });
};
function placementRecord(skill, band, raw, self = false) {
  const pl = placementState();
  pl.results[skill] = { band, raw, self, date: today() };
  S.scores = S.scores.filter((s) => !(s.kind === 'placement' && s.skill === skill));
  addScore({ skill, band, kind: 'placement', ref: 'placement', raw, label: 'Placement' + (self ? ' (self-assessed)' : ''), weight: self ? 0.5 : 1 });
  save();
}
ACT.placeFinish = () => {
  const pl = placementState();
  pl.done = true; pl.date = today();
  // Rebuild today and the current week from the new estimates.
  regenerateToday();
  save();
  toast('Your plan is ready');
  go('today');
};
ACT.placeManual = () => {
  SKILLS.forEach((k) => placementRecord(k, +$(`#ps-${k}`).value, 'official score'));
  ACT.placeFinish();
};

/* ---------- Settings ---------- */
VIEWS.settings = {
  html() {
    const p = S.profile;
    const dayOpts = (sel) => DOW_NAMES.map((d, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${d}</option>`).join('');
    const aiLine = { ready: 'Available: essays and speaking are graded by Claude.', loading: 'Connecting…', denied: 'Declined for this visit. Reload the page to be asked again.', disabled: 'Not available for this account.', absent: 'Not available here. Open this page inside Claude to get AI grading.' }[AI.state];
    const storeLine = Cloud.status === 'cloud' ? 'Saved privately to your Claude account. Only you can see it, on any device where you open this page.' : Cloud.status === 'connecting' ? 'Connecting…' : 'Saved in this browser only. Open the page inside Claude while signed in to keep it in your account.';
    return `<div class="page-head">${backBtn('today', 'Today')}<h1>Settings</h1></div>
      <div class="card"><h2>Exam and plan</h2>
        <div class="grid-2">
          <div class="field"><label for="s-exam">First exam date</label><input class="input" type="date" id="s-exam" data-ch="setting" data-k="examDate" value="${esc(p.examDate)}"></div>
          <div class="field"><label for="s-final">Deadline for your target</label><input class="input" type="date" id="s-final" data-ch="setting" data-k="finalDate" value="${esc(p.finalDate)}"></div>
          <div class="field"><label for="s-start">Plan start date (week 1, day 1)</label><input class="input" type="date" id="s-start" data-ch="setting" data-k="startDate" value="${esc(p.startDate)}"></div>
          <div class="field"><label for="s-min">Study time per day</label><select class="input" id="s-min" data-ch="setting" data-k="dailyMinutes">${[75, 90, 105, 120].map((m) => `<option value="${m}" ${m === p.dailyMinutes ? 'selected' : ''}>${fmtMins(m)}</option>`).join('')}</select></div>
          <div class="field"><label for="s-target">Target band</label><select class="input" id="s-target" data-ch="setting" data-k="target">${[6.5, 7, 7.5, 8].map((m) => `<option value="${m}" ${m === p.target ? 'selected' : ''}>${m.toFixed(1)}</option>`).join('')}</select></div>
          <div class="field"><label for="s-mintarget">Minimum acceptable band</label><select class="input" id="s-mintarget" data-ch="setting" data-k="minTarget">${[6, 6.5, 7].map((m) => `<option value="${m}" ${m === p.minTarget ? 'selected' : ''}>${m.toFixed(1)}</option>`).join('')}</select></div>
          <div class="field"><label for="s-light">Light day</label><select class="input" id="s-light" data-ch="setting" data-k="lightDay">${dayOpts(p.lightDay)}</select></div>
          <div class="field"><label for="s-mock">Mock exam day (part 2 is the next day)</label><select class="input" id="s-mock" data-ch="setting" data-k="mockDay">${dayOpts(p.mockDay)}</select></div>
          <div class="field"><label for="s-words">New words per day</label><select class="input" id="s-words" data-ch="setting" data-k="newWords">${[4, 6, 8, 10].map((m) => `<option value="${m}" ${m === p.newWords ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        </div>
        <p class="xs faint">Changing plan settings rebuilds today and future days. Past days keep their record.</p>
      </div>
      <div class="card"><h2>Audio and language</h2>
        <div class="grid-2">
          <div class="field"><label for="s-rate">Listening speed</label><select class="input" id="s-rate" data-ch="setting" data-k="ttsRate">${[[0.85, 'Slower (0.85×)'], [0.95, 'Slightly slower'], [1, 'Normal'], [1.08, 'Slightly faster']].map(([v, l]) => `<option value="${v}" ${v === p.ttsRate ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="s-readq">Examiner reads speaking questions aloud</label><select class="input" id="s-readq" data-ch="setting" data-k="readQuestions"><option value="1" ${p.readQuestions ? 'selected' : ''}>Yes</option><option value="0" ${!p.readQuestions ? 'selected' : ''}>No</option></select></div>
          <div class="field"><label for="s-ar">Arabic explanations</label><select class="input" id="s-ar" data-ch="setting" data-k="autoArabic"><option value="0" ${!p.autoArabic ? 'selected' : ''}>Show when I tap the Arabic button</option><option value="1" ${p.autoArabic ? 'selected' : ''}>Always show</option></select></div>
        </div>
        <p class="small muted">Voices on this device: ${TTS.ok ? `${TTS.voices.length} English voices (${[...new Set(TTS.voices.map((v) => ACCENT_NAME[v.lang.replace('_', '-')] || v.lang))].slice(0, 8).join(', ') || 'loading'})` : 'speech playback is not supported in this browser'}. Accents you do not have installed fall back to a British voice.</p>
      </div>
      <div class="card"><h2>Claude and your data</h2>
        <p class="small"><b>AI grading:</b> ${esc(aiLine)}</p>
        <p class="small"><b>Progress:</b> ${esc(storeLine)}</p>
        ${Cloud.error ? `<div class="note warn">${esc(Cloud.error)}</div>` : ''}
        <div class="btn-row"><button class="btn ghost small" data-act="exportData">Copy a backup</button><button class="btn ghost small" data-act="importOpen">Restore from a backup</button><button class="btn quiet small" data-act="resetAll">Reset everything</button></div>
        <div id="import-box" hidden><div class="field"><label for="import-text">Paste a backup copied from this page</label><textarea class="input" id="import-text" rows="4"></textarea></div><div><button class="btn small" data-act="importRun">Restore</button></div></div>
      </div>`;
  },
};
CHG.setting = (el) => {
  const k = el.dataset.k; const p = S.profile;
  let v = el.value;
  if (['dailyMinutes', 'lightDay', 'mockDay', 'newWords'].includes(k)) v = +v;
  if (['target', 'minTarget', 'ttsRate'].includes(k)) v = +v;
  if (['readQuestions', 'autoArabic'].includes(k)) v = v === '1';
  if (['examDate', 'finalDate', 'startDate'].includes(k) && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
  if (p[k] === v) return;
  p[k] = v;
  if (['startDate', 'dailyMinutes', 'lightDay', 'mockDay', 'examDate', 'target'].includes(k)) {
    const t = today();
    S.days = Object.fromEntries(Object.entries(S.days).filter(([d]) => d < t));
    const wk = planPos(t).week;
    Object.keys(S.weekEst).forEach((w) => { if (+w >= wk) delete S.weekEst[w]; });
  }
  save(); updateChrome(); toast('Saved');
};
ACT.exportData = async () => {
  const data = JSON.stringify({ app: 'band-seven', v: 1, S, SRS });
  try { await navigator.clipboard.writeText(data); toast('Backup copied. Paste it somewhere safe.'); }
  catch {
    const box = $('#import-box'); box.hidden = false;
    const ta = $('#import-text'); ta.value = data; ta.select();
    toast('Copy the selected text to keep your backup.');
  }
};
ACT.importOpen = () => { const b = $('#import-box'); b.hidden = !b.hidden; };
ACT.importRun = () => {
  let d;
  try { d = JSON.parse($('#import-text').value); } catch { toast('That is not a backup from this page.'); return; }
  if (!d || d.app !== 'band-seven' || !d.S) { toast('That is not a backup from this page.'); return; }
  confirmModal({
    title: 'Restore this backup?', body: 'Your current progress on this page is replaced by the backup.', ok: 'Restore', danger: true,
    onOk: () => { S = mergeDefaults(defaultState(), d.S); SRS = d.SRS || { updatedAt: 0, cards: {} }; save(); saveSrs(); toast('Backup restored'); go('today'); },
  });
};
ACT.resetAll = () => {
  confirmModal({
    title: 'Reset everything?', body: 'This deletes your placement results, scores, plan history, flashcard progress and saved essays from this page. It cannot be undone.', ok: 'Delete my progress', danger: true,
    onOk: () => {
      S.journal.forEach((j) => deleteDoc(j.id));
      S = defaultState(); SRS = { updatedAt: 0, cards: {} };
      save(); saveSrs(); toast('Progress reset'); go('today');
    },
  });
};
