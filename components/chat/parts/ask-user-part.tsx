"use client";

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import type { AskUserToolPart } from "@/lib/chat/tools";

import { ToolPendingIcon } from "./tool-state";

/**
 * The live question is rendered by `QuestionCard`, pinned above the composer.
 * This part only renders the transcript trail: a marker while the question is
 * being asked, and the answered question/answer pairs once it comes back.
 */
export const AskUserPart = ({ part }: { part: AskUserToolPart }) => {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <Marker className="shimmer" render={<output />}>
        <MarkerIcon>
          <ToolPendingIcon />
        </MarkerIcon>
        <MarkerContent>Asking you a question…</MarkerContent>
      </Marker>
    );
  }

  if (part.state === "output-error") {
    return (
      <Marker render={<output />}>
        <MarkerContent>
          <span className="text-destructive">
            {`Question failed: ${part.errorText}`}
          </span>
        </MarkerContent>
      </Marker>
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
