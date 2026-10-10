/* ---------- Claude (sample capability) ---------- */
const AI = { fn: null, state: 'loading' };   // state: loading | ready | absent | denied | disabled

async function aiInit() {
  if (!window.claude?.use) { AI.state = 'absent'; return; }
  try {
    const s = await window.claude.use('sample');
    AI.fn = s; AI.state = s ? 'ready' : 'absent';
  } catch { AI.state = 'absent'; }
  rerenderIfIdle();
}
const aiReady = () => AI.state === 'ready';

function aiErrorText(e) {
  switch (e?.code) {
    case 'not_granted': AI.state = 'denied'; return 'Claude access was declined for this page, so AI grading is off for this visit. Reload the page to be asked again, or turn it on in the page’s Permissions menu.';
    case 'sampling_disabled': case 'not_declared': case 'capability_disabled': case 'capability_removed':
      AI.state = 'disabled'; return 'Claude is not available for this account or view, so AI grading is off.';
    case 'rate_limited': return 'Too many requests, or your Claude usage limit was reached. Wait a few minutes, then tap Try again.';
    case 'session_expired': return 'Your Claude session expired. Sign in again, then tap Try again.';
    case 'invalid_json': return 'Claude’s reply could not be read. Tap Try again.';
    case 'refused': return 'Claude declined this request. Edit your text and try again.';
    case 'prompt_too_large': return 'This text is too long to grade in one go.';
    case 'cancelled': return 'Stopped.';
    case 'absent': return 'AI grading works when this page is opened inside Claude.';
    default: return 'Claude could not be reached. Tap Try again.';
  }
}

async function aiJson(prompt, { tier = 'default', onText, signal, cache } = {}) {
  if (!AI.fn) throw { code: 'absent' };
  const opts = { modelTier: tier, signal };
  if (onText) opts.onText = onText;
  if (cache !== undefined) opts.cache = cache;
  return AI.fn.json(prompt, opts);
}
async function aiText(prompt, { tier = 'quick', onText, signal } = {}) {
  if (!AI.fn) throw { code: 'absent' };
  const r = await AI.fn(prompt, { modelTier: tier, signal, onText });
  return r.text;
}

/* ---------- band descriptors (condensed paraphrase of the public descriptors) ---------- */
const DESCRIPTORS_WRITING = `
TASK ACHIEVEMENT (Task 1)
8: covers all requirements; clearly presents, highlights and illustrates key features; occasional minor slips.
7: covers the requirements; a clear overview of main trends/differences/stages; key features clearly highlighted but could be extended.
6: addresses the requirements; an overview is attempted; key features adequately covered but some details irrelevant, inappropriate or inaccurate.
5: generally addresses the task; recounts detail mechanically with no clear overview; key features not adequately covered; may have inaccurate data.
4: attempts the task but does not cover all key features; confuses features with detail.
TASK RESPONSE (Task 2)
8: sufficiently addresses all parts; well-developed response with relevant, extended and supported ideas.
7: addresses all parts; a clear position throughout; main ideas extended and supported, but may over-generalise or supporting ideas may lack focus.
6: addresses all parts though some more fully than others; a relevant position although conclusions may become unclear or repetitive; some main ideas inadequately developed or unclear.
5: addresses the task only partially; position expressed but development not always clear; main ideas limited and not sufficiently developed; may include irrelevant detail.
4: responds minimally or tangentially; position unclear; ideas difficult to identify or repetitive.
COHERENCE AND COHESION
8: sequences information and ideas logically; manages all aspects of cohesion well; paragraphing sufficient and appropriate.
7: logically organises information; clear progression throughout; uses a range of cohesive devices appropriately although with some under- or over-use; each paragraph has a clear central topic.
6: arranges information coherently with clear overall progression; cohesive devices used effectively but cohesion within or between sentences may be faulty or mechanical; referencing not always clear; paragraphing not always logical.
5: some organisation but lacks overall progression; inadequate, inaccurate or overused cohesive devices; repetitive because of lack of referencing and substitution; paragraphing may be inadequate.
LEXICAL RESOURCE
8: wide range used fluently and flexibly to convey precise meanings; skilful use of uncommon items with only occasional inaccuracies in word choice and collocation.
7: sufficient range to allow some flexibility and precision; uses less common items with some awareness of style and collocation; occasional errors in word choice, spelling or word formation.
6: adequate range for the task; attempts less common vocabulary but with some inaccuracy; some errors in spelling or word formation that do not impede communication.
5: limited range, minimally adequate; may make noticeable errors in spelling or word formation that may cause some difficulty for the reader.
GRAMMATICAL RANGE AND ACCURACY
8: wide range of structures; the majority of sentences are error-free; only very occasional errors or inappropriacies.
7: a variety of complex structures; frequent error-free sentences; good control of grammar and punctuation but may make a few errors.
6: a mix of simple and complex sentence forms; some errors in grammar and punctuation but they rarely reduce communication.
5: only a limited range of structures; attempts complex sentences but these tend to be less accurate than simple ones; frequent grammatical errors and faulty punctuation.`;

const DESCRIPTORS_SPEAKING = `
FLUENCY AND COHERENCE
8: speaks fluently with only occasional repetition or self-correction; hesitation is usually content-related; develops topics coherently and appropriately.
7: speaks at length without noticeable effort or loss of coherence; may show language-related hesitation, repetition or self-correction; uses a range of connectives and discourse markers with some flexibility.
6: willing to speak at length, though may lose coherence at times due to repetition, self-correction or hesitation; uses a range of connectives but not always appropriately.
5: usually maintains flow but uses repetition, self-correction and/or slow speech to keep going; may over-use certain connectives; simple speech fluent but complex communication causes problems.
LEXICAL RESOURCE
8: wide resource used readily and flexibly; uses less common and idiomatic vocabulary skilfully with occasional inaccuracies; paraphrases effectively.
7: uses vocabulary flexibly to discuss a variety of topics; some less common and idiomatic vocabulary with awareness of style and collocation, with some inappropriate choices; paraphrases effectively.
6: wide enough vocabulary to discuss topics at length and make meaning clear despite inappropriacies; generally paraphrases successfully.
5: manages familiar and unfamiliar topics but with limited flexibility; attempts paraphrase with mixed success.
GRAMMATICAL RANGE AND ACCURACY
8: wide range of structures flexibly; produces a majority of error-free sentences with only occasional inappropriacies or basic/non-systematic errors.
7: uses a range of complex structures with some flexibility; frequently produces error-free sentences, though some grammatical mistakes persist.
6: uses a mix of simple and complex structures, but with limited flexibility; may make frequent mistakes with complex structures, though these rarely cause comprehension problems.
5: produces basic sentence forms with reasonable accuracy; uses a limited range of more complex structures, but these usually contain errors.`;

const STRICT_RULES = `Calibration rules (follow them exactly):
- Be a strict, realistic examiner. The learner explicitly wants honest bands, not encouragement.
- Award each criterion a WHOLE band (4, 5, 6, 7, 8 or 9). If torn between two bands, give the lower one.
- A criterion gets 7 only if every band-7 feature is clearly present; most B2 learners score 5 or 6 per criterion.
- Count and weigh errors with articles, prepositions, subject-verb agreement, plurals, verb forms, run-on sentences and comma splices; these are typical of Arabic L1 writers.
- Memorised phrases, mechanical linkers ("Moreover", "Furthermore", "In conclusion") and long words used inaccurately do not count as range.
- Quote mistakes exactly as written (the "quote" field must be an exact substring of the candidate's text).`;

function writingGradePrompt({ task, prompt, chart, text, words, minutes, essayType }) {
  const minWords = task === 1 ? 150 : 250;
  return `You are a senior IELTS Academic Writing examiner. Assess this Task ${task} response using the band descriptors below.
${DESCRIPTORS_WRITING}

${STRICT_RULES}
- Under length: the response has ${words} words (minimum ${minWords}). If under the minimum, lower ${task === 1 ? 'Task Achievement' : 'Task Response'} accordingly and say so.
${task === 1
    ? '- Task 1: no clear overview caps Task Achievement at 5. Check every figure against the data below; inaccurate figures, opinions or speculation about causes lower Task Achievement.'
    : `- Task 2 (${essayType || 'essay'}): check that every part of the question is answered and the position is clear and consistent.`}
- Time used: ${minutes == null ? 'not recorded' : `${minutes} minutes (limit ${task === 1 ? 20 : 40})`}.

TASK PROMPT:
${prompt}
${chart ? `\nCHART DATA (what the candidate saw):\n${JSON.stringify(chart)}\n` : ''}
CANDIDATE RESPONSE:
"""
${text}
"""

Reply with only a JSON object in exactly this shape:
{
  "criteria": {
    "${task === 1 ? 'TA' : 'TR'}": {"band": 6, "comment": "2-3 sentences of specific evidence from the response", "fix": "one concrete thing to do next time"},
    "CC": {"band": 6, "comment": "...", "fix": "..."},
    "LR": {"band": 6, "comment": "...", "fix": "..."},
    "GRA": {"band": 6, "comment": "...", "fix": "..."}
  },
  "summary": "3 direct sentences: the estimated level, the single biggest reason it is not higher, and what would move it up half a band",
  "strengths": ["up to 3 short points"],
  "mistakes": [
    {"quote": "exact text from the response", "correction": "corrected text", "type": "grammar|vocabulary|spelling|punctuation|cohesion|task", "explanation": "one short English sentence", "ar": "شرح قصير بالعربية"}
  ],
  "improved": "the candidate's response rewritten at band 8: keep their ideas, structure and position, fix every error, upgrade vocabulary and cohesion; paragraphs separated by \\n\\n",
  "nextSteps": ["3 specific practice actions"]
}
List the 8-15 most important mistakes, most serious first.`;
}

function speakingGradePrompt({ parts, method, totalWords, totalSec }) {
  const wpm = totalSec > 0 ? Math.round(totalWords / (totalSec / 60)) : null;
  const methodNote = {
    speech: 'The transcript came from live speech recognition. It may lack punctuation and can mis-hear words; do not penalise punctuation or obvious recognition errors.',
    dictation: 'The transcript came from the phone keyboard\'s dictation. Hesitations and fillers are mostly removed by dictation, so judge fluency mainly from length, development, speech rate and coherence; do not reward fluency you cannot see.',
    typed: 'The candidate TYPED these answers instead of speaking. Typed answers overstate fluency and accuracy: be stricter, and state clearly that the estimate is only indicative.',
  }[method] || '';
  return `You are a senior IELTS Speaking examiner. Assess this candidate from the transcript using the descriptors below.
${DESCRIPTORS_SPEAKING}

${STRICT_RULES.replace(/candidate's text/g, "candidate's transcript")}
- Pronunciation cannot be judged from a transcript: do NOT score it.
- Part 1 answers should be 2-4 sentences; very short answers lower Fluency and Coherence. A Part 2 talk under about 1 minute 40 seconds or under about 180 words lowers Fluency and Coherence. Part 3 answers need reasons and examples.
- ${methodNote}
- Measured speaking time: ${totalSec ? Math.round(totalSec) + ' seconds' : 'unknown'}; total words: ${totalWords}${wpm ? `; about ${wpm} words per minute (fluent band 7 speakers usually sustain about 110-160 wpm)` : ''}.

TRANSCRIPT:
${parts.map((p, i) => `[${i + 1}] Part ${p.part} — Examiner: ${p.q}\nCandidate (${p.sec ? Math.round(p.sec) + ' s' : 'time unknown'}): ${p.a || '(no answer)'}`).join('\n\n')}

Reply with only a JSON object in exactly this shape:
{
  "criteria": {
    "FC": {"band": 6, "comment": "2-3 sentences of specific evidence", "fix": "one concrete action"},
    "LR": {"band": 6, "comment": "...", "fix": "..."},
    "GRA": {"band": 6, "comment": "...", "fix": "..."}
  },
  "summary": "3 direct sentences on the estimated level and what holds it back",
  "fluencyNotes": ["2-4 observations on length, development, fillers, speed, repetition"],
  "mistakes": [{"quote": "exact words from the transcript", "correction": "...", "explanation": "one short English sentence", "ar": "شرح قصير بالعربية"}],
  "betterAnswers": [{"q": "the question", "answer": "a natural spoken band-8 answer using the candidate's own ideas (Part 1: 3-4 sentences; Part 2: about 250 words; Part 3: 5-6 sentences)"}],
  "nextSteps": ["3 specific practice actions"]
}
Give 6-12 mistakes and better answers for the 2 weakest responses.`;
}

function explainArabicPrompt(term, context) {
  return `An Arabic-speaking IELTS learner (B2 level) selected this English ${term.split(/\s+/).length > 3 ? 'phrase' : 'word or phrase'}: "${term}".
${context ? `It appears in this sentence: "${context}"` : ''}
Explain it in Modern Standard Arabic for this learner. Give:
1) المعنى in this context (one sentence),
2) the part of speech and the Arabic equivalent,
3) one simple English example sentence (in English) with its Arabic translation,
4) two useful English collocations.
Keep it under 90 words. Plain text, no Markdown symbols.`;
}

function genReadingPrompt({ level, topic }) {
  return `Write ONE original IELTS Academic Reading passage with questions, at the difficulty of IELTS Passage ${level} (1 = most factual, 3 = most abstract and argumentative). Topic area: ${topic}. Everything must be original: invent researchers and organisations with clearly fictional names; do not copy or imitate published IELTS books; avoid precise statistics attributed to real institutions. British spelling. Plain text in strings.

Requirements: 700-850 words in 6-7 paragraphs labelled A, B, C...; exactly 13 questions in 3 groups of different types chosen from: tfng, ynng (only for an argumentative passage), headings, matching_info, mcq, gap, summary_bank, sentence_endings. Real IELTS difficulty: paraphrase between questions and text; plausible distractors; realistic NOT GIVEN items. Questions numbered 1-13 in order. Every question has a precise explanation citing the paragraph letter.

Group shapes:
- tfng / ynng: questions [{"n":1,"prompt":"statement","answer":"TRUE|FALSE|NOT GIVEN (or YES|NO|NOT GIVEN)","explanation":"..."}]
- headings: "options":[{"key":"i","text":"heading"},...] (2+ more headings than questions); questions prompt "Paragraph B", answer "iv"
- matching_info: "options": the paragraph letters [{"key":"A","text":"Paragraph A"},...]; prompt = information; answer = letter
- mcq: each question has its own "options":[{"key":"A","text":"..."},{"key":"B",...},{"key":"C",...},{"key":"D",...}], answer a key
- gap: group "wordLimit":"NO MORE THAN TWO WORDS"; prompt contains ____ exactly once; answer = array of accepted strings, the first copied word for word from the passage
- summary_bank: group "title" and "options" word bank (3+ more than questions); prompt contains ____; answer = option key
- sentence_endings: group "options" endings (2+ more than questions); prompt = sentence beginning; answer = key

Reply with only JSON:
{"title":"...","level":${level},"topic":"${topic}","paragraphs":[{"label":"A","text":"..."}],"groups":[{"type":"...","instructions":"IELTS-style instruction","title":"optional","wordLimit":"only for gap","options":[...],"questions":[...]}]}`;
}

function genListeningPrompt({ section }) {
  const what = {
    1: 'Section 1: a conversation between two people in an everyday social context (e.g. booking, enquiring, registering) with form or note completion and multiple choice',
    2: 'Section 2: a monologue in an everyday social context (e.g. a talk about local facilities or an event) with multiple choice and matching',
    3: 'Section 3: a conversation between two or three people in an academic context (students and a tutor discussing an assignment) with multiple choice and matching',
    4: 'Section 4: an academic lecture with note completion',
  }[section];
  return `Write ONE original IELTS Listening ${what}. It will be read aloud by text-to-speech. Everything must be original (fictional names and places). British spelling in questions.

Requirements: script 550-750 words; exactly 10 questions numbered 1-10 in script order; genuine IELTS distractors (a speaker corrects a detail, an option is suggested then rejected). Speakers: "N" is the narrator (accent en-GB) who introduces the section, gives reading time with {"pause": 20, "label": "Look at questions 1 to 5"} items, and ends with "That is the end of section ${section}." Other speakers use accents from en-AU, en-US, en-IE, en-NZ, en-CA, en-IN, en-ZA, en-GB. In the script write numbers, dates and spellings as spoken ("two hundred and forty pounds", "K, A, R, I, M"); in answers write them normally with alternatives (["240", "£240"]). Each script line under 300 characters. Every question has an explanation quoting the speaker's words.

Group shapes:
- gap: group "title", "wordLimit":"ONE WORD AND/OR A NUMBER" (or NO MORE THAN TWO WORDS); prompt contains ____ exactly once; answer = array of accepted strings
- mcq: each question has own "options":[{"key":"A","text":"..."},{"key":"B",...},{"key":"C",...}], answer key
- matching_features: group "options":[{"key":"A","text":"..."},...] (more options than questions); prompt = item; answer key

Reply with only JSON:
{"title":"...","section":${section},"topic":"...","speakers":{"N":{"role":"Narrator","accent":"en-GB","voice":"female"},"A":{"role":"...","accent":"en-AU","voice":"male"}},"script":[{"s":"N","t":"..."},{"pause":20,"label":"..."},{"s":"A","t":"..."}],"groups":[{"type":"...","instructions":"...","title":"optional","wordLimit":"for gap","options":[...],"questions":[{"n":1,"prompt":"...","answer":"...","explanation":"..."}]}]}`;
}

/* Light structural check for AI-generated practice items before they are shown. */
function checkGenerated(item, kind) {
  const problems = [];
  if (!item || typeof item !== 'object') return ['No item returned.'];
  if (!item.title) problems.push('missing title');
  if (kind === 'reading' && (!Array.isArray(item.paragraphs) || item.paragraphs.length < 4)) problems.push('too few paragraphs');
  if (kind === 'listening' && (!Array.isArray(item.script) || item.script.length < 6)) problems.push('script missing');
  if (!Array.isArray(item.groups) || !item.groups.length) problems.push('no questions');
  let n = 0;
  (item.groups || []).forEach((g) => {
    if (!QTYPES[g.type]) problems.push(`unsupported question type ${g.type}`);
    (g.questions || []).forEach((q) => {
      n += g.type === 'mcq_multi' ? (q.count || 2) : 1;
      if (q.answer == null && !q.answers) problems.push(`question ${q.n} has no answer`);
      const keys = (q.options || g.options || []).map((o) => o.key);
      if (['mcq', 'headings', 'matching_info', 'matching_features', 'sentence_endings', 'summary_bank'].includes(g.type) && !keys.includes(q.answer)) problems.push(`question ${q.n} answer is not an option`);
    });
  });
  if (n < 8) problems.push('fewer than 8 questions');
  return problems;
}
