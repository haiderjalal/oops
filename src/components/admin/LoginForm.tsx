"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { type LoginState, loginAction } from "@/features/auth/actions";

export function LoginForm({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Field label="Email" required>
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state.email ?? ""}
          />
        )}
      </Field>
      <Field label="Password" required>
        {(control) => (
          <Input
            {...control}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>
      {mfaEnabled ? (
        <Field
          label="Authenticator code"
          hint="The 6-digit code from your authenticator app."
          required
        >
          {(control) => (
            <Input
              {...control}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              required
            />
          )}
        </Field>
      ) : null}

      <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-2">
        <LogIn className="size-4" aria-hidden="true" />
        Sign in
      </Button>
    </form>
  );
}
