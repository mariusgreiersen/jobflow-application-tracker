import { z } from "zod";
import { fromDateTimeLocalValue, dateInputToMorningIso } from "@/lib/domain/dates";
import {
  APPLICATION_STATUSES,
  WORK_TYPES,
  type ApplicationInput,
  type FollowUpInput,
} from "@/lib/domain/types";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const optionalUrl = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .refine((v) => v === "" || isHttpUrl(v), "Enter a full URL starting with https://");

const optionalAmount = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,9}$/.test(v.replace(/[\s,._]/g, "")), "Enter a whole number");

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Form schema. Every field is a string because that's what inputs produce;
 * `toApplicationInput` converts the validated values into the domain shape.
 */
export const applicationFormSchema = z
  .object({
    company: z.string().trim().min(1, "Company name is required").max(120, "Company name is too long"),
    jobTitle: z.string().trim().min(1, "Job title is required").max(160, "Job title is too long"),
    logoUrl: optionalUrl,
    location: optionalText(120, "Location"),
    workType: z.enum([...WORK_TYPES, ""]),
    jobUrl: optionalUrl,
    status: z.enum(APPLICATION_STATUSES),
    dateApplied: z.string().refine((v) => v === "" || DATE_ONLY.test(v), "Enter a valid date"),
    interviewAt: z
      .string()
      .refine((v) => v === "" || fromDateTimeLocalValue(v) !== null, "Enter a valid date and time"),
    interviewNotes: optionalText(5000, "Interview notes"),
    salaryMin: optionalAmount,
    salaryMax: optionalAmount,
    salaryCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || /^[A-Z]{3}$/.test(v), "Use a 3-letter currency code, e.g. DKK"),
    notes: optionalText(5000, "Notes"),
    /** Only used when creating: optionally schedules a follow-up reminder. */
    followUpDate: z.string().refine((v) => v === "" || DATE_ONLY.test(v), "Enter a valid date"),
  })
  .superRefine((values, ctx) => {
    const min = parseAmount(values.salaryMin);
    const max = parseAmount(values.salaryMax);
    if (min !== null && max !== null && max < min) {
      ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "Maximum must be at least the minimum" });
    }
    if ((min !== null || max !== null) && values.salaryCurrency === "") {
      ctx.addIssue({ code: "custom", path: ["salaryCurrency"], message: "Add a currency for the salary" });
    }
  });

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
  company: "",
  jobTitle: "",
  logoUrl: "",
  location: "",
  workType: "",
  jobUrl: "",
  status: "applied",
  dateApplied: "",
  interviewAt: "",
  interviewNotes: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "",
  notes: "",
  followUpDate: "",
};

function parseAmount(value: string): number | null {
  const digits = value.replace(/[\s,._]/g, "");
  return digits === "" ? null : Number(digits);
}

const emptyToNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

/** Converts validated form values into the domain input shape. */
export function toApplicationInput(values: ApplicationFormValues): ApplicationInput {
  return {
    company: values.company.trim(),
    jobTitle: values.jobTitle.trim(),
    logoUrl: emptyToNull(values.logoUrl),
    location: emptyToNull(values.location),
    workType: values.workType === "" ? null : values.workType,
    jobUrl: emptyToNull(values.jobUrl),
    status: values.status,
    dateApplied: emptyToNull(values.dateApplied),
    interviewAt: fromDateTimeLocalValue(values.interviewAt),
    interviewNotes: emptyToNull(values.interviewNotes),
    salaryMin: parseAmount(values.salaryMin),
    salaryMax: parseAmount(values.salaryMax),
    salaryCurrency: emptyToNull(values.salaryCurrency.toUpperCase()),
    notes: emptyToNull(values.notes),
  };
}

export const followUpFormSchema = z.object({
  applicationId: z.string().min(1, "Choose an application"),
  title: z.string().trim().min(1, "Describe the follow-up").max(200, "Keep it under 200 characters"),
  dueDate: z.string().refine((v) => DATE_ONLY.test(v), "Pick a due date"),
});

export type FollowUpFormValues = z.infer<typeof followUpFormSchema>;

export function toFollowUpInput(values: FollowUpFormValues): FollowUpInput {
  return {
    applicationId: values.applicationId,
    title: values.title.trim(),
    dueAt: dateInputToMorningIso(values.dueDate) as string,
  };
}

export const interviewFormSchema = z.object({
  applicationId: z.string().min(1, "Choose an application"),
  interviewAt: z
    .string()
    .refine((v) => fromDateTimeLocalValue(v) !== null, "Pick the interview date and time"),
  interviewNotes: optionalText(5000, "Preparation notes"),
});

export type InterviewFormValues = z.infer<typeof interviewFormSchema>;
