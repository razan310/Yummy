/* ---------- start ---------- */
function buildContentIndex() {
  CONTENT.vocab.forEach((v) => { WORD_INDEX[v.w.toLowerCase()] = v; });
  buildVocabOrder();
}
function main() {
  applyTheme(getTheme());
  loadLocal();
  $('#app').innerHTML = shellHtml();
  TTS.init();
  bindEvents();
  initStudyTimer();
  buildContentIndex();
  const h = (location.hash || '').slice(1);
  if (['today', 'plan', 'practice', 'words', 'progress'].includes(h)) ROUTE = { name: h, params: {} };
  render();
  cloudInit();
  aiInit();
}
main();
