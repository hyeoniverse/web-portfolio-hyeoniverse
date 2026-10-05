/**
 * AI 요청의 공급자 실패를 토스트로 알린다 — 번역·요약·커버 생성 응답의 failures 를 받는다.
 *
 * 실패로 끝났으면 오류 토스트, 앞 공급자가 실패했지만 뒤 공급자로 성공했으면 주의 토스트.
 * 키가 없어 건너뛴 것은 성공했을 때는 알리지 않는다(설정 대로 동작한 것이라 매번 뜨면 소음이다).
 * 원인별 고칠 방법은 설정 › 서비스의 AI 상태 패널이 보여 준다.
 */
import { showToast } from "@/stores/toastStore";
import { fillTemplate } from "@/utils/format";
import { AI_PROVIDER_INFO, AI_PROVIDERS, FAILURE_KINDS, type ProviderFailure } from "./providers";

type T = (key: string) => string;

/** 응답 본문에서 failures 를 안전하게 꺼낸다 */
export function failuresOf(body: unknown): ProviderFailure[] {
  const list = (body as { failures?: unknown } | null)?.failures;
  if (!Array.isArray(list)) return [];
  return list.filter((f): f is ProviderFailure =>
    !!f && typeof f === "object"
    && (AI_PROVIDERS as readonly string[]).includes((f as ProviderFailure).provider)
    && (FAILURE_KINDS as readonly string[]).includes((f as ProviderFailure).kind));
}

/** 공급자마다 한 줄 — "· Gemini: 키가 만료됐습니다\n· OpenAI: 한도를 넘었습니다".
 *  한 줄에 이어 붙이면 셋만 돼도 어느 공급자의 사유인지 읽히지 않았다 */
export function describeFailures(failures: ProviderFailure[], t: T): string {
  return failures
    .map((f) => {
      const reason = t(`admin.aiHealth.kind.${f.kind}`);
      const off = f.disabled ? ` ${t("admin.aiHealth.toastDisabled")}` : "";
      return `· ${AI_PROVIDER_INFO[f.provider].label}: ${reason}${off}`;
    })
    .join("\n");
}

/**
 * @param feature 무엇을 하다 실패했는지(예: "AI 요약") — 토스트 첫머리
 * @param ok 결과를 받았는가(뒤 공급자로 성공)
 */
export function notifyAiFailures(body: unknown, t: T, { feature, ok }: { feature: string; ok: boolean }): void {
  const all = failuresOf(body);
  /* 결과가 났으면 키 없음 · 이미 꺼져 있어 건너뛴 것(꺼질 때 이미 알렸다)은 빼고, 이번에 실제로 실패한 것만 */
  const shown = ok ? all.filter((f) => f.kind !== "no_key" && !f.skipped) : all;
  if (shown.length === 0) {
    if (!ok) showToast(fillTemplate(t("admin.aiHealth.toastFailedPlain"), { feature }), "error", 6000);
    return;
  }
  const key = ok ? "admin.aiHealth.toastFallback" : "admin.aiHealth.toastFailed";
  showToast(fillTemplate(t(key), { feature, reasons: describeFailures(shown, t) }), ok ? "warning" : "error", 8000);
}

/**
 * 결과를 기다리지 않는 AI 요청(저장 뒤 자동 요약 등)의 응답을 알린다 — 실패는 오류 토스트,
 * 뒤 공급자로 성공했으면 주의 토스트. 본문을 돌려줘 부르는 쪽이 더 쓸 수 있게 한다.
 */
export async function reportAiResponse(res: Response, t: T, feature: string, { background = false } = {}): Promise<unknown> {
  const body = await res.json().catch(() => null);
  /* 자동으로 부른 것(background)은 키를 하나도 넣지 않은 경우(503)는 알리지 않는다 — 쓰지 않기로 한 기능이
     저장할 때마다 오류로 뜨면 안 된다. 직접 누른 요청은 알린다 */
  if (background && res.status === 503) return body;
  notifyAiFailures(body, t, { feature, ok: res.ok });
  return body;
}
