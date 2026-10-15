import type { SortOption } from "@/core/domain/filters";

export const SORT_LABEL: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  company: "Company name",
  interview: "Upcoming interview",
};
