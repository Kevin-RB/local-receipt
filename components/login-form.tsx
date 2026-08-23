"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              setPending(true);
              setError(null);
              const { error: result } = await signIn.email({
                email: String(formData.get("email")),
                password: String(formData.get("password")),
              });
              setPending(false);
              if (result) {
                setError(result.message ?? "Failed to sign in");
                return;
              }
              router.push("/");
              router.refresh();
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Sign in to your account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" required />
                <FieldError>{error}</FieldError>
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Signing in…" : "Sign in"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <Image
              src="https://cdn.mos.cms.futurecdn.net/LotZ8WU7o6esocmzqrPC6S.jpg"
              alt="Possum receipt app"
              fill
              className="object-cover"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
