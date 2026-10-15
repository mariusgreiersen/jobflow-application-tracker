import type { ActivityEvent } from "@/core/domain/types";
import { STATUS_META } from "./status";

/** Human-readable description of a history event. */
export function describeActivity(event: Pick<ActivityEvent, "type" | "fromStatus" | "toStatus">): string {
  const label = (status: ActivityEvent["toStatus"]) => (status ? STATUS_META[status].label : "unknown");
  switch (event.type) {
    case "created":
      return "Added to JobFlow";
    case "status_changed":
      if (event.toStatus === "applied" && (!event.fromStatus || event.fromStatus === "saved")) return "Applied";
      if (event.toStatus === "offer") return "Received an offer";
      if (event.toStatus === "rejected") return "Marked as rejected";
      if (event.toStatus === "withdrawn") return "Withdrew application";
      return `Moved ${event.fromStatus ? `from ${label(event.fromStatus)} ` : ""}to ${label(event.toStatus)}`;
    case "interview_scheduled":
      return "Interview scheduled";
    case "archived":
      return "Archived";
    case "restored":
      return "Restored from archive";
  }
}
