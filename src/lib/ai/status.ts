/**
 * 꺼진 공급자 판정 — 서버(lib/ai/health 가 요청을 거를 때)와 화면(설정 › 서비스의 상태 표시)이 같이 쓴다.
 * 시간이 지나면 풀리는 원인은 그 시간이 지났으면 한 번 다시 시도하게 둔다:
 * 한도(quota)는 달이 바뀌면, 요청 속도·서버·연결은 한 시간 뒤. 키·권한·결제는 사람이 풀 때까지.
 */
import { FATAL_KINDS, type ProviderHealth } from "./providers";

export function isDisabledNow(h: ProviderHealth | undefined, now: number): boolean {
  const d = h?.disabled;
  if (!d) return false;
  const at = new Date(d.at);
  if (d.kind === "quota") return at.toISOString().slice(0, 7) === new Date(now).toISOString().slice(0, 7);
  if (!FATAL_KINDS.has(d.kind)) return now - at.getTime() < 60 * 60 * 1000;
  return true;
}
