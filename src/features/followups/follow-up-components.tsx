"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, startOfDay } from "date-fns";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, fieldA11y } from "@/components/form-field";
import { CompanyLogo } from "@/components/applications/company-logo";
import { relativeDayLabel } from "@/lib/domain/format";
import type { Application, FollowUpTask } from "@/lib/domain/types";
import { followUpFormSchema, toFollowUpInput, type FollowUpFormValues } from "@/lib/validations/application";
import { useJobData } from "@/features/jobs/job-data-provider";
import { cn } from "@/lib/utils";

export function FollowUpItem({
  task,
  application,
  onOpenApplication,
  showCompany = true,
}: {
  task: FollowUpTask;
  application?: Application;
  onOpenApplication?: (id: string) => void;
  showCompany?: boolean;
}) {
  const { toggleTask, deleteTask } = useJobData();
  const due = new Date(task.dueAt);
  const done = task.completedAt !== null;
  const overdue = !done && due < startOfDay(new Date());
  const checkboxId = `task-${task.id}`;

  return (
    <li className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
      <Checkbox
        id={checkboxId}
        checked={done}
        onCheckedChange={() => void toggleTask(task.id)}
        className="mt-0.5"
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={cn("block cursor-pointer text-sm leading-snug", done && "text-muted-foreground line-through")}
        >
          {task.title}
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}>
            <CalendarClock className="size-3" />
            {overdue ? "Overdue · " : ""}
            {relativeDayLabel(due)}
          </span>
          {showCompany && application && (
            <button
              type="button"
              onClick={() => onOpenApplication?.(application.id)}
              className="inline-flex items-center gap-1.5 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CompanyLogo company={application.company} logoUrl={application.logoUrl} size="sm" className="size-4 rounded text-[7px]" />
              {application.company}
            </button>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => void deleteTask(task.id)}
        aria-label={`Delete follow-up "${task.title}"`}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

/**
 * Adds a follow-up. Pass `applicationId` to lock it to one application,
 * or `applications` to let the user pick.
 */
export function FollowUpForm({
  applicationId,
  applications,
  onDone,
  compact = false,
}: {
  applicationId?: string;
  applications?: Application[];
  onDone?: () => void;
  compact?: boolean;
}) {
  const { createTask } = useJobData();
  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpFormSchema),
    defaultValues: {
      applicationId: applicationId ?? "",
      title: "",
      dueDate: format(addDays(new Date(), 3), "yyyy-MM-dd"),
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const ok = await createTask(toFollowUpInput(values));
    if (ok) {
      form.reset({ ...values, title: "" });
      onDone?.();
    }
  });

  const idPrefix = applicationId ? `fu-${applicationId}` : "fu-new";

  return (
    <form onSubmit={onSubmit} noValidate className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
      {!applicationId && applications && (
        <FormField id={`${idPrefix}-app`} label="Application" error={errors.applicationId?.message} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="applicationId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger {...fieldA11y(`${idPrefix}-app`, errors.applicationId?.message)} className="h-9 w-full">
                  <SelectValue placeholder="Choose an application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.company} · {app.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      )}
      <FormField id={`${idPrefix}-title`} label="Follow-up" error={errors.title?.message} className={compact ? undefined : "sm:col-span-2"}>
        <Input
          {...fieldA11y(`${idPrefix}-title`, errors.title?.message)}
          placeholder="Email the recruiter about next steps"
          className="h-9"
          {...form.register("title")}
        />
      </FormField>
      <div className={cn("flex items-end gap-2", !compact && "sm:col-span-2")}>
        <FormField id={`${idPrefix}-due`} label="Due" error={errors.dueDate?.message} className="flex-1">
          <Input {...fieldA11y(`${idPrefix}-due`, errors.dueDate?.message)} type="date" className="h-9" {...form.register("dueDate")} />
        </FormField>
        <Button type="submit" className={cn("h-9", (errors.dueDate || errors.title) && "mb-[22px]")} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </div>
    </form>
  );
}
