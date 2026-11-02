"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[var(--container-col)] flex-col justify-center px-6 py-12">
      <p className="font-display mb-12 text-4xl">Indexio<span className="text-[var(--color-accent)]">.</span></p>
      <p className="eyebrow mb-4">404 / Not in the catalogue</p>
      <h1 className="font-display text-5xl sm:text-6xl">This page is missing.</h1>
      <p className="mt-5 max-w-md text-[var(--color-ink-2)]">The address may have changed. Your library is a good place to start again.</p>
      <Link href="/" className={buttonClasses({ variant: "primary", className: "mt-8 self-start" })}>Back to the library</Link>
    </main>
  );
}
