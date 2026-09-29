"use client";

import { Leap } from "loading-dev";

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import type { AskUserAnswers, AskUserToolPart } from "@/lib/chat/tools";

export const QuestionCard = ({
  onAnswer,
  part,
}: {
  onAnswer: (toolCallId: string, answers: AskUserAnswers) => void;
  part: AskUserToolPart;
}) => {
  const questions =
    part.state === "input-available" ? part.input.questions : [];

  return (
    <div className="pointer-events-none sticky bottom-2 z-50 mx-auto w-full max-w-3xl px-4 pt-2">
      <div className="bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 pointer-events-auto w-full rounded-2xl p-4 text-sm shadow-lg ring-1">
        {questions.length === 0 ? (
          <div className="shimmer text-muted-foreground flex items-center gap-2 py-2">
            <Leap size={14} />
            Preparing a question…
          </div>
        ) : (
          <Questionnaire
            defaultItem="q0"
            key={part.toolCallId}
            items={questions.map((question, index) => ({
              choices: question.choices.map((choice) => ({ value: choice })),
              name: `q${index}`,
              required: true,
            }))}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onAnswer(
                part.toolCallId,
                questions.map((question, index) => ({
                  answer: String(formData.get(`q${index}`) ?? ""),
                  question: question.question,
                }))
              );
            }}
          >
            {questions.length > 1 ? (
              <QuestionnaireProgress className="-mb-4" />
            ) : null}
            {questions.map((question, index) => (
              <QuestionnaireItem key={index} name={`q${index}`} required>
                <QuestionnaireTitle>{question.question}</QuestionnaireTitle>
                <QuestionnaireChoices>
                  {question.choices.map((choice) => (
                    <QuestionnaireChoice key={choice} value={choice}>
                      {choice}
                    </QuestionnaireChoice>
                  ))}
                  <QuestionnaireInput
                    aria-label="Another answer"
                    placeholder="Type another answer…"
                  />
                </QuestionnaireChoices>
                <QuestionnaireError />
              </QuestionnaireItem>
            ))}
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireNext>Next</QuestionnaireNext>
              <QuestionnaireSubmit>Answer</QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
        )}
      </div>
    </div>
  );
};
