"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { Leap } from "loading-dev";
import { MessageCircleIcon, PlusIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller";
import { greetingFor } from "@/lib/chat/greeting";
import { isLastStreaming } from "@/lib/chat/message-parts";
import type {
  AskUserAnswers,
  AskUserToolPart,
  ChatUIMessage,
} from "@/lib/chat/tools";
import { cn } from "@/lib/utils";

import { ChatMessage } from "./chat-message";
import { ChatDebugPanel } from "./debug-panel";
import { PromptForm } from "./prompt-form";
import { QuestionCard } from "./question-card";
import { Suggestions } from "./suggestions";

/**
 * Throttles client re-renders while tokens stream in. Surfaced in the debug
 * panel, since it is easy to mistake for a stalled response.
 */
const THROTTLE_MS = 50;

/**
 * The panel is behind a compile-time constant so the whole branch — component
 * and props — is dropped from production bundles rather than merely hidden.
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * The greeting is read once on mount and never changes, so the store has
 * nothing to subscribe to. `getServerSnapshot` returning `null` is what stops
 * React from hydrating a server-rendered greeting that would then be replaced.
 */
const subscribeToClock = () => () => 0;

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

const findPendingQuestion = (
  message: ChatUIMessage | undefined
): AskUserToolPart | undefined =>
  message?.role === "assistant"
    ? message.parts.find(
        (part): part is AskUserToolPart =>
          part.type === "tool-ask_user" &&
          (part.state === "input-streaming" || part.state === "input-available")
      )
    : undefined;

export const Chat = ({ firstName }: { firstName: string }) => {
  const {
    addToolOutput,
    error,
    id: chatId,
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<ChatUIMessage>({
    // Resumes the turn once the user answers the ask_user questionnaire:
    // the unanswered tool call is the signal that the agent is waiting.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    throttle: THROTTLE_MS,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;
  const lastMessage = messages.at(-1);
  const pendingQuestion = findPendingQuestion(lastMessage);

  // Null on the server and the first client render, so there is no wrong
  // greeting to correct — the title is filled in once the browser's clock is
  // available. See `lib/chat/greeting.ts`.
  const greeting = useSyncExternalStore(
    subscribeToClock,
    () => greetingFor(firstName),
    () => null
  );

  const debugPanel = isDev ? (
    <ChatDebugPanel
      chatId={chatId}
      error={error}
      messages={messages}
      status={status}
      throttle={THROTTLE_MS}
    />
  ) : null;

  return (
    <div className="flex h-full w-full flex-col">
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {/*
            The whole empty state waits for the greeting rather than rendering
            with a hole where the title goes. The greeting comes from the
            browser's own clock, so it is only known after hydration; gating the
            block keeps it from shifting the layout once it arrives.
          */}
          {greeting ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="brand">
                  <MessageCircleIcon />
                </EmptyMedia>
                <EmptyTitle size="lg">{greeting}</EmptyTitle>
                <EmptyDescription>
                  Ask about your spending — for example “how much did I spend on
                  groceries last month?”
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="w-full max-w-3xl">
                <PromptForm
                  isBusy={busy}
                  onStop={stop}
                  onSubmit={(text) => sendMessage({ text })}
                  placeholder="How can I help you today?"
                />
                <Suggestions onSelect={(text) => sendMessage({ text })} />
              </EmptyContent>
            </Empty>
          ) : null}
          {debugPanel}
        </div>
      ) : (
        <>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <MessageScrollerProvider autoScroll>
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent className="mx-auto w-full max-w-3xl">
                    {messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === "user"}
                      >
                        <ChatMessage
                          isStreaming={isLastStreaming(
                            message,
                            lastMessage?.id,
                            busy
                          )}
                          message={message}
                        />
                      </MessageScrollerItem>
                    ))}

                    {status === "submitted" ? (
                      <MessageScrollerItem messageId="thinking">
                        <Marker className="shimmer" render={<output />}>
                          <MarkerIcon>
                            <Leap size={14} />
                          </MarkerIcon>
                          <MarkerContent>Thinking…</MarkerContent>
                        </Marker>
                      </MessageScrollerItem>
                    ) : null}
                  </MessageScrollerContent>

                  {pendingQuestion ? (
                    <QuestionCard
                      onAnswer={(toolCallId: string, answers: AskUserAnswers) =>
                        addToolOutput({
                          output: answers,
                          tool: "ask_user",
                          toolCallId,
                        })
                      }
                      part={pendingQuestion}
                    />
                  ) : null}
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
              <TopFade />
            </MessageScrollerProvider>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 py-3">
            {error ? (
              <p className="text-destructive text-xs">
                Something went wrong. Please try again.
                {error.message ? ` (${error.message})` : ""}
              </p>
            ) : null}
            <PromptForm
              isBusy={busy}
              onStop={stop}
              onSubmit={(text) => sendMessage({ text })}
              placeholder="Ask about your receipts…"
            />
            {busy ? null : (
              <Button
                className="self-start"
                onClick={() => setMessages([])}
                size="sm"
                type="button"
                variant="ghost"
              >
                <PlusIcon />
                New chat
              </Button>
            )}
          </div>
          {debugPanel}
        </>
      )}
    </div>
  );
};
