/* ---------- Account (hosted site) ---------- */
VIEWS.account = {
  html({ mode = 'signup' }) {
    const head = `<div class="page-head">${backBtn('today', 'Today')}<h1>Your account</h1></div>`;
    if (Cloud.kind === 'claude') {
      return `${head}<div class="card"><h2>Saved to your Claude account</h2><p class="muted">Inside Claude your progress is saved privately to your Claude account automatically. There is nothing to set up.</p></div>`;
    }
    if (Cloud.kind === 'server' && Cloud.user) {
      return `${head}<div class="card hero">
          <div class="eyebrow">Signed in</div>
          <h2>${esc(Cloud.user.name || Cloud.user.email)}</h2>
          ${Cloud.user.name ? `<p class="muted">${esc(Cloud.user.email)}</p>` : ''}
          <p>Your plan, scores, flashcards and study time are saved to this account. Sign in with the same email on your phone or computer to continue where you stopped.</p>
          ${Cloud.error ? `<div class="note warn">${esc(Cloud.error)}</div>` : ''}
          <div class="btn-row"><button class="btn ghost" data-act="signOut">Sign out</button></div>
        </div>`;
    }
    if (Cloud.kind !== 'server') {
      return `${head}<div class="card"><h2>Accounts work on the online version</h2><p class="muted">This copy of the app is not connected to a server, so your progress is saved in this browser only. Open the app from its website address to create an account.</p></div>`;
    }
    const signup = mode === 'signup';
    const hasLocal = S.scores.length > 0 || Object.keys(SRS.cards).length > 0;
    return `${head}
      <div class="card hero">
        <div class="seg" role="group" aria-label="Account"><button data-act="accMode" data-m="signup" aria-pressed="${signup}">Create account</button><button data-act="accMode" data-m="signin" aria-pressed="${!signup}">Sign in</button></div>
        <p class="muted">${signup ? 'Create a free account to keep your plan, scores and flashcards on every device.' : 'Sign in to load your saved progress.'}${hasLocal && signup ? ' The progress already on this device is saved into your new account.' : ''}</p>
        <form id="acc-form" class="stack" novalidate>
          ${signup ? '<div class="field"><label for="acc-name">Name (optional)</label><input class="input" id="acc-name" autocomplete="name" maxlength="60"></div>' : ''}
          <div class="field"><label for="acc-email">Email</label><input class="input" id="acc-email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required></div>
          <div class="field"><label for="acc-pass">Password</label><input class="input" id="acc-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required>${signup ? '<span class="xs faint">At least 8 characters.</span>' : ''}</div>
          <div id="acc-msg" aria-live="polite"></div>
          <div class="btn-row"><button class="btn" type="submit" id="acc-submit">${signup ? 'Create account' : 'Sign in'}</button></div>
        </form>
      </div>
      <p class="xs faint">Your password is stored only as a salted hash. Progress is stored privately and is visible only to you when signed in.</p>`;
  },
  mount({ mode = 'signup' }) {
    const form = $('#acc-form');
    if (!form) return;
    form.addEventListener('submit', (e) => { e.preventDefault(); submitAccount(mode === 'signup' ? 'register' : 'login'); });
  },
};
ACT.accMode = (el) => go('account', { mode: el.dataset.m });
async function submitAccount(action) {
  const msg = $('#acc-msg'); const btn = $('#acc-submit');
  const email = $('#acc-email').value.trim();
  const password = $('#acc-pass').value;
  const name = $('#acc-name') ? $('#acc-name').value.trim() : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) { msg.innerHTML = '<div class="note bad">Enter a valid email address.</div>'; return; }
  if (password.length < 8) { msg.innerHTML = '<div class="note bad">Use a password of at least 8 characters.</div>'; return; }
  btn.disabled = true; msg.innerHTML = '<div class="ai-wait"><span class="spinner"></span>One moment…</div>';
  try {
    const r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action, email, password, name }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.user) { msg.innerHTML = `<div class="note bad">${esc(data.error || 'Something went wrong. Try again.')}</div>`; btn.disabled = false; return; }
    msg.innerHTML = '';
    await connectAccount(data.user, { interactive: true });
    toast(action === 'register' ? 'Account created. Your progress is saved.' : 'Signed in');
    go('today', {}, { force: true });
  } catch {
    msg.innerHTML = '<div class="note bad">Could not reach the server. Check your connection and try again.</div>';
    btn.disabled = false;
  }
}
ACT.signOut = () => {
  confirmModal({
    title: 'Sign out?', body: 'Your progress stays saved in your account. This device forgets it until you sign in again.', ok: 'Sign out',
    onOk: async () => { await signOut(); toast('Signed out'); go('account', { mode: 'signin' }, { force: true }); },
  });
};
function accountBanner() {
  if (Cloud.kind !== 'server' || Cloud.user) return '';
  return `<div class="card tint"><div class="row-between"><div style="min-width:0"><b>Save your progress</b><div class="small muted">Create a free account so your plan, scores and flashcards are kept on every device.</div></div>
    <div class="btn-row"><button class="btn small" data-act="nav" data-to="account">Create account</button><button class="btn small ghost" data-act="accMode" data-m="signin">Sign in</button></div></div></div>`;
}
