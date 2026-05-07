import { getSecret } from "@/lib/getSecret";

export type Provider = "gemini" | "google" | "deepl" | "claude";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
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
export interface TranslateItem {
  id: string;
  text: string;
}

/** provider 한 번의 호출 결과 — 성공한 id 만 results 에 들어가고, 응답에 안 잡힌 id 는 failed 에 남음 */
export interface ProviderBatchResult {
  results: Map<string, string>;
  failed: string[];
}

/* ── Gemini (ID-keyed JSON 프롬프트) ── */
export async function translateBatchWithGemini(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

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

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(rawText) as Record<string, string>;

  return splitByPresence(items, parsed);
}

/* ── Google Cloud Translation (인덱스 보존 — 응답 길이만큼 매핑) ── */
export async function translateBatchWithGoogle(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("GOOGLE_TRANSLATE_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY not configured");

  const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: items.map((it) => it.text),
      source: LANG_MAP_GOOGLE[sourceLang],
      target: LANG_MAP_GOOGLE[targetLang],
      format: "text",
    }),
  });

  if (!res.ok) throw new Error(`Google Translate API error: ${res.status}`);

  const data = await res.json();
  const arr = data?.data?.translations;
  if (!Array.isArray(arr)) throw new Error("Invalid Google Translate response");

  return mapByIndex(items, arr.map((t: { translatedText: string }) => t.translatedText));
}

/* ── DeepL (인덱스 보존) ── */
export async function translateBatchWithDeepL(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("DEEPL_API_KEY");
  if (!apiKey) throw new Error("DEEPL_API_KEY not configured");

  const res = await fetch(DEEPL_API_URL, {
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

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`DeepL API error: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.translations)) throw new Error("Invalid DeepL response");

  return mapByIndex(items, data.translations.map((t: { text: string }) => t.text));
}

/* ── Claude (ID-keyed JSON 프롬프트) ── */
export async function translateBatchWithClaude(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
): Promise<ProviderBatchResult> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

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

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Claude API error: ${res.status} ${errBody}`);
  }

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
export async function translateBatchWithProvider(
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
  | { translations: string[]; failedIndices: number[] }
  | { error: string }
> {
  if (texts.length === 0) return { translations: [], failedIndices: [] };

  // 인덱스 기반 자동 id 부여 (호출자가 직접 id 를 다루지 않게)
  const items: TranslateItem[] = texts.map((text, i) => ({ id: `i${i}`, text }));

  let remaining = items;
  const collected = new Map<string, string>();
  let lastError = "Unknown error";
  let anyProviderTried = false;

  for (const provider of providerList) {
    if (remaining.length === 0) break;
    try {
      const { results, failed } = await translateBatchWithProvider(
        provider, remaining, sourceLang, targetLang,
      );
      anyProviderTried = true;
      for (const [id, text] of results) collected.set(id, text);
      // 실패한 항목들만 다음 provider 로 — 성공분은 보존
      const failedSet = new Set(failed);
      remaining = remaining.filter((it) => failedSet.has(it.id));
      if (failed.length > 0) {
        console.warn(logPrefix, provider, `partial: ${results.size}/${results.size + failed.length} succeeded, ${failed.length} retrying`);
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
      console.error(logPrefix, provider, lastError);
    }
  }

  // 모든 provider 시도가 throw 만 발생시켰고 한 항목도 못 얻은 경우 → 전체 에러
  if (!anyProviderTried && collected.size === 0) {
    return { error: lastError };
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

  return { translations, failedIndices };
}
