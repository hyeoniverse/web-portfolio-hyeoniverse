import { getSecret } from "@/lib/getSecret";
import { filterEnabled, missingKey, networkError, providerErrorFrom, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { AiProvider, ProviderFailure } from "@/lib/ai/providers";
import { aiModel } from "@/lib/ai/models";

export type Provider = "gemini" | "google" | "deepl" | "claude";

/** 번역 설정의 이름 → 상태·사용량을 세는 공급자 이름(Google 은 TTS 와 키가 달라 따로 센다) */
export const translationAiProvider = (p: Provider): AiProvider => (p === "google" ? "google_translate" : p);

/** 공급자 호출 — 연결 실패도 원인을 남길 수 있게 감싼다 */
async function call(provider: AiProvider, url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw networkError(provider, e);
  }
  if (!res.ok) throw await providerErrorFrom(provider, res);
  return res;
}

/* 모델 이름은 설정(lib/ai/models)에서 */
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
/* 무료 키는 끝이 ":fx" 이고 api-free 주소만 받는다. 유료 키는 api 주소 — 주소를 하나로 박아 두면 유료 키가 403 이었다 */
const deeplApiUrl = (key: string) => (key.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate");
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const GOOGLE_TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

const LANG_MAP_DEEPL: Record<string, string> = { ko: "KO", en: "EN" };
const LANG_MAP_GOOGLE: Record<string, string> = { ko: "ko", en: "en" };

/* ── ID 기반 일괄 번역 단위 ──
 *   id : 호출자가 부여한 안정적인 키 (예: "title", "body", "i0", "i1") 또는 자동 생성된 인덱스 키.
 *         provider 응답을 입력에 매핑할 때 사용 — 순서나 길이에 의존하지 않음.
 *   text: 실제 번역할 원문.
 */
interface TranslateItem {
  id: string;
  text: string;
}

/** provider 한 번의 호출 결과 — 성공한 id 만 results 에 들어가고, 응답에 안 잡힌 id 는 failed 에 남음 */
interface ProviderBatchResult {
  results: Map<string, string>;
  failed: string[];
}

/* ── Gemini (ID-keyed JSON 프롬프트) ── */
async function translateBatchWithGemini(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw missingKey("gemini", "GEMINI_API_KEY");

  const sourceName = sourceLang === "ko" ? "Korean" : "English";
  const targetName = targetLang === "ko" ? "Korean" : "English";

  // 입력을 { id: text } JSON object 로 보내고, 동일한 키 형태로 응답 받음 → 누락 id 자동 식별
  const inputObj: Record<string, string> = {};
  for (const it of items) inputObj[it.id] = it.text;

  const prompt = `Translate the following ${items.length} text(s) from ${sourceName} to ${targetName}.

Rules:
- Input is a JSON object whose keys are stable IDs and values are the texts to translate.
- Return ONLY a JSON object with the SAME keys, mapped to the translated strings.
- If you cannot translate a particular item, omit that key (do NOT return an empty string for it).
- Preserve all formatting: markdown syntax, HTML tags, line breaks, code blocks.
- For technical terms (e.g. "Next.js", "GSAP", "Supabase"), keep them as-is.

Input:
${JSON.stringify(inputObj, null, 2)}`;

  const res = await call("gemini", `${geminiUrl(await aiModel("gemini"))}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(rawText) as Record<string, string>;

  return splitByPresence(items, parsed);
}

/* ── Google Cloud Translation (인덱스 보존 — 응답 길이만큼 매핑) ── */
async function translateBatchWithGoogle(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("GOOGLE_TRANSLATE_API_KEY");
  if (!apiKey) throw missingKey("google_translate", "GOOGLE_TRANSLATE_API_KEY");

  const res = await call("google_translate", `${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: items.map((it) => it.text),
      source: LANG_MAP_GOOGLE[sourceLang],
      target: LANG_MAP_GOOGLE[targetLang],
      format: "text",
    }),
  });

  const data = await res.json();
  const arr = data?.data?.translations;
  if (!Array.isArray(arr)) throw new Error("Invalid Google Translate response");

  return mapByIndex(items, arr.map((t: { translatedText: string }) => t.translatedText));
}

/* ── DeepL (인덱스 보존) ── */
async function translateBatchWithDeepL(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("DEEPL_API_KEY");
  if (!apiKey) throw missingKey("deepl", "DEEPL_API_KEY");

  const res = await call("deepl", deeplApiUrl(apiKey), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: items.map((it) => it.text),
      source_lang: LANG_MAP_DEEPL[sourceLang],
      target_lang: LANG_MAP_DEEPL[targetLang],
    }),
  });

  const data = await res.json();
  if (!Array.isArray(data?.translations)) throw new Error("Invalid DeepL response");

  return mapByIndex(items, data.translations.map((t: { text: string }) => t.text));
}

/* ── Claude (ID-keyed JSON 프롬프트) ── */
async function translateBatchWithClaude(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw missingKey("claude", "ANTHROPIC_API_KEY");

  const sourceName = sourceLang === "ko" ? "Korean" : "English";
  const targetName = targetLang === "ko" ? "Korean" : "English";

  const inputObj: Record<string, string> = {};
  for (const it of items) inputObj[it.id] = it.text;

  const prompt = `Translate the following ${items.length} text(s) from ${sourceName} to ${targetName}.

Rules:
- Input is a JSON object whose keys are stable IDs and values are the texts to translate.
- Return ONLY a JSON object with the SAME keys, mapped to the translated strings.
- If you cannot translate a particular item, omit that key (do NOT return an empty string for it).
- Preserve all formatting: markdown syntax, HTML tags, line breaks, code blocks.
- For technical terms (e.g. "Next.js", "GSAP", "Supabase"), keep them as-is.

Input:
${JSON.stringify(inputObj, null, 2)}`;

  const res = await call("claude", CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: await aiModel("claude"),
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const rawText = data?.content?.[0]?.text ?? "{}";
  const parsed = JSON.parse(rawText) as Record<string, string>;

  return splitByPresence(items, parsed);
}

/* ── 공통 헬퍼 ── */

/** ID-keyed 응답 (Gemini/Claude) — parsed[id] 가 있으면 성공, 없으면 실패 */
function splitByPresence(
  items: TranslateItem[],
  parsed: Record<string, string>,
): ProviderBatchResult {
  const results = new Map<string, string>();
  const failed: string[] = [];
  for (const it of items) {
    const v = parsed[it.id];
    if (typeof v === "string" && v.length > 0) results.set(it.id, v);
    else failed.push(it.id);
  }
  return { results, failed };
}

/** 인덱스 기반 응답 (DeepL/Google) — 응답 array 길이만큼만 입력 id 와 매핑 */
function mapByIndex(items: TranslateItem[], translated: string[]): ProviderBatchResult {
  const results = new Map<string, string>();
  const failed: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const v = translated[i];
    if (typeof v === "string" && v.length > 0) results.set(items[i].id, v);
    else failed.push(items[i].id);
  }
  return { results, failed };
}

/* ── Dispatcher ── */
async function translateBatchWithProvider(
  provider: Provider,
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  switch (provider) {
    case "google": return translateBatchWithGoogle(items, sourceLang, targetLang);
    case "deepl":  return translateBatchWithDeepL(items, sourceLang, targetLang);
    case "claude": return translateBatchWithClaude(items, sourceLang, targetLang);
    default:       return translateBatchWithGemini(items, sourceLang, targetLang);
  }
}

/* ── Build provider list from site config ── */
export interface FallbackConfig {
  enabled?: boolean;
  priority?: string[];
  excluded?: string[];
}

export function buildProviderList(
  primary: Provider,
  fallbackCfg?: FallbackConfig | null,
): Provider[] {
  const list: Provider[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    const excl = new Set(fallbackCfg.excluded ?? []);
    for (const p of fallbackCfg.priority) {
      if (p !== primary && !excl.has(p)) list.push(p as Provider);
    }
  }
  return list;
}

/* ── Translate with fallback (잔여 set 반복) ──
 *
 * 핵심 동작:
 *   1. 모든 입력 텍스트를 \"잔여 (remaining)\" set 으로 시작
 *   2. provider 순회: 매 호출마다 입력으로 \"잔여\" 만 보냄
 *   3. 성공한 id 는 collected 에 누적, remaining 에서 제거
 *   4. remaining 이 0 이 되면 조기 종료, 아니면 다음 provider 로
 *   5. 모든 provider 소진 후 collected + 최종 failedIds 반환
 *
 * 공개 API 호환: texts: string[] 를 받아 자동으로 인덱스 id 부여, 결과를 동일 길이 배열로 반환.
 *               실패한 슬롯은 빈 문자열, failedIndices 에 인덱스 기록.
 */
export async function translateWithFallback(
  providerList: Provider[],
  texts: string[],
  sourceLang: string,
  targetLang: string,
  logPrefix = "[translate]",
): Promise<
  | { translations: string[]; failedIndices: number[]; failures: ProviderFailure[] }
  | { error: string; failures: ProviderFailure[] }
> {
  if (texts.length === 0) return { translations: [], failedIndices: [], failures: [] };

  /* 여러 번 이어 실패해 꺼 둔 공급자는 부르지 않는다(lib/ai/health) */
  const { enabled, skipped } = await filterEnabled(providerList, translationAiProvider);
  const failures: ProviderFailure[] = [...skipped];

  // 인덱스 기반 자동 id 부여 (호출자가 직접 id 를 다루지 않게)
  const items: TranslateItem[] = texts.map((text, i) => ({ id: `i${i}`, text }));

  let remaining = items;
  const collected = new Map<string, string>();
  let lastError = "Unknown error";
  let anyProviderTried = false;

  for (const provider of enabled) {
    if (remaining.length === 0) break;
    const id = translationAiProvider(provider);
    try {
      const sent = remaining;
      const { results, failed } = await translateBatchWithProvider(
        provider, remaining, sourceLang, targetLang,
      );
      anyProviderTried = true;
      /* 글자 단위로 매기는 공급자는 보낸 글자 수를, 나머지는 호출 수를 센다 */
      await recordOk(id, id === "deepl" || id === "google_translate" ? sent.reduce((n, it) => n + it.text.length, 0) : undefined);
      for (const [id, text] of results) collected.set(id, text);
      // 실패한 항목들만 다음 provider 로 — 성공분은 보존
      const failedSet = new Set(failed);
      remaining = remaining.filter((it) => failedSet.has(it.id));
      if (failed.length > 0) {
        console.warn(logPrefix, provider, `partial: ${results.size}/${results.size + failed.length} succeeded, ${failed.length} retrying`);
      }
    } catch (e) {
      const err = toProviderError(id, e);
      lastError = err.message;
      failures.push(await recordFailure(err));
      console.error(logPrefix, provider, err.kind, lastError);
    }
  }

  // 모든 provider 시도가 throw 만 발생시켰고 한 항목도 못 얻은 경우 → 전체 에러 + admin 알림
  if (!anyProviderTried && collected.size === 0) {
    try {
      const { notifyAdmin } = await import("@/lib/adminNotify");
      await notifyAdmin({
        type: "ai_failure",
        title: "번역 chain 전부 실패",
        message: `${logPrefix} — providers: ${providerList.join(" → ")}, 마지막 에러: ${lastError}`,
        metadata: { context: logPrefix, providers: providerList, lastError, source: sourceLang, target: targetLang },
      });
    } catch { /* swallow */ }
    return { error: lastError, failures };
  }

  // 결과를 입력 순서대로 재조립 — 실패한 슬롯은 빈 문자열
  const translations = new Array<string>(texts.length).fill("");
  const failedIndices: number[] = [];
  for (let i = 0; i < texts.length; i++) {
    const id = items[i].id;
    const v = collected.get(id);
    if (v != null) translations[i] = v;
    else failedIndices.push(i);
  }

  return { translations, failedIndices, failures };
}

/** 번역 체인이 전부 실패했을 때의 응답 코드 — 키가 하나도 없으면 503, 모두 꺼져 있으면 AI_PROVIDERS_DISABLED */
export function translationFailure(failures: ProviderFailure[]): {
  status: 502 | 503;
  code: "TRANSLATION_NOT_CONFIGURED" | "TRANSLATION_FAILED" | "AI_PROVIDERS_DISABLED";
} {
  if (failures.length > 0 && failures.every((f) => f.kind === "no_key")) return { status: 503, code: "TRANSLATION_NOT_CONFIGURED" };
  if (failures.length > 0 && failures.every((f) => f.disabled)) return { status: 502, code: "AI_PROVIDERS_DISABLED" };
  return { status: 502, code: "TRANSLATION_FAILED" };
}
