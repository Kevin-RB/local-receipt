import { createAgentUIStreamResponse, validateUIMessages } from "ai";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createChatAgent } from "@/lib/chat/agent";
import { buildChatTools } from "@/lib/chat/tools";
import type { ChatUIMessage } from "@/lib/chat/tools";
import { discardUntrustedToolOutputs } from "@/lib/chat/trust";

/** The app runs against a local model, so latency is bound by OCR-free local inference. */
export const maxDuration = 60;

export const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tools = buildChatTools(session.user.id);

  // The body is client-supplied, so validate the shape of every message and
  // tool part before it reaches the model.
  let messages: ChatUIMessage[];
  try {
    messages = await validateUIMessages<ChatUIMessage>({
      messages: (body as { messages?: unknown })?.messages,
      tools: tools as Parameters<typeof validateUIMessages>[0]["tools"],
    });
  } catch {
    return NextResponse.json({ error: "Invalid messages." }, { status: 400 });
  }

  const agent = await createChatAgent(session.user.id);

  return createAgentUIStreamResponse({
    abortSignal: request.signal,
    agent,
    onError: () => "Something went wrong. Please try again.",
    // Everything past this point came off the wire. See `lib/chat/trust.ts`.
    uiMessages: discardUntrustedToolOutputs(messages),
  });
};
