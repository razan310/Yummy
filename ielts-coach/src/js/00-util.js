'use strict';
/* ---------- small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = (s) => String(s ?? '').trim().split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wordCount = (s) => (String(s ?? '').trim().match(/\S+/g) || []).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const clone = (o) => JSON.parse(JSON.stringify(o));
const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------- dates (local calendar days as YYYY-MM-DD) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const today = () => ymd();
const fmtDate = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => parseYmd(s).toLocaleDateString('en-GB', o);
const fmtLong = (s) => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long' });
const fmtFull = (s) => fmtDate(s, { day: 'numeric', month: 'long', year: 'numeric' });
const dow = (s) => parseYmd(s).getDay();
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmtClock = (sec) => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60); return `${pad(m)}:${pad(sec % 60)}`; };
const fmtMins = (min) => { min = Math.round(min); if (min < 60) return `${min} min`; const h = Math.floor(min / 60); const m = min % 60; return m ? `${h} h ${m} min` : `${h} h`; };

/* ---------- IELTS bands ---------- */
const SKILLS = ['L', 'R', 'W', 'S'];
const SKILL_NAME = { L: 'Listening', R: 'Reading', W: 'Writing', S: 'Speaking' };
const roundHalf = (x) => Math.round(x * 2 + 1e-9) / 2;          // overall band: .25 -> .5, .75 -> next whole
const floorHalf = (x) => Math.floor(x * 2 + 1e-9) / 2;          // strict: round down to the half band
const fmtBand = (b) => (b == null || Number.isNaN(b) ? '–' : (Math.round(b * 2) / 2).toFixed(1));
function overallBand(b) {
  const v = SKILLS.map((k) => b[k]).filter((x) => x != null);
  return v.length === 4 ? roundHalf(sum(v) / 4) : null;
}
// Approximate public raw-score conversion tables (Academic Reading, Listening), out of 40.
const READING_TABLE = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0]];
const LISTENING_TABLE = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0]];
function rawToBand(skill, correct, total, adjust = 0) {
  if (!total) return null;
  const scaled = Math.round((correct / total) * 40);
  const table = skill === 'L' ? LISTENING_TABLE : READING_TABLE;
  let band = 0;
  for (const [min, b] of table) if (scaled >= min) { band = b; break; }
  // A single short set is easier than a full 40-question paper: subtract the difficulty adjustment.
  return clamp(band + adjust, 0, 9);
}

/* ---------- answer checking ---------- */
const normAns = (s) => String(s ?? '').toLowerCase()
  .replace(/[’‘`]/g, "'").replace(/[£$€]/g, '').replace(/[.,;:!?"()]/g, '')
  .replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^(the|a|an) /, '');
function isRightText(given, answer) {
  const alts = Array.isArray(answer) ? answer : [answer];
  const g = normAns(given);
  return g.length > 0 && alts.some((a) => normAns(a) === g);
}
