/**
 * Database types matching supabase/migrations. Hand-written to mirror what
 * `supabase gen types typescript` produces, so queries are type-checked.
 */
import type { ActivityType, ApplicationStatus, WorkType } from "@/lib/domain/types";

type Timestamp = string;

export type ApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  job_title: string;
  logo_url: string | null;
  location: string | null;
  work_type: WorkType | null;
  job_url: string | null;
  status: ApplicationStatus;
  date_applied: string | null;
  interview_at: Timestamp | null;
  interview_notes: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  notes: string | null;
  archived_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type FollowUpTaskRow = {
  id: string;
  user_id: string;
  application_id: string;
  title: string;
  due_at: Timestamp;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  application_id: string;
  type: ActivityType;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus | null;
  occurred_at: Timestamp;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type ServerManaged = "id" | "user_id" | "created_at" | "updated_at";

type Insertable<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<ProfileRow, "id">;
        Update: Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      applications: {
        Row: ApplicationRow;
        Insert: Insertable<ApplicationRow, "company" | "job_title">;
        Update: Partial<Omit<ApplicationRow, ServerManaged>>;
        Relationships: [];
      };
      follow_up_tasks: {
        Row: FollowUpTaskRow;
        Insert: Insertable<FollowUpTaskRow, "application_id" | "title" | "due_at">;
        Update: Partial<Omit<FollowUpTaskRow, ServerManaged | "application_id">>;
        Relationships: [];
      };
      application_activity: {
        Row: ActivityRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
