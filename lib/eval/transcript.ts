export interface TranscriptScore {
  /** Character error rate: edit distance ÷ golden characters. 0 is perfect. */
  cer: number;
  /** Golden lines absent from the model transcript. */
  missingLines: string[];
  /** Word error rate: edit distance ÷ golden words. 0 is perfect. */
  wer: number;
}

/** Case- and whitespace-insensitive form used for every comparison here. */
export const normalizeTranscript = (text: string) =>
  text.toLowerCase().replaceAll(/\s+/gu, " ").trim();

/**
 * Levenshtein edit distance over any comparable sequences. Two-row dynamic
 * programming, so memory is O(min(len)).
 */
const editDistance = <T>(a: T[], b: T[]): number => {
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }

  return previous[b.length];
};

/**
 * Scores an OCR transcript against the fixture's golden transcript.
 *
 * CER and WER grade overall fidelity (a difference of degree), while
 * `missingLines` names the specific golden lines the transcript never produced
 * (a difference of kind). Neither is a pass/fail threshold — a local model will
 * rarely be character-perfect, and a rising CER is the signal, not a nonzero one.
 */
export const scoreTranscript = ({
  actual,
  golden,
}: {
  actual: string;
  golden: string;
}): TranscriptScore => {
  const normalizedGolden = normalizeTranscript(golden);
  const normalizedActual = normalizeTranscript(actual);

  const goldenChars = [...normalizedGolden];
  const goldenWords = normalizedGolden.split(" ").filter(Boolean);
  const actualWords = normalizedActual.split(" ").filter(Boolean);

  const goldenLines = golden
    .split("\n")
    .map((line) => normalizeTranscript(line))
    .filter(Boolean);

  return {
    cer:
      goldenChars.length === 0
        ? 0
        : editDistance(goldenChars, [...normalizedActual]) / goldenChars.length,
    missingLines: goldenLines.filter(
      (line) => !normalizedActual.includes(line)
    ),
    wer:
      goldenWords.length === 0
        ? 0
        : editDistance(goldenWords, actualWords) / goldenWords.length,
  };
};
