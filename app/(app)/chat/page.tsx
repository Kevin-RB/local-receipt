import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Chat } from "@/components/chat/chat";
import { auth } from "@/lib/auth";
import { toDisplayName } from "@/lib/chat/greeting";

const ChatPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="flex h-[calc(100svh-3rem)] flex-col">
      {/* The greeting is resolved in the browser, from the user's own clock —
          see `lib/chat/greeting.ts`. */}
      <Chat firstName={toDisplayName(session.user.name)} />
    </main>
  );
};

export default ChatPage;
