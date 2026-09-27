import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Chat } from "@/components/chat/chat";
import { auth } from "@/lib/auth";

const ChatPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="flex h-[calc(100svh-3rem)] flex-col">
      <Chat />
    </main>
  );
};

export default ChatPage;
