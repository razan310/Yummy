/* ---------- Welcome (the hosted site's entry screen) and account ---------- */
const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

function authFormHtml(mode) {
  const signup = mode === 'signup';
  return `<div class="auth">
    <div class="seg auth-seg" role="tablist" aria-label="Account"><button role="tab" data-act="accMode" data-m="signup" aria-pressed="${signup}" aria-selected="${signup}">Create account</button><button role="tab" data-act="accMode" data-m="signin" aria-pressed="${!signup}" aria-selected="${!signup}">Sign in</button></div>
    <h2>${signup ? 'Create your free account' : 'Welcome back'}</h2>
    <p class="small muted">${signup ? 'Your plan, scores and flashcards are saved to your account, so you can study on your phone and your computer.' : 'Sign in to continue where you stopped.'}</p>
    <form id="acc-form" class="stack" novalidate>
      ${signup ? '<div class="field"><label for="acc-name">Your name</label><input class="input" id="acc-name" autocomplete="given-name" maxlength="40" required placeholder="For example, Razan"></div>' : ''}
      <div class="field"><label for="acc-email">Email</label><input class="input" id="acc-email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required placeholder="you@example.com"></div>
      <div class="field"><label for="acc-pass">Password</label>
        <div class="pw-wrap"><input class="input" id="acc-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required><button type="button" class="pw-toggle" data-act="pwToggle" aria-label="Show password" aria-pressed="false">${EYE}</button></div>
        ${signup ? '<span class="xs faint">At least 8 characters. There is no password reset yet, so keep it somewhere safe.</span>' : ''}</div>
      <div id="acc-msg" aria-live="polite"></div>
      <button class="btn block" type="submit" id="acc-submit">${signup ? 'Create my account' : 'Sign in'}</button>
    </form>
    <p class="small center">${signup ? 'Already have an account? <button class="link" data-act="accMode" data-m="signin">Sign in</button>' : 'New here? <button class="link" data-act="accMode" data-m="signup">Create an account</button>'}</p>
  </div>`;
}
function bindAuthForm(mode) {
  const form = $('#acc-form');
  if (!form) return;
  form.addEventListener('submit', (e) => { e.preventDefault(); submitAccount(mode === 'signup' ? 'register' : 'login'); });
  const first = $(mode === 'signup' ? '#acc-name' : '#acc-email');
  if (first && window.matchMedia('(pointer: fine)').matches) first.focus();
}
ACT.pwToggle = (el) => {
  const input = $('#acc-pass'); const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  el.setAttribute('aria-pressed', String(show)); el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};

VIEWS.welcome = {
  html({ mode = 'signup' }) {
    const points = [
      ['A plan that adapts to you', 'A short placement test sets your starting band in each skill. Every week the plan gives more time to the skills furthest from your target.'],
      ['Practice for all four skills', 'Timed reading and listening tests, Task 1 and Task 2 writing, speaking with a cue card, and daily academic vocabulary.'],
      ['Honest progress', 'Band estimates per skill, your streak, your study time and a weekly mock exam from week 4.'],
    ];
    return `<section class="welcome">
      <div class="welcome-intro">
        <div class="eyebrow">IELTS Academic coach</div>
        <h1>Reach band 7.0 with a plan built around you.</h1>
        <p class="lead">Ninety minutes a day, a clear list of what to do, and scores you can trust.</p>
        <div class="welcome-scale" aria-hidden="true">${bandRuler('W', 6, { target: 7, minTarget: 6.5, label: 'Where many learners start', gapText: 'goal 7.0' })}</div>
        <ul class="welcome-points">${points.map(([t, d], i) => `<li><span class="wp-num mono">${i + 1}</span><div><b>${t}</b><p class="small muted">${d}</p></div></li>`).join('')}</ul>
      </div>
      <div class="card hero welcome-form">${authFormHtml(mode)}</div>
    </section>`;
  },
  mount({ mode = 'signup' }) { bindAuthForm(mode); },
};

VIEWS.account = {
  html({ mode = 'signup' }) {
    const head = `<div class="page-head">${backBtn('today', 'Today')}<h1>Your account</h1></div>`;
    if (Cloud.kind === 'claude') {
      return `${head}<div class="card"><h2>Saved to your Claude account</h2><p class="muted">Inside Claude your progress is saved privately to your Claude account automatically. There is nothing to set up.</p>
        <div class="field"><label for="s-name">Your name</label><input class="input" id="s-name" data-ch="setting" data-k="name" value="${esc(S.profile.name || '')}" maxlength="40"></div></div>`;
    }
    if (Cloud.kind === 'server' && Cloud.user) {
      const st = syncState();
      const days = Object.keys(S.studySec).length;
      return `${head}
        <div class="card hero profile-card">
          <div class="profile-top"><span class="avatar xl" aria-hidden="true">${esc(initials(displayName()))}</span>
            <div style="min-width:0"><h2 class="ellipsis">${esc(displayName() || 'Your account')}</h2><div class="muted ellipsis">${esc(Cloud.user.email)}</div>
              <div class="me-status inline"><i class="me-dot static ${st.tone}"></i><span>${esc(st.text)}</span></div></div></div>
          <div class="stat-row">
            <div class="stat"><span class="stat-label">Streak</span><span class="stat-value">${plural(streakNow(), 'day')}</span></div>
            <div class="stat"><span class="stat-label">Days studied</span><span class="stat-value">${days}</span></div>
            <div class="stat"><span class="stat-label">Overall estimate</span><span class="stat-value mono">${fmtBand(overallBand(displayEstimates()))}</span></div>
          </div>
        </div>
        <div class="card"><h2>Profile</h2>
          <div class="field"><label for="s-name">Your name</label><input class="input" id="s-name" data-ch="setting" data-k="name" value="${esc(S.profile.name || '')}" maxlength="40" autocomplete="given-name"><span class="xs faint">Shown in your greeting and on this page.</span></div>
        </div>
        <div class="card"><h2>Signing in on another device</h2><p class="small muted">Open this website on your phone or computer and sign in with <b>${esc(Cloud.user.email)}</b>. Your plan, scores, flashcards and study time are already there.</p></div>
        <div class="btn-row"><button class="btn ghost" data-act="nav" data-to="settings">Settings</button><button class="btn quiet danger-text" data-act="signOut">Sign out</button></div>`;
    }
    if (Cloud.kind !== 'server') {
      return `${head}<div class="card"><h2>Accounts work on the online version</h2><p class="muted">This copy of the app is not connected to a server, so your progress is saved in this browser only. Open the app from its website address to create an account.</p></div>`;
    }
    return `${head}<div class="card hero">${authFormHtml(mode)}</div>`;
  },
  mount({ mode = 'signup' }) { bindAuthForm(mode); },
};
ACT.accMode = (el) => go('account', { mode: el.dataset.m });

async function submitAccount(action) {
  const msg = $('#acc-msg'); const btn = $('#acc-submit');
  const email = $('#acc-email').value.trim();
  const password = $('#acc-pass').value;
  const name = $('#acc-name') ? $('#acc-name').value.trim() : '';
  const bad = (t, field) => { msg.innerHTML = `<div class="note bad">${esc(t)}</div>`; if (field) $(field).focus(); };
  if (action === 'register' && !name) return bad('Tell us your name, so we know what to call you.', '#acc-name');
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Enter a valid email address.', '#acc-email');
  if (password.length < 8) return bad('Use a password of at least 8 characters.', '#acc-pass');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>' + (action === 'register' ? 'Creating your account…' : 'Signing in…');
  msg.innerHTML = '';
  try {
    const r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action, email, password, name }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.user) {
      btn.disabled = false; btn.textContent = action === 'register' ? 'Create my account' : 'Sign in';
      return bad(data.error || 'Something went wrong. Try again.');
    }
    await connectAccount(data.user, { interactive: true });
    if (name && !S.profile.name) { S.profile.name = name; save(); }
    const first = firstName();
    toast(action === 'register' ? `Welcome, ${first || 'and welcome'}! Your account is ready.` : `Welcome back${first ? `, ${first}` : ''}`);
    go('today', {}, { force: true });
  } catch {
    btn.disabled = false; btn.textContent = action === 'register' ? 'Create my account' : 'Sign in';
    bad('Could not reach the server. Check your connection and try again.');
  }
  return undefined;
}
ACT.signOut = () => {
  closeMeMenu();
  confirmModal({
    title: 'Sign out?', body: 'Your progress stays saved in your account. This device forgets it until you sign in again.', ok: 'Sign out',
    onOk: async () => { await signOut(); SETUP = null; toast('Signed out'); go('account', { mode: 'signin' }, { force: true }); },
  });
};
function accountBanner() {
  if (Cloud.kind !== 'server' || Cloud.user) return '';
  return `<div class="card tint"><div class="row-between"><div style="min-width:0"><b>Save your progress</b><div class="small muted">Create a free account so your plan, scores and flashcards are kept on every device.</div></div>
    <div class="btn-row"><button class="btn small" data-act="nav" data-to="account">Create account</button><button class="btn small ghost" data-act="accMode" data-m="signin">Sign in</button></div></div></div>`;
}
