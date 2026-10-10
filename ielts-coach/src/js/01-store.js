/* ---------- state + persistence ----------
   The whole study record lives in S. It is cached in localStorage for instant load and,
   when the page runs inside Claude, saved to the learner's private db subtree
   (data/users/<id>/...), which survives devices and republishes. */
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

/* ---------- cloud (Claude db) ---------- */
const Cloud = { db: null, uid: null, status: 'connecting', error: '' };
const writers = {};

function cloudPath(id) { return `data/users/${Cloud.uid}/${id}`; }

function cloudWrite(id, getData) {
  if (!Cloud.db || !Cloud.uid) return;
  const w = writers[id] || (writers[id] = { busy: false, dirty: false, get: null });
  w.get = getData;
  if (w.busy) { w.dirty = true; return; }
  const run = async () => {
    w.busy = true; w.dirty = false;
    let attempt = 0;
    for (;;) {
      try {
        await Cloud.db.doc(cloudPath(id)).set(w.get());
        Cloud.error = '';
        break;
      } catch (e) {
        if (e?.code === 'unavailable' && attempt++ < 1) { await sleep(800 + Math.random() * 1200); continue; }
        if (e?.code === 'quota_exceeded') Cloud.error = 'Your saved data is full. Delete old attempts in Settings.';
        else if (e?.code === 'invalid_argument') Cloud.error = 'This record could not be saved (too large).';
        else Cloud.error = 'Saving to your Claude account failed; your progress is kept on this device.';
        updateSyncBadge();
        break;
      }
    }
    w.busy = false;
    if (w.dirty) run();
  };
  run();
}

const pushCore = debounce(() => cloudWrite('core', () => ({ type: 'core', ...clone(S) })), 1200);
const pushSrs = debounce(() => cloudWrite('srs', () => ({ type: 'srs', ...clone(SRS) })), 1500);

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
  LS.set(LS_DOC + id, Cloud.db ? { ...data, synced: true } : data);
  cloudWrite(id, () => ({ ...clone(data), type: data.type || 'att' }));
}
async function loadDoc(id) {
  if (DOCS[id]) return DOCS[id];
  const local = LS.get(LS_DOC + id);
  if (local) { DOCS[id] = local; return local; }
  if (Cloud.db) {
    try {
      const snap = await Cloud.db.doc(cloudPath(id)).get();
      if (snap.exists) { DOCS[id] = clone(snap.data()); LS.set(LS_DOC + id, DOCS[id]); return DOCS[id]; }
    } catch { /* fall through */ }
  }
  return null;
}
function deleteDoc(id) {
  delete DOCS[id];
  LS.del(LS_DOC + id);
  if (Cloud.db) Cloud.db.doc(cloudPath(id)).delete().catch(() => {});
}

async function cloudInit() {
  if (!window.claude?.use) { Cloud.status = 'local'; updateSyncBadge(); return; }
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const id = user ? await user.id() : null;
    if (!db || !id) { Cloud.status = 'local'; updateSyncBadge(); return; }
    const base = `data/users/${id}`;
    // Read before enabling writes, so nothing created on this device in the first moments
    // (such as today's task list) can overwrite progress saved from another device.
    const [core, srs, gens] = await Promise.all([
      db.doc(`${base}/core`).get(),
      db.doc(`${base}/srs`).get(),
      db.collection(base).where('type', '==', 'gen').get().catch(() => null),
    ]);
    Cloud.db = db; Cloud.uid = id;
    let changed = false;
    if (core.exists) {
      const remote = clone(core.data());
      delete remote.type;
      if ((remote.updatedAt || 0) > LOADED_AT.core) { S = mergeDefaults(defaultState(), remote); LS.set(LS_CORE, S); changed = true; }
      else if ((S.updatedAt || 0) > (remote.updatedAt || 0)) pushCore();
    } else if (S.updatedAt) pushCore();
    if (srs.exists) {
      const remote = clone(srs.data());
      delete remote.type;
      if ((remote.updatedAt || 0) > LOADED_AT.srs) { SRS = { updatedAt: remote.updatedAt, cards: remote.cards || {} }; LS.set(LS_SRS, SRS); changed = true; }
      else if ((SRS.updatedAt || 0) > (remote.updatedAt || 0)) pushSrs();
    } else if (SRS.updatedAt) pushSrs();
    // Attempts saved on this device before the account connected.
    S.journal.forEach((j) => { const d = LS.get(LS_DOC + j.id); if (d && !d.synced) { d.synced = true; LS.set(LS_DOC + j.id, d); cloudWrite(j.id, () => ({ ...d, type: 'att' })); } });
    if (gens && !gens.empty) gens.docs.forEach((d) => { if (!DOCS[d.id]) { DOCS[d.id] = clone(d.data()); LS.set(LS_DOC + d.id, DOCS[d.id]); } });
    Cloud.status = 'cloud';
    updateSyncBadge();
    if (changed) onDataReplaced();
  } catch (e) {
    Cloud.status = 'local';
    Cloud.error = e?.code === 'revoked' ? '' : 'Could not reach your Claude account; saving on this device.';
    updateSyncBadge();
  }
}

function updateSyncBadge() {
  const el = $('#sync');
  if (!el) return;
  const map = {
    connecting: ['', 'Connecting…', 'Checking for your saved progress'],
    cloud: ['cloud', 'Saved', 'Progress is saved privately to your Claude account'],
    local: ['local', 'This device', 'Progress is saved in this browser only'],
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}
