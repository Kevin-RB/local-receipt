import { describe, expect, it } from "vitest";

import { askUserInput } from "./ask-user";

const question = (choices: string[]) => ({
  choices,
  question: "Which period?",
});

describe("ask_user input schema", () => {
  it("accepts one question with exactly three choices", () => {
    const input = {
      questions: [question(["This month", "Last 3 months", "This year"])],
    };

    expect(askUserInput.safeParse(input).success).toBeTruthy();
  });

  it("accepts several questions, each with exactly three choices", () => {
    const input = {
      questions: [
        question(["This month", "Last 3 months", "This year"]),
        question(["Coles", "Woolworths", "Aldi"]),
      ],
    };

    expect(askUserInput.safeParse(input).success).toBeTruthy();
  });

  it("rejects a question with two choices", () => {
    expect(
      askUserInput.safeParse({
        questions: [question(["This month", "This year"])],
      }).success
    ).toBeFalsy();
  });

  it("rejects a question with four choices", () => {
    expect(
      askUserInput.safeParse({
        questions: [
          question(["This month", "Last 3 months", "This year", "All time"]),
        ],
      }).success
    ).toBeFalsy();
  });

  it("rejects an empty question list", () => {
    expect(askUserInput.safeParse({ questions: [] }).success).toBeFalsy();
  });

  it("rejects a question without a prompt", () => {
    expect(
      askUserInput.safeParse({
        questions: [{ choices: ["This month", "Last 3 months", "This year"] }],
      }).success
    ).toBeFalsy();
  });
});
