import { CodedError, errorFromBody } from "@/lib/apiError";
import { failuresOf } from "@/lib/ai/notifyFailures";
import type { ProviderFailure } from "@/lib/ai/providers";
/**
 * 일괄 번역 결과:
 *   - translations : 입력과 동일 길이의 배열. 실패한 슬롯은 "" (빈 문자열)
 *   - failedIndices: 모든 provider 시도 후에도 번역 못 받은 인덱스 목록
 *                   (호출자가 \"제목만 안 됐으니 빈칸으로 두자\" 등 결정 가능)
 */
/** 실패는 CodedError — 화면은 errorText 로 화면 언어 문구를 얻는다(#862). 제공자가 쓴 문장은 message 에 남는다 */
/* failures — 공급자마다의 실패 원인(뒤 공급자로 성공했어도 실린다). 화면은 notifyAiFailures 로 알린다 */
export type TranslateResult =
  | { translations: string[]; failedIndices: number[]; failures: ProviderFailure[] }
  | { error: CodedError; failures: ProviderFailure[] };

export async function autoTranslate(
  texts: string[],
  sourceLang: "ko" | "en",
  targetLang: "ko" | "en",
): Promise<TranslateResult> {
  try {
    const res = await fetch("/api/admin/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, sourceLang, targetLang }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: errorFromBody(data, res.status), failures: failuresOf(data) };
    if (!Array.isArray(data?.translations)) return { error: new CodedError("Empty translation response"), failures: [] };
    return {
      translations: data.translations,
      failedIndices: Array.isArray(data.failedIndices) ? data.failedIndices : [],
      failures: failuresOf(data),
    };
  } catch {
    return { error: new CodedError("Network error"), failures: [] };
  }
}
