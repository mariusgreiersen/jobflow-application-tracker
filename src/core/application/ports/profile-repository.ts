export interface ProfileRepository {
  getFullName(): Promise<string | null>;
  updateFullName(fullName: string): Promise<void>;
}
