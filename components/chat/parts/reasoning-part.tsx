"use client";

import type { ReasoningUIPart } from "ai";
import { BrainIcon } from "lucide-react";

import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

/**
 * A `Trace` row for the reasoning phase, without the reasoning itself.
 *
 * Reasoning streams ahead of the answer, and the local model can take a while
 * over it. Without anything on screen that reads as a stalled request, so the
 * row shows that work is happening — but the text is deliberately not rendered.
 * Chain-of-thought is unedited model output: it can contradict the answer, name
 * a tool it then abandons, or restate a figure it has not checked, and none of
 * that is something to put in front of a user making decisions from their
 * spending data. Inspected in devtools, it reads as planning, not insight.
 *
 * The row is transient — it disappears once the answer starts arriving, so a
 * finished message shows only its answer and tool results.
 */
export const ReasoningPart = ({
  isStreaming,
  part,
}: {
  isStreaming: boolean;
  part: ReasoningUIPart;
}) => {
  if (!isStreaming && part.state !== "streaming") {
    return null;
  }

  return (
    <Trace>
      <TraceLine aria-live="polite" status="running">
        <TraceIcon>
          <BrainIcon />
        </TraceIcon>
        <TraceTitle>Reasoning…</TraceTitle>
      </TraceLine>
    </Trace>
  );
};
