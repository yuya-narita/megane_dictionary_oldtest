(() => {
  'use strict';

  function detectLanguage(text) {
    const s = String(text ?? '');
    const ja = (s.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
    const latin = (s.match(/[A-Za-z]/g) || []).length;
    // Japanese wins whenever it is meaningfully present. This keeps Japanese prose
    // containing URLs / product names from being misclassified as English.
    if (ja >= 4 && ja >= latin * 0.08) return 'ja';
    if (latin >= 4) return 'en';
    return ja > 0 ? 'ja' : 'en';
  }

  function getSplitter(language) {
    return language === 'en' ? window.EnglishSceneSplitter : window.JapaneseSceneSplitter;
  }

  function splitDetailed(text, options = {}) {
    const language = options.language && options.language !== 'auto' ? options.language : detectLanguage(text);
    const splitter = getSplitter(language);
    const chunks = splitter.splitDetailed(text, options);
    return chunks.map(chunk => ({ ...chunk, language }));
  }

  function split(text, options = {}) { return splitDetailed(text, options).map(x => x.text); }

  window.SceneTextSplitter = Object.freeze({
    version: '1.0.0', detectLanguage, split, splitDetailed, getSplitter
  });
})();
