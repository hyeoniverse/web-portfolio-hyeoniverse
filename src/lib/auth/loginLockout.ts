import { createAdminClient } from "@/lib/supabase/admin";

/* Admin 로그인 실패 횟수 추적 + lockout.
   - 5회 실패 → 15분 잠금
   - 잠금 시간 경과 시 자동 해제 (next attempt 에서 reset)
   - 성공 시 row 삭제 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface LockoutState {
  email: string;
  failed_count: number;
  locked_until: string | null;
  last_attempt_at: string;
}

export interface LockoutCheckResult {
  locked: boolean;
  /** locked=true 일 때 남은 잠금 초 */
  remainingSeconds?: number;
  /** locked=false 일 때 — 마지막 시도 후 남은 시도 횟수 */
  attemptsLeft?: number;
}

/** 로그인 시도 전 호출 — 현재 잠금 상태 확인. */
export async function checkLockout(email: string): Promise<LockoutCheckResult> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_login_attempts")
    .select("email, failed_count, locked_until, last_attempt_at")
    .eq("email", email)
    .maybeSingle<LockoutState>();

  if (!data) return { locked: false, attemptsLeft: MAX_ATTEMPTS };

  if (data.locked_until) {
    const until = new Date(data.locked_until).getTime();
    const now = Date.now();
    if (until > now) {
      return { locked: true, remainingSeconds: Math.ceil((until - now) / 1000) };
    }
    // 잠금 만료 — 다음 실패에서 어차피 다시 잠겨야 하므로 carry-over 안 함 (reset)
  }

  return { locked: false, attemptsLeft: Math.max(0, MAX_ATTEMPTS - data.failed_count) };
}

/** 로그인 실패 시 호출 — 카운트 증가, 임계값 초과 시 lockout 설정.
 *  반환값에 locked / remainingSeconds / attemptsLeft 포함. */
export async function recordFailure(email: string): Promise<LockoutCheckResult> {
  const supabase = createAdminClient();
  const now = new Date();

  // 기존 row fetch — 잠금 만료된 경우 reset 후 새 카운트로 시작
  const { data: existing } = await supabase
    .from("admin_login_attempts")
    .select("failed_count, locked_until")
    .eq("email", email)
    .maybeSingle<Pick<LockoutState, "failed_count" | "locked_until">>();

  const lockoutExpired =
    existing?.locked_until && new Date(existing.locked_until).getTime() <= now.getTime();
  const prevCount = !existing || lockoutExpired ? 0 : existing.failed_count;
  const nextCount = prevCount + 1;

  const shouldLock = nextCount >= MAX_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000).toISOString()
    : null;

  await supabase.from("admin_login_attempts").upsert(
    {
      email,
      failed_count: nextCount,
      locked_until: lockedUntil,
      last_attempt_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "email" },
  );

  if (shouldLock) {
    // 5회 연속 실패 → 잠금 발생. 비정상 시도 신호
    const { notifyAdmin } = await import("@/lib/adminNotify");
    await notifyAdmin({
      type: "login_lockout",
      title: "로그인 잠금 발생",
      message: `${email} 계정이 ${MAX_ATTEMPTS}회 연속 로그인 실패로 ${LOCKOUT_MINUTES}분간 잠겼습니다.`,
      metadata: { email, lockout_minutes: LOCKOUT_MINUTES, locked_until: lockedUntil },
    });
    return { locked: true, remainingSeconds: LOCKOUT_MINUTES * 60 };
  }
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - nextCount };
}

/** 로그인 성공 시 호출 — row 삭제 (카운터 reset). */
export async function clearFailures(email: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("admin_login_attempts").delete().eq("email", email);
}

export const LOCKOUT_CONFIG = {
  maxAttempts: MAX_ATTEMPTS,
  lockoutMinutes: LOCKOUT_MINUTES,
};
