"use client";

import { CheckIcon } from "lucide-react";

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";

import { ToolError, ToolRunning } from "./tool-state";

/**
 * Shared shell for a tool result: a one-line marker saying what ran, above a
 * compact table of the data it returned. The marker doubles as the running and
 * error state, so a tool call occupies one slot in the transcript whether it is
 * in flight, failed, or done.
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
    return <ToolError label={label} text={errorText} />;
  }

  if (isPending) {
    return <ToolRunning label={`${label}…`} />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Marker render={<output />}>
        <MarkerIcon>
          <CheckIcon />
        </MarkerIcon>
        <MarkerContent>{label}</MarkerContent>
      </Marker>
      {children ?? null}
    </div>
  );
};
