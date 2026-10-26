// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AskUserAnswers, AskUserToolPart } from "@/lib/chat/tools";

import { QuestionCard } from "./question-card";

const CHOICES = ["This month", "Last 3 months", "This year"];

const pendingQuestion = {
  input: {
    questions: [{ choices: CHOICES, question: "Which period?" }],
  },
  state: "input-available",
  toolCallId: "call-1",
  type: "tool-ask_user",
} satisfies AskUserToolPart;

describe(QuestionCard, () => {
  it("renders the question and its three choices", () => {
    const html = renderToStaticMarkup(
      <QuestionCard onAnswer={() => 0} part={pendingQuestion} />
    );

    expect(html).toContain("Which period?");
    for (const choice of CHOICES) {
      expect(html).toContain(choice);
    }
  });

  it("submits the chosen answer through the tool-call id", () => {
    const onAnswer =
      vi.fn<(toolCallId: string, answers: AskUserAnswers) => void>();
    render(<QuestionCard onAnswer={onAnswer} part={pendingQuestion} />);

    fireEvent.click(screen.getByLabelText("This year"));

    const form = screen.getByRole("button", { name: "Answer" }).closest("form");
    if (!form) {
      throw new Error("the questionnaire did not render a form");
    }
    fireEvent.submit(form);

    // The exact payload `chat.tsx` hands to `addToolOutput`.
    expect(onAnswer).toHaveBeenCalledWith("call-1", [
      { answer: "This year", question: "Which period?" },
    ]);
  });
});
