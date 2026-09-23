import { describe, expect, it } from "vitest";

import { normalizeTranscript, scoreTranscript } from "./transcript";

describe(normalizeTranscript, () => {
  it("folds case and collapses whitespace runs", () => {
    expect(normalizeTranscript("  TOTAL   $25.80\n")).toBe("total $25.80");
  });
});

describe(scoreTranscript, () => {
  it("scores an identical transcript as perfect", () => {
    const transcript = "ALDI STORES\nTOTAL 75.56";

    const score = scoreTranscript({ actual: transcript, golden: transcript });

    expect(score.cer).toBe(0);
    expect(score.wer).toBe(0);
    expect(score.missingLines).toStrictEqual([]);
  });

  it("ignores case and whitespace differences", () => {
    const score = scoreTranscript({
      actual: "aldi   stores\n\ntotal   75.56",
      golden: "ALDI STORES\nTOTAL 75.56",
    });

    expect(score.cer).toBe(0);
    expect(score.missingLines).toStrictEqual([]);
  });

  it("reports the golden lines the transcript never produced", () => {
    const score = scoreTranscript({
      actual: "ALDI STORES\nTOTAL 75.56",
      golden: "ALDI STORES\nCREDIT SURCHARGE 0.37\nTOTAL 75.56",
    });

    expect(score.missingLines).toStrictEqual(["credit surcharge 0.37"]);
  });

  it("grades a dropped price as a partial, nonzero error", () => {
    const score = scoreTranscript({
      actual: "WW RSPCA Chicken Diced Breast 1kg\nTOTAL 25.80",
      golden: "WW RSPCA Chicken Diced Breast 1kg 15.50\nTOTAL 25.80",
    });

    expect(score.cer).toBeGreaterThan(0);
    expect(score.wer).toBeGreaterThan(0);
    expect(score.missingLines).toStrictEqual([
      "ww rspca chicken diced breast 1kg 15.50",
    ]);
  });

  it("keeps CER bounded by the golden length", () => {
    const score = scoreTranscript({ actual: "", golden: "abcde" });

    expect(score.cer).toBe(1);
    expect(score.wer).toBe(1);
  });
});
