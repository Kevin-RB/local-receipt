import { isToolUIPart } from "ai";

import type { ChatMessagePart, ChatUIMessage } from "./tools";

/**
 * Adjacent text parts belong to one markdown document. The model can split its
 * answer across several parts (a tool call between two sentences, say), and
 * rendering each as its own bubble would break the paragraph and the list
 * numbering. Merging first keeps one bubble per contiguous run of prose.
 */
export const mergeTextParts = (parts: ChatMessagePart[]): ChatMessagePart[] => {
  const merged: ChatMessagePart[] = [];

  for (const part of parts) {
    const last = merged.at(-1);
    if (part.type === "text" && last?.type === "text") {
      merged[merged.length - 1] = { ...part, text: last.text + part.text };
      continue;
    }
    merged.push(part);
  }

  return merged;
};

/** Stable React key for a part: tool calls have a `toolCallId`, text does not. */
export const partKey = (part: ChatMessagePart, index: number): string =>
  isToolUIPart(part) ? part.toolCallId : `text-${index}`;

/** True when the message is the one currently being appended to. */
export const isLastStreaming = (
  message: ChatUIMessage,
  lastId: string | undefined,
  busy: boolean
): boolean => busy && message.id === lastId;
