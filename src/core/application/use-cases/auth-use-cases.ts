import type { AuthGateway, AuthResult, AuthUser, EmailLink } from "../ports/auth-gateway";

export interface AuthUseCasesDeps {
  auth: AuthGateway;
  /** Absolute base URL used in links inside auth emails. */
  siteUrl: () => Promise<string>;
}

export const AFTER_SIGN_IN_PATH = "/dashboard";
export const RESET_PASSWORD_PATH = "/reset-password";

export function makeAuthUseCases({ auth, siteUrl }: AuthUseCasesDeps) {
  return {
    currentUser(): Promise<AuthUser | null> {
      return auth.currentUser();
    },

    signIn(email: string, password: string): Promise<AuthResult> {
      return auth.signIn(email, password);
    },

    async signUp(input: { fullName: string; email: string; password: string }) {
      const base = await siteUrl();
      return auth.signUp({ ...input, confirmRedirectTo: `${base}/auth/callback?next=${AFTER_SIGN_IN_PATH}` });
    },

    /**
     * Sends a reset link. Reports success whether or not the account exists, so
     * the response can't be used to discover registered emails; only rate
     * limiting is surfaced.
     */
    async requestPasswordReset(email: string): Promise<AuthResult> {
      const base = await siteUrl();
      const result = await auth.sendPasswordReset(email, `${base}/auth/callback?next=${RESET_PASSWORD_PATH}`);
      if (!result.ok && result.reason === "rate_limited") return result;
      return { ok: true, value: undefined };
    },

    /** Only possible with an active session, i.e. after following a recovery link. */
    async changePassword(password: string): Promise<AuthResult> {
      if (!(await auth.currentUser())) return { ok: false, reason: "not_authenticated" };
      return auth.updatePassword(password);
    },

    signOut(): Promise<void> {
      return auth.signOut();
    },

    completeEmailLink(link: EmailLink): Promise<AuthResult> {
      return auth.completeEmailLink(link);
    },
  };
}

export type AuthUseCases = ReturnType<typeof makeAuthUseCases>;
