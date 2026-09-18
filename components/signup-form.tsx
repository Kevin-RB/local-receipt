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
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const SignupForm = ({
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
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEndIcon className="size-6" />
              </div>
              <span className="sr-only">possum</span>
            </Link>
            <h1 className="text-xl font-bold">Create an account</h1>
            <FieldDescription>
              Already have an account? <Link href="/sign-in">Sign in</Link>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="text-base md:text-xs"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              autoComplete="email"
              className="text-base md:text-xs"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="inviteCode">Invite code</FieldLabel>
            <Input
              id="inviteCode"
              name="inviteCode"
              autoComplete="off"
              className="text-base md:text-xs"
              required
            />
            <FieldDescription>
              Enter the invite code you were given to create an account
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="text-base md:text-xs"
                minLength={8}
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
              {pending ? "Creating account…" : "Sign up"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
};
