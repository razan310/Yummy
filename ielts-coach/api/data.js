// GET    /api/data?doc=core   -> the signed-in user's document, or 404
// PUT    /api/data?doc=core   -> save it (JSON object body)
// DELETE /api/data?doc=att_x  -> delete it
import { json, fail, getSession, readText, writeText, removeBlob, fromApp } from './_lib.js';

const DOC = /^(core|srs|att_[a-z0-9]{6,40})$/;
const MAX_BYTES = { core: 900000, srs: 400000, att: 150000 };

async function target(request) {
  const s = await getSession(request);
  if (!s) return { error: fail(401, 'Sign in to save your progress.') };
  const doc = new URL(request.url).searchParams.get('doc') || '';
  if (!DOC.test(doc)) return { error: fail(400, 'Unknown document.') };
  return { doc, path: `data/${s.uid}/${doc}.json` };
}

export async function GET(request) {
  const t = await target(request);
  if (t.error) return t.error;
  const text = await readText(t.path);
  if (text == null) return fail(404, 'Not saved yet.');
  return new Response(text, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function PUT(request) {
  if (!fromApp(request)) return fail(403, 'Request refused.');
  const t = await target(request);
  if (t.error) return t.error;
  const text = await request.text();
  const limit = MAX_BYTES[t.doc.startsWith('att_') ? 'att' : t.doc];
  if (Buffer.byteLength(text) > limit) return fail(413, 'This record is too large to save.');
  let data;
  try { data = JSON.parse(text); } catch { return fail(400, 'Invalid data.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, 'Invalid data.');
  await writeText(t.path, text);
  return json({ ok: true });
}

export async function DELETE(request) {
  if (!fromApp(request)) return fail(403, 'Request refused.');
  const t = await target(request);
  if (t.error) return t.error;
  await removeBlob(t.path);
  return json({ ok: true });
}
