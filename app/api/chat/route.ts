import { createAgentUIStreamResponse } from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createChatAgent } from "@/lib/chat/agent";

export const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = (await request.json()) as { messages: UIMessage[] };
  const agent = await createChatAgent(session.user.id);

  return createAgentUIStreamResponse({ agent, uiMessages: messages });
};
