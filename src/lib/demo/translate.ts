import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  AUTO_SOURCE,
  buildProviderList,
  TRANSLATE_LANGS,
  translateWithFallback,
  translationAiProvider,
  type Provider,
  type TranslateLang,
} from "@/lib/api/translationProviders";
import { DemoInputError, demoChoice, demoText } from "@/lib/demo/input";
import { allUnavailable, anyProviderUsable, providerLabel, publicFailures, succeededProvider, type DemoOutcome } from "@/lib/demo/handler";

/**
 * 번역 데모 — 댓글 번역(/api/translate)과 같은 공급자 · 같은 순서(설정 › 서비스 › 번역)로 옮긴다.
 * 공급자 상태 · 사용량 기록(ai_usage)은 translateWithFallback 이 실제 경로와 똑같이 남긴다.
 */
const TRANSLATE_MAX = 1000;

export interface TranslateInput {
  text: string;
  /** 원문 언어 — auto 면 공급자가 가려낸다 */
  source: TranslateLang | typeof AUTO_SOURCE;
  target: TranslateLang;
}

const LANGS = Object.keys(TRANSLATE_LANGS) as TranslateLang[];

export function parseTranslate(body: Record<string, unknown>): TranslateInput {
  const target = demoChoice(body.target, LANGS, "en", "고를 수 없는 언어입니다.");
  /* 원문 언어를 보내지 않으면 예전처럼 ko ↔ en 반대쪽으로 본다 */
  const source = demoChoice(body.source, [AUTO_SOURCE, ...LANGS], target === "ko" ? "en" : "ko", "고를 수 없는 원문 언어입니다.");
  if (source === target) throw new DemoInputError("원문과 같은 언어로는 번역할 수 없습니다.");
  return {
    text: demoText(body.text, { max: TRANSLATE_MAX, empty: "번역할 글을 써 주세요.", refused: "이 글은 번역해 드릴 수 없습니다.", lines: true }),
    source,
    target,
  };
}

export async function translateUnavailable(): Promise<string | null> {
  const config = await getSiteConfig();
  return config?.translation?.enabled === false ? "지금은 번역 기능을 쓸 수 없습니다." : null;
}

/** 지금 쓸 수 있나 — 꺼 두지 않았고, 부를 공급자가 있다 */
export async function translateUsable(): Promise<boolean> {
  if (await translateUnavailable()) return false;
  const config = await getSiteConfig();
  const order = buildProviderList((config?.translation?.provider as Provider) ?? "deepl", config?.translation?.fallback);
  return anyProviderUsable(order.map(translationAiProvider));
}

export async function runTranslate({ text, source, target }: TranslateInput): Promise<DemoOutcome<{ text: string; provider: string }>> {
  const config = await getSiteConfig();
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const order = buildProviderList(primary, config?.translation?.fallback);

  const result = await translateWithFallback(order, [text], source, target, "[demo/translate]");
  if ("error" in result) {
    return allUnavailable(result.failures)
      ? { ok: false, status: 503, message: "지금은 번역 기능을 쓸 수 없습니다.", failures: publicFailures(result.failures) }
      : { ok: false, status: 502, message: "번역하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", failures: publicFailures(result.failures) };
  }
  const translated = result.translations[0]?.trim();
  if (!translated || result.failedIndices.includes(0)) {
    return { ok: false, status: 502, message: "번역하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  /* 한 줄짜리라 앞 공급자가 실패를 던지지 않고 빈 결과만 낸 드문 경우엔 이름이 앞쪽으로 어긋날 수 있다 */
  const id = succeededProvider(order, result.failures, translationAiProvider);
  return { ok: true, data: { text: translated, provider: id ? providerLabel(id) : "" } };
}
