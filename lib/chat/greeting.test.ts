import { describe, expect, it } from "vitest";

import { greetingFor, toDisplayName } from "./greeting";

describe(greetingFor, () => {
  it("greets by the hour it is given", () => {
    expect(greetingFor("Sam", 0)).toBe("Good morning, Sam");
    expect(greetingFor("Sam", 9)).toBe("Good morning, Sam");
    expect(greetingFor("Sam", 13)).toBe("Good afternoon, Sam");
    expect(greetingFor("Sam", 23)).toBe("Good evening, Sam");
  });

  it("switches at 12:00 and 18:00", () => {
    expect(greetingFor("", 11)).toBe("Good morning");
    expect(greetingFor("", 12)).toBe("Good afternoon");
    expect(greetingFor("", 17)).toBe("Good afternoon");
    expect(greetingFor("", 18)).toBe("Good evening");
  });

  it("omits the name when there is none", () => {
    expect(greetingFor("", 9)).toBe("Good morning");
  });

  it("defaults to the current local hour", () => {
    // Only the shape is asserted: the hour comes from the machine's own zone,
    // which is the point of resolving this in the browser.
    expect(greetingFor("Sam")).toBe(greetingFor("Sam", new Date().getHours()));
  });
});

describe(toDisplayName, () => {
  it("takes and capitalises the first name", () => {
    expect(toDisplayName("sam wilson")).toBe("Sam");
    expect(toDisplayName("ada  byron")).toBe("Ada");
    expect(toDisplayName("  grace   hopper ")).toBe("Grace");
  });

  it("leaves an already-capitalised or all-caps name intact", () => {
    expect(toDisplayName("SAM")).toBe("SAM");
  });

  it("copes with an empty name", () => {
    expect(toDisplayName("")).toBe("");
    expect(toDisplayName("   ")).toBe("");
  });
});
