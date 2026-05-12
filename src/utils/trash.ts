/**
 * Soft-delete 후 자동 영구삭제까지 보관 기간 (일).
 * cron/publish-scheduled 와 동기화 필요.
 */
export const TRASH_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** deleted_at ISO 문자열로부터 자동 영구삭제까지 남은 일수 (음수가 되면 0 으로 clamp) */
export function getTrashDaysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const expiresAt = deleted + TRASH_RETENTION_DAYS * MS_PER_DAY;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / MS_PER_DAY));
}
