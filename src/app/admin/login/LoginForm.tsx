"use client";

import { startTransition, useActionState } from "react";
import { initialState } from "@/lib/action-state";
import { loginAction } from "@/server/actions/auth";
import { buttonClasses } from "@/components/ui/Button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form
      action={action}
      className="grid gap-4"
      onSubmit={(e) => {
        // Keep the typed email if sign-in fails (React would otherwise reset the form).
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input !py-2.5" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input !py-2.5" />
      </div>
      {state.message && !state.ok ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "mt-2 w-full")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
