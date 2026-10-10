/* ---------- app shell: routing, events, shared UI ---------- */
let ROUTE = { name: 'today', params: {} };
let RUN = null;           // the live activity (quiz, essay, speaking session, flashcards)
const VIEWS = {};
const ACT = {};           // click handlers:  data-act="name"
const CHG = {};           // change/input handlers: data-ch="name"

const ICONS = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v3M16 3v3M8.5 14.5l2 2 4-4"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2"/></svg>',
  practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4.5l5 5L9 20H4v-5z"/><path d="M12.5 6.5l5 5"/></svg>',
  words: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6.5" width="13" height="13" rx="2"/><path d="M7.5 3.5h11a2 2 0 0 1 2 2v11"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
};
const NAV = [['today', 'Today'], ['plan', 'Plan'], ['practice', 'Practice'], ['words', 'Words'], ['progress', 'Progress']];
const NAV_OF = { readingRun: 'practice', listeningRun: 'practice', writingRun: 'practice', speakingRun: 'practice', grammarRun: 'practice', reading: 'practice', listening: 'practice', writing: 'practice', speaking: 'practice', grammar: 'practice', mock: 'practice', journal: 'practice', attempt: 'practice', placement: 'today', mockRun: 'practice', settings: '', account: '' };

function shellHtml() {
  const tabs = (cls) => NAV.map(([k, label]) => `<button class="tab" data-act="nav" data-to="${k}" data-nav="${k}">${ICONS[k]}<span>${label}</span></button>`).join('');
  return `<header class="topbar"><div class="topbar-in">
      <button class="brand" data-act="nav" data-to="today" aria-label="Band Seven home"><span class="brand-cell">7.0</span><span class="brand-name">Band Seven</span></button>
      <nav class="tabs-top" aria-label="Main">${tabs()}</nav>
      <div class="topbar-spacer"></div>
      <div class="topbar-actions">
        <span class="chip-exam" id="exam-chip"></span>
        <button id="sync" class="sync" data-act="nav" data-to="account"><span>…</span></button>
        <button class="icon-btn" data-act="theme" id="theme-btn" aria-label="Change theme"></button>
        <button class="icon-btn" data-act="nav" data-to="settings" id="settings-btn" aria-label="Settings">${ICONS.gear}</button>
        <button class="me-btn" id="me-btn" data-act="meMenu" aria-haspopup="menu" aria-expanded="false" aria-controls="me-menu" hidden><span class="avatar" id="me-avatar"></span><i class="me-dot" id="me-dot"></i></button>
      </div>
    </div></header>
    <div class="me-menu" id="me-menu" role="menu" hidden></div>
    <main id="main" tabindex="-1"></main>
    <nav class="tabs-bottom" aria-label="Main">${tabs()}</nav>
    <div id="toast-root"></div><div id="modal-root"></div>`;
}

function updateChrome() {
  const active = NAV_OF[ROUTE.name] || ROUTE.name;
  $$('[data-nav]').forEach((b) => { if (b.dataset.nav === active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const left = diffDays(today(), S.profile.examDate);
  const chip = $('#exam-chip');
  if (chip) chip.innerHTML = left >= 0 ? `Exam in <b>${left}</b> ${left === 1 ? 'day' : 'days'}` : '';
  const th = getTheme();
  const tb = $('#theme-btn');
  if (tb) { tb.innerHTML = th === 'dark' ? ICONS.moon : th === 'light' ? ICONS.sun : ICONS.auto; tb.title = `Theme: ${th === 'system' ? 'match device' : th}`; }
  updateSyncBadge();
  const signedIn = !!(Cloud.kind === 'server' && Cloud.user);
  const me = $('#me-btn');
  if (me) {
    me.hidden = !signedIn;
    $('#sync').hidden = signedIn;
    $('#settings-btn').hidden = signedIn;
    if (signedIn) {
      $('#me-avatar').textContent = initials(displayName());
      const st = syncState();
      $('#me-dot').className = `me-dot ${st.tone}`;
      me.setAttribute('aria-label', `${displayName() || 'Your account'}: ${st.text}`);
    }
  }
  document.body.classList.toggle('gated', !!gateView());
}

/* ---------- who is signed in ---------- */
const HOSTED = typeof window !== 'undefined' && !window.claude?.use && /^https?:$/.test(location.protocol);
function displayName() { return (S.profile.name || Cloud.user?.name || (Cloud.user?.email || '').split('@')[0] || '').trim(); }
function firstName() { return displayName().split(/\s+/)[0] || ''; }
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}
function syncState() {
  if (Cloud.error) return { tone: 'bad', text: Cloud.error };
  if (Cloud.status === 'connecting') return { tone: 'warn', text: 'Loading your progress…' };
  if (Object.values(writers).some((w) => w.busy || w.dirty)) return { tone: 'warn', text: 'Saving…' };
  return { tone: 'good', text: 'All progress saved to your account' };
}
/* On the hosted site the app starts with the account screen until someone signs in. */
function gateView() {
  if (!HOSTED) return null;
  if (Cloud.status === 'connecting' && !Cloud.kind) return 'splash';
  if (Cloud.kind === 'server' && !Cloud.user) return 'welcome';
  return null;
}
function meMenuHtml() {
  const st = syncState();
  return `<div class="me-head"><span class="avatar lg" aria-hidden="true">${esc(initials(displayName()))}</span><div style="min-width:0"><b class="ellipsis">${esc(displayName() || 'Your account')}</b><div class="xs muted ellipsis">${esc(Cloud.user?.email || '')}</div></div></div>
    <div class="me-status"><i class="me-dot static ${st.tone}"></i><span>${esc(st.text)}</span></div>
    <button role="menuitem" data-act="menuGo" data-to="account">Your account</button>
    <button role="menuitem" data-act="menuGo" data-to="progress">Your progress</button>
    <button role="menuitem" data-act="menuGo" data-to="settings">Settings</button>
    <button role="menuitem" data-act="signOut" class="danger-text">Sign out</button>`;
}
function closeMeMenu() { const m = $('#me-menu'); if (m && !m.hidden) { m.hidden = true; $('#me-btn')?.setAttribute('aria-expanded', 'false'); } }
ACT.meMenu = () => {
  const m = $('#me-menu');
  if (!m.hidden) { closeMeMenu(); return; }
  m.innerHTML = meMenuHtml(); m.hidden = false;
  $('#me-btn').setAttribute('aria-expanded', 'true');
  m.querySelector('button')?.focus();
};
ACT.menuGo = (el) => { closeMeMenu(); go(el.dataset.to); };

function render() {
  closeMeMenu();
  const gate = gateView();
  let name = gate || ROUTE.name;
  if (!gate && name === 'today' && needsSetup()) name = 'setup';
  const params = gate === 'welcome' ? (ROUTE.name === 'account' ? ROUTE.params : {}) : (ROUTE.params || {});
  const v = VIEWS[name] || VIEWS.today;
  const main = $('#main');
  main.innerHTML = v.html(params);
  if (v.mount) v.mount(params);
  if (v.study) studyStart(); else studyStop();
  updateChrome();
}
VIEWS.splash = { html: () => '<div class="splash"><span class="brand-cell big">7.0</span><div class="ai-wait"><span class="spinner"></span>Loading your plan…</div></div>' };
function go(name, params = {}, { force = false } = {}) {
  if (!force && RUN && RUN.dirty && RUN.dirty()) {
    confirmModal({
      title: 'Leave this activity?',
      body: RUN.leaveText || 'Your answers in this activity will be lost.',
      ok: 'Leave', cancel: 'Stay',
      onOk: () => go(name, params, { force: true }),
    });
    return;
  }
  if (RUN && RUN.cleanup) RUN.cleanup();
  RUN = null;
  TTS.stop();
  ROUTE = { name, params };
  render();
  window.scrollTo(0, 0);
}
function rerenderIfIdle() { if (!RUN && document.body) render(); else updateChrome(); }
function onDataReplaced() { rerenderIfIdle(); }

/* ---------- theme ---------- */
function getTheme() { try { return localStorage.getItem('b7.theme') || 'system'; } catch { return 'system'; } }
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
ACT.theme = () => {
  const order = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(getTheme()) + 1) % 3];
  try { localStorage.setItem('b7.theme', next); } catch { /* ignore */ }
  applyTheme(next); updateChrome();
  toast(next === 'system' ? 'Theme matches your device' : `${next[0].toUpperCase() + next.slice(1)} theme`);
};
ACT.nav = (el) => go(el.dataset.to);
ACT.back = (el) => go(el.dataset.to || 'today', el.dataset.params ? JSON.parse(el.dataset.params) : {});

/* ---------- toast + modal ---------- */
let toastTimer;
function toast(msg) {
  const root = $('#toast-root'); if (!root) return;
  root.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { root.innerHTML = ''; }, 2600);
}
let MODAL = null;
/* onCancel runs for the Cancel button; onDismiss (defaults to onCancel) for the backdrop and Escape. */
function confirmModal({ title, body, ok = 'OK', cancel = 'Cancel', danger = false, onOk, onCancel, onDismiss }) {
  MODAL = { onOk, onCancel, onDismiss: onDismiss || onCancel };
  $('#modal-root').innerHTML = `<div class="modal-back" data-act="modalDismiss"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t" data-stop="1">
      <h2 id="modal-t">${esc(title)}</h2><div class="muted">${body}</div>
      <div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" data-act="modalClose">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : ''}" data-act="modalOk">${esc(ok)}</button></div></div></div>`;
  $('#modal-root [data-act="modalOk"]').focus();
}
function closeModal(kind) {
  const m = MODAL; $('#modal-root').innerHTML = ''; MODAL = null;
  const fn = m && (kind === 'cancel' ? m.onCancel : m.onDismiss);
  if (fn) fn();
}
ACT.modalClose = () => closeModal('cancel');
ACT.modalDismiss = (el, e) => { if (e.target.closest('[data-stop]')) return; closeModal('dismiss'); };
ACT.modalOk = () => { const m = MODAL; $('#modal-root').innerHTML = ''; MODAL = null; if (m && m.onOk) m.onOk(); };

/* ---------- countdown timer (tap to pause; runs into overtime) ---------- */
class Countdown {
  constructor(seconds, { id, onEnd, onTick, elapsed = 0, autostart = false } = {}) {
    this.total = seconds; this.elapsed = elapsed; this.id = id; this.onEnd = onEnd; this.onTick = onTick;
    this.running = false; this.ended = false; this.int = null; this.last = 0;
    if (autostart) this.start();
  }
  get left() { return this.total - this.elapsed; }
  start() {
    if (this.running) return;
    this.running = true; this.last = Date.now();
    this.int = setInterval(() => this.tick(), 250);
    this.paint();
  }
  pause() { if (!this.running) return; this.tick(); this.running = false; clearInterval(this.int); this.paint(); }
  toggle() { this.running ? this.pause() : this.start(); }
  tick() {
    if (!this.running) return;
    const now = Date.now(); this.elapsed += (now - this.last) / 1000; this.last = now;
    if (!this.ended && this.left <= 0) { this.ended = true; if (this.onEnd) this.onEnd(); }
    if (this.onTick) this.onTick(this);
    this.paint();
  }
  stop() { this.pause(); clearInterval(this.int); }
  paint() {
    const el = this.id && document.getElementById(this.id);
    if (!el) return;
    const left = this.left;
    el.textContent = left >= 0 ? fmtClock(left) : `+${fmtClock(-left)}`;
    const wrap = el.closest('.timer');
    if (wrap) {
      wrap.classList.toggle('paused', !this.running);
      wrap.classList.toggle('warn', left > 0 && left <= Math.min(300, this.total * 0.15));
      wrap.classList.toggle('bad', left <= 60);
      wrap.title = this.running ? 'Tap to pause' : 'Tap to start';
    }
  }
}
const timerHtml = (id, label) => `<button class="timer paused" data-act="timer" aria-label="${esc(label || 'Timer')}"><span id="${id}">--:--</span></button>`;
ACT.timer = () => { if (RUN && RUN.timer) RUN.timer.toggle(); };

/* ---------- shared bits ---------- */
const backBtn = (to, label, params) => `<button class="back" data-act="back" data-to="${to}" ${params ? `data-params='${esc(JSON.stringify(params))}'` : ''}>${ICONS.back}${esc(label)}</button>`;
const skillDot = (s) => `<span class="skill-dot ${s}" aria-hidden="true"></span>`;
function bandRuler(skill, est, { target = S.profile.target, minTarget = S.profile.minTarget, label = '', gapText = '' } = {}) {
  const lo = 4, hi = 9;
  const pct = (v) => `${((clamp(v, lo, hi) - lo) / (hi - lo)) * 100}%`;
  const ticks = [];
  for (let v = lo; v <= hi; v += 0.5) ticks.push(`<i class="ruler-tick ${Number.isInteger(v) ? 'major' : ''}" style="left:${pct(v)}"></i>`);
  const labels = [4, 5, 6, 7, 8, 9].map((v) => `<span style="left:${pct(v)}">${v}</span>`).join('');
  const val = est == null ? null : roundHalf(est);
  const name = label || SKILL_NAME[skill];
  const gap = gapText ? `<span class="ruler-gap">${esc(gapText)}</span>` : val == null ? '' : val >= target ? '<span class="pill good">At target</span>' : `<span class="ruler-gap">${(target - val).toFixed(1)} below ${target.toFixed(1)}</span>`;
  return `<div class="ruler" aria-label="${esc(name)} ${val == null ? 'no estimate yet' : 'estimated band ' + fmtBand(val)}">
    <div class="ruler-top"><span class="ruler-name">${label ? '' : skillDot(skill)} ${esc(name)}</span><span class="row" style="gap:10px">${gap}<span class="ruler-val">${fmtBand(val)}</span></span></div>
    <div class="ruler-track"><div class="ruler-line"></div>${ticks.join('')}
      ${val != null ? `<div class="ruler-fill" style="width:${pct(val)}"></div>` : ''}
      <i class="ruler-target min" style="left:${pct(minTarget)}" title="Minimum ${minTarget}"></i>
      <i class="ruler-target" style="left:${pct(target)}" title="Target ${target}"></i>
      ${val != null ? `<i class="ruler-dot" style="left:${pct(val)}"></i>` : ''}</div>
    <div class="ruler-labels">${labels}</div></div>`;
}
function aiStatusNote() {
  if (AI.state === 'ready') return '';
  if (AI.state === 'loading') return '<div class="note">Connecting to Claude for grading…</div>';
  if (AI.state === 'denied') return '<div class="note warn">Claude access was declined for this page, so grading is off for this visit. Reload to be asked again.</div>';
  return '<div class="note warn">AI grading needs this page to be open inside Claude. Here you can still practise, see model answers and assess yourself.</div>';
}

/* ---------- Arabic explanation of selected text (reading passages, transcripts, feedback) ---------- */
let LAST_SEL = { text: '', context: '', range: null };
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const text = sel.toString().trim();
  if (!text || text.length > 80) return;
  const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  const zone = node && node.closest && node.closest('[data-explain]');
  if (!zone) return;
  const para = node.closest('p, .para, .line, li, div');
  LAST_SEL = { text, context: para ? para.textContent.trim().slice(0, 400) : '', range: sel.getRangeAt(0).cloneRange() };
});
ACT.explainSel = async (el) => {
  const box = document.getElementById(el.dataset.out || 'explain-out');
  const term = LAST_SEL.text;
  if (!term) { toast('Select a word or phrase in the text first.'); return; }
  if (!aiReady()) { box.hidden = false; box.innerHTML = `<div class="note warn">${esc(aiErrorText({ code: 'absent' }))}</div>`; return; }
  box.hidden = false;
  box.innerHTML = `<div class="ai-wait"><span class="spinner"></span>Explaining “${esc(term)}” in Arabic…</div>`;
  try {
    const text = await aiText(explainArabicPrompt(term, LAST_SEL.context), {
      tier: 'quick',
      onText: ({ text: t }) => { box.innerHTML = `<div class="ar-box"><div class="xs faint" dir="ltr" style="text-align:left">${esc(term)}</div><div class="ar" lang="ar">${esc(t)}</div></div>`; },
    });
    box.innerHTML = `<div class="ar-box"><div class="row-between"><b dir="ltr">${esc(term)}</b><button class="btn quiet small" data-act="closeBox" data-box="${esc(box.id)}">Close</button></div><div class="ar" lang="ar">${esc(text)}</div></div>`;
  } catch (e) {
    box.innerHTML = `<div class="note warn">${esc(aiErrorText(e))}</div>`;
  }
};
ACT.closeBox = (el) => { const b = document.getElementById(el.dataset.box); if (b) { b.hidden = true; b.innerHTML = ''; } };
ACT.highlightSel = () => {
  const r = LAST_SEL.range;
  if (!r) { toast('Select some text in the passage first.'); return; }
  try {
    const m = document.createElement('mark');
    r.surroundContents(m);
    window.getSelection().removeAllRanges();
    LAST_SEL = { text: '', context: '', range: null };
  } catch { toast('Highlight within one paragraph at a time.'); }
};
const selTools = (out) => `<div class="sel-tools"><button class="btn ghost small" data-act="highlightSel">Highlight selection</button><button class="btn ghost small ar-btn" data-act="explainSel" data-out="${out}">Explain selection · شرح بالعربية</button></div><div id="${out}" hidden></div>`;
ACT.toggleAr = (el) => {
  const box = el.closest('[data-ar-scope]') || document.body;
  box.classList.toggle('show-ar');
  el.setAttribute('aria-pressed', String(box.classList.contains('show-ar')));
};

/* ---------- events ---------- */
function bindEvents() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ACT[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
    fn(el, e);
  });
  const onField = (e) => {
    const el = e.target;
    if (RUN && RUN.quiz && (el.dataset.q || el.dataset.multi)) {
      const textual = el.tagName === 'INPUT' && el.type === 'text';
      if (textual ? e.type === 'input' : e.type === 'change') quizInputHandler(RUN.quiz, el);
    }
    if (el.dataset.ch && CHG[el.dataset.ch]) CHG[el.dataset.ch](el, e);
  };
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (MODAL) closeModal('dismiss'); else closeMeMenu(); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('#me-menu, #me-btn')) closeMeMenu(); }, true);
  window.addEventListener('beforeunload', () => { save(); });
}
