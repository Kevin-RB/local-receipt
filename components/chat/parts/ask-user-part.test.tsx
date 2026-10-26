import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AskUserToolPart } from "@/lib/chat/tools";

import { AskUserPart } from "./ask-user-part";

const pending = {
  input: {
    questions: [
      {
        choices: ["This month", "Last 3 months", "This year"],
        question: "Which period?",
      },
    ],
  },
  state: "input-available",
  toolCallId: "call-1",
  type: "tool-ask_user",
} satisfies AskUserToolPart;

const answered = {
  ...pending,
  output: [{ answer: "This year", question: "Which period?" }],
  state: "output-available",
} satisfies AskUserToolPart;

describe(AskUserPart, () => {
  it("shows the running label while the question is unanswered", () => {
    const html = renderToStaticMarkup(<AskUserPart part={pending} />);

    expect(html).toContain("Asking you a question…");
  });

  it("shows each question and its answer once the user answers", () => {
    const html = renderToStaticMarkup(<AskUserPart part={answered} />);

    expect(html).toContain("Which period?");
    expect(html).toContain("This year");
    expect(html).not.toContain("Asking you a question…");
  });
});
