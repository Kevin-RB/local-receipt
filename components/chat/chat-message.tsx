"use client";

import { isStaticToolUIPart } from "ai";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { mergeTextParts, partKey } from "@/lib/chat/message-parts";
import type { ChatMessagePart, ChatUIMessage } from "@/lib/chat/tools";

import { AskUserPart } from "./parts/ask-user-part";
import { ListReceiptsPart } from "./parts/list-receipts-part";
import { ReasoningPart } from "./parts/reasoning-part";
import { ReceiptDetailPart } from "./parts/receipt-detail-part";
import { SearchLineItemsPart } from "./parts/search-line-items-part";
import { SpendByCategoryPart } from "./parts/spend-by-category-part";
import { SpendByMerchantPart } from "./parts/spend-by-merchant-part";
import { TextPart } from "./parts/text-part";

/**
 * Compile-time exhaustiveness check. A tool part that falls through every `case`
 * arrives here as `never`, and `never` is not assignable to `never` once the
 * function has a concrete parameter type — so adding a tool to `buildChatTools`
 * without a `case` is a build error rather than a silently blank transcript.
 */
const unreachableToolPart = (part: never): never => {
  throw new Error(`Unhandled tool part: ${JSON.stringify(part)}`);
};

const AssistantToolPart = ({ part }: { part: ChatMessagePart }) => {
  // `isStaticToolUIPart`, not `isToolUIPart`: the latter also matches
  // `DynamicToolUIPart`, whose name is a bare `string` and cannot be a `case`
  // label. We never register dynamic tools.
  if (!isStaticToolUIPart(part)) {
    return null;
  }

  // Narrowing on the discriminant gives each renderer its own precisely typed
  // part, so `input` and `output` need no cast.
  switch (part.type) {
    case "tool-ask_user": {
      return <AskUserPart part={part} />;
    }
    case "tool-list_receipts": {
      return <ListReceiptsPart part={part} />;
    }
    case "tool-receipt_detail": {
      return <ReceiptDetailPart part={part} />;
    }
    case "tool-search_line_items": {
      return <SearchLineItemsPart part={part} />;
    }
    case "tool-spend_by_category": {
      return <SpendByCategoryPart part={part} />;
    }
    case "tool-spend_by_merchant": {
      return <SpendByMerchantPart part={part} />;
    }
    default: {
      return unreachableToolPart(part);
    }
  }
};

const AssistantPart = ({
  isStreaming,
  part,
}: {
  isStreaming: boolean;
  part: ChatMessagePart;
}) => {
  if (part.type === "text") {
    return (
      <Bubble variant="muted">
        <BubbleContent>
          <TextPart isStreaming={isStreaming} part={part} />
        </BubbleContent>
      </Bubble>
    );
  }

  if (part.type === "reasoning") {
    return <ReasoningPart isStreaming={isStreaming} part={part} />;
  }

  return <AssistantToolPart part={part} />;
};

export const ChatMessage = ({
  isStreaming,
  message,
}: {
  isStreaming: boolean;
  message: ChatUIMessage;
}) => {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble variant="default">
            <BubbleContent className="whitespace-pre-wrap">
              {message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("")}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message align="start">
      <MessageContent>
        {mergeTextParts(message.parts).map((part, index) => (
          <AssistantPart
            isStreaming={isStreaming}
            key={partKey(part, index)}
            part={part}
          />
        ))}
      </MessageContent>
    </Message>
  );
};
