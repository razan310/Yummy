/* ---------- Writing ---------- */
const findPrompt = (id) => CONTENT.task1.find((x) => x.id === id) || CONTENT.task2.find((x) => x.id === id);
const taskNo = (id) => (String(id).startsWith('t1') ? 1 : 2);

VIEWS.writing = {
  html({ tab = 't2' }) {
    const t1 = CONTENT.task1;
    const t2 = CONTENT.task2.filter((x) => !x.placement);
    const list = tab === 't1'
      ? t1.map((it) => `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(it.title)}</div><div class="small muted">${esc(CHART_LABEL[it.chartType] || it.chartType)} · 20 minutes · at least 150 words</div></div>
          <div class="stack" style="justify-items:end;gap:6px">${statusPill('task1', it.id)}<button class="btn small ghost" data-act="openWriting" data-id="${it.id}">${isDone('task1', it.id) ? 'Write again' : 'Start'}</button></div></div>`).join('')
      : t2.map((it) => `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(it.prompt.split(/(?<=[.?!])\s/)[0])}</div><div class="small muted">${esc(ESSAY_LABEL[it.essayType] || it.essayType)} · ${esc(it.topic)} · 40 minutes · at least 250 words</div></div>
          <div class="stack" style="justify-items:end;gap:6px">${statusPill('task2', it.id)}<button class="btn small ghost" data-act="openWriting" data-id="${it.id}">${isDone('task2', it.id) ? 'Write again' : 'Start'}</button></div></div>`).join('');
    return `<div class="page-head">${backBtn('practice', 'Practice')}<h1>Writing</h1><p class="muted">Timed like the exam, with spell-check off. Claude grades each response on the four official criteria, lists your mistakes and rewrites your text at band 8.</p></div>
      ${aiStatusNote()}
      <div class="seg" role="group" aria-label="Task"><button data-act="writingTab" data-t="t1" aria-pressed="${tab === 't1'}">Task 1 · reports</button><button data-act="writingTab" data-t="t2" aria-pressed="${tab === 't2'}">Task 2 · essays</button></div>
      <div class="card">${list}</div>
      <div class="btn-row"><button class="btn ghost" data-act="nav" data-to="journal">Open your error log</button></div>`;
  },
};
ACT.writingTab = (el) => go('writing', { tab: el.dataset.t });
ACT.openWriting = (el) => go('writingRun', { ids: [el.dataset.id] });

/* ---------- writing run ---------- */
const draftKey = (id) => `b7.draft.${id}`;
VIEWS.writingRun = {
  study: true,
  html({ ids, placement, mockWeek }) {
    const tasks = ids.map((id) => {
      const item = findPrompt(id);
      const d = LS.get(draftKey(id));
      return item ? { id, task: taskNo(id), item, text: d?.text || '' } : null;
    }).filter(Boolean);
    if (!tasks.length) return `<div class="empty">This task is no longer available.</div>`;
    const total = sum(tasks.map((t) => (t.task === 1 ? 20 : 40))) * 60;
    const saved = LS.get(`b7.draftTime.${ids.join('+')}`);
    RUN = {
      kind: 'writing', tasks, ti: tasks.length > 1 ? 0 : 0, placement, mockWeek, status: 'writing',
      timer: new Countdown(total, { id: 'run-timer', elapsed: saved?.elapsed || 0, onEnd: () => toast('Time is up. In the exam you would stop now.') }),
      timeKey: `b7.draftTime.${ids.join('+')}`,
      dirty: () => RUN.status === 'grading',
      leaveText: 'Claude is still grading. If you leave now the grading is cancelled; your text stays saved as a draft.',
      cleanup() { this.timer.stop(); LS.set(this.timeKey, { elapsed: this.timer.elapsed }); if (this.ctl) this.ctl.abort(); },
      keepAlive: () => true,
    };
    const back = mockWeek ? backBtn('mockRun', 'Mock exam', { week: mockWeek }) : placement ? backBtn('placement', 'Placement test') : backBtn('writing', 'Writing', { tab: tasks[0].task === 1 ? 't1' : 't2' });
    return `${back}<div id="wr-body">${writingEditorHtml()}</div>`;
  },
  mount() { if (!RUN) return; RUN.timer.paint(); updateWordCount(); },
};
function writingEditorHtml() {
  const R = RUN; const t = R.tasks[R.ti];
  const it = t.item; const min = t.task === 1 ? 150 : 250;
  const help = !R.placement && !R.mockWeek;
  const tabs = R.tasks.length > 1 ? `<div class="seg" role="group" aria-label="Task">${R.tasks.map((x, i) => `<button data-act="wrTab" data-i="${i}" aria-pressed="${i === R.ti}">Task ${x.task} <span class="mono" id="wc-tab-${i}">${wordCount(x.text)}w</span></button>`).join('')}</div>` : '';
  return `<div class="run-bar">${timerHtml('run-timer', 'Writing timer')}<span class="wc" id="wc">0 words</span><div class="grow"></div><button class="btn small" data-act="submitWriting">Submit for grading</button></div>
    ${tabs}
    <div class="prompt-box"><div class="eyebrow">Writing Task ${t.task} · spend about ${t.task === 1 ? 20 : 40} minutes</div>
      ${t.task === 1 ? `<p>${esc(it.prompt)}</p>${renderChart(it.chart)}` : `<p>${esc(it.prompt)}</p>`}
      <p class="small"><b>Write at least ${min} words.</b></p></div>
    ${help ? `<details class="card flat"><summary>Planning help</summary>
      ${t.task === 1 ? `<div class="small"><b>A strong answer covers:</b><ul class="ticks">${it.keyFeatures.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>` : `<div class="small"><b>Ideas to consider:</b><ul class="ticks">${it.ideas.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>`}
      <div class="small"><b>Useful language:</b> ${esc((t.task === 1 ? it.usefulLanguage : it.usefulVocab || []).join(' · '))}</div></details>` : ''}
    <label class="label" for="essay">Your answer</label>
    <textarea class="essay" id="essay" data-ch="essay" spellcheck="false" autocorrect="off" autocapitalize="sentences" placeholder="${t.task === 1 ? 'Start with a paraphrase of the question, then an overview of the main features…' : 'Introduce the topic and give your position…'}">${esc(t.text)}</textarea>
    <p class="xs faint">Spell-check is off, as in the computer-delivered test. Your text is saved as a draft on this device while you type.</p>`;
}
const saveDraft = debounce((id, text) => { LS.set(draftKey(id), { text, at: Date.now() }); if (RUN && RUN.timeKey) LS.set(RUN.timeKey, { elapsed: RUN.timer.elapsed }); }, 600);
CHG.essay = (el) => {
  const R = RUN; if (!R || R.kind !== 'writing' || R.status !== 'writing') return;
  const t = R.tasks[R.ti];
  t.text = el.value;
  if (!R.timer.running && !R.startedOnce) { R.startedOnce = true; R.timer.start(); }
  updateWordCount();
  saveDraft(t.id, t.text);
};
function updateWordCount() {
  const R = RUN; if (!R || R.kind !== 'writing') return;
  const t = R.tasks[R.ti]; const n = wordCount(t.text); const min = t.task === 1 ? 150 : 250;
  const el = $('#wc'); if (el) { el.textContent = `${n} words`; el.classList.toggle('ok', n >= min); }
  const tab = $(`#wc-tab-${R.ti}`); if (tab) tab.textContent = `${n}w`;
}
ACT.wrTab = (el) => { RUN.ti = +el.dataset.i; $('#wr-body').innerHTML = writingEditorHtml(); RUN.timer.paint(); updateWordCount(); };

ACT.submitWriting = () => {
  const R = RUN; if (!R || R.status !== 'writing') return;
  const short = R.tasks.filter((t) => wordCount(t.text) < 40);
  if (short.length) { toast(`Write at least 40 words for Task ${short[0].task} before submitting.`); return; }
  const under = R.tasks.filter((t) => wordCount(t.text) < (t.task === 1 ? 150 : 250));
  const go2 = () => (aiReady() ? gradeWriting(R) : selfAssessWriting(R));
  if (under.length) confirmModal({ title: 'Submit under the word limit?', body: `Task ${under[0].task} has ${wordCount(under[0].text)} words. Examiners lower the Task ${under[0].task === 1 ? 'Achievement' : 'Response'} band for short answers.`, ok: 'Submit anyway', cancel: 'Keep writing', onOk: go2 });
  else go2();
};

async function gradeWriting(R) {
  R.status = 'grading'; R.timer.pause();
  R.ctl = new AbortController();
  const minutes = Math.round(R.timer.elapsed / 60);
  $('#wr-body').innerHTML = `<div class="card hero"><div class="ai-wait"><span class="spinner"></span><span>Claude is marking ${R.tasks.length > 1 ? 'both tasks' : 'your response'} on the four criteria. This usually takes 30–90 seconds.</span></div>
    ${R.tasks.map((t, i) => `<div class="stream-box" id="stream-${i}"></div>`).join('')}
    <div><button class="btn quiet small" data-act="stopGrading">Stop</button></div></div>`;
  try {
    const results = await Promise.all(R.tasks.map((t, i) => aiJson(writingGradePrompt({
      task: t.task, prompt: t.item.prompt, chart: t.task === 1 ? t.item.chart : null, text: t.text,
      words: wordCount(t.text), minutes: R.tasks.length > 1 ? null : minutes, essayType: t.item.essayType,
    }), { tier: 'complex', signal: R.ctl.signal, onText: ({ text }) => { const s = $(`#stream-${i}`); if (s) s.textContent = text.slice(-500); } })));
    const atts = R.tasks.map((t, i) => buildWritingAttempt(t, results[i], minutes));
    if (atts.some((a) => a == null)) throw { code: 'invalid_json' };
    finishWriting(R, atts);
  } catch (e) {
    R.status = 'writing';
    if (RUN !== R) return;
    $('#wr-body').innerHTML = `<div class="note warn">${esc(aiErrorText(e))}</div>${writingEditorHtml()}`;
    $('#wr-body .note').insertAdjacentHTML('beforeend', ' <button class="btn small" data-act="submitWriting">Try again</button>');
    R.timer.paint(); updateWordCount();
  }
}
ACT.stopGrading = () => { if (RUN && RUN.ctl) RUN.ctl.abort(); };

function buildWritingAttempt(t, fb, minutes) {
  if (!fb || !fb.criteria) return null;
  const keys = t.task === 1 ? ['TA', 'CC', 'LR', 'GRA'] : ['TR', 'CC', 'LR', 'GRA'];
  const crit = {};
  keys.forEach((k) => {
    const c = fb.criteria[k] || (k === 'TA' ? fb.criteria.TR : k === 'TR' ? fb.criteria.TA : null) || {};
    crit[k] = { band: clamp(Math.round(Number(c.band) || 0), 0, 9), comment: String(c.comment || ''), fix: String(c.fix || '') };
  });
  const band = floorHalf(sum(keys.map((k) => crit[k].band)) / 4);
  return {
    id: `att_${uid()}`, type: 'att', kind: t.task === 1 ? 'task1' : 'task2', ref: t.id, date: today(), ts: Date.now(),
    text: t.text, words: wordCount(t.text), minutes,
    feedback: {
      criteria: crit, summary: String(fb.summary || ''), strengths: (fb.strengths || []).map(String),
      mistakes: (fb.mistakes || []).filter((m) => m && m.quote).map((m) => ({ quote: String(m.quote), correction: String(m.correction || ''), type: String(m.type || ''), explanation: String(m.explanation || ''), ar: String(m.ar || '') })),
      improved: String(fb.improved || ''), nextSteps: (fb.nextSteps || []).map(String),
    },
    band,
  };
}
function weakestCrit(crit) { return Object.entries(crit).sort((a, b) => a[1].band - b[1].band)[0]?.[0]; }

function finishWriting(R, atts) {
  R.status = 'done';
  atts.forEach((a) => {
    saveDoc(a.id, a);
    const t = R.tasks.find((x) => x.id === a.ref);
    S.journal.unshift({ id: a.id, kind: a.kind, ref: a.ref, title: t.item.title || t.item.prompt.slice(0, 80), date: a.date, band: a.band, words: a.words, crit: Object.fromEntries(Object.entries(a.feedback.criteria).map(([k, v]) => [k, v.band])), top: a.feedback.mistakes.slice(0, 5).map((m) => ({ quote: m.quote, correction: m.correction })), mock: R.mockWeek || null });
    S.done[`${a.kind}:${a.ref}`] = { date: a.date, band: a.band };
    LS.del(draftKey(a.ref));
  });
  LS.del(R.timeKey);
  const t2 = atts.find((a) => a.kind === 'task2'); const t1 = atts.find((a) => a.kind === 'task1');
  S.lastCrit.W = weakestCrit((t2 || t1).feedback.criteria);
  if (R.placement) placementRecord('W', t2.band, `Task 2, ${t2.words} words`);
  else if (R.mockWeek) {
    const band = t1 && t2 ? floorHalf((t1.band + 2 * t2.band) / 3) : (t2 || t1).band;
    mockRecord(R.mockWeek, 'W', { band, t1: t1?.band ?? null, t2: t2?.band ?? null, atts: atts.map((a) => a.id) });
  } else {
    atts.forEach((a) => {
      addScore({ skill: 'W', band: a.band, ref: a.ref, raw: `${a.words} words`, label: `Writing Task ${a.kind === 'task1' ? 1 : 2}`, weight: a.kind === 'task1' ? 0.5 : 1 });
      completeTask(a.kind === 'task1' ? 't1' : 't2', a.ref);
    });
  }
  save();
  $('#wr-body').innerHTML = atts.map((a) => writingFeedbackHtml(a, findPrompt(a.ref))).join('<hr class="divider">')
    + `<div class="btn-row">${R.placement ? '<button class="btn" data-act="nav" data-to="placement">Back to the placement test</button>' : R.mockWeek ? `<button class="btn" data-act="toMock" data-w="${R.mockWeek}">Back to the mock exam</button>` : '<button class="btn" data-act="nav" data-to="today">Back to today</button><button class="btn ghost" data-act="nav" data-to="writing">More writing</button>'}</div>`;
  window.scrollTo(0, 0);
}

function markMistakes(text, mistakes) {
  const spans = [];
  mistakes.forEach((m, i) => {
    const q = (m.quote || '').trim(); if (q.length < 2) return;
    let from = 0, idx;
    while ((idx = text.indexOf(q, from)) !== -1) {
      if (!spans.some((s) => idx < s.end && idx + q.length > s.start)) { spans.push({ start: idx, end: idx + q.length, i }); break; }
      from = idx + 1;
    }
  });
  spans.sort((a, b) => a.start - b.start);
  let out = '', pos = 0;
  spans.forEach((s) => { out += esc(text.slice(pos, s.start)) + `<mark class="err" title="${esc(mistakes[s.i].correction)}">${esc(text.slice(s.start, s.end))}<sup class="mono">${s.i + 1}</sup></mark>`; pos = s.end; });
  out += esc(text.slice(pos));
  return out.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function writingFeedbackHtml(a, item) {
  const fb = a.feedback; const task = a.kind === 'task1' ? 1 : 2;
  const keys = Object.keys(fb.criteria);
  const arOn = S.profile.autoArabic ? 'show-ar' : '';
  return `<div class="stack-lg">
    <div class="card hero">
      <div class="eyebrow">Writing Task ${task} · ${esc(fmtDate(a.date))} · ${a.words} words${a.minutes != null ? ` · ${a.minutes} min` : ''}</div>
      <div class="score-hero"><div class="big-band">${fmtBand(a.band)}<small> estimated band</small></div>
        ${a.words < (task === 1 ? 150 : 250) ? `<span class="pill warn">Under ${task === 1 ? 150 : 250} words</span>` : ''}</div>
      <p>${esc(fb.summary)}</p>
      <div class="table-wrap"><table class="crit-table"><thead><tr><th>Criterion</th><th>Band</th><th>Evidence and next step</th></tr></thead><tbody>
        ${keys.map((k) => `<tr><td><b>${esc(CRIT_NAME[k])}</b></td><td class="crit-band">${fb.criteria[k].band}</td><td>${esc(fb.criteria[k].comment)}${fb.criteria[k].fix ? `<div class="small" style="margin-top:4px"><b>Do next:</b> ${esc(fb.criteria[k].fix)}</div>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="xs faint">Band = average of the four criteria, rounded down to the half band. This is an AI estimate calibrated to be strict; an examiner may differ by half a band.</p>
      ${fb.strengths.length ? `<div class="small"><b>What worked:</b> ${esc(fb.strengths.join(' · '))}</div>` : ''}
    </div>
    <div class="card"><h2>Your response, with mistakes marked</h2><div class="essay-view" data-explain="1">${markMistakes(a.text, fb.mistakes)}</div></div>
    <div class="card ${arOn}" data-ar-scope="1"><div class="row-between"><h2>Mistakes (${fb.mistakes.length})</h2><button class="btn ghost small ar-btn" data-act="toggleAr" aria-pressed="${!!arOn}">عربي · Arabic</button></div>
      <div>${fb.mistakes.map((m, i) => `<div class="mistake"><div class="row" style="gap:8px"><span class="qn" style="width:28px">${i + 1}</span><span class="pill">${esc(m.type || 'error')}</span></div>
        <div><span class="m-wrong">${esc(m.quote)}</span> → <span class="m-right">${esc(m.correction)}</span></div>
        <div class="small muted">${esc(m.explanation)}</div>${m.ar ? `<div class="ar ar-inline small" lang="ar">${esc(m.ar)}</div>` : ''}</div>`).join('') || '<p class="muted">No significant mistakes listed.</p>'}</div></div>
    <div class="card"><h2>Your response at band 8</h2><p class="small muted">Same ideas and structure as yours, with every error fixed and stronger language. Compare it paragraph by paragraph.</p><div class="essay-view" data-explain="1">${paras(fb.improved)}</div></div>
    ${item?.modelAnswer ? `<details class="card flat"><summary>Model answer for this task (band 8)</summary><div class="essay-view">${paras(item.modelAnswer)}</div></details>` : ''}
    ${fb.nextSteps.length ? `<div class="card tint"><h2>Next steps</h2><ul class="ticks">${fb.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    ${selTools(`explain-${a.id}`)}
  </div>`;
}

/* Without Claude: model answer + checklist + honest self-assessment */
function selfAssessWriting(R) {
  R.status = 'self';
  $('#wr-body').innerHTML = R.tasks.map((t, i) => `<div class="card">
      <h2>Task ${t.task}: assess yourself</h2>
      ${aiStatusNote()}
      <p class="small muted">Compare your text with the band 8 model and the band 7 checklist. Be strict: if any line is not clearly true, choose the lower band.</p>
      <ul class="ticks small">${(t.task === 1
    ? ['A clear overview sentence of the main trends or stages', 'Key features selected and compared, with accurate figures', 'Logical paragraphs; linkers used naturally, not in every sentence', 'Some less common vocabulary used correctly (e.g. plateaued, a marginal rise)', 'Frequent error-free complex sentences; few article or preposition errors']
    : ['Every part of the question answered, with one clear position throughout', 'Each body paragraph has one main idea, explained and supported with an example', 'Clear progression; referencing (this, such, these) used to avoid repetition', 'Less common vocabulary and collocations used accurately', 'A variety of complex sentences, most of them error-free']).map((x) => `<li>${x}</li>`).join('')}</ul>
      <details><summary>Model answer (band 8)</summary><div class="essay-view">${paras(t.item.modelAnswer)}</div></details>
      <div class="field"><label for="self-${i}">My honest band for this task</label><select class="input" id="self-${i}" style="max-width:160px">${bandOptions(5.5)}</select></div>
    </div>`).join('') + '<div class="btn-row"><button class="btn" data-act="saveSelfWriting">Save my self-assessment</button></div>';
}
ACT.saveSelfWriting = () => {
  const R = RUN; if (!R) return;
  const bands = R.tasks.map((t, i) => +$(`#self-${i}`).value);
  R.tasks.forEach((t, i) => { S.done[`${t.task === 1 ? 'task1' : 'task2'}:${t.id}`] = { date: today(), band: bands[i] }; LS.del(draftKey(t.id)); });
  if (R.placement) placementRecord('W', bands[0], 'self-assessed', true);
  else if (R.mockWeek) mockRecord(R.mockWeek, 'W', { band: bands.length > 1 ? floorHalf((bands[0] + 2 * bands[1]) / 3) : bands[0], self: true });
  else R.tasks.forEach((t, i) => { addScore({ skill: 'W', band: bands[i], ref: t.id, label: `Writing Task ${t.task} (self-assessed)`, weight: 0.4 }); completeTask(t.task === 1 ? 't1' : 't2', t.id); });
  R.status = 'done';
  save(); toast('Saved');
  go(R.placement ? 'placement' : R.mockWeek ? 'mockRun' : 'writing', R.mockWeek ? { week: R.mockWeek } : {}, { force: true });
};

/* ---------- error log ---------- */
VIEWS.journal = {
  html() {
    const items = S.journal;
    const recent = items.flatMap((j) => (j.top || []).map((m) => ({ ...m, kind: j.kind, date: j.date }))).slice(0, 24);
    const counts = {};
    items.slice(0, 10).forEach((j) => Object.entries(j.crit || {}).forEach(([k, v]) => { (counts[k] = counts[k] || []).push(v); }));
    const avgCrit = Object.entries(counts).map(([k, v]) => [k, sum(v) / v.length]).sort((a, b) => a[1] - b[1]);
    return `<div class="page-head">${backBtn('practice', 'Practice')}<h1>Error log</h1><p class="muted">Every graded essay and speaking session. Re-read your recurring mistakes before you write or speak.</p></div>
      ${avgCrit.length ? `<div class="card"><h2>Criteria averages (last 10 attempts)</h2><div class="stack" style="gap:6px">${avgCrit.map(([k, v]) => `<div class="row-between"><span>${esc(CRIT_NAME[k])}</span><b class="mono">${v.toFixed(1)}</b></div>`).join('')}</div></div>` : ''}
      ${recent.length ? `<div class="card"><h2>Recent mistakes</h2>${recent.map((m) => `<div class="mistake"><div><span class="m-wrong">${esc(m.quote)}</span> → <span class="m-right">${esc(m.correction)}</span></div><div class="xs faint">${esc(m.kind === 'speaking' ? 'Speaking' : m.kind === 'task1' ? 'Task 1' : 'Task 2')} · ${esc(fmtDate(m.date))}</div></div>`).join('')}</div>` : ''}
      <div class="card"><h2>All attempts</h2>${items.length ? items.map((j) => `<div class="item-row"><div style="min-width:0"><div class="item-title">${esc(j.kind === 'speaking' ? 'Speaking' : j.kind === 'task1' ? 'Writing Task 1' : 'Writing Task 2')}${j.mock ? ` · week ${j.mock} mock` : ''}</div><div class="small muted">${esc(fmtDate(j.date))} · ${esc(j.title || '')}</div></div>
        <div class="row"><b class="mono">${fmtBand(j.band)}</b><button class="btn small ghost" data-act="openAttempt" data-id="${j.id}">Open</button></div></div>`).join('') : '<div class="empty">Graded essays and speaking sessions appear here.</div>'}</div>`;
  },
};
ACT.openAttempt = (el) => go('attempt', { id: el.dataset.id });
VIEWS.attempt = {
  html({ id }) { return `${backBtn('journal', 'Error log')}<div id="att-body"><div class="ai-wait"><span class="spinner"></span>Loading…</div></div>`; },
  async mount({ id }) {
    const a = await loadDoc(id);
    const box = $('#att-body'); if (!box || ROUTE.params.id !== id) return;
    if (!a) { box.innerHTML = '<div class="empty">This attempt could not be loaded on this device.</div>'; return; }
    if (a.kind === 'speaking') box.innerHTML = speakingFeedbackHtml(a);
    else { const item = findPrompt(a.ref); box.innerHTML = `${item ? `<details class="card flat"><summary>The task</summary><div class="prompt-box"><p>${esc(item.prompt)}</p>${item.chart ? renderChart(item.chart) : ''}</div></details>` : ''}${writingFeedbackHtml(a, item)}`; }
  },
};
