import { describe, expect, it } from "vitest";

import { isLastStreaming, mergeTextParts, partKey } from "./message-parts";
import type { ChatMessagePart, ChatUIMessage } from "./tools";

const text = (value: string): ChatMessagePart => ({
  state: "done",
  text: value,
  type: "text",
});

const tool = (name: string): ChatMessagePart =>
  ({
    input: {},
    output: [],
    state: "output-available",
    toolCallId: `call-${name}`,
    type: `tool-${name}`,
  }) as unknown as ChatMessagePart;

describe(mergeTextParts, () => {
  it("leaves a single text part untouched", () => {
    const parts = [text("Hello")];
    expect(mergeTextParts(parts)).toStrictEqual(parts);
  });

  it("joins adjacent text parts into one markdown document", () => {
    // Without this, a tool call between two halves of a sentence would render
    // as two separate bubbles and read as two paragraphs.
    expect(mergeTextParts([text("You spent "), text("$42.50.")])).toStrictEqual(
      [text("You spent $42.50.")]
    );
  });

  it("does not merge across a tool call", () => {
    const merged = mergeTextParts([
      text("before"),
      tool("spend_by_merchant"),
      text("after"),
    ]);
    expect(merged).toHaveLength(3);
    expect(merged[0]).toStrictEqual(text("before"));
    expect(merged[2]).toStrictEqual(text("after"));
  });
});

describe(partKey, () => {
  it("uses the toolCallId for tool parts", () => {
    expect(partKey(tool("spend_by_merchant"), 3)).toBe(
      "call-spend_by_merchant"
    );
  });

  it("falls back to the index for text parts", () => {
    expect(partKey(text("hi"), 0)).toBe("text-0");
  });
});

describe(isLastStreaming, () => {
  const message = {
    id: "m2",
    parts: [],
    role: "assistant",
  } as ChatUIMessage;

  it("is true only for the last message while busy", () => {
    expect(isLastStreaming(message, "m2", true)).toBeTruthy();
    expect(isLastStreaming(message, "m1", true)).toBeFalsy();
    expect(isLastStreaming(message, "m2", false)).toBeFalsy();
  });
});
