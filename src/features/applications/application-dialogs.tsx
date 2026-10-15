"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EMPTY_APPLICATION_FORM, type ApplicationFormValues } from "@/lib/validations/application";
import { useJobData } from "@/features/jobs/job-data-provider";
import { ApplicationForm } from "./application-form";
import { ApplicationDetailSheet } from "./application-detail-sheet";
import { followUpFromForm, formToInput, toFormValues } from "./form-values";

interface DialogsContextValue {
  openCreate: (defaults?: Partial<ApplicationFormValues>) => void;
  openEdit: (id: string) => void;
  openDetail: (id: string) => void;
  confirmDelete: (id: string) => void;
}

const DialogsContext = createContext<DialogsContextValue | null>(null);

type FormState = { mode: "create"; defaults: ApplicationFormValues; key: number } | { mode: "edit"; id: string; key: number };

/**
 * Hosts the application dialogs once for the whole app, so any screen
 * (dashboard, list, board, agenda) can open them without prop drilling.
 */
export function ApplicationDialogsProvider({ children }: { children: ReactNode }) {
  const { applications, createApplication, updateApplication, deleteApplication } = useJobData();
  const [form, setForm] = useState<FormState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editing = form?.mode === "edit" ? applications.find((a) => a.id === form.id) : undefined;
  const pendingDelete = deleteId ? applications.find((a) => a.id === deleteId) : undefined;

  const openCreate = useCallback((defaults?: Partial<ApplicationFormValues>) => {
    setForm({ mode: "create", defaults: { ...EMPTY_APPLICATION_FORM, ...defaults }, key: Date.now() });
  }, []);
  const openEdit = useCallback((id: string) => setForm({ mode: "edit", id, key: Date.now() }), []);
  const openDetail = useCallback((id: string) => setDetailId(id), []);
  const confirmDelete = useCallback((id: string) => setDeleteId(id), []);

  const value = useMemo(
    () => ({ openCreate, openEdit, openDetail, confirmDelete }),
    [openCreate, openEdit, openDetail, confirmDelete],
  );

  async function handleSubmit(values: ApplicationFormValues) {
    const input = formToInput(values);
    if (form?.mode === "edit") {
      const ok = await updateApplication(form.id, input, { successMessage: "Changes saved" });
      if (ok) setForm(null);
    } else {
      const created = await createApplication(input, followUpFromForm(values, input.company));
      if (created) setForm(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const ok = await deleteApplication(deleteId);
    setDeleting(false);
    if (ok) {
      if (detailId === deleteId) setDetailId(null);
      setDeleteId(null);
    }
  }

  const formOpen = form !== null && (form.mode === "create" || editing !== undefined);

  return (
    <DialogsContext value={value}>
      {children}

      <Dialog open={formOpen} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto p-6 sm:max-w-2xl">
          <DialogHeader className="mb-1">
            <DialogTitle className="text-lg">{form?.mode === "edit" ? "Edit application" : "Add application"}</DialogTitle>
            <DialogDescription>
              {form?.mode === "edit"
                ? `Update the details for ${editing?.company}.`
                : "Only company and job title are required. You can fill in the rest later."}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <ApplicationForm
              key={form.key}
              isEditing={form.mode === "edit"}
              defaultValues={form.mode === "edit" && editing ? toFormValues(editing) : form.mode === "create" ? form.defaults : EMPTY_APPLICATION_FORM}
              onSubmit={handleSubmit}
              onCancel={() => setForm(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ApplicationDetailSheet applicationId={detailId} onClose={() => setDetailId(null)} />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && !deleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.company ?? "application"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the application, its follow-ups and its history. If you just want it out of
              the way, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogsContext>
  );
}

export function useApplicationDialogs(): DialogsContextValue {
  const context = useContext(DialogsContext);
  if (!context) throw new Error("useApplicationDialogs must be used inside <ApplicationDialogsProvider>");
  return context;
}
