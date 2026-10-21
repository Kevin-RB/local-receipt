import { Chat } from "@/components/chat/chat";
import { requireSession } from "@/lib/auth/dal";
import { toDisplayName } from "@/lib/chat/greeting";

const Home = async () => {
  const session = await requireSession();

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* The greeting is resolved in the browser, from the user's own clock —
          see `lib/chat/greeting.ts`. */}
      <Chat firstName={toDisplayName(session.user.name)} />
    </main>
  );
};

export default Home;
