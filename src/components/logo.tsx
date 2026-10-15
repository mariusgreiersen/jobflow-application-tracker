import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 place-items-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30 ring-1 ring-white/15",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h7" />
        <path d="M4 12h11" />
        <path d="M4 17h5" />
        <path d="m15 15 2.5 2.5L21 13" />
      </svg>
    </span>
  );
}

export function Logo({
  href = "/",
  className,
  textClassName,
}: {
  href?: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      <LogoMark />
      <span className={cn("text-[17px] font-semibold tracking-tight", textClassName)}>JobFlow</span>
    </Link>
  );
}
