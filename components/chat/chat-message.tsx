"use client";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { mergeTextParts, partKey } from "@/lib/chat/message-parts";
import type { ChatUIMessage } from "@/lib/chat/tools";

import { AgentSteps } from "./agent-steps";
import { TextPart } from "./parts/text-part";

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
          <Bubble align="end" variant="muted">
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

  const textParts = mergeTextParts(message.parts).filter(
    (part) => part.type === "text"
  );

  return (
    <Message align="start">
      <MessageContent>
        <AgentSteps isStreaming={isStreaming} parts={message.parts} />
        {textParts.map((part, index) => (
          <Bubble key={partKey(part, index)} variant="secondary">
            <BubbleContent>
              <TextPart isStreaming={isStreaming} part={part} />
            </BubbleContent>
          </Bubble>
        ))}
      </MessageContent>
    </Message>
  );
};
