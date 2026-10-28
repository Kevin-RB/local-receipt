import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AskUserStep } from "@/components/chat/agent-steps";
import type { AskUserToolPart } from "@/lib/chat/tools";

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

describe(AskUserStep, () => {
  it("shows the running label while the question is unanswered", () => {
    const html = renderToStaticMarkup(<AskUserStep part={pending} streaming />);

    expect(html).toContain("Asking you a question");
  });

  it("keeps waiting for the answer after the stream pauses", () => {
    const html = renderToStaticMarkup(
      <AskUserStep part={pending} streaming={false} />
    );

    expect(html).toContain("Asking you a question");
    expect(html).not.toContain("Failed to ask a question");
  });

  it("shows each question and its answer once the user answers", () => {
    const html = renderToStaticMarkup(
      <AskUserStep part={answered} streaming />
    );

    expect(html).toContain("Which period?");
    expect(html).toContain("This year");
    expect(html).not.toContain("Asking you a question");
  });
});
