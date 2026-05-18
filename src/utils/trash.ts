/**
 * Soft-delete 후 자동 영구삭제까지 보관 기간 (일).
 * Default fallback — purge_after column 이 NULL 인 legacy row 용.
 * 실제 cron 은 row 의 purge_after 를 직접 비교 (인기글 90일 / 일반 30일 / 연장 가변).
 */
const TRASH_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** purge_after (우선) 또는 deleted_at + 30일 (legacy) 기준 남은 일수 */
export function getTrashDaysLeft(deletedAt: string, purgeAfter?: string | null): number {
  if (purgeAfter) {
    const remain = new Date(purgeAfter).getTime() - Date.now();
    return Math.max(0, Math.ceil(remain / MS_PER_DAY));
  }
  const deleted = new Date(deletedAt).getTime();
  const expiresAt = deleted + TRASH_RETENTION_DAYS * MS_PER_DAY;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / MS_PER_DAY));
}
