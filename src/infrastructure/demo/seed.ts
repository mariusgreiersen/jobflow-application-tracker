import { addDays, format, set, subDays } from "date-fns";
import type {
  ActivityEvent,
  Application,
  ApplicationStatus,
  FollowUpTask,
  JobSnapshot,
  WorkType,
} from "@/core/domain/types";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000000";
export const DEMO_PROFILE = { id: DEMO_USER_ID, email: "demo@jobflow.app", fullName: "Alex Demo" };

/**
 * Fictional companies (Microsoft sample names and TV-show companies) so nothing
 * implies a real hiring process. All dates are relative to "now", so the demo
 * always has upcoming interviews and an active-looking history.
 */
interface SeedEntry {
  company: string;
  jobTitle: string;
  location: string;
  workType: WorkType;
  /** Status history as [status, daysAgo]; the last entry is the current status. */
  history: Array<[ApplicationStatus, number]>;
  /** Saved jobs have no history entry beyond creation. */
  savedDaysAgo?: number;
  interview?: { inDays: number; hour: number; minute?: number; notes: string };
  salary?: [number, number, string];
  notes?: string;
  jobUrl?: string;
  archivedDaysAgo?: number;
  followUps?: Array<{ title: string; dueInDays: number; completedDaysAgo?: number }>;
}

const SEED: SeedEntry[] = [
  {
    company: "Northwind Labs",
    jobTitle: "Graduate Software Engineer",
    location: "Copenhagen, Denmark",
    workType: "hybrid",
    history: [["applied", 18], ["interview", 9]],
    interview: {
      inDays: 2,
      hour: 10,
      notes: "Technical round with two engineers. Review system design basics and my thesis project.",
    },
    salary: [480000, 540000, "DKK"],
    notes: "Referral from a former classmate. Team works on logistics optimisation.",
    jobUrl: "https://careers.example.com/northwind/graduate-swe",
    followUps: [{ title: "Send thank-you note to recruiter", dueInDays: -8, completedDaysAgo: 8 }],
  },
  {
    company: "Contoso",
    jobTitle: "Junior Backend Engineer (Go)",
    location: "Aarhus, Denmark",
    workType: "onsite",
    history: [["applied", 12]],
    followUps: [{ title: "Follow up on application status", dueInDays: -2 }],
  },
  {
    company: "Fabrikam Robotics",
    jobTitle: "Software Engineer, Perception",
    location: "Odense, Denmark",
    workType: "onsite",
    history: [["applied", 40], ["interview", 30], ["offer", 6]],
    salary: [540000, 600000, "DKK"],
    notes: "Offer deadline in two weeks. Ask about relocation support and the learning budget.",
    followUps: [{ title: "Reply to offer with questions", dueInDays: 1 }],
  },
  {
    company: "Initech",
    jobTitle: "Frontend Engineer (React)",
    location: "Remote, EU",
    workType: "remote",
    history: [["applied", 35], ["rejected", 20]],
    notes: "Generic rejection. They wanted 3+ years of experience.",
  },
  {
    company: "Globex Systems",
    jobTitle: "Platform Engineer",
    location: "Berlin, Germany",
    workType: "hybrid",
    history: [["applied", 21], ["interview", 7]],
    interview: {
      inDays: 5,
      hour: 14,
      minute: 30,
      notes: "Kubernetes and CI/CD deep dive. Prepare an incident story.",
    },
    salary: [65000, 75000, "EUR"],
  },
  {
    company: "Hooli",
    jobTitle: "Machine Learning Engineer, Graduate",
    location: "London, United Kingdom",
    workType: "hybrid",
    history: [["applied", 5]],
    salary: [55000, 65000, "GBP"],
  },
  {
    company: "Tailspin Analytics",
    jobTitle: "Data Engineer",
    location: "Copenhagen, Denmark",
    workType: "remote",
    history: [],
    savedDaysAgo: 3,
    notes: "Apply before the end of the month. Tailor the CV towards dbt and Airflow.",
  },
  {
    company: "Wingtip Games",
    jobTitle: "Gameplay Programmer",
    location: "Stockholm, Sweden",
    workType: "onsite",
    history: [["applied", 45], ["interview", 33], ["rejected", 25]],
    notes: "Made it to the final round. Feedback: strong C++, wanted more engine experience.",
  },
  {
    company: "Adatum Health",
    jobTitle: "Full-Stack Developer",
    location: "Copenhagen, Denmark",
    workType: "hybrid",
    history: [["applied", 8]],
    followUps: [{ title: "Email hiring manager about timeline", dueInDays: 0 }],
  },
  {
    company: "Lamna Bank",
    jobTitle: "Software Engineer, Payments",
    location: "Copenhagen, Denmark",
    workType: "onsite",
    history: [["applied", 26], ["interview", 14]],
    interview: {
      inDays: 1,
      hour: 9,
      notes: "Final round: pair programming plus a values interview. Bring questions about on-call.",
    },
    salary: [520000, 580000, "DKK"],
  },
  {
    company: "Woodgrove Bank",
    jobTitle: "Graduate Programme: Technology",
    location: "Aarhus, Denmark",
    workType: "hybrid",
    history: [["applied", 3]],
  },
  {
    company: "Litware",
    jobTitle: "DevOps Engineer",
    location: "Remote, Nordics",
    workType: "remote",
    history: [],
    savedDaysAgo: 6,
  },
  {
    company: "Proseware",
    jobTitle: "TypeScript Engineer",
    location: "Amsterdam, Netherlands",
    workType: "remote",
    history: [["applied", 30], ["withdrawn", 15]],
    notes: "Withdrew after the take-home: the role was mostly maintenance work.",
  },
  {
    company: "Alpine Ski House",
    jobTitle: "Mobile Developer (React Native)",
    location: "Copenhagen, Denmark",
    workType: "hybrid",
    history: [["applied", 15]],
    followUps: [{ title: "Check in with recruiter Maja", dueInDays: 3 }],
  },
  {
    company: "Blue Yonder Airlines",
    jobTitle: "Backend Engineer (Kotlin)",
    location: "Billund, Denmark",
    workType: "onsite",
    history: [["applied", 28], ["rejected", 18]],
  },
  {
    company: "Relecloud",
    jobTitle: "Cloud Engineer",
    location: "Stockholm, Sweden",
    workType: "hybrid",
    history: [["applied", 33], ["interview", 24], ["offer", 3]],
    salary: [560000, 620000, "SEK"],
    followUps: [
      { title: "Compare offer with Fabrikam", dueInDays: 4 },
      { title: "Send references to recruiter", dueInDays: -5, completedDaysAgo: 4 },
    ],
  },
  {
    company: "Trey Research",
    jobTitle: "Research Software Engineer",
    location: "Copenhagen, Denmark",
    workType: "onsite",
    history: [["applied", 16], ["interview", 4]],
    interview: {
      inDays: 9,
      hour: 13,
      notes: "Present a past project for 20 minutes. Use the distributed systems course project.",
    },
  },
  {
    company: "Fourth Coffee",
    jobTitle: "Junior Full-Stack Engineer",
    location: "Aarhus, Denmark",
    workType: "hybrid",
    history: [["applied", 22]],
    followUps: [{ title: "Follow up: no response after three weeks", dueInDays: -5 }],
  },
  {
    company: "VanArsdel",
    jobTitle: "Software Engineer in Test",
    location: "Malmö, Sweden",
    workType: "hybrid",
    history: [],
    savedDaysAgo: 1,
  },
  {
    company: "Southridge Video",
    jobTitle: "Video Platform Engineer",
    location: "Remote, EU",
    workType: "remote",
    history: [["applied", 60], ["rejected", 50]],
    archivedDaysAgo: 40,
  },
  {
    company: "First Up Consultants",
    jobTitle: "Graduate Technology Consultant",
    location: "Copenhagen, Denmark",
    workType: "onsite",
    history: [["applied", 2]],
  },
];

function seededId(prefix: string, index: number): string {
  // Stable, valid UUID-shaped ids keep demo URLs and React keys deterministic.
  const hex = (prefix.charCodeAt(0).toString(16) + index.toString(16).padStart(4, "0")).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.slice(-12)}`;
}

export function createDemoSnapshot(now: Date = new Date()): JobSnapshot {
  const applications: Application[] = [];
  const activity: ActivityEvent[] = [];
  const tasks: FollowUpTask[] = [];
  let activitySeq = 0;
  let taskSeq = 0;

  // Spread events across the working day so timestamps look natural.
  const at = (daysAgo: number, hour = 10) =>
    set(subDays(now, daysAgo), { hours: hour, minutes: 15, seconds: 0, milliseconds: 0 }).toISOString();

  SEED.forEach((entry, index) => {
    const id = seededId("a", index);
    const firstDay = entry.history[0]?.[1] ?? entry.savedDaysAgo ?? 0;
    const createdAt = at(firstDay + 1, 9);
    const current = entry.history.at(-1)?.[0] ?? "saved";
    const applied = entry.history.find(([status]) => status === "applied");
    const interviewAt = entry.interview
      ? set(addDays(now, entry.interview.inDays), {
          hours: entry.interview.hour,
          minutes: entry.interview.minute ?? 0,
          seconds: 0,
          milliseconds: 0,
        }).toISOString()
      : null;
    const lastChange = entry.history.at(-1)?.[1] ?? firstDay;

    applications.push({
      id,
      userId: DEMO_USER_ID,
      company: entry.company,
      jobTitle: entry.jobTitle,
      logoUrl: null,
      location: entry.location,
      workType: entry.workType,
      jobUrl: entry.jobUrl ?? null,
      status: current,
      dateApplied: applied ? format(subDays(now, applied[1]), "yyyy-MM-dd") : null,
      interviewAt,
      interviewNotes: entry.interview?.notes ?? null,
      salaryMin: entry.salary?.[0] ?? null,
      salaryMax: entry.salary?.[1] ?? null,
      salaryCurrency: entry.salary?.[2] ?? null,
      notes: entry.notes ?? null,
      archivedAt: entry.archivedDaysAgo !== undefined ? at(entry.archivedDaysAgo, 16) : null,
      createdAt,
      updatedAt: at(lastChange, 11),
    });

    const push = (event: Omit<ActivityEvent, "id" | "userId" | "applicationId">) =>
      activity.push({ id: seededId("e", activitySeq++), userId: DEMO_USER_ID, applicationId: id, ...event });

    push({ type: "created", fromStatus: null, toStatus: "saved", occurredAt: createdAt });
    let previous: ApplicationStatus = "saved";
    for (const [status, daysAgo] of entry.history) {
      push({ type: "status_changed", fromStatus: previous, toStatus: status, occurredAt: at(daysAgo, 11) });
      previous = status;
    }
    if (entry.interview) {
      const scheduledDaysAgo = entry.history.find(([s]) => s === "interview")?.[1] ?? 1;
      push({ type: "interview_scheduled", fromStatus: null, toStatus: "interview", occurredAt: at(scheduledDaysAgo, 12) });
    }
    if (entry.archivedDaysAgo !== undefined) {
      push({ type: "archived", fromStatus: null, toStatus: current, occurredAt: at(entry.archivedDaysAgo, 16) });
    }

    for (const followUp of entry.followUps ?? []) {
      tasks.push({
        id: seededId("t", taskSeq++),
        userId: DEMO_USER_ID,
        applicationId: id,
        title: followUp.title,
        dueAt: set(addDays(now, followUp.dueInDays), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
        completedAt: followUp.completedDaysAgo !== undefined ? at(followUp.completedDaysAgo, 15) : null,
        createdAt: at(Math.max(firstDay - 1, 0), 9),
        updatedAt: at(Math.max(firstDay - 1, 0), 9),
      });
    }
  });

  activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return { applications, tasks, activity };
}
