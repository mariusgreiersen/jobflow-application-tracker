"use client";

import Link from "next/link";
import { RotateCcw, Sparkles } from "lucide-react";
import { useJobData } from "@/features/jobs/job-data-provider";
import { exitDemo } from "@/features/auth/actions";

export function DemoBanner() {
  const { resetDemo } = useJobData();
  return (
    <div
      role="region"
      aria-label="Demo mode"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-2 text-center text-xs text-white sm:text-sm"
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Sparkles className="size-3.5" /> Demo mode
      </span>
      <span className="text-white/80">Sample data, stored only in this browser. Changes never reach a server.</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void resetDemo?.()}
          className="inline-flex items-center gap-1 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
        <form action={exitDemo}>
          <button type="submit" className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            Exit
          </button>
        </form>
        <Link href="/signup" className="rounded-md bg-white/15 px-2 py-0.5 font-medium hover:bg-white/25">
          Create account
        </Link>
      </span>
    </div>
  );
}
