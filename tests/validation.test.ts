import { describe, expect, it } from "vitest";
import {
  EMPTY_APPLICATION_FORM,
  applicationFormSchema,
  followUpFormSchema,
  toApplicationInput,
  type ApplicationFormValues,
} from "@/lib/validations/application";
import { loginSchema, resetPasswordSchema, signUpSchema } from "@/lib/validations/auth";

const valid = (overrides: Partial<ApplicationFormValues> = {}): ApplicationFormValues => ({
  ...EMPTY_APPLICATION_FORM,
  company: "Northwind Labs",
  jobTitle: "Graduate Software Engineer",
  ...overrides,
});

function issuesFor(values: ApplicationFormValues) {
  const result = applicationFormSchema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("application form validation", () => {
  it("accepts a minimal application with only company and title", () => {
    expect(applicationFormSchema.safeParse(valid()).success).toBe(true);
  });

  it("requires company and job title, ignoring whitespace", () => {
    const issues = issuesFor(valid({ company: "   ", jobTitle: "" }));
    expect(issues.company).toBe("Company name is required");
    expect(issues.jobTitle).toBe("Job title is required");
  });

  it("rejects non-http URLs", () => {
    expect(issuesFor(valid({ jobUrl: "javascript:alert(1)" })).jobUrl).toMatch(/https/);
    expect(issuesFor(valid({ jobUrl: "not a url" })).jobUrl).toBeDefined();
    expect(issuesFor(valid({ jobUrl: "https://example.com/jobs/1" })).jobUrl).toBeUndefined();
  });

  it("validates the salary range and requires a currency", () => {
    expect(issuesFor(valid({ salaryMin: "600000", salaryMax: "500000", salaryCurrency: "DKK" })).salaryMax).toMatch(/at least/);
    expect(issuesFor(valid({ salaryMin: "500000" })).salaryCurrency).toMatch(/currency/);
    expect(issuesFor(valid({ salaryMin: "abc", salaryCurrency: "DKK" })).salaryMin).toBe("Enter a whole number");
    expect(issuesFor(valid({ salaryCurrency: "kroner", salaryMin: "1" })).salaryCurrency).toMatch(/3-letter/);
  });

  it("rejects malformed dates", () => {
    expect(issuesFor(valid({ dateApplied: "15/10/2026" })).dateApplied).toBeDefined();
    expect(issuesFor(valid({ interviewAt: "tomorrow" })).interviewAt).toBeDefined();
  });

  it("converts form strings into the domain shape", () => {
    const parsed = applicationFormSchema.parse(
      valid({
        location: "  Aarhus ",
        workType: "remote",
        salaryMin: "480,000",
        salaryMax: "540000",
        salaryCurrency: "dkk",
        interviewAt: "2026-10-20T14:30",
        notes: "",
      }),
    );
    const input = toApplicationInput(parsed);
    expect(input).toMatchObject({
      location: "Aarhus",
      workType: "remote",
      salaryMin: 480000,
      salaryMax: 540000,
      salaryCurrency: "DKK",
      notes: null,
      logoUrl: null,
    });
    // 14:30 Copenhagen summer time (UTC+2) is 12:30 UTC.
    expect(input.interviewAt).toBe("2026-10-20T12:30:00.000Z");
  });
});

describe("follow-up validation", () => {
  it("requires an application, title and due date", () => {
    const result = followUpFormSchema.safeParse({ applicationId: "", title: " ", dueDate: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(3);
  });
});

describe("auth validation", () => {
  it("normalises email and checks format", () => {
    expect(loginSchema.parse({ email: "  Ada@Example.COM ", password: "x" }).email).toBe("ada@example.com");
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });

  it("enforces password length on sign-up", () => {
    expect(signUpSchema.safeParse({ fullName: "Ada", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "Ada", email: "a@b.co", password: "long-enough" }).success).toBe(true);
  });

  it("requires matching passwords on reset", () => {
    const result = resetPasswordSchema.safeParse({ password: "password123", confirmPassword: "password124" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });
});
