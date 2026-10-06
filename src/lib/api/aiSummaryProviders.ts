import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { filterEnabled, missingKey, networkError, providerErrorFrom, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { AiProvider, ProviderFailure } from "@/lib/ai/providers";
import { aiModel, groqModel } from "@/lib/ai/models";
import { coerceSummary, extractSkeleton, serializeSummary, type StructuredSummary } from "@/lib/ai/summary";

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
  /* 긴 글은 뼈대(제목 · 소제목 · 문단 첫 문장 · 글머리 · 마지막 문단)만 — 길이와 상관없이 보내는 양이 같다(lib/ai/summary) */
  const ko = extractSkeleton(input.ko);
  const en = extractSkeleton(input.en);
  return `You write short summaries for a developer's personal site, in the voice of a Notion AI summary: plain, direct, scannable. Summarize the following ${what}. The content below is an outline (headings, first sentences, bullets), not the full text.

Voice (both languages)
- Lead with the fact. No preamble, no framing ("This post explains…", "이 글에서는…").
- One idea per sentence. Short sentences; no chained clauses with "and/so/which" or "~하고, ~하며".
- Plain words. No marketing adjectives (innovative, powerful, seamless, 혁신적인, 강력한, 완벽한), no intensifiers (very, 매우, 정말).
- Concrete over abstract: name the technology, the number, the decision. Prefer "LCP 9.7s → 2.7s" over "performance improved a lot".
- Neutral and calm. No exclamation marks, no rhetorical questions, no emojis.

Output
- Return ONLY a JSON object with this exact shape, no markdown, no code fence, no extra keys:
  {"ko": {"tldr": "...", "body": "...", "note": "...", "keywords": ["..."], "takeaway": "..."}, "en": {...same keys...}}
- "tldr": a headline-like single line that says what this ${kind === "post" ? "post" : "project"} is about, under 60 characters, no trailing period in English.
- "body": 2 to 3 sentences, under 220 characters total — what was done, how, and what came out of it (numbers, decisions, outcomes).
- "note": one sentence, under 90 characters — a limitation, caveat, or precondition the reader should know. Empty string if there is none.
- "keywords": 3 to 5 short tags (1-3 words each) a reader would search for — technologies, techniques, topics.
- "takeaway": one closing sentence, under 80 characters — the single biggest result, or who benefits most from reading.

Korean ("ko")
- Polite declarative style ending in "-합니다 / -입니다" (합니다체). Never use "-해요", "-한다", or "-했어요".
- Keep sentences under 45 characters where possible. Split rather than join.
- Do not start with "이 글은" or "이 프로젝트는"; state the substance directly.
- "tldr" reads like a document title: a noun phrase or a short statement, no ending "~입니다" needed (e.g. "LCP 9.7초 → 2.7초, 혼자 운영하는 포트폴리오").
- Keep technical terms, product names, and code identifiers in their original form (e.g. React, Supabase, useEffect).

English ("en")
- Natural, neutral tone; no first person. Sentence case for "tldr" (title-like, no trailing period).

Both
- Cover: ${focus}.
- Be concrete: prefer specific nouns, numbers, and outcomes over generic phrases like "various", "effectively", "in-depth".
- Do not repeat the tldr inside body or takeaway. No emojis, no quotation marks, no trailing labels.
- If one language's content is missing, write that language from the other language's content.

Title: ${(input.title || "").trim() || "(none)"}

Korean outline:
${ko || "(none)"}

English outline:
${en || "(none)"}`;
}

/** 공급자가 만든 요약 — 언어마다 구조(한 줄 + 핵심). 저장은 JSON 문자열로(lib/ai/summary.serializeSummary) */
export interface SummaryResult {
  ko: StructuredSummary;
  en: StructuredSummary;
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
  /* 새 모양({tldr, points})과 예전 모양(문장) 둘 다 받는다 — 모델이 지시를 덜 따라도 쓸 수 있게 */
  const ko = coerceSummary(parsed.ko);
  const en = coerceSummary(parsed.en);
  if (!ko && !en) throw new Error(`요약 응답을 JSON 으로 읽지 못했습니다: ${cleaned.slice(0, 120)}`);
  const empty: StructuredSummary = { tldr: "" };
  return { ko: ko ?? empty, en: en ?? empty };
}

/** 저장할 문자열로 — 본문 해시를 함께 넣어 발행 때 안 바뀐 글은 다시 만들지 않게 한다 */
export function toStored(s: StructuredSummary, hash: string): string {
  return serializeSummary({ ...s, hash });
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
