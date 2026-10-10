/* ---------- text-to-speech ---------- */
const ACCENT_NAME = { 'en-GB': 'British', 'en-US': 'American', 'en-AU': 'Australian', 'en-IE': 'Irish', 'en-NZ': 'New Zealand', 'en-IN': 'Indian', 'en-ZA': 'South African', 'en-CA': 'Canadian' };
const FEMALE_RX = /female|woman|samantha|karen|moira|tessa|fiona|victoria|allison|ava|susan|serena|kate|catherine|veena|zira|hazel|libby|sonia|natasha|martha|nicky|joanna|salli|kimberly|kendra|ivy|emma|amy|olivia|aria|jenny|michelle|clara|isla|neerja|leah|molly|emily|sara|zoe|nora|heera|tina|grandma/i;
const MALE_RX = /\bmale\b|daniel|alex\b|fred|oliver|arthur|rishi|aaron|gordon|lee\b|tom\b|david|mark\b|george|ryan|william|thomas|guy|brian|matthew|justin|joey|russell|liam|connor|mitchell|prabhat|ravi|luke|noah|eric|grandpa|reed|rocko|eddy/i;

const TTS = {
  ok: typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  voices: [],
  init() {
    if (!this.ok) return;
    const load = () => { this.voices = speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang)); };
    load();
    try { speechSynthesis.addEventListener('voiceschanged', load); } catch { speechSynthesis.onvoiceschanged = load; }
  },
  gender(v) { return FEMALE_RX.test(v.name) ? 'female' : MALE_RX.test(v.name) ? 'male' : null; },
  quality(v) { return (/natural|neural|premium|enhanced|online/i.test(v.name) ? 3 : 0) + (/google|microsoft|apple/i.test(v.name) ? 1 : 0) + (v.localService ? 1 : 0); },
  pick(accent, gender, avoid = []) {
    const lang = String(accent || 'en-GB').toLowerCase();
    const vl = (v) => v.lang.replace('_', '-').toLowerCase();
    let pool = this.voices.filter((v) => vl(v) === lang);
    const exact = pool.length > 0;
    if (!pool.length) pool = this.voices.filter((v) => vl(v) === 'en-gb');
    if (!pool.length) pool = this.voices;
    let c = pool.filter((v) => this.gender(v) === gender && !avoid.includes(v));
    if (!c.length) c = pool.filter((v) => !avoid.includes(v) && this.gender(v) !== (gender === 'male' ? 'female' : 'male'));
    if (!c.length) c = pool.filter((v) => !avoid.includes(v));
    if (!c.length) c = pool;
    c = [...c].sort((a, b) => this.quality(b) - this.quality(a));
    const voice = c[0] || null;
    const vg = voice ? this.gender(voice) : null;
    // Shift pitch when we could not find the right gender, so two speakers still sound different.
    const pitch = !voice ? 1 : vg === gender ? 1 : vg ? (gender === 'male' ? 0.75 : 1.25) : (gender === 'male' ? 0.88 : 1.12);
    return { voice, exact, pitch, accent };
  },
  speak(text, { accent = 'en-GB', gender = 'female', rate = 1 } = {}) {
    if (!this.ok) return Promise.resolve();
    speechSynthesis.cancel();
    const cast = this.pick(accent, gender);
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (cast.voice) u.voice = cast.voice;
      u.lang = cast.voice ? cast.voice.lang : accent;
      u.rate = rate; u.pitch = cast.pitch;
      u.onend = resolve; u.onerror = resolve;
      TTS._keep = u;
      speechSynthesis.speak(u);
    });
  },
  stop() { if (this.ok) speechSynthesis.cancel(); },
};

/* Plays a listening script line by line, with narrator reading-time pauses. */
class ScriptPlayer {
  constructor(section, { rate = 1, onLine, onPause, onEnd, onState } = {}) {
    this.sec = section; this.rate = rate;
    this.onLine = onLine || (() => {}); this.onPause = onPause || (() => {});
    this.onEnd = onEnd || (() => {}); this.onState = onState || (() => {});
    this.idx = 0; this.token = 0; this.state = 'idle'; this.timer = null; this.pauseLeft = 0;
    this.cast = {};
    const used = [];
    Object.entries(section.speakers || {}).forEach(([k, sp]) => {
      const c = TTS.pick(sp.accent, sp.voice, used);
      if (c.voice) used.push(c.voice);
      this.cast[k] = { ...c, role: sp.role, gender: sp.voice };
    });
  }
  castList() {
    return Object.entries(this.cast).map(([, c]) => ({
      role: c.role, accent: ACCENT_NAME[c.accent] || c.accent,
      voice: c.voice ? c.voice.name : 'device default', exact: c.exact,
    }));
  }
  play(from) {
    if (!TTS.ok) return;
    if (from != null) this.idx = from;
    this.token++;
    speechSynthesis.cancel();
    this.state = 'playing'; this.onState(this.state);
    this._step(this.token);
  }
  _step(tok) {
    if (tok !== this.token) return;
    const script = this.sec.script;
    if (this.idx >= script.length) { this.state = 'ended'; this.onState(this.state); this.onEnd(); return; }
    const item = script[this.idx];
    if (item.pause != null) {
      this.pauseLeft = this.pauseLeft > 0 ? this.pauseLeft : item.pause;
      this.onPause(this.pauseLeft, item.label || 'Reading time', this.idx);
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (tok !== this.token) { clearInterval(this.timer); return; }
        this.pauseLeft -= 1;
        this.onPause(this.pauseLeft, item.label || 'Reading time', this.idx);
        if (this.pauseLeft <= 0) { clearInterval(this.timer); this.pauseLeft = 0; this.idx++; this._step(tok); }
      }, 1000);
      return;
    }
    const c = this.cast[item.s] || this.cast.N || TTS.pick('en-GB', 'female');
    const u = new SpeechSynthesisUtterance(item.t);
    if (c.voice) u.voice = c.voice;
    u.lang = c.voice ? c.voice.lang : (c.accent || 'en-GB');
    u.rate = this.rate; u.pitch = c.pitch || 1;
    u.onend = () => { if (tok === this.token) { this.idx++; this._step(tok); } };
    u.onerror = (e) => { if (tok !== this.token || e.error === 'interrupted' || e.error === 'canceled') return; this.idx++; this._step(tok); };
    this.current = u;
    this.onLine(item, this.idx, c);
    speechSynthesis.speak(u);
  }
  pause() {
    if (this.state !== 'playing') return;
    this.token++; clearInterval(this.timer); speechSynthesis.cancel();
    this.state = 'paused'; this.onState(this.state);
  }
  resume() { if (this.state === 'paused') this.play(); }
  stop() {
    this.token++; clearInterval(this.timer); this.pauseLeft = 0;
    if (TTS.ok) speechSynthesis.cancel();
    this.state = 'idle'; this.idx = 0; this.onState(this.state);
  }
  skipPause() { if (this.pauseLeft > 0) { this.pauseLeft = 1; } }
}

/* ---------- speech recognition (live transcript) ---------- */
const SRClass = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const Rec = {
  supported: !!SRClass,
  blocked: false,           // set once the browser or the viewer refuses the microphone
  rec: null, active: false, finalText: '',
  start({ onText, onFail }) {
    if (!SRClass || this.blocked) { onFail && onFail('unsupported'); return false; }
    this.finalText = ''; this.active = true;
    const make = () => {
      const r = new SRClass();
      r.lang = 'en-GB'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) this.finalText += res[0].transcript.trim() + ' ';
          else interim += res[0].transcript;
        }
        onText(this.finalText, interim);
      };
      r.onerror = (e) => {
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) {
          this.blocked = true; this.active = false; onFail && onFail(e.error);
        }
      };
      r.onend = () => {
        // Chrome ends after silence; restart while the candidate is still "speaking".
        if (this.active && !this.blocked) { try { this.rec = make(); this.rec.start(); } catch { /* ignore */ } }
      };
      return r;
    };
    try { this.rec = make(); this.rec.start(); return true; } catch { this.blocked = true; this.active = false; onFail && onFail('start-failed'); return false; }
  },
  stop() { this.active = false; try { this.rec && this.rec.stop(); } catch { /* ignore */ } return this.finalText.trim(); },
};
