"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertIcon, LinkIcon, SpinnerIcon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/components/ui/styles";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Wrong password");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-5">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col items-center gap-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-8 shadow-lg"
      >
        <div className="flex flex-col items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-solid)] text-[var(--color-inverse)] shadow-md"
            aria-hidden="true"
          >
            <LinkIcon size={22} />
          </span>
          <h1
            className="text-[var(--text-2xl)] font-semibold text-[var(--color-ink)]"
            style={{ letterSpacing: "-0.9px" }}
          >
            Indexio
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
            Enter your password to open your library.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            aria-invalid={error ? true : undefined}
            autoFocus
            className={`h-12 w-full rounded-[var(--radius-md)] border bg-[var(--color-inset)] px-4 text-[var(--text-base)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)] ${FOCUS_RING} ${
              error ? "border-[var(--color-danger)]" : "border-[var(--color-line-strong)]"
            }`}
          />
          {error && (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-[var(--text-sm)] text-[var(--color-danger)]"
            >
              <AlertIcon size={14} className="shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={loading} className="h-11 w-full">
            {loading && <SpinnerIcon size={14} />}
            {loading ? "Checking…" : "Unlock"}
          </Button>
        </div>
      </form>
    </div>
  );
}
