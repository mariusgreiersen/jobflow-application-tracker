"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, fieldA11y } from "@/components/form-field";
import { StatusDot } from "@/components/applications/status-badge";
import { STATUS_META, WORK_TYPE_LABEL } from "@/lib/presenters/status";
import { APPLICATION_STATUSES, WORK_TYPES } from "@/core/domain/types";
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from "@/lib/validations/application";

const NO_WORK_TYPE = "unspecified";

export interface ApplicationFormProps {
  defaultValues: ApplicationFormValues;
  isEditing: boolean;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  onCancel: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ApplicationForm({ defaultValues, isEditing, onSubmit, onCancel }: ApplicationFormProps) {
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { errors, isSubmitting } = form.formState;
  const err = (name: keyof ApplicationFormValues) => errors[name]?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-7">
      <Section title="Role">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="company" label="Company" required error={err("company")}>
            <Input {...fieldA11y("company", err("company"))} autoFocus placeholder="Northwind Labs" className="h-9" {...form.register("company")} />
          </FormField>
          <FormField id="jobTitle" label="Job title" required error={err("jobTitle")}>
            <Input {...fieldA11y("jobTitle", err("jobTitle"))} placeholder="Graduate Software Engineer" className="h-9" {...form.register("jobTitle")} />
          </FormField>
          <FormField id="location" label="Location" error={err("location")}>
            <Input {...fieldA11y("location", err("location"))} placeholder="Copenhagen, Denmark" className="h-9" {...form.register("location")} />
          </FormField>
          <FormField id="workType" label="Work type" error={err("workType")}>
            <Controller
              control={form.control}
              name="workType"
              render={({ field }) => (
                <Select
                  value={field.value === "" ? NO_WORK_TYPE : field.value}
                  onValueChange={(v) => field.onChange(v === NO_WORK_TYPE ? "" : v)}
                >
                  <SelectTrigger {...fieldA11y("workType", err("workType"))} className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_WORK_TYPE}>Not specified</SelectItem>
                    {WORK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {WORK_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="jobUrl" label="Job posting URL" error={err("jobUrl")}>
            <Input {...fieldA11y("jobUrl", err("jobUrl"))} type="url" inputMode="url" placeholder="https://…" className="h-9" {...form.register("jobUrl")} />
          </FormField>
          <FormField id="logoUrl" label="Logo URL" error={err("logoUrl")} hint={err("logoUrl") ? undefined : "Optional. Initials are used otherwise."}>
            <Input {...fieldA11y("logoUrl", err("logoUrl"))} type="url" inputMode="url" placeholder="https://…/logo.png" className="h-9" {...form.register("logoUrl")} />
          </FormField>
        </div>
      </Section>

      <Section title="Progress">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="status" label="Status" error={err("status")}>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...fieldA11y("status", err("status"))} className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        <StatusDot status={status} />
                        {STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            id="dateApplied"
            label="Date applied"
            error={err("dateApplied")}
            hint={err("dateApplied") ? undefined : "Defaults to today once applied."}
          >
            <Input {...fieldA11y("dateApplied", err("dateApplied"))} type="date" className="h-9" {...form.register("dateApplied")} />
          </FormField>
          <FormField
            id="interviewAt"
            label="Upcoming interview"
            error={err("interviewAt")}
            hint={err("interviewAt") ? undefined : "In your local time zone."}
          >
            <Input {...fieldA11y("interviewAt", err("interviewAt"))} type="datetime-local" className="h-9" {...form.register("interviewAt")} />
          </FormField>
          {!isEditing && (
            <FormField
              id="followUpDate"
              label="Follow-up reminder"
              error={err("followUpDate")}
              hint={err("followUpDate") ? undefined : "Shown in your agenda on that day."}
            >
              <Input {...fieldA11y("followUpDate", err("followUpDate"))} type="date" className="h-9" {...form.register("followUpDate")} />
            </FormField>
          )}
          <FormField id="interviewNotes" label="Interview preparation notes" error={err("interviewNotes")} className="sm:col-span-2">
            <Textarea
              {...fieldA11y("interviewNotes", err("interviewNotes"))}
              rows={2}
              placeholder="Who you're meeting, topics to prepare, questions to ask…"
              {...form.register("interviewNotes")}
            />
          </FormField>
        </div>
      </Section>

      <Section title="Compensation">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField id="salaryMin" label="Salary from" error={err("salaryMin")}>
            <Input {...fieldA11y("salaryMin", err("salaryMin"))} inputMode="numeric" placeholder="480000" className="h-9" {...form.register("salaryMin")} />
          </FormField>
          <FormField id="salaryMax" label="Salary to" error={err("salaryMax")}>
            <Input {...fieldA11y("salaryMax", err("salaryMax"))} inputMode="numeric" placeholder="540000" className="h-9" {...form.register("salaryMax")} />
          </FormField>
          <FormField id="salaryCurrency" label="Currency" error={err("salaryCurrency")} className="col-span-2 sm:col-span-1">
            <Input
              {...fieldA11y("salaryCurrency", err("salaryCurrency"))}
              maxLength={3}
              placeholder="DKK"
              className="h-9 uppercase"
              {...form.register("salaryCurrency")}
            />
          </FormField>
        </div>
      </Section>

      <FormField id="notes" label="Notes" error={err("notes")}>
        <Textarea {...fieldA11y("notes", err("notes"))} rows={3} placeholder="Referrals, contacts, impressions…" {...form.register("notes")} />
      </FormField>

      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t bg-popover/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-9" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" className="h-9 min-w-36" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isEditing ? "Save changes" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
