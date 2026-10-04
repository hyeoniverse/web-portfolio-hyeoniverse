import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { filterEnabled, missingKey, networkError, providerErrorFrom, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { AiProvider, ProviderFailure } from "@/lib/ai/providers";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface SummaryResult {
  ko: string;
  en: string;
}

type SummaryProvider = "gemini" | "openai" | "claude";

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

async function callOpenAI(prompt: string): Promise<SummaryResult> {
  const apiKey = await getSecret("OPENAI_API_KEY");
  if (!apiKey) throw missingKey("openai", "OPENAI_API_KEY");
  const res = await call("openai", OPENAI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.2, response_format: { type: "json_object" } }),
  });
  const data = await res.json();
  const parsed: { ko?: string; en?: string } = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
  return { ko: parsed.ko ?? "", en: parsed.en ?? "" };
}

async function callClaude(prompt: string): Promise<SummaryResult> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw missingKey("claude", "ANTHROPIC_API_KEY");
  const res = await call("claude", CLAUDE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  const parsed: { ko?: string; en?: string } = JSON.parse(data?.content?.[0]?.text ?? "{}");
  return { ko: parsed.ko ?? "", en: parsed.en ?? "" };
}

async function callGemini(prompt: string): Promise<SummaryResult> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw missingKey("gemini", "GEMINI_API_KEY");
  const res = await call("gemini", `${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
  });
  const data = await res.json();
  const parsed: { ko?: string; en?: string } = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
  return { ko: parsed.ko ?? "", en: parsed.en ?? "" };
}

/** Config 기반 provider 우선순위 리스트 생성 */
export async function buildSummaryProviderList(): Promise<SummaryProvider[]> {
  const config = await getSiteConfig();
  const primary = (config?.aiSummary?.provider ?? "gemini") as SummaryProvider;
  const fallbackCfg = config?.aiSummary?.fallback;
  const providerList: SummaryProvider[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    const excl = new Set(fallbackCfg.excluded ?? []);
    for (const p of fallbackCfg.priority) {
      if (p !== primary && !excl.has(p)) providerList.push(p as SummaryProvider);
    }
  }
  return providerList;
}

/** Provider fallback 순회하며 요약 생성 */
export async function generateSummary(
  prompt: string,
  logPrefix: string,
): Promise<SummaryResult & { failures: ProviderFailure[] }> {
  /* 여러 번 이어 실패해 꺼 둔 공급자는 부르지 않는다(lib/ai/health) */
  const { enabled, skipped } = await filterEnabled(await buildSummaryProviderList(), (p) => p);
  const failures: ProviderFailure[] = [...skipped];
  let lastError = skipped.length ? "All providers disabled" : "Unknown error";
  const failed: { provider: string; error: string }[] = [];

  for (const provider of enabled) {
    try {
      const result = provider === "openai" ? await callOpenAI(prompt)
        : provider === "claude" ? await callClaude(prompt)
        : await callGemini(prompt);
      await recordOk(provider);
      return { ...result, failures };
    } catch (e) {
      const err = toProviderError(provider, e);
      lastError = err.message;
      failed.push({ provider, error: `${err.kind} ${lastError}` });
      failures.push(await recordFailure(err));
      console.error(`[${logPrefix}]`, provider, err.kind, lastError);
    }
  }

  // fallback chain 전부 실패 — admin 알림 (운영 신호)
  try {
    const { notifyAdmin } = await import("@/lib/adminNotify");
    await notifyAdmin({
      type: "ai_failure",
      title: "AI 요약 chain 전부 실패",
      message: `${logPrefix} — 시도한 provider: ${failed.map((f) => `${f.provider}(${f.error})`).join(" → ")}`,
      metadata: { context: logPrefix, failed },
    });
  } catch { /* notify 실패도 swallow */ }

  throw new AiSummaryError(lastError, failures);
}

/** 에러 상태코드 매핑용 커스텀 에러 */
export class AiSummaryError extends Error {
  readonly statusCode: number;
  readonly failures: ProviderFailure[];

  constructor(message: string, failures: ProviderFailure[] = []) {
    super(message);
    this.name = "AiSummaryError";
    this.failures = failures;
    /* 원인은 failures 가 공급자마다 싣는다 — 상태 코드는 "키가 하나도 없다(503)"와 그 밖(502)만 가른다 */
    this.statusCode = failures.length > 0 && failures.every((f) => f.kind === "no_key") ? 503 : 502;
  }
}
