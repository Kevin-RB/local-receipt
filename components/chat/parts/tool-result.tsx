"use client";

import { Leap } from "loading-dev";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";

import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

/**
 * Shared shell for a tool result: a one-line `Trace` row saying what ran, above
 * a compact table of the data it returned. The row doubles as the running and
 * error state, so a tool call occupies one slot in the transcript whether it is
 * in flight, failed, or done.
 *
 * `TraceLine`'s `status` carries the styling — `running` shimmers the title,
 * `error` makes it destructive — so each state is just a different row rather
 * than a different primitive.
 *
 * Running and error rows keep the polite live region the retired
 * `<Marker render={<output />}>` rows carried. The message scroller's log
 * region only announces additions, and these rows settle into their final
 * text in place, so the transition would otherwise go unannounced.
 *
 * The two booleans come from the SDK's own `UIToolInvocation` discriminant,
 * which the caller narrows before it can reach the typed `output` anyway — so
 * this shell re-uses that narrowing instead of re-deriving the states itself.
 */
export const ToolResult = ({
  children,
  errorText,
  isPending,
  label,
}: {
  children?: React.ReactNode;
  errorText?: string;
  isPending: boolean;
  label: string;
}) => {
  if (errorText) {
    return (
      <Trace>
        <TraceLine aria-live="polite" status="error">
          <TraceIcon>
            <TriangleAlertIcon />
          </TraceIcon>
          {/* `TraceTitle` truncates, and a clipped error is the only diagnostic
              the reader gets, so the title is allowed to wrap here. */}
          <TraceTitle className="whitespace-normal">
            {`${label} failed: ${errorText}`}
          </TraceTitle>
        </TraceLine>
      </Trace>
    );
  }

  if (isPending) {
    return (
      <Trace>
        <TraceLine aria-live="polite" status="running">
          <TraceIcon>
            <Leap size={14} />
          </TraceIcon>
          <TraceTitle>{`${label}…`}</TraceTitle>
        </TraceLine>
      </Trace>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Trace>
        <TraceLine>
          <TraceIcon>
            <CheckIcon />
          </TraceIcon>
          <TraceTitle>{label}</TraceTitle>
        </TraceLine>
      </Trace>
      {children ?? null}
    </div>
  );
};
