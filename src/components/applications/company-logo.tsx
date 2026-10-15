"use client";

import { useState } from "react";
import { hueFromString, initials } from "@/lib/presenters/format";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-7 text-[10px] rounded-md",
  md: "size-9 text-xs rounded-lg",
  lg: "size-12 text-sm rounded-xl",
} as const;

/** Company logo from a URL, falling back to coloured initials when absent or broken. */
export function CompanyLogo({
  company,
  logoUrl,
  size = "md",
  className,
}: {
  company: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hue = hueFromString(company);

  if (logoUrl && !failed) {
    return (
      // Arbitrary user-supplied hosts can't be listed in next/image remotePatterns.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        onError={() => setFailed(true)}
        className={cn(SIZES[size], "shrink-0 border bg-white object-contain p-0.5", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ "--logo-hue": hue } as React.CSSProperties}
      className={cn(
        SIZES[size],
        "grid shrink-0 place-items-center font-semibold tracking-tight ring-1 ring-black/5 ring-inset",
        "bg-[oklch(0.94_0.045_var(--logo-hue))] text-[oklch(0.42_0.12_var(--logo-hue))]",
        "dark:bg-[oklch(0.3_0.06_var(--logo-hue))] dark:text-[oklch(0.86_0.08_var(--logo-hue))] dark:ring-white/10",
        className,
      )}
    >
      {initials(company)}
    </span>
  );
}
