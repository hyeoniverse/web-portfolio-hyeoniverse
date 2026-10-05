import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { filterEnabled, missingKey, networkError, providerErrorFrom, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { AiProvider, ProviderFailure } from "@/lib/ai/providers";
import { aiModel, groqModel } from "@/lib/ai/models";

/* 모델 이름은 설정(lib/ai/models)에서 — 코드에 박아 두면 은퇴할 때마다 고쳐야 한다 */
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * 요약 프롬프트 — 글(posts)과 작업물(works)이 같은 규칙을 쓰고, 공급자마다 같은 문장을 보낸다.
 * 한국어는 합니다체(존댓말)로 — 사이트의 다른 안내 문구와 같은 말투. 본문이 HTML 이면 태그는 무시하라고 알린다.
 * 본문은 앞 3,000자만 — 요약에 충분하고 토큰을 아낀다.
 */
export function buildSummaryPrompt(kind: "post" | "work", input: { title?: string | null; ko?: string | null; en?: string | null }): string {
  const what = kind === "post" ? "blog post" : "portfolio project description";
  const focus = kind === "post"
    ? "what the post is about, the key insight or approach, and what the reader takes away"
    : "what the project is, the author's role and approach, and the key outcome";
  const strip = (s?: string | null) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
  return `You write short summaries for a developer's personal site. Summarize the following ${what}.

Output
- Return ONLY a JSON object: {"ko": "...", "en": "..."}. No markdown, no code fence, no extra keys.

Korean ("ko")
- 2-3 sentences, under 200 characters in total.
- Polite declarative style ending in "-합니다 / -입니다" (합니다체). Never use "-해요", "-한다", or "-했어요".
- Do not start with "이 글은" or "이 프로젝트는"; state the substance directly.
- Keep technical terms, product names, and code identifiers in their original form (e.g. React, Supabase, useEffect).

English ("en")
- 2-3 sentences, under 200 characters in total. Natural, neutral tone; no first person.

Both
- Cover: ${focus}.
- Be concrete: prefer specific nouns and outcomes over generic phrases like "various", "effectively", "in-depth".
- No headers, bullet points, emojis, or quotation marks around the summary.
- If one language's content is missing, write that summary from the other language's content.

Title: ${(input.title || "").trim() || "(none)"}

Korean content:
${strip(input.ko) || "(none)"}

English content:
${strip(input.en) || "(none)"}`;
}

interface SummaryResult {
  ko: string;
  en: string;
}

type SummaryProvider = "gemini" | "openai" | "groq" | "claude";

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

/** 모델이 돌려준 글에서 {"ko","en"} 을 꺼낸다 — 코드 울타리 · 앞뒤 설명 · 추론 모델의 군더더기가 붙어 있어도 첫 { 부터 짝 } 까지를 읽는다 */
export function parseSummaryJson(text: string): SummaryResult {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  let parsed: { ko?: unknown; en?: unknown } = {};
  try { parsed = JSON.parse(slice); } catch { /* 아래에서 빈 값으로 */ }
  const pick = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const out = { ko: pick(parsed.ko), en: pick(parsed.en) };
  if (!out.ko && !out.en) throw new Error(`요약 응답을 JSON 으로 읽지 못했습니다: ${cleaned.slice(0, 120)}`);
  return out;
}

/* OpenAI 호환 chat completions — OpenAI 와 Groq 이 같은 꼴(URL · 키만 다르다).
   JSON 모드(response_format)로 먼저 보내고, 공급자가 json_validate_failed(400)로 거절하면(Groq 의 추론 모델이 그렇다)
   모드 없이 한 번 더 보내 글에서 JSON 을 꺼낸다 */
async function callOpenAICompatible(provider: "openai" | "groq", url: string, keyName: string, prompt: string, temperature: number): Promise<SummaryResult> {
  const apiKey = await getSecret(keyName);
  if (!apiKey) throw missingKey(provider, keyName);
  /* Groq 의 "latest" 는 그 키의 목록에서 고른다(모델 은퇴에 안 깨지게) */
  const model = provider === "groq" ? await groqModel(apiKey) : await aiModel(provider);
  const send = async (jsonMode: boolean) => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
      });
    } catch (e) {
      throw networkError(provider, e);
    }
    return res;
  };
  let res = await send(true);
  if (res.status === 400) {
    const body = await res.clone().text().catch(() => "");
    if (/json_validate_failed|response_format/i.test(body)) res = await send(false);
  }
  if (!res.ok) throw await providerErrorFrom(provider, res);
  const data = await res.json();
  return parseSummaryJson(String(data?.choices?.[0]?.message?.content ?? ""));
}
const callOpenAI = (prompt: string, temperature: number) => callOpenAICompatible("openai", OPENAI_API_URL, "OPENAI_API_KEY", prompt, temperature);
const callGroq = (prompt: string, temperature: number) => callOpenAICompatible("groq", GROQ_API_URL, "GROQ_API_KEY", prompt, temperature);

async function callClaude(prompt: string, temperature: number): Promise<SummaryResult> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw missingKey("claude", "ANTHROPIC_API_KEY");
  const res = await call("claude", CLAUDE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: await aiModel("claude"), max_tokens: 1024, temperature, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return parseSummaryJson(String(data?.content?.[0]?.text ?? ""));
}

async function callGemini(prompt: string, temperature: number): Promise<SummaryResult> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw missingKey("gemini", "GEMINI_API_KEY");
  const res = await call("gemini", `${geminiUrl(await aiModel("gemini"))}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, responseMimeType: "application/json" } }),
  });
  const data = await res.json();
  return parseSummaryJson(String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""));
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
/**
 * @param temperature 자동 요약(저장 때)은 0.2 로 안정적으로, 사용자가 "다시 만들기"를 눌렀을 때는 0.7 — 같은 본문에 같은 값이면
 *   거의 같은 글이 나와 비교할 게 없다
 */
export async function generateSummary(
  prompt: string,
  logPrefix: string,
  { temperature = 0.2 }: { temperature?: number } = {},
): Promise<SummaryResult & { failures: ProviderFailure[] }> {
  /* 여러 번 이어 실패해 꺼 둔 공급자는 부르지 않는다(lib/ai/health) */
  const { enabled, skipped } = await filterEnabled(await buildSummaryProviderList(), (p) => p);
  const failures: ProviderFailure[] = [...skipped];
  let lastError = skipped.length ? "All providers disabled" : "Unknown error";
  const failed: { provider: string; error: string }[] = [];

  for (const provider of enabled) {
    try {
      const result = provider === "openai" ? await callOpenAI(prompt, temperature)
        : provider === "groq" ? await callGroq(prompt, temperature)
        : provider === "claude" ? await callClaude(prompt, temperature)
        : await callGemini(prompt, temperature);
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
