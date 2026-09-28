"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import {
  CheckIcon,
  LoaderCircleIcon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller";
import type { ChatToolName, ChatUIMessage } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<ChatToolName, string> = {
  listReceipts: "Listing receipts",
  receiptDetail: "Reading a receipt",
  searchLineItems: "Searching items",
  spendByCategory: "Totalling by category",
  spendByMerchant: "Totalling by merchant",
};

const ToolStatusIcon = ({ state }: { state: string }) => {
  if (state === "output-error") {
    return <TriangleAlertIcon />;
  }
  if (state === "input-streaming" || state === "input-available") {
    return <LoaderCircleIcon className="animate-spin" />;
  }
  return <CheckIcon />;
};

const TopFade = () => {
  const { start } = useMessageScrollerScrollable();

  return (
    <div
      aria-hidden="true"
      className={cn(
        "from-background pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b to-transparent transition-opacity duration-200",
        start ? "opacity-100" : "opacity-0"
      )}
    />
  );
};

export const Chat = () => {
  const { error, messages, sendMessage, status } = useChat<ChatUIMessage>({
    throttle: 50,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  const submit = () => {
    const text = input.trim();
    if (!text || busy) {
      return;
    }
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-3xl">
                {messages.length === 0 ? (
                  <MessageScrollerItem>
                    <div className="pt-10">
                      <Marker variant="separator">
                        <MarkerContent>
                          Ask about your spending, for example “how much did I
                          spend on groceries last month?”
                        </MarkerContent>
                      </Marker>
                    </div>
                  </MessageScrollerItem>
                ) : null}

                {messages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={isUser}
                    >
                      <Message align={isUser ? "end" : "start"}>
                        <MessageContent>
                          {message.parts.map((part, index) => {
                            if (part.type === "text") {
                              return (
                                <Bubble
                                  key={`${message.id}-${index}`}
                                  variant={isUser ? "default" : "muted"}
                                >
                                  {isUser ? (
                                    <BubbleContent className="whitespace-pre-wrap">
                                      {part.text}
                                    </BubbleContent>
                                  ) : (
                                    <BubbleContent>
                                      <Streamdown isAnimating={busy}>
                                        {part.text}
                                      </Streamdown>
                                    </BubbleContent>
                                  )}
                                </Bubble>
                              );
                            }

                            if (isToolUIPart(part)) {
                              const name = getToolName(part) as ChatToolName;

                              return (
                                <Marker
                                  key={`${message.id}-${index}`}
                                  render={<output />}
                                >
                                  <MarkerIcon>
                                    <ToolStatusIcon state={part.state} />
                                  </MarkerIcon>
                                  <MarkerContent>
                                    {TOOL_LABELS[name]}
                                  </MarkerContent>
                                </Marker>
                              );
                            }

                            return null;
                          })}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })}

                {busy ? (
                  <MessageScrollerItem>
                    <Marker render={<output />}>
                      <MarkerContent>Thinking…</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
          <TopFade />
        </MessageScrollerProvider>
      </div>

      <div className="mx-auto w-full max-w-3xl py-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <InputGroup>
            <InputGroupTextarea
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask about your receipts…"
              rows={1}
              value={input}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Send"
                disabled={busy || input.trim().length === 0}
                size="icon-sm"
                type="submit"
              >
                <SendIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {error ? (
            <p className="text-destructive text-xs">
              Something went wrong. Please try again.
              {error.message ? ` (${error.message})` : ""}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
};
