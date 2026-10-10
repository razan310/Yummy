/* ---------- Progress ---------- */
VIEWS.progress = {
  html() {
    const p = S.profile;
    const est = estimates(); const disp = displayEstimates();
    const overall = overallBand(disp);
    const partial = SKILLS.filter((k) => disp[k] != null);
    const t = today();
    const last7 = sum(Array.from({ length: 7 }, (_, i) => S.studySec[addDays(t, -i)] || 0)) / 60;
    const totalMin = sum(Object.values(S.studySec)) / 60;
    const tasksDone = sum(Object.values(S.days).map((d) => d.tasks.filter((x) => x.done).length));
    const gap = (target) => (overall == null ? null : Math.max(0, target - overall));
    const hero = !partial.length
      ? `<div class="card hero"><h2>No scores yet</h2><p class="muted">Take the placement test to get your first band estimates.</p><div><button class="btn" data-act="nav" data-to="placement">Start the placement test</button></div></div>`
      : `<div class="card hero"><div class="eyebrow">Estimated overall band</div>
          <div class="score-hero"><div class="big-band">${fmtBand(overall)}${overall == null ? '<small> (needs all four skills)</small>' : ''}</div>
            ${overall != null ? `<div class="stack" style="gap:2px"><div>${gap(p.target) === 0 ? `<span class="pill good">At ${p.target.toFixed(1)}</span>` : `<b class="mono">${gap(p.target).toFixed(1)}</b> to ${p.target.toFixed(1)} by ${esc(fmtDate(p.finalDate, { month: 'long', year: 'numeric' }))}`}</div>
              <div class="small muted">${gap(p.minTarget) === 0 ? `Minimum ${p.minTarget.toFixed(1)} reached` : `${gap(p.minTarget).toFixed(1)} to the ${p.minTarget.toFixed(1)} minimum for ${esc(fmtDate(p.examDate, { day: 'numeric', month: 'long' }))}`}</div></div>` : ''}</div>
          ${SKILLS.map((k) => bandRuler(k, est[k])).join('')}
          <p class="xs faint">Overall = average of the four skills, rounded to the nearest half band as IELTS does. Skill estimates weight your last six scores, with mocks and official results counting most.</p></div>`;
    const multiples = `<div class="card"><h2>Band by skill over time</h2><p class="small muted">Each dot is one scored task or test. Black line: ${p.target.toFixed(1)}; grey line: ${p.minTarget.toFixed(1)}.</p>
      <div class="multiples">${SKILLS.map((k) => {
    const pts = S.scores.filter((s) => s.skill === k).sort((a, b) => a.ts - b.ts).slice(-20);
    return `<div class="chart"><div class="row-between"><b>${skillDot(k)} ${SKILL_NAME[k]}</b><span class="mono small">${pts.length ? `latest ${fmtBand(pts[pts.length - 1].band)}` : 'no scores'}</span></div>${pts.length ? bandTrend(pts, { target: p.target, minTarget: p.minTarget, label: SKILL_NAME[k] }) : '<div class="empty small">No scores yet</div>'}</div>`;
  }).join('')}</div></div>`;
    const start = p.startDate;
    const cells = Array.from({ length: PLAN_WEEKS * 7 }, (_, i) => {
      const d = addDays(start, i); const m = (S.studySec[d] || 0) / 60;
      const cls = d > t ? 'future' : m >= 75 ? 'l3' : m >= 30 ? 'l2' : m > 0 || dayActive(d) ? 'l1' : '';
      return `<i class="${cls}" title="${esc(fmtDate(d))}: ${Math.round(m)} min"></i>`;
    }).join('');
    const habits = `<div class="card"><h2>Habits</h2>
      <div class="stat-row">
        <div class="stat"><span class="stat-label">Current streak</span><span class="stat-value">${plural(streakNow(), 'day')}</span></div>
        <div class="stat"><span class="stat-label">Best streak</span><span class="stat-value">${plural(bestStreak(), 'day')}</span></div>
        <div class="stat"><span class="stat-label">Last 7 days</span><span class="stat-value">${fmtMins(last7)}</span></div>
        <div class="stat"><span class="stat-label">Total study time</span><span class="stat-value">${fmtMins(totalMin)}</span></div>
        <div class="stat"><span class="stat-label">Plan tasks done</span><span class="stat-value">${tasksDone}</span></div>
      </div>
      <div class="stack" style="gap:6px"><span class="small muted">Your 12 weeks, one column per week (darker = more minutes of active study)</span><div class="heat" aria-label="Study calendar">${cells}</div></div>
      <p class="xs faint">Study time counts only while an activity is open, the page is visible and you have interacted in the last two and a half minutes.</p></div>`;
    const recent = [...S.scores].sort((a, b) => b.ts - a.ts).slice(0, 15);
    const table = `<div class="card"><h2>Recent results</h2>${recent.length ? `<div class="table-wrap"><table class="results-table"><thead><tr><th>Date</th><th>Activity</th><th>Score</th><th style="text-align:right">Band</th></tr></thead><tbody>
      ${recent.map((s) => `<tr><td class="num">${esc(fmtDate(s.date, { day: 'numeric', month: 'short' }))}</td><td>${skillDot(s.skill)} ${esc(s.label || SKILL_NAME[s.skill])}${s.kind === 'mock' ? ' <span class="pill accent">mock</span>' : s.kind === 'exam' ? ' <span class="pill good">official</span>' : ''}</td><td class="num">${esc(s.raw || '')}</td><td class="n">${fmtBand(s.band)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Your scores appear here.</div>'}</div>`;
    const official = `<details class="card flat"><summary>Log an official IELTS result</summary>
      <p class="small muted">Official results count three times as much as practice in your estimates.</p>
      <div class="grid-3"><div class="field"><label for="of-date">Test date</label><input class="input" type="date" id="of-date" value="${esc(p.examDate <= t ? p.examDate : t)}"></div>
      ${SKILLS.map((k) => `<div class="field"><label for="of-${k}">${SKILL_NAME[k]}</label><select class="input" id="of-${k}">${bandOptions(6.5)}</select></div>`).join('')}</div>
      <div><button class="btn ghost" data-act="logOfficial">Save official result</button></div></details>`;
    return `<div class="page-head"><h1>Progress</h1></div>${hero}${multiples}${habits}${table}${official}`;
  },
};
ACT.logOfficial = () => {
  const date = $('#of-date').value || today();
  SKILLS.forEach((k) => { S.scores.push({ id: uid(), ts: parseYmd(date).getTime() + 1, date, skill: k, band: +$(`#of-${k}`).value, kind: 'exam', ref: 'official', raw: 'official', label: 'Official IELTS result', weight: 1 }); });
  save(); toast('Official result saved'); render();
};

/* ---------- Mock exams ---------- */
function mockDate(week) {
  const days = buildWeek(week, S.weekEst[week] || estimates());
  return days.find((d) => d.tasks.includes('mockLR'))?.date || weekStart(week);
}
function ensureMock(week) {
  if (S.mocks[week]) return S.mocks[week];
  const used = new Set(Object.values(S.mocks).flatMap((m) => [...m.content.L, ...m.content.R, m.content.T1, m.content.T2, m.content.P1, m.content.P2]));
  const best = (list, kind) => list.find((x) => !used.has(x.id) && !isDone(kind, x.id)) || list.find((x) => !used.has(x.id)) || list[0];
  const L = [1, 2, 3, 4].map((s) => best([...CONTENT.listening, ...genItems('listening')].filter((x) => !x.placement && x.section === s), 'listening')?.id).filter(Boolean);
  const R = [1, 2, 3].map((lv) => best([...CONTENT.reading, ...genItems('reading')].filter((x) => !x.placement && x.level === lv), 'reading')?.id).filter(Boolean);
  const content = {
    L, R,
    T1: best(CONTENT.task1, 'task1').id,
    T2: best(CONTENT.task2.filter((x) => !x.placement), 'task2').id,
    P1: best(CONTENT.speaking.part1.filter((x) => !x.placement), 'p1').id,
    P2: best(CONTENT.speaking.part2.filter((x) => !x.placement), 'p2').id,
  };
  S.mocks[week] = { week, created: today(), content, parts: {}, overall: null };
  save();
  return S.mocks[week];
}
function mockRecord(week, skill, data) {
  const m = ensureMock(week);
  m.parts[skill] = { ...data, date: today() };
  const raw = data.correct != null ? `${data.correct}/${data.total}` : skill === 'W' && data.t1 != null ? `T1 ${fmtBand(data.t1)} · T2 ${fmtBand(data.t2)}` : '';
  S.scores = S.scores.filter((s) => !(s.kind === 'mock' && s.ref === `mock${week}` && s.skill === skill));
  addScore({ skill, band: data.band, kind: 'mock', ref: `mock${week}`, raw, label: `Week ${week} mock${data.self ? ' (self-assessed)' : ''}`, weight: data.self ? 0.4 : data.method === 'typed' ? 0.5 : 1 });
  if (m.parts.L && m.parts.R) completeTask('mockLR', String(week));
  if (m.parts.W && m.parts.S) completeTask('mockWS', String(week));
  if (SKILLS.every((k) => m.parts[k])) {
    const b = {}; SKILLS.forEach((k) => { b[k] = m.parts[k].band; });
    m.overall = overallBand(b);
  }
}
VIEWS.mock = {
  html() {
    const cur = planPos(today()).week;
    const weeks = Array.from({ length: PLAN_WEEKS - 3 }, (_, i) => i + 4);
    const rows = weeks.map((w) => {
      const m = S.mocks[w]; const open = w <= cur;
      const parts = SKILLS.map((k) => (m?.parts[k] ? `<span class="pill ${m.parts[k].band >= S.profile.target ? 'good' : m.parts[k].band >= S.profile.minTarget ? 'accent' : 'warn'}">${k} ${fmtBand(m.parts[k].band)}</span>` : `<span class="pill">${k} –</span>`)).join('');
      return `<div class="item-row"><div style="min-width:0"><div class="item-title">Week ${w} mock${m?.overall != null ? ` · overall <span class="mono">${fmtBand(m.overall)}</span>` : ''}</div><div class="small muted">${esc(fmtDate(mockDate(w)))} and the next day</div><div class="chips" style="margin-top:4px">${parts}</div></div>
        ${open ? `<button class="btn small ${m?.overall != null ? 'quiet' : ''}" data-act="openMock" data-w="${w}">${m?.overall != null ? 'Review' : m ? 'Continue' : 'Start'}</button>` : '<span class="pill">Locked</span>'}</div>`;
    }).join('');
    return `<div class="page-head">${backBtn('practice', 'Practice')}<h1>Mock exams</h1><p class="muted">From week 4, one full test a week under exam timing, split over two days so it fits your study time: Listening and Reading (about 95 minutes) on your mock day, Writing and Speaking (about 75 minutes) the next day.</p></div>
      ${cur < 4 ? `<div class="note">Your first mock opens in week 4, on ${esc(fmtLong(mockDate(4)))}. Until then the plan builds the skills each section tests.</div>` : ''}
      <div class="card">${rows}</div>`;
  },
};
ACT.openMock = (el) => go('mockRun', { week: +el.dataset.w });
ACT.toMock = (el) => go('mockRun', { week: +el.dataset.w });
VIEWS.mockRun = {
  html({ week }) {
    const m = ensureMock(week);
    const repeats = [...(m.parts.L ? [] : m.content.L.filter((id) => isDone('listening', id))), ...(m.parts.R ? [] : m.content.R.filter((id) => isDone('reading', id)))].length;
    const part = (k, title, mins, desc, act) => {
      const r = m.parts[k];
      return `<div class="item-row"><div style="min-width:0"><div class="item-title">${title} <span class="faint small">· ${mins}</span></div><div class="small muted">${desc}</div>${r ? `<div class="small">Result: <b class="mono">${fmtBand(r.band)}</b> ${r.correct != null ? `<span class="faint">(${r.correct}/${r.total})</span>` : ''}</div>` : ''}</div>
        ${r ? '<span class="pill good">Done</span>' : `<button class="btn small" data-act="${act}" data-w="${week}">Start</button>`}</div>`;
    };
    const b = {}; SKILLS.forEach((k) => { b[k] = m.parts[k]?.band ?? null; });
    const prev = Object.values(S.mocks).filter((x) => x.week < week && x.overall != null).sort((a, c) => c.week - a.week)[0];
    return `${backBtn('mock', 'Mock exams')}
      <div class="page-head"><div class="eyebrow">Week ${week} mock exam</div><h1>${m.overall != null ? `Overall ${fmtBand(m.overall)}` : 'Full test under exam conditions'}</h1>
        <p class="muted">Do each part in one go without pausing the timer. Listening plays once. Use a quiet room and, for Speaking, your microphone or phone dictation.</p></div>
      ${repeats ? `<div class="note warn">${plural(repeats, 'section')} in this mock ${repeats === 1 ? 'is one' : 'are ones'} you practised before, so the score may be a little high.${aiReady() ? ' You can generate fresh passages and recordings in Reading and Listening before starting.' : ''}</div>` : ''}
      <div class="card"><h2>Day 1 · about 95 minutes</h2>
        ${part('L', 'Listening', '4 sections, 40 questions, about 30 minutes', 'Played once with reading time, as in the test.', 'mockL')}
        ${part('R', 'Reading', '3 passages, 60 minutes', 'Passages from factual to argumentative.', 'mockR')}</div>
      <div class="card"><h2>Day 2 · about 75 minutes</h2>
        ${part('W', 'Writing', 'Task 1 + Task 2, 60 minutes', 'One timer for both tasks. Task 2 counts double.', 'mockW')}
        ${part('S', 'Speaking', 'Parts 1, 2 and 3, about 12 minutes', 'Examiner questions read aloud; graded by Claude from the transcript.', 'mockS')}</div>
      ${m.overall != null ? `<div class="card hero"><div class="eyebrow">Result</div><div class="score-hero"><div class="big-band">${fmtBand(m.overall)}<small> overall</small></div>${prev ? `<span class="small muted">Week ${prev.week}: ${fmtBand(prev.overall)} (${m.overall - prev.overall >= 0 ? '+' : ''}${(m.overall - prev.overall).toFixed(1)})</span>` : ''}</div>${SKILLS.map((k) => bandRuler(k, b[k])).join('')}</div>` : ''}`;
  },
};
ACT.mockL = (el) => { const w = +el.dataset.w; go('listeningRun', { ids: S.mocks[w].content.L, mockWeek: w }); };
ACT.mockR = (el) => { const w = +el.dataset.w; go('readingRun', { ids: S.mocks[w].content.R, mockWeek: w }); };
ACT.mockW = (el) => { const w = +el.dataset.w; const c = S.mocks[w].content; go('writingRun', { ids: [c.T1, c.T2], mockWeek: w }); };
ACT.mockS = (el) => { const w = +el.dataset.w; go('speakingRun', { mode: 'full', mockWeek: w }); };
