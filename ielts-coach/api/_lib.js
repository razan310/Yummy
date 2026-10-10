// Shared helpers for the account API. Files starting with "_" are not deployed as routes.
// Storage is a private Vercel Blob store (BLOB_READ_WRITE_TOKEN is provided by the project):
//   users/<sha256(email)>.json      account record (password stored as a scrypt hash)
//   sessions/<sha256(token)>.json   sign-in sessions (the raw token lives only in the cookie)
//   data/<uid>/<doc>.json           progress documents (core, srs, att_*)
import { put, get, del } from '@vercel/blob';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
export const SESSION_DAYS = 60;
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export const newId = () => randomBytes(12).toString('hex');

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
export const fail = (status, error) => json({ error }, status);

export async function readJson(pathname) {
  let r;
  try { r = await get(pathname, { access: 'private', useCache: false }); } catch (e) {
    if (e && e.name === 'BlobNotFoundError') return null;
    throw e;
  }
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function readText(pathname) {
  let r;
  try { r = await get(pathname, { access: 'private', useCache: false }); } catch (e) {
    if (e && e.name === 'BlobNotFoundError') return null;
    throw e;
  }
  if (!r || r.statusCode !== 200) return null;
  return new Response(r.stream).text();
}
export async function writeText(pathname, text, { overwrite = true } = {}) {
  await put(pathname, text, { access: 'private', addRandomSuffix: false, allowOverwrite: overwrite, contentType: 'application/json' });
}
export const writeJson = (pathname, data, opts) => writeText(pathname, JSON.stringify(data), opts);
export async function removeBlob(pathname) {
  try { await del(pathname); } catch { /* already gone */ }
}

/* Mutating requests must come from the app itself: the custom header cannot be sent
   cross-site without a CORS preflight, which this API never approves. */
export const fromApp = (request) => request.headers.get('x-band-seven') === '1';

function cookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
export const sessionCookie = (token, maxAgeSec) => `b7s=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;

export async function getSession(request) {
  const token = cookie(request, 'b7s');
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const s = await readJson(`sessions/${sha256(token)}.json`);
  if (!s || !s.uid || !(s.exp > Date.now())) return null;
  return { ...s, token };
}
export async function createSession(user) {
  const token = randomBytes(32).toString('base64url');
  const exp = Date.now() + SESSION_DAYS * 86400000;
  await writeJson(`sessions/${sha256(token)}.json`, { uid: user.uid, email: user.email, exp });
  return token;
}
export const endSession = (token) => removeBlob(`sessions/${sha256(token)}.json`);

export async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const buf = await scrypt(password.normalize('NFKC'), salt, 64);
  return { salt, hash: buf.toString('hex') };
}
export async function checkPassword(password, salt, hash) {
  const { hash: h } = await hashPassword(password, salt);
  const a = Buffer.from(h, 'hex'); const b = Buffer.from(String(hash), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
