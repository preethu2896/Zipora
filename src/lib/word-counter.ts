export const readingRate = 238;
export const speakingRate = 130;

export function countText(text: string) {
  const trimmed = text.trim();
  let words = 0;
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u.test(text) && typeof Intl.Segmenter === 'function') {
    for (const word of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)) {
      if (word.isWordLike) words++;
    }
  } else {
    words = [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’\-][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu)].length;
  }
  let sentences = 0;
  if (typeof Intl.Segmenter === 'function') {
    for (const sentence of new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(trimmed)) {
      if (/[\p{L}\p{N}]/u.test(sentence.segment)) sentences++;
    }
  } else {
    sentences = trimmed.split(/[.!?。！？]+/u).filter(part => /[\p{L}\p{N}]/u.test(part)).length;
  }
  let characters = 0;
  let charactersWithoutSpaces = 0;
  for (const character of text) {
    characters++;
    if (!/\s/u.test(character)) charactersWithoutSpaces++;
  }
  return {
    words, characters, charactersWithoutSpaces, sentences,
    paragraphs: trimmed ? trimmed.replace(/\r\n?/g, '\n').split(/\n[^\S\n]*\n\s*/).length : 0,
    reading: Math.ceil(words * 60 / readingRate),
    speaking: Math.ceil(words * 60 / speakingRate),
  };
}

export function durationLabel(seconds: number) {
  return seconds < 60 ? `${seconds} sec` : `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
}
