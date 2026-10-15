import { Chat } from "@/components/chat/chat";
import { requireSession } from "@/lib/auth/dal";
import { toDisplayName } from "@/lib/chat/greeting";

const Home = async () => {
  const session = await requireSession();

  return (
    <main className="flex h-[calc(100svh-3rem)] flex-col">
      {/* The greeting is resolved in the browser, from the user's own clock —
          see `lib/chat/greeting.ts`. */}
      <Chat firstName={toDisplayName(session.user.name)} />
    </main>
  );
};

export default Home;
