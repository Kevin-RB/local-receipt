"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, GalleryVerticalEndIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

const signUpSchema = z.object({
  email: z.email("Enter a valid email address."),
  inviteCode: z.string().min(1, "Enter your invite code."),
  name: z.string().min(1, "Enter your name."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export const SignupForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<SignUpValues>({
    defaultValues: { email: "", inviteCode: "", name: "", password: "" },
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (values: SignUpValues) => {
    const { error } = await signUp.email(values);
    if (error) {
      setError("root", { message: error.message ?? "Failed to sign up" });
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              {...register("name")}
              aria-invalid={!!errors.name}
              autoComplete="name"
              id="name"
              required
              type="text"
            />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              {...register("email")}
              aria-invalid={!!errors.email}
              autoComplete="email"
              id="email"
              placeholder="m@example.com"
              required
              type="email"
            />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field data-invalid={!!errors.inviteCode}>
            <FieldLabel htmlFor="inviteCode">Invite code</FieldLabel>
            <Input
              {...register("inviteCode")}
              aria-invalid={!!errors.inviteCode}
              autoComplete="off"
              id="inviteCode"
              required
            />
            <FieldDescription>
              Enter the invite code you were given to create an account
            </FieldDescription>
            <FieldError errors={[errors.inviteCode]} />
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                {...register("password")}
                aria-invalid={!!errors.password}
                autoComplete="new-password"
                id="password"
                minLength={8}
                required
                type={showPassword ? "text" : "password"}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="relative touch-manipulation after:absolute after:-inset-3 after:content-['']"
                  onClick={() => setShowPassword((visible) => !visible)}
                  size="icon-xs"
                  type="button"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldError errors={[errors.password, errors.root]} />
          </Field>
          <Field>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account…" : "Sign up"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
};
