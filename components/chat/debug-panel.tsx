"use client";

import type { ChatStatus } from "ai";
import { getToolName, isToolUIPart } from "ai";
import { useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import type { ChatMessagePart, ChatUIMessage } from "@/lib/chat/tools";

/**
 * A dev-only readout of the AI SDK's client state.
 *
 * `useChat` exposes `status`, `id`, `error` and `messages`; it does not expose
 * token usage or timings, so those are not shown. The model is fixed
 * server-side and never appears in the client state.
 */
const summarize = (part: ChatMessagePart): string => {
  if (isToolUIPart(part)) {
    return `${getToolName(part)}:${part.state}`;
  }
  if (part.type === "text") {
    return `text:${part.text.length}`;
  }
  if (part.type === "reasoning") {
    return `reasoning:${part.text.length}`;
  }
  return part.type;
};

/**
 * `Badge` owns its own colours, so the status tone comes from its `variant`.
 * `destructive` for a failed request, `default` while the turn is in flight,
 * `secondary` once it has settled.
 */
const variantFor = (status: ChatStatus) => {
  if (status === "error") {
    return "destructive" as const;
  }
  if (status === "streaming" || status === "submitted") {
    return "default" as const;
  }
  return "secondary" as const;
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex gap-2">
    <span className="text-muted-foreground w-20 shrink-0">{label}</span>
    <span className="min-w-0 break-words">{value}</span>
  </div>
);

/**
 * `useChat` generates its id randomly per instance, so the server and the
 * client each render a different one. Rendering it during SSR is therefore a
 * hydration mismatch, so the whole body waits for mount. The panel is
 * dev-only and collapsed by default, so nothing is lost by deferring it.
 */
const subscribeToNothing = () => () => 0;
const hasMounted = () => true;

export const ChatDebugPanel = ({
  chatId,
  error,
  messages,
  status,
  throttle,
}: {
  chatId: string;
  error: Error | undefined;
  messages: ChatUIMessage[];
  status: ChatStatus;
  throttle: number;
}) => {
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    hasMounted,
    () => false
  );
  const last = messages.at(-1);

  return (
    <details className="border-t px-4 py-2 font-mono text-xs">
      <summary className="text-muted-foreground cursor-pointer select-none">
        AI SDK debug
      </summary>

      {mounted ? (
        <div className="mt-2 flex flex-col gap-1">
          <Row
            label="status"
            value={<Badge variant={variantFor(status)}>{status}</Badge>}
          />
          <Row label="chat id" value={chatId} />
          <Row label="messages" value={messages.length} />
          <Row label="throttle" value={`${throttle}ms`} />
          {last ? (
            <>
              <Row label="last role" value={last.role} />
              <Row
                label="last parts"
                value={last.parts.map(summarize).join(", ") || "—"}
              />
            </>
          ) : (
            <Row label="last" value="—" />
          )}
          {error ? <Row label="error" value={error.message} /> : null}
        </div>
      ) : null}
    </details>
  );
};
