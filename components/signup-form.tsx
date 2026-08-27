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
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const SignupForm = ({
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
              const { error: result } = await signUp.email({
                email: String(formData.get("email")),
                inviteCode: String(formData.get("inviteCode") ?? ""),
                name: String(formData.get("name")),
                password: String(formData.get("password")),
              });
              setPending(false);
              if (result) {
                setError(result.message ?? "Failed to sign up");
                return;
              }
              router.push("/");
              router.refresh();
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-balance text-muted-foreground">
                  Enter your details below to get started
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" name="name" type="text" required />
              </Field>
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
                <FieldLabel htmlFor="inviteCode">Invite code</FieldLabel>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  type="password"
                  autoComplete="off"
                  required
                />
                <FieldDescription>
                  Enter the invite code you were given to create an account
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                />
              </Field>
              <Field>
                <FieldError>{error}</FieldError>
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating account…" : "Sign up"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Already have an account? <Link href="/sign-in">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <Image
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrBAQ9rhaFUdFFVz9V18_2iKB4de9JAYysLg0J8C6XXZZlAshHiMH9iWQ&s=10"
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
