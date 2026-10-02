"use client";

import { Blocks, Leap } from "loading-dev";
import { TriangleAlertIcon } from "lucide-react";

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";

/**
 * The running state of a tool call. `shimmer` animates the label while the
 * server executes the tool, so a slow query is visibly in progress rather than
 * looking like a finished answer with no data.
 */
export const ToolRunning = ({ label }: { label: string }) => (
  <Marker className="shimmer" render={<output />}>
    <MarkerIcon>
      <Leap size={14} />
    </MarkerIcon>
    <MarkerContent>{label}</MarkerContent>
  </Marker>
);

export const ToolError = ({ label, text }: { label: string; text: string }) => (
  <Marker render={<output />}>
    <MarkerIcon>
      <TriangleAlertIcon />
    </MarkerIcon>
    {/* `MarkerContent` owns its own colour, so the destructive tone lives on
        the inner span rather than as a restyle of the primitive. */}
    <MarkerContent>
      <span className="text-destructive">{`${label} failed: ${text}`}</span>
    </MarkerContent>
  </Marker>
);

export const ToolPendingIcon = () => (
  <Blocks color="var(--primary)" size={14} />
);
