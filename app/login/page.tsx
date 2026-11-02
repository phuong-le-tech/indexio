"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertIcon, SpinnerIcon } from "@/components/ui/Icon";
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
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Wrong password");
        return;
      }
    } catch {
      setError("Could not reach the server");
      return;
    } finally {
      setLoading(false);
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[var(--container-wide)] items-center gap-12 px-6 py-12 md:grid-cols-2 md:gap-20 md:px-12">
      <div className="border-b border-[var(--color-line)] pb-10 md:border-r md:border-b-0 md:py-16 md:pr-12">
        <p className="font-display mb-12 text-4xl">Indexio<span className="text-[var(--color-accent)]">.</span></p>
        <p className="eyebrow mb-5">A personal link index</p>
        <h1 className="font-display max-w-md text-5xl leading-[1.1] lg:text-7xl">A place for<br />what you find.</h1>
        <p className="mt-6 max-w-xs text-[var(--text-base)] leading-relaxed text-[var(--color-ink-2)]">The articles, ideas and corners of the web worth coming back to.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-7 justify-self-center">
        <div>
          <p className="eyebrow mb-3">Private collection</p>
          <h2 className="font-display mb-3 text-4xl">Welcome back.</h2>
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">Enter your password to open your library.</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <label htmlFor="password" className="text-[var(--text-sm)] font-medium">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your library password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            autoFocus
            className={`h-12 w-full rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-4 text-[var(--text-base)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)] ${FOCUS_RING} ${error ? "border-[var(--color-danger)]" : "border-[var(--color-line-strong)]"}`}
          />
          {error && <p id="login-error" role="alert" className="flex items-center gap-1.5 text-[var(--text-sm)] text-[var(--color-danger)]"><AlertIcon size={14} className="shrink-0" />{error}</p>}
          <Button type="submit" variant="primary" disabled={loading} className="h-12 w-full">
            {loading && <SpinnerIcon size={14} />}{loading ? "Checking…" : "Unlock"}
          </Button>
        </div>
      </form>
    </main>
  );
}
