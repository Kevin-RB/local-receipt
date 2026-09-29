import { getStaticToolName, isStaticToolUIPart } from "ai";

import type { ChatUIMessage } from "./tools";

/**
 * The only tool whose output legitimately originates in the browser, keyed by
 * the SDK's own tool name (`getStaticToolName`) rather than by a sliced `tool-`
 * prefix. `ask_user` is completed by the user in the UI, and the client has to
 * send that answer back for the agent to continue.
 */
const CLIENT_ANSWERED_TOOLS = new Set<string>(["ask_user"]);

/**
 * Declared `as const` so `state` stays the literal `"output-error"` when spread.
 * Widening it to `string` is what makes TypeScript reject the spread against the
 * SDK's per-tool part union.
 */
const REJECTED = {
  errorText:
    "Discarded an untrusted result sent by the client. Call the tool again to get a real result.",
  output: undefined,
  state: "output-error",
} as const;

/**
 * The model treats a tool result as ground truth, so a client that posted a
 * fabricated `spend_by_merchant` result could talk the model into reporting
 * invented totals — and, more subtly, could contradict the real answer. Tool
 * results the server produces itself are always reproducible, so anything the
 * browser sends for those tools is replaced with an error the model can only
 * resolve by calling the tool again.
 */
export const discardUntrustedToolOutputs = (
  messages: ChatUIMessage[]
): ChatUIMessage[] =>
  messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    let changed = false;
    const parts = message.parts.map((part) => {
      if (
        !isStaticToolUIPart(part) ||
        part.state !== "output-available" ||
        CLIENT_ANSWERED_TOOLS.has(getStaticToolName(part))
      ) {
        return part;
      }

      changed = true;
      return { ...part, ...REJECTED };
    });

    return changed ? { ...message, parts } : message;
  });
