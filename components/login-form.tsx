"use client";

import { EyeIcon, EyeOffIcon, GalleryVerticalEndIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form
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
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEndIcon className="size-6" />
              </div>
              <span className="sr-only">possum</span>
            </Link>
            <h1 className="text-xl font-bold">Possum receipts</h1>
            <p className="text-balance text-muted-foreground">
              Give your receipts a new home
            </p>
            <FieldDescription>
              Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              autoComplete="username"
              className="text-base md:text-xs"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="current-password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="current-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="text-base md:text-xs"
                required
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="relative touch-manipulation after:absolute after:-inset-3 after:content-['']"
                  size="icon-xs"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{error}</FieldError>
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
};
