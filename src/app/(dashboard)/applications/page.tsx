import type { Metadata } from "next";
import { ApplicationsView } from "@/features/applications/applications-view";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  // Keyed by the query so a new search from the top bar resets the filters.
  return <ApplicationsView key={query} initialQuery={query} />;
}
