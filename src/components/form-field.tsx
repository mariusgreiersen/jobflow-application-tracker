import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  /** Rendered beside the label, e.g. a "Forgot password?" link. */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * Label + control + message. Controls should set
 * `aria-invalid={!!error}` and `aria-describedby={fieldMessageId(id)}`.
 */
export function FormField({ id, label, error, hint, required, className, aside, children }: FormFieldProps) {
  const message = error ?? hint;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden className="text-muted-foreground">
              *
            </span>
          )}
        </Label>
        {aside}
      </div>
      {children}
      {message && (
        <p
          id={fieldMessageId(id)}
          role={error ? "alert" : undefined}
          className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export function fieldMessageId(id: string) {
  return `${id}-message`;
}

export function fieldA11y(id: string, error?: string) {
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": fieldMessageId(id) };
}
