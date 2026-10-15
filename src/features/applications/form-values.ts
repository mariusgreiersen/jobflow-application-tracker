import { resolveAppliedDate } from "@/lib/domain/status";
import { dateInputToMorningIso, toDateTimeLocalValue } from "@/lib/domain/dates";
import type { Application, ApplicationInput } from "@/lib/domain/types";
import {
  EMPTY_APPLICATION_FORM,
  toApplicationInput,
  type ApplicationFormValues,
} from "@/lib/validations/application";

export function toFormValues(app: Application): ApplicationFormValues {
  return {
    ...EMPTY_APPLICATION_FORM,
    company: app.company,
    jobTitle: app.jobTitle,
    logoUrl: app.logoUrl ?? "",
    location: app.location ?? "",
    workType: app.workType ?? "",
    jobUrl: app.jobUrl ?? "",
    status: app.status,
    dateApplied: app.dateApplied ?? "",
    interviewAt: toDateTimeLocalValue(app.interviewAt),
    interviewNotes: app.interviewNotes ?? "",
    salaryMin: app.salaryMin?.toString() ?? "",
    salaryMax: app.salaryMax?.toString() ?? "",
    salaryCurrency: app.salaryCurrency ?? "",
    notes: app.notes ?? "",
  };
}

/** Form values -> domain input, applying the same applied-date rule as status moves. */
export function formToInput(values: ApplicationFormValues): ApplicationInput {
  const input = toApplicationInput(values);
  return { ...input, dateApplied: resolveAppliedDate(input.status, input.dateApplied) };
}

export function followUpFromForm(values: ApplicationFormValues, company: string) {
  const dueAt = values.followUpDate ? dateInputToMorningIso(values.followUpDate) : null;
  return dueAt ? { title: `Follow up with ${company}`, dueAt } : undefined;
}
