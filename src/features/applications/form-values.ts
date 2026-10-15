import { dateInputToMorningIso, toDateTimeLocalValue } from "@/lib/forms/date-input";
import type { Application, ApplicationInput } from "@/core/domain/types";
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

/** Form values -> use-case input. Business defaults are applied by the use case. */
export function formToInput(values: ApplicationFormValues): ApplicationInput {
  return toApplicationInput(values);
}

/** The optional "follow-up reminder" date as a local-morning instant. */
export function followUpDueAtFromForm(values: ApplicationFormValues): string | null {
  return values.followUpDate ? dateInputToMorningIso(values.followUpDate) : null;
}
