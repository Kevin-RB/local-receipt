"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container mx-auto flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlertIcon className="size-4" />
            Something went wrong
          </CardTitle>
          <CardDescription>
            The page could not be loaded. Try again, and if the problem
            persists, check the server logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={retry} variant="outline">
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
