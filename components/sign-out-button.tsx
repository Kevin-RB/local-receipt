"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export const SignOutButton = () => (
  <Button
    variant="ghost"
    size="sm"
    onClick={async () => {
      await signOut();
      // A real navigation so the server layout re-reads the cleared session —
      // see the note in `login-form.tsx`.
      window.location.assign("/sign-in");
    }}
  >
    Sign out
  </Button>
);
