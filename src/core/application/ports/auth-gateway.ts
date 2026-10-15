export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

export type AuthFailure =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "already_registered"
  | "rate_limited"
  | "invalid_link"
  | "not_authenticated"
  | "unknown";

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; reason: AuthFailure; message?: string };

export type EmailLink = { code: string } | { tokenHash: string; type: string };

/** Identity provider boundary (Supabase Auth in production). */
export interface AuthGateway {
  currentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  /** Resolves to whether a session was created immediately (false = email confirmation required). */
  signUp(input: { fullName: string; email: string; password: string; confirmRedirectTo: string }): Promise<AuthResult<{ sessionCreated: boolean }>>;
  sendPasswordReset(email: string, redirectTo: string): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Completes a sign-up confirmation or password-recovery link. */
  completeEmailLink(link: EmailLink): Promise<AuthResult>;
}
