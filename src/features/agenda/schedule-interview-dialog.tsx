"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, fieldA11y } from "@/components/form-field";
import { fromDateTimeLocalValue } from "@/lib/domain/dates";
import { isClosed, planStatusChange } from "@/lib/domain/status";
import type { Application, ApplicationPatch } from "@/lib/domain/types";
import { interviewFormSchema, type InterviewFormValues } from "@/lib/validations/application";
import { useJobData } from "@/features/jobs/job-data-provider";

export function ScheduleInterviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { applications, updateApplication } = useJobData();
  const candidates = applications.filter((a) => !a.archivedAt && !isClosed(a.status));

  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: { applicationId: "", interviewAt: "", interviewNotes: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const app = applications.find((a) => a.id === values.applicationId) as Application;
    const patch: ApplicationPatch = {
      interviewAt: fromDateTimeLocalValue(values.interviewAt),
      interviewNotes: values.interviewNotes.trim() || app.interviewNotes,
    };
    // Scheduling an interview moves an earlier-stage application to "Interview".
    if (app.status === "saved" || app.status === "applied") {
      Object.assign(patch, planStatusChange(app, "interview"));
    }
    const ok = await updateApplication(app.id, patch, { successMessage: `Interview with ${app.company} scheduled` });
    if (ok) {
      form.reset();
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule an interview</DialogTitle>
          <DialogDescription>
            Times are in your local time zone. Saved or applied applications move to the Interview stage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormField id="interview-app" label="Application" error={errors.applicationId?.message}>
            <Controller
              control={form.control}
              name="applicationId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger {...fieldA11y("interview-app", errors.applicationId?.message)} className="h-9 w-full">
                    <SelectValue placeholder="Choose an application" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.company} · {app.jobTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="interview-at" label="Date and time" error={errors.interviewAt?.message}>
            <Input {...fieldA11y("interview-at", errors.interviewAt?.message)} type="datetime-local" className="h-9" {...form.register("interviewAt")} />
          </FormField>
          <FormField id="interview-notes" label="Preparation notes" error={errors.interviewNotes?.message}>
            <Textarea
              {...fieldA11y("interview-notes", errors.interviewNotes?.message)}
              rows={3}
              placeholder="Format, interviewers, topics to prepare…"
              {...form.register("interviewNotes")}
            />
          </FormField>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
