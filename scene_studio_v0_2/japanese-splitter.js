(() => {
  'use strict';

  const DEFAULT_LIMITS = Object.freeze({ short: 42, normal: 68, long: 96 });
  const OPENERS = new Set(['「','『','（','(','【','［','[','〈','《','“','‘']);
  const CLOSERS = new Set(['」','』','）',')','】','］',']','〉','》','”','’']);
  const SENTENCE_END = new Set(['。','！','？','!','?']);
  const TRAILING_CLOSERS = new Set(['」','』','）',')','】','］',']','〉','》','”','’']);

  function normalize(text) {
    return String(text ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\t\u00a0]+/g, ' ')
      .replace(/[ \u3000]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function isListLine(line) {
    return /^\s*(?:[-*+・●○■□▪▫◆◇▶▷]|\d{1,3}[.)、]|[①-⑳])\s*/u.test(line);
  }

  function isDialogueLine(line) {
    const s = line.trim();
    if (s.length < 2) return false;
    const pairs = [['「','」'],['『','』'],['“','”'],['‘','’']];
    return pairs.some(([a,b]) => s.startsWith(a) && s.endsWith(b));
  }

  function looksLikeStandaloneBeat(line) {
    const s = line.trim();
    if (!s) return false;
    if (s.length > 28) return false;
    return /(?:——|――|…|\.\.\.|：|:)$/.test(s) || /^[—―…]+$/.test(s);
  }

  function sentenceTokens(text) {
    const out = [];
    let buffer = '';
    const stack = [];
    const chars = [...text];

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      buffer += ch;
      if (OPENERS.has(ch)) stack.push(ch);
      else if (CLOSERS.has(ch) && stack.length) stack.pop();

      if (SENTENCE_END.has(ch) && stack.length === 0) {
        while (i + 1 < chars.length && TRAILING_CLOSERS.has(chars[i + 1])) {
          buffer += chars[++i];
        }
        if (buffer.trim()) out.push(buffer.trim());
        buffer = '';
      }
    }
    if (buffer.trim()) out.push(buffer.trim());
    return out;
  }

  function splitLongUnpunctuated(text, limit) {
    const s = text.trim();
    if (s.length <= limit) return [s];
    const out = [];
    let rest = s;
    const min = Math.max(18, Math.floor(limit * 0.55));

    while (rest.length > limit) {
      const searchEnd = Math.min(rest.length, Math.floor(limit * 1.12));
      const searchStart = Math.min(min, searchEnd - 1);
      const slice = rest.slice(searchStart, searchEnd + 1);
      let rel = -1;
      const candidates = ['、', '，', ',', '；', ';', '：', ':', ' '];
      for (const mark of candidates) {
        const p = slice.lastIndexOf(mark);
        if (p > rel) rel = p;
      }
      let cut = rel >= 0 ? searchStart + rel + 1 : limit;
      if (cut <= 0) cut = limit;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
    return out.filter(Boolean);
  }

  function packSentences(text, limit) {
    const tokens = sentenceTokens(text);
    if (tokens.length <= 1) return splitLongUnpunctuated(text, limit);

    const out = [];
    let buffer = '';
    for (const token of tokens) {
      const pieces = token.length > Math.floor(limit * 1.35)
        ? splitLongUnpunctuated(token, limit)
        : [token];
      for (const piece of pieces) {
        const candidate = buffer ? `${buffer}\n${piece}` : piece;
        if (buffer && candidate.length > limit) {
          out.push(buffer);
          buffer = piece;
        } else {
          buffer = candidate;
        }
      }
    }
    if (buffer) out.push(buffer);
    return out;
  }

  function makeChunk(text, type = 'text', reason = 'paragraph') {
    return { text: text.trim(), type, reason };
  }

  function processPlainLines(lines, limit) {
    const clean = lines.map(v => v.trim()).filter(Boolean);
    if (!clean.length) return [];
    const joined = clean.join('\n');
    if (joined.length <= limit) return [makeChunk(joined, 'text', clean.length > 1 ? 'line-break' : 'paragraph')];

    // Meaningful author line breaks get first chance before punctuation packing.
    if (clean.length > 1) {
      const out = [];
      let buffer = '';
      for (const line of clean) {
        const candidate = buffer ? `${buffer}\n${line}` : line;
        if (buffer && candidate.length > limit) {
          out.push(...packSentences(buffer, limit).map(t => makeChunk(t, 'text', 'line-break')));
          buffer = line;
        } else {
          buffer = candidate;
        }
      }
      if (buffer) out.push(...packSentences(buffer, limit).map(t => makeChunk(t, 'text', 'sentence')));
      return out;
    }
    return packSentences(joined, limit).map(t => makeChunk(t, 'text', 'sentence'));
  }

  function processBlock(block, limit) {
    const lines = block.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return [];

    if (lines.every(isListLine)) {
      return [makeChunk(lines.join('\n'), 'text', 'list-block')];
    }

    const out = [];
    let plain = [];
    let list = [];
    const flushPlain = () => {
      if (!plain.length) return;
      out.push(...processPlainLines(plain, limit));
      plain = [];
    };
    const flushList = () => {
      if (!list.length) return;
      out.push(makeChunk(list.join('\n'), 'text', 'list-block'));
      list = [];
    };

    for (const line of lines) {
      if (isDialogueLine(line)) {
        flushPlain(); flushList();
        out.push(makeChunk(line, 'dialogue', 'dialogue'));
      } else if (isListLine(line)) {
        flushPlain();
        list.push(line);
      } else if (looksLikeStandaloneBeat(line)) {
        flushPlain(); flushList();
        out.push(makeChunk(line, 'text', 'beat'));
      } else {
        flushList();
        plain.push(line);
      }
    }
    flushPlain(); flushList();
    return out;
  }

  function splitDetailed(text, options = {}) {
    const normalized = normalize(text);
    if (!normalized) return [];
    const density = options.density || 'normal';
    const limits = options.limits || DEFAULT_LIMITS;
    const limit = Number(options.limit) || limits[density] || DEFAULT_LIMITS.normal;

    return normalized
      .split(/\n\s*\n/)
      .flatMap(block => processBlock(block, limit))
      .filter(chunk => chunk.text);
  }

  function split(text, options = {}) {
    return splitDetailed(text, options).map(x => x.text);
  }

  window.JapaneseSceneSplitter = Object.freeze({
    version: '1.0.1',
    limits: DEFAULT_LIMITS,
    normalize,
    split,
    splitDetailed,
    isDialogueLine,
    isListLine
  });
})();
