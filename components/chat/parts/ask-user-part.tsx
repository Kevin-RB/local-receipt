"use client";

import { Blocks } from "loading-dev";

import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import type { AskUserToolPart } from "@/lib/chat/tools";

/**
 * The live question is rendered by `QuestionCard`, pinned above the composer.
 * This part only renders the transcript trail: a `Trace` row while the question
 * is being asked, and the answered question/answer pairs once it comes back.
 */
export const AskUserPart = ({ part }: { part: AskUserToolPart }) => {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <Trace>
        <TraceLine status="running">
          <TraceIcon>
            <Blocks color="var(--primary)" size={14} />
          </TraceIcon>
          <TraceTitle>Asking you a question…</TraceTitle>
        </TraceLine>
      </Trace>
    );
  }

  if (part.state === "output-error") {
    return (
      <Trace>
        <TraceLine status="error">
          <TraceTitle>{`Question failed: ${part.errorText}`}</TraceTitle>
        </TraceLine>
      </Trace>
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  return (
    <ol className="flex flex-col gap-1 px-1 text-xs">
      {part.output.map((entry) => (
        <li key={entry.question}>
          <span className="text-muted-foreground">{entry.question}</span>{" "}
          <span className="font-medium">{entry.answer}</span>
        </li>
      ))}
    </ol>
  );
};
