import type { Clock } from "@/core/application/ports/clock";

export const systemClock: Clock = { now: () => new Date() };
