import type { ApplicationStatus, WorkType } from "@/core/domain/types";

/** How each status is presented. Visual concerns live here, not in the domain. */
export interface StatusMeta {
  label: string;
  description: string;
  /** Tailwind classes for the small status dot. */
  dot: string;
  /** Tailwind classes for a status badge. */
  badge: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  saved: {
    label: "Saved",
    description: "Bookmarked, not applied yet",
    dot: "bg-slate-400",
    badge:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25",
  },
  applied: {
    label: "Applied",
    description: "Submitted, waiting to hear back",
    dot: "bg-sky-500",
    badge:
      "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  },
  interview: {
    label: "Interview",
    description: "In the interview process",
    dot: "bg-violet-500",
    badge:
      "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  },
  offer: {
    label: "Offer",
    description: "Offer received",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  },
  rejected: {
    label: "Rejected",
    description: "Not moving forward",
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
  },
  withdrawn: {
    label: "Withdrawn",
    description: "You withdrew from the process",
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  },
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};
