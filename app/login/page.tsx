"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)]">
      <form onSubmit={handleSubmit} className="flex w-80 flex-col items-center gap-6">
        <h1
          className="text-[var(--text-2xl)] font-semibold text-[var(--color-ink)]"
          style={{ letterSpacing: "-0.9px" }}
        >
          Indexio
        </h1>

        <div className="flex w-full flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 text-[var(--text-base)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/20"
          />
          {error && <p className="text-[var(--text-sm)] text-[var(--color-danger)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--color-accent-solid)] text-[var(--text-sm)] font-medium text-[var(--color-inverse)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}
