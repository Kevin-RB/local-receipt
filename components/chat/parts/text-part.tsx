"use client";

import type { TextUIPart } from "ai";
import { Streamdown } from "streamdown";

/**
 * `streamdown` handles markdown plus streaming. The `typeset` classes are not
 * available here (no `app/typeset.css`), so spacing is left to `BubbleContent`.
 */
export const TextPart = ({
  isStreaming,
  part,
}: {
  isStreaming: boolean;
  part: TextUIPart;
}) => {
  if (!part.text.trim()) {
    return null;
  }

  return <Streamdown isAnimating={isStreaming}>{part.text}</Streamdown>;
};
