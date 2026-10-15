/**
 * A change that has been decided by a use case but not yet persisted.
 *
 * `preview` is what the entity will look like, so the UI can render it
 * optimistically; `commit()` persists it and resolves to the stored version.
 * If `commit()` rejects, the caller restores its previous copy. The use case
 * stays the single place where the business rule lives.
 */
export interface PendingChange<T> {
  preview: T;
  commit(): Promise<T>;
}
