/* ---------- state + persistence ----------
   The whole study record lives in S. It is cached in localStorage for instant load and saved
   remotely: inside Claude to the learner's private db subtree, and on the hosted site to the
   learner's account through this site's API. */
const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};
const LS_CORE = 'b7.core.v1';
const LS_SRS = 'b7.srs.v1';
const LS_DOC = 'b7.doc.';

function defaultState() {
  return {
    v: 1,
    updatedAt: 0,
    profile: {
      startDate: today(),
      examDate: '2026-12-12',
      finalDate: '2027-07-31',
      target: 7,
      minTarget: 6.5,
      dailyMinutes: 105,
      lightDay: 5,
      mockDay: 6,
      newWords: 6,
      ttsRate: 1,
      autoArabic: false,
      readQuestions: true,
    },
    placement: null,           // {status, step, results:{R,L,W,S}, bands:{}, date}
    scores: [],                // {id, ts, date, skill, band, kind, ref, raw, label}
    days: {},                  // date -> {tasks:[...], week}
    weekEst: {},               // week -> frozen estimates used to plan that week
    studySec: {},              // date -> seconds of active study
    done: {},                  // 'reading:r01' -> {date, score, total, band}
    qstats: {},                // question type -> {c, t}
    journal: [],               // writing/speaking attempts (summary; full text in att_ docs)
    lastCrit: {},              // 'W' / 'S' -> weakest criterion of the latest feedback
    vocab: { cursor: 0, newDate: '', newCount: 0 },
    grammar: {},               // g01 -> {score, total, date}
    mocks: {},                 // week -> mock record
    gen: [],                   // summaries of AI-generated practice items
    account: '',               // the hosted-site account this copy belongs to
  };
}

let S = defaultState();
let LOADED_AT = { core: 0, srs: 0 };   // timestamps of the local copy as it was when the page opened
let SRS = { updatedAt: 0, cards: {} };   // word -> {due, ivl, ease, reps, lapses}
const DOCS = {};                           // id -> loaded attempt / generated item

function mergeDefaults(base, saved) {
  const out = { ...base, ...saved };
  out.profile = { ...base.profile, ...(saved.profile || {}) };
  out.vocab = { ...base.vocab, ...(saved.vocab || {}) };
  return out;
}

function loadLocal() {
  const core = LS.get(LS_CORE);
  if (core && core.v === 1) S = mergeDefaults(defaultState(), core);
  const srs = LS.get(LS_SRS);
  if (srs && srs.cards) SRS = srs;
  LOADED_AT = { core: S.updatedAt || 0, srs: SRS.updatedAt || 0 };
}

/* ---------- remote storage ----------
   Two backends share one sync path:
   - 'claude': inside Claude, the artifact's private db subtree for this viewer.
   - 'server': on the hosted site (Vercel), this site's own API, after the learner signs in.
   Reads may happen before reconciling; writes start only once Cloud.ready is true, so a fresh
   device never overwrites progress saved elsewhere. */
const Cloud = { kind: null, db: null, uid: null, user: null, ready: false, status: 'connecting', error: '' };
const writers = {};

function cloudPath(id) { return `data/users/${Cloud.uid}/${id}`; }
function api(path, opts = {}) {
  return fetch(path, { credentials: 'same-origin', cache: 'no-store', ...opts, headers: { 'content-type': 'application/json', 'x-band-seven': '1', ...(opts.headers || {}) } });
}
const Remote = {
  async get(id) {
    if (Cloud.kind === 'claude') { const snap = await Cloud.db.doc(cloudPath(id)).get(); return snap.exists ? clone(snap.data()) : null; }
    if (Cloud.kind === 'server') {
      const r = await api(`/api/data?doc=${encodeURIComponent(id)}`);
      if (r.status === 404) return null;
      if (!r.ok) throw { code: r.status === 401 ? 'signed_out' : 'unavailable' };
      return r.json();
    }
    return null;
  },
  async set(id, data) {
    if (Cloud.kind === 'claude') return Cloud.db.doc(cloudPath(id)).set(data);
    if (Cloud.kind === 'server') {
      const body = JSON.stringify(data);
      const r = await api(`/api/data?doc=${encodeURIComponent(id)}`, { method: 'PUT', body, keepalive: body.length < 60000 });
      if (!r.ok) throw { code: r.status === 401 ? 'signed_out' : r.status === 413 ? 'invalid_argument' : 'unavailable' };
    }
    return undefined;
  },
  async del(id) {
    if (Cloud.kind === 'claude') return Cloud.db.doc(cloudPath(id)).delete();
    if (Cloud.kind === 'server') await api(`/api/data?doc=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return undefined;
  },
};

function cloudWrite(id, getData) {
  if (!Cloud.ready) return;
  const w = writers[id] || (writers[id] = { busy: false, dirty: false, get: null });
  w.get = getData;
  if (w.busy) { w.dirty = true; return; }
  const run = async () => {
    w.busy = true; w.dirty = false;
    let attempt = 0;
    for (;;) {
      try {
        await Remote.set(id, w.get());
        Cloud.error = '';
        break;
      } catch (e) {
        if (e?.code === 'unavailable' && attempt++ < 1) { await sleep(800 + Math.random() * 1200); continue; }
        if (e?.code === 'signed_out') { Cloud.ready = false; Cloud.user = null; Cloud.status = 'signed-out'; Cloud.error = 'You were signed out. Sign in again to keep saving to your account.'; }
        else if (e?.code === 'quota_exceeded') Cloud.error = 'Your saved data is full. Delete old attempts in Settings.';
        else if (e?.code === 'invalid_argument') Cloud.error = 'This record could not be saved (too large).';
        else Cloud.error = 'Saving to your account failed; your progress is kept on this device and will be saved again later.';
        updateSyncBadge();
        break;
      }
    }
    w.busy = false;
    if (w.dirty) run();
  };
  run();
}
async function waitForWrites(ms = 4000) {
  const end = Date.now() + ms;
  while (Object.values(writers).some((w) => w.busy || w.dirty) && Date.now() < end) await sleep(100);
}

/* Debounce with flush(): the hosted site batches writes more (each write costs a storage operation). */
function debounced(fn, msFn) {
  let t = null;
  const d = () => { clearTimeout(t); t = setTimeout(() => { t = null; fn(); }, msFn()); };
  d.flush = () => { if (t) { clearTimeout(t); t = null; fn(); } };
  return d;
}
const pushCore = debounced(() => cloudWrite('core', () => ({ type: 'core', ...clone(S) })), () => (Cloud.kind === 'server' ? 4000 : 1200));
const pushSrs = debounced(() => cloudWrite('srs', () => ({ type: 'srs', ...clone(SRS) })), () => (Cloud.kind === 'server' ? 6000 : 1500));
function flushWrites() { pushCore.flush(); pushSrs.flush(); }

function save({ cloud = true } = {}) {
  S.updatedAt = Date.now();
  LS.set(LS_CORE, S);
  if (cloud) pushCore();
}
function saveSrs() {
  SRS.updatedAt = Date.now();
  LS.set(LS_SRS, SRS);
  pushSrs();
}
function saveDoc(id, data) {
  DOCS[id] = data;
  LS.set(LS_DOC + id, Cloud.ready ? { ...data, synced: true } : data);
  cloudWrite(id, () => ({ ...clone(data), type: data.type || 'att' }));
}
async function loadDoc(id) {
  if (DOCS[id]) return DOCS[id];
  const local = LS.get(LS_DOC + id);
  if (local) { DOCS[id] = local; return local; }
  if (Cloud.kind) {
    try {
      const d = await Remote.get(id);
      if (d) { DOCS[id] = d; LS.set(LS_DOC + id, d); return d; }
    } catch { /* fall through */ }
  }
  return null;
}
function deleteDoc(id) {
  delete DOCS[id];
  LS.del(LS_DOC + id);
  if (Cloud.ready) Remote.del(id).catch(() => {});
}

/* Merge what the account holds with this device's copy. The newer side wins; the device's copy
   counts as newer only if it changed before this page opened (so a fresh device never wins). */
function reconcile(core, srs) {
  let changed = false;
  if (core) {
    delete core.type;
    if ((core.updatedAt || 0) > LOADED_AT.core) { S = mergeDefaults(defaultState(), core); LS.set(LS_CORE, S); changed = true; }
    else if ((S.updatedAt || 0) > (core.updatedAt || 0)) pushCore();
  } else if (S.updatedAt) pushCore();
  if (srs) {
    delete srs.type;
    if ((srs.updatedAt || 0) > LOADED_AT.srs) { SRS = { updatedAt: srs.updatedAt, cards: srs.cards || {} }; LS.set(LS_SRS, SRS); changed = true; }
    else if ((SRS.updatedAt || 0) > (srs.updatedAt || 0)) pushSrs();
  } else if (SRS.updatedAt) pushSrs();
  // Attempts saved on this device before the account connected.
  S.journal.forEach((j) => { const d = LS.get(LS_DOC + j.id); if (d && !d.synced) { d.synced = true; LS.set(LS_DOC + j.id, d); cloudWrite(j.id, () => ({ ...d, type: 'att' })); } });
  return changed;
}

async function cloudInit() {
  if (window.claude?.use) return claudeInit();
  if (/^https?:$/.test(location.protocol)) return serverInit();
  Cloud.status = 'local'; updateSyncBadge();
  return undefined;
}
async function claudeInit() {
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const id = user ? await user.id() : null;
    if (!db || !id) { Cloud.status = 'local'; updateSyncBadge(); return; }
    Cloud.kind = 'claude'; Cloud.db = db; Cloud.uid = id;
    const base = `data/users/${id}`;
    const [core, srs, gens] = await Promise.all([
      Remote.get('core'), Remote.get('srs'),
      db.collection(base).where('type', '==', 'gen').get().catch(() => null),
    ]);
    Cloud.ready = true;
    const changed = reconcile(core, srs);
    if (gens && !gens.empty) gens.docs.forEach((d) => { if (!DOCS[d.id]) { DOCS[d.id] = clone(d.data()); LS.set(LS_DOC + d.id, DOCS[d.id]); } });
    Cloud.status = 'cloud';
    updateSyncBadge();
    if (changed) onDataReplaced();
  } catch (e) {
    Cloud.kind = null; Cloud.ready = false;
    Cloud.status = 'local';
    Cloud.error = e?.code === 'revoked' ? '' : 'Could not reach your Claude account; saving on this device.';
    updateSyncBadge();
  }
}
async function serverInit() {
  let r;
  try { r = await api('/api/auth'); } catch { Cloud.status = 'local'; updateSyncBadge(); return; }
  if (r.status === 401) { Cloud.kind = 'server'; Cloud.status = 'signed-out'; updateSyncBadge(); rerenderIfIdle(); return; }
  const data = r.ok ? await r.json().catch(() => null) : null;
  if (!data || !data.user) { Cloud.status = 'local'; updateSyncBadge(); return; }   // no account API on this host
  await connectAccount(data.user);
}
/* After sign-in or sign-up: load the account's progress and decide what to keep. */
async function connectAccount(user, { interactive = false } = {}) {
  Cloud.kind = 'server'; Cloud.user = user; Cloud.status = 'connecting'; updateSyncBadge();
  let core = null, srs = null;
  try { [core, srs] = await Promise.all([Remote.get('core'), Remote.get('srs')]); }
  catch { Cloud.status = 'signed-out'; Cloud.user = null; Cloud.error = 'Could not load your account. Try signing in again.'; updateSyncBadge(); return; }
  const deviceHasOtherProgress = S.account !== user.email && (S.scores.length > 0 || Object.keys(S.done).length > 0 || Object.keys(SRS.cards).length > 0);
  const finish = (useDevice) => {
    if (useDevice) { LOADED_AT = { core: Number.MAX_SAFE_INTEGER, srs: Number.MAX_SAFE_INTEGER }; }
    Cloud.ready = true;
    const changed = reconcile(core, srs);
    LOADED_AT = { core: S.updatedAt || 0, srs: SRS.updatedAt || 0 };
    if (S.account !== user.email) { S.account = user.email; save(); }
    if (useDevice) { save(); saveSrs(); }
    Cloud.status = 'cloud'; Cloud.error = '';
    updateSyncBadge();
    if (changed || interactive) onDataReplaced();
  };
  if (core && deviceHasOtherProgress && interactive) {
    confirmModal({
      title: 'Which progress should your account keep?',
      body: `<p>Your account already has saved progress, and this device also has progress that is not in your account.</p><p style="margin-top:8px">Keep the account’s progress (recommended), or replace it with what is on this device.</p>`,
      ok: 'Keep my account’s progress', cancel: 'Use this device’s progress',
      onOk: () => finish(false),
      onCancel: () => finish(true),
      onDismiss: () => finish(false),
    });
    return;
  }
  finish(!core && deviceHasOtherProgress);
}
async function signOut() {
  flushWrites();
  await waitForWrites();
  try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }); } catch { /* cookie is cleared server-side when reachable */ }
  LS.del(LS_CORE); LS.del(LS_SRS);
  Object.keys(DOCS).forEach((k) => { delete DOCS[k]; });
  try { Object.keys(localStorage).filter((k) => k.startsWith(LS_DOC) || k.startsWith('b7.draft')).forEach((k) => localStorage.removeItem(k)); } catch { /* storage blocked */ }
  S = defaultState(); SRS = { updatedAt: 0, cards: {} };
  LOADED_AT = { core: 0, srs: 0 };
  Cloud.user = null; Cloud.ready = false; Cloud.status = 'signed-out'; Cloud.error = '';
  updateSyncBadge();
}

function updateSyncBadge() {
  const el = $('#sync');
  if (!el) return;
  const signedIn = Cloud.kind === 'server' && Cloud.user;
  const map = {
    connecting: ['', 'Connecting…', 'Checking for your saved progress'],
    cloud: ['cloud', 'Saved', signedIn ? `Progress is saved to your account (${Cloud.user.email})` : 'Progress is saved privately to your Claude account'],
    local: ['local', 'This device', 'Progress is saved in this browser only'],
    'signed-out': ['local out', 'Sign in', 'Sign in or create an account to save your progress on every device'],
  };
  const [cls, label, title] = map[Cloud.status] || map.local;
  el.className = `sync ${cls}`;
  el.title = Cloud.error || title;
  el.innerHTML = `<span>${esc(label)}</span>`;
}

/* ---------- study-time tracking (active, visible, recently-interacted time only) ---------- */
const Study = { lastInput: Date.now(), active: false, tick: null };
function studyStart() { Study.active = true; Study.lastInput = Date.now(); }
function studyStop() { Study.active = false; }
function initStudyTimer() {
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { Study.lastInput = Date.now(); }, { passive: true, capture: true }));
  Study.tick = setInterval(() => {
    if (!Study.active || document.hidden) return;
    const idle = Date.now() - Study.lastInput > 150000 && !(RUN && RUN.keepAlive && RUN.keepAlive());
    if (idle) return;
    const d = today();
    S.studySec[d] = (S.studySec[d] || 0) + 15;
    LS.set(LS_CORE, S);
  }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); flushWrites(); } });
  window.addEventListener('pagehide', () => flushWrites());
}
