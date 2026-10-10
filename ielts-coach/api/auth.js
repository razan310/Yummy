// GET  /api/auth  -> the signed-in user, or 401
// POST /api/auth  {action: 'register' | 'login' | 'logout', email, password, name}
import {
  json, fail, readJson, writeJson, getSession, createSession, endSession, sessionCookie,
  hashPassword, checkPassword, sha256, newId, fromApp, SESSION_DAYS,
} from './_lib.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
const userPath = (email) => `users/${sha256(email)}.json`;
const publicUser = (u) => ({ email: u.email, name: u.name || '' });
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;

export async function GET(request) {
  const s = await getSession(request);
  if (!s) return json({ user: null }, 401);
  const u = await readJson(userPath(s.email));
  if (!u || u.uid !== s.uid) return json({ user: null }, 401);
  return json({ user: publicUser(u) });
}

export async function POST(request) {
  if (!fromApp(request)) return fail(403, 'Request refused.');
  let body;
  try { body = await request.json(); } catch { return fail(400, 'Invalid request.'); }
  const action = body && body.action;

  if (action === 'logout') {
    const s = await getSession(request);
    if (s) await endSession(s.token);
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (email.length > 254 || !EMAIL.test(email)) return fail(400, 'Enter a valid email address.');
  if (password.length < 8 || password.length > 200) return fail(400, 'Use a password of at least 8 characters.');

  if (action === 'register') {
    if (process.env.SIGNUPS === 'closed') return fail(403, 'New accounts are closed on this site.');
    if (await readJson(userPath(email))) return fail(409, 'An account with this email already exists. Sign in instead.');
    const { salt, hash } = await hashPassword(password);
    const user = { uid: newId(), email, name: String(body.name || '').trim().slice(0, 60), salt, hash, createdAt: Date.now(), fails: 0, lockUntil: 0 };
    try {
      await writeJson(userPath(email), user, { overwrite: false });
    } catch {
      return fail(409, 'An account with this email already exists. Sign in instead.');
    }
    const token = await createSession(user);
    return json({ user: publicUser(user) }, 201, { 'set-cookie': sessionCookie(token, SESSION_DAYS * 86400) });
  }

  if (action === 'login') {
    const user = await readJson(userPath(email));
    if (!user) {
      await hashPassword(password); // spend the same time as a real check
      return fail(401, 'Email or password is incorrect.');
    }
    if (user.lockUntil > Date.now()) return fail(429, 'Too many failed attempts. Try again in 15 minutes.');
    if (!(await checkPassword(password, user.salt, user.hash))) {
      user.fails = (user.fails || 0) + 1;
      if (user.fails >= MAX_FAILS) { user.fails = 0; user.lockUntil = Date.now() + LOCK_MS; }
      await writeJson(userPath(email), user);
      return fail(401, 'Email or password is incorrect.');
    }
    if (user.fails || user.lockUntil) { user.fails = 0; user.lockUntil = 0; await writeJson(userPath(email), user); }
    const token = await createSession(user);
    return json({ user: publicUser(user) }, 200, { 'set-cookie': sessionCookie(token, SESSION_DAYS * 86400) });
  }

  return fail(400, 'Unknown action.');
}
