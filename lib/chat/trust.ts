import { isDynamicToolUIPart, isStaticToolUIPart } from "ai";

import type { ChatMessagePart, ChatUIMessage } from "./tools";

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
 * Any part that will become a `tool-result` for the model.
 *
 * `isStaticToolUIPart` alone is not enough: it matches `type: "tool-*"`, so a
 * part typed `dynamic-tool` slips past. The SDK still converts one carrying
 * `providerExecuted === true` and `state: "output-available"` into a
 * `tool-result`, and both fields arrive on the request body. The app registers
 * no dynamic tools, so any such part is fabricated by definition.
 *
 * See https://github.com/Kevin-RB/local-receipt/pull/136#discussion_r1
 */
const isToolResultPart = (
  part: ChatMessagePart
): part is Extract<
  ChatMessagePart,
  { type: "dynamic-tool" | `tool-${string}` }
> => isStaticToolUIPart(part) || isDynamicToolUIPart(part);

/** Only `ask_user` may be answered by the browser. */
const isTrustedClientTool = (part: { type: string }): boolean => {
  const name = part.type.startsWith("tool-")
    ? part.type.slice("tool-".length)
    : (part as { toolName?: string }).toolName;

  return name !== undefined && CLIENT_ANSWERED_TOOLS.has(name);
};

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
        !isToolResultPart(part) ||
        part.state !== "output-available" ||
        isTrustedClientTool(part)
      ) {
        return part;
      }

      changed = true;
      return { ...part, ...REJECTED };
    });

    return changed ? { ...message, parts } : message;
  });
