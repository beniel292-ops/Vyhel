"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  startTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { initialState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const ErrorsContext = createContext<Record<string, string>>({});
const PendingContext = createContext(false);
export const useFieldError = (name: string) => useContext(ErrorsContext)[name];

/**
 * Wraps a server action with: inline field errors, a toast, redirect-after-create,
 * preview-in-new-tab, and an unsaved-changes guard.
 */
export function AdminForm({
  action,
  children,
  className,
  resetOnSuccess,
  onSuccess,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (s: ActionState) => void;
}) {
  // A thrown server action (network drop, request too large, server error) becomes a normal error
  // message instead of crashing the page.
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData): Promise<ActionState> => {
    try {
      return await action(prev, fd);
    } catch (err) {
      console.error(err);
      return {
        ok: false,
        message: navigator.onLine ? "Couldn't save — the request failed or was too large. Please try again." : "You're offline. Reconnect and try again.",
        nonce: Date.now(),
      };
    }
  }, initialState);
  const [clientError, setClientError] = useState<{ message: string; nonce: number } | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!state.nonce) return;
    if (state.ok) {
      dirty.current = false;
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
      if (state.redirectTo?.endsWith("/preview")) {
        window.open(state.redirectTo, "_blank", "noopener");
        router.refresh();
      } else if (state.redirectTo) {
        router.push(state.redirectTo);
      } else {
        router.refresh();
      }
    } else if (state.errors) {
      const first = Object.keys(state.errors)[0];
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nonce]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return (
    <ErrorsContext.Provider value={state.errors ?? {}}>
      <PendingContext.Provider value={pending}>
      <form
        ref={formRef}
        className={className}
        onChange={() => {
          dirty.current = true;
        }}
        noValidate
        onSubmit={(e) => {
          // Submit manually so React doesn't reset the form (keeps typed values when validation fails).
          e.preventDefault();
          // Check file sizes before sending anything (inputs opt in with data-max-bytes).
          for (const input of Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>("input[type=file][data-max-bytes]"))) {
            const f = input.files?.[0];
            const max = Number(input.dataset.maxBytes);
            if (f && max && f.size > max) {
              setClientError({ message: `“${f.name}” is ${(f.size / 1048576).toFixed(1)} MB — the limit is ${Math.round(max / 1048576)} MB.`, nonce: Date.now() });
              return;
            }
          }
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
      </form>
      <Toast message={state.message} tone={state.ok ? "success" : "error"} nonce={state.nonce} />
      {clientError ? <Toast message={clientError.message} tone="error" nonce={clientError.nonce} /> : null}
      </PendingContext.Provider>
    </ErrorsContext.Provider>
  );
}

export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  required?: boolean;
  children: (id: string, invalid: boolean) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      {children(id, Boolean(error))}
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  name,
  hint,
  required,
  className,
  ...props
}: { label: string; name: string; hint?: ReactNode; required?: boolean; className?: string } & ComponentProps<"input">) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(id, invalid) => (
        <input id={id} name={name} aria-invalid={invalid || undefined} className={cn("input", invalid && "!border-danger")} {...props} />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  name,
  hint,
  required,
  className,
  rows = 3,
  ...props
}: { label: string; name: string; hint?: ReactNode; required?: boolean; className?: string } & ComponentProps<"textarea">) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(id, invalid) => (
        <textarea id={id} name={name} rows={rows} aria-invalid={invalid || undefined} className={cn("input", invalid && "!border-danger")} {...props} />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  required,
  options,
  placeholder,
  className,
  ...props
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
} & ComponentProps<"select">) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(id, invalid) => (
        <select id={id} name={name} aria-invalid={invalid || undefined} className={cn("input", invalid && "!border-danger")} {...props}>
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ label, name, hint, defaultChecked }: { label: string; name: string; hint?: string; defaultChecked?: boolean }) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
        <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
        <span>
          <span className="block text-sm text-ink">{label}</span>
          {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
        </span>
      </label>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function FormSection({ id, title, description, children }: { id?: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-5 p-5">{children}</div>
    </section>
  );
}

export function SubmitButton({
  children,
  intent,
  variant = "primary",
  size = "md",
  className,
}: {
  children: ReactNode;
  intent?: string;
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = status.pending || ctxPending;
  return (
    <button type="submit" name="intent" value={intent} disabled={pending} className={buttonClasses(variant, size, className)}>
      {pending ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Sticky bottom bar with the publishing workflow buttons. */
export function PublishBar({ status, isNew, cancelHref, children }: { status?: string; isNew: boolean; cancelHref?: string; children?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-[13px] text-muted">
          {isNew ? "New — not saved yet" : <>Status: <span className="font-medium capitalize text-ink">{status}</span></>}
        </span>
        {cancelHref ? (
          <Link href={cancelHref} className={buttonClasses("ghost", "md")}>
            Cancel
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** Native <dialog> modal: focus trapping, Esc to close and backdrop for free. */
export function Modal({
  trigger,
  title,
  children,
  wide,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  children: (close: () => void) => ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const open = () => setMounted(true);
  const close = () => setMounted(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (mounted && !d.open) d.showModal();
    if (!mounted && d.open) d.close();
  }, [mounted]);
  return (
    <>
      {trigger(open)}
      <dialog
        ref={ref}
        // React re-dispatches a nested <dialog>'s "close" event to every ancestor's onClose, so a dialog
        // opened inside this one (e.g. the media library inside "Add affiliate product") would also
        // close this one. Only react to our own dialog closing.
        onClose={(e) => {
          if (e.target === e.currentTarget) setMounted(false);
        }}
        onClick={(e) => e.target === e.currentTarget && close()}
        className={cn(
          "m-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-canvas p-0 text-ink shadow-2xl backdrop:bg-ink/35",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        {mounted ? (
          <div>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <button type="button" onClick={close} className="rounded px-2 py-1 text-sm text-muted hover:bg-sunken" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5">{children(close)}</div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

/** A button that asks for confirmation, then submits a server action form. */
export function ConfirmButton({
  action,
  fields,
  label,
  title,
  body,
  confirmLabel = "Confirm",
  variant = "ghost",
  size = "sm",
  className,
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: ReactNode;
  title: string;
  body: string;
  confirmLabel?: string;
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Modal
      title={title}
      trigger={(open) => (
        <Button variant={variant} size={size} onClick={open} className={className}>
          {label}
        </Button>
      )}
    >
      {(close) => (
        <form action={action} onSubmit={() => setTimeout(close, 50)}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <SubmitButton variant="danger">{confirmLabel}</SubmitButton>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** Small inline form for one-click row actions (publish, unpublish…). */
export function RowAction({
  action,
  fields,
  children,
  className,
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form action={action} className="inline">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <RowActionButton className={className}>{children}</RowActionButton>
    </form>
  );
}

function RowActionButton({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken hover:text-ink disabled:opacity-50", className)}
    >
      {pending ? "…" : children}
    </button>
  );
}
