"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { Download, Loader2, LogOut, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { FormField, fieldA11y } from "@/components/form-field";
import { UserAvatar } from "@/components/layout/user-menu";
import { profileSchema, type ProfileValues } from "@/lib/validations/auth";
import { useJobData } from "@/features/jobs/job-data-provider";
import { exitDemo, signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function SettingsView() {
  const { profile, mode, updateProfileName, resetDemo, applications, tasks, activity, status } = useJobData();
  const { theme, setTheme } = useTheme();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { fullName: profile.fullName ?? "" },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const liveName = useWatch({ control: form.control, name: "fullName" });

  function exportData() {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), applications, followUps: tasks, activity }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, appearance and data." />
      <div className="grid max-w-3xl gap-6">
        <Panel title="Profile" description="Your name appears in the sidebar and greeting.">
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await updateProfileName(values.fullName);
            })}
            noValidate
            className="flex flex-col gap-5 sm:flex-row sm:items-start"
          >
            <UserAvatar name={liveName || profile.email} className="size-16 text-xl" />
            <div className="grid flex-1 gap-4">
              <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
                <Input {...fieldA11y("fullName", errors.fullName?.message)} className="h-9" autoComplete="name" {...form.register("fullName")} />
              </FormField>
              <FormField id="email" label="Email" hint={mode === "demo" ? "Demo workspaces have no real email." : "Used to sign in."}>
                <Input id="email" value={profile.email ?? ""} disabled className="h-9" />
              </FormField>
              <div>
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  Save profile
                </Button>
              </div>
            </div>
          </form>
        </Panel>

        <Panel title="Appearance">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  theme === value ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Data" description="Download everything you've stored in JobFlow as JSON.">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportData} disabled={status !== "ready"}>
              <Download /> Export data
            </Button>
            {resetDemo && (
              <Button variant="outline" onClick={() => void resetDemo()}>
                <RotateCcw /> Reset demo data
              </Button>
            )}
          </div>
        </Panel>

        <Panel title={mode === "demo" ? "Demo session" : "Session"}>
          <form action={mode === "demo" ? exitDemo : signOut}>
            <Button type="submit" variant="outline">
              <LogOut /> {mode === "demo" ? "Exit demo" : "Log out"}
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
