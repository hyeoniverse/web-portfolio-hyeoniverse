import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { filterEnabled, missingKey, networkError, providerErrorFrom, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { AiProvider, ProviderFailure } from "@/lib/ai/providers";
import { aiModel, groqModel } from "@/lib/ai/models";
import { DEFAULT_SUMMARY_OPTIONS, coerceSummary, extractSkeleton, serializeSummary, type StructuredSummary, type SummaryOptions } from "@/lib/ai/summary";

/* 모델 이름은 설정(lib/ai/models)에서 — 코드에 박아 두면 은퇴할 때마다 고쳐야 한다 */
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * 요약 프롬프트 — 글(posts)과 작업물(works)이 같은 틀을 쓰고, 네 공급자에 같은 문장이 간다.
 * 규칙을 길게 늘어놓기보다 좋은 예 하나와 피할 예(실제로 나왔던 문장)를 보여 준다 — 모델은 예시를 가장 잘 따라 한다.
 * 관리자가 편집기에서 고른 값(options)은 말투 · 분량 · 초점 · 키워드 수 · 덧붙임 · 추가 지시로 들어간다.
 * 본문은 뼈대만(lib/ai/summary.extractSkeleton) — 길이와 상관없이 보내는 양이 같다.
 */
export function buildSummaryPrompt(
  kind: "post" | "work",
  input: { title?: string | null; ko?: string | null; en?: string | null },
  opts: SummaryOptions = DEFAULT_SUMMARY_OPTIONS,
): string {
  const what = kind === "post" ? "blog post" : "portfolio project description";
  const ko = extractSkeleton(input.ko);
  const en = extractSkeleton(input.en);

  const tone = {
    formal: 'Korean ends sentences in 합니다체 ("-합니다", "-입니다", "-했습니다").',
    friendly: 'Korean ends sentences in 해요체 ("-해요", "-예요", "-했어요"). Warm but not chatty.',
    plain: 'Korean ends sentences in 평서체 ("-다", "-했다"), like a technical note.',
  }[opts.tone];
  const length = {
    short: { points: "2 to 3", takeaway: "under 50 characters" },
    normal: { points: "3 to 4", takeaway: "under 70 characters" },
    detailed: { points: "4 to 6", takeaway: "under 90 characters" },
  }[opts.length];
  const focus = {
    outcome: "Lead with results: numbers, before → after, what now works that did not.",
    process: "Lead with how: the approach, the key decisions and why they were made, the trade-offs.",
    reader: "Lead with the reader: what problem this helps them solve and what they can apply themselves.",
  }[opts.focus];
  const keywordsRule = opts.keywords === 0
    ? '"keywords": always an empty array [].'
    : `"keywords": exactly ${opts.keywords} short tags (1-3 words) a reader would search for. Real technologies, techniques, or topics named in the text. Keep product names as written (Next.js, Supabase).`;
  const noteRule = opts.note
    ? '"note": one sentence about a real limitation, precondition, or caveat that the text itself states. If the text states none, return "". Never invent one, never write a generic line like "실제 측정 기반으로 적용했습니다".'
    : '"note": always "".';

  const example = kind === "post"
    ? `{"ko":{"tldr":"React 19 useOptimistic 으로 좋아요 지연 없애기","body":"좋아요 단추를 즉시 반응하게 바꾼 과정입니다.","points":[{"label":"낙관적 업데이트","text":"서버 응답 전에 숫자를 먼저 바꾸고, 실패하면 되돌립니다."},{"label":"구현","text":"\`useOptimistic\` 과 서버 액션 하나로 끝납니다."},{"label":"결과","text":"체감 지연이 **400ms → 0** 으로 줄었습니다."}],"note":"서버 액션을 쓰는 프로젝트에서만 그대로 적용됩니다.","keywords":["React 19","useOptimistic","서버 액션","낙관적 업데이트"],"takeaway":"목록 화면의 상호작용을 즉시 반응하게 바꾸는 방법입니다."},"en":{"tldr":"Removing like-button lag with React 19 useOptimistic","body":"How the like button was made to respond instantly.","points":[{"label":"Optimistic update","text":"The count changes before the server responds and rolls back on failure."},{"label":"Implementation","text":"Just \`useOptimistic\` and one server action."},{"label":"Result","text":"Perceived latency dropped from **400ms to 0**."}],"note":"Applies as-is only to projects using server actions.","keywords":["React 19","useOptimistic","Server actions","Optimistic UI"],"takeaway":"A pattern for making list interactions feel instant."}}`
    : `{"ko":{"tldr":"혼자 만든 사내 일정 공유 앱","body":"작은 팀의 주간 일정 조율을 도구로 옮겼습니다.","points":[{"label":"역할","text":"설계부터 배포까지 혼자 맡았습니다."},{"label":"구성","text":"Next.js 와 Supabase 실시간 구독으로 보드를 동기화합니다."},{"label":"효과","text":"주간 회의가 **60분 → 30분** 으로 줄었습니다."}],"note":"","keywords":["Next.js","Supabase","실시간 동기화","사내 도구"],"takeaway":"반복 회의를 작은 도구로 줄인 사례입니다."},"en":{"tldr":"A solo-built team calendar app","body":"Moved a small team's weekly scheduling into a tool.","points":[{"label":"Role","text":"Designed, built, and shipped solo."},{"label":"Stack","text":"Next.js with Supabase realtime keeps the board in sync."},{"label":"Impact","text":"Weekly meetings went from **60 to 30 minutes**."}],"note":"","keywords":["Next.js","Supabase","Realtime sync","Internal tools"],"takeaway":"How a small tool cut a recurring meeting in half."}}`;

  return `You summarize a ${what} for the author's personal site. The summary appears in a box above the article, like a Notion AI summary: a reader should get the point in five seconds.

The content below is an outline (title, headings, first sentences, bullets), not the full text. Use only facts that appear in it.

## Fields
- "tldr": the headline. A noun phrase or short statement under 50 characters that names the subject and the most specific fact (a number, a technology, a result). It is a title, so no sentence ending: write "LCP 9.7초 → 2.7초로 줄인 포트폴리오", not "포트폴리오의 성능을 최적화했습니다".
- "body": ONE short lead sentence (under 70 characters) that frames what the points cover. Not a list of facts — the points carry the facts.
- "points": ${length.points} items, each {"label": "...", "text": "..."}.
  - "label": a 2-6 word lead-in naming the area, like a bold heading in a Notion bullet ("성능", "편집기 입력", "권한 구조", "Scroll conflicts"). No trailing colon.
  - "text": one sentence about that area — what changed and the result. Wrap the single most important number or result in **double asterisks** (e.g. "LCP 를 **9.7초 → 2.7초** 로 줄였습니다"). Wrap code identifiers in \`backticks\` (e.g. \`useMemo\`). At most one bold span per item; no other markdown.
  - Each item covers a different area. Do not cram several results into one item.
- ${noteRule}
- ${keywordsRule}
- "takeaway": one sentence, ${length.takeaway}. What the reader can take from it. Describe the content, not the author: never "개발자는 … 보여줍니다", "능력을 보여줍니다", "역량을 증명합니다".

## Style
- ${tone}
- ${focus}
- Short sentences. Split instead of joining with "~하고, ~하며, ~했으며".
- Plain words. No praise or hype (최적화된, 혁신적인, 강력한, 효과적으로, 지속적으로, 다양한), no exclamation marks, no emojis, no quotation marks.
- Keep technical terms and code identifiers as written. Numbers stay numbers.
- English is a natural rewrite of the same content in neutral tone, not a word-for-word translation. Title-like "tldr" without a trailing period.
- If one language's outline is missing, write that language from the other.

## Avoid (real outputs that missed the mark)
- body as a wall of text: "모바일 LCP를 9.7초에서 2.7초로 줄이고 Lighthouse 점수를 50점에서 77점으로 올렸습니다. 편집기 입력 지연을 … 98px→0으로 만들었습니다." → every result jammed into one paragraph. Split into points: {"label":"모바일 성능","text":"LCP 를 **9.7초 → 2.7초** 로 줄였습니다."}, {"label":"편집기 입력","text":"\`useMemo\` 로 입력 지연을 **120ms → 72ms** 로 낮췄습니다."}, …
- note "모든 최적화가 좋은 결과를 낸 것은 아니었습니다" → vague. Name what did not work, or return "".
- tldr "HYEONIVERSE 포트폴리오 사이트, 성능·보안을 최적화했습니다" → a sentence, vague. Better: "LCP 9.7초 → 2.7초, 혼자 운영하는 포트폴리오".
- note "모든 최적화는 실제 측정 기반으로 반복 적용했습니다" → not a caveat. Return "" instead.
- takeaway "개발자는 혼자서도 문제를 찾아 고치고 서비스 품질을 지속적으로 향상시킬 수 있음을 보여줍니다" → praises the author, too long.

## Output
Return ONLY one JSON object, no markdown, no code fence, exactly these keys:
{"ko": {"tldr": "", "body": "", "points": [{"label": "", "text": ""}], "note": "", "keywords": [], "takeaway": ""}, "en": {...same keys...}}

Example of the shape and voice (a different ${kind === "post" ? "post" : "project"}; do not copy its facts):
${example}
${opts.instruction ? `\n## Extra instruction from the author (follow it unless it conflicts with the output format)\n${opts.instruction}\n` : ""}
## Content
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
/** 생성 값 — temperature 와 출력 토큰 상한. 네 공급자가 각자의 이름으로 받는다 */
interface GenParams { temperature: number; maxTokens: number }

async function callOpenAICompatible(provider: "openai" | "groq", url: string, keyName: string, prompt: string, gen: GenParams): Promise<SummaryResult> {
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
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: gen.temperature, max_completion_tokens: gen.maxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
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
const callOpenAI = (prompt: string, gen: GenParams) => callOpenAICompatible("openai", OPENAI_API_URL, "OPENAI_API_KEY", prompt, gen);
const callGroq = (prompt: string, gen: GenParams) => callOpenAICompatible("groq", GROQ_API_URL, "GROQ_API_KEY", prompt, gen);

async function callClaude(prompt: string, gen: GenParams): Promise<SummaryResult> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw missingKey("claude", "ANTHROPIC_API_KEY");
  const res = await call("claude", CLAUDE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: await aiModel("claude"), max_tokens: gen.maxTokens, temperature: gen.temperature, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return parseSummaryJson(String(data?.content?.[0]?.text ?? ""));
}

async function callGemini(prompt: string, gen: GenParams): Promise<SummaryResult> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw missingKey("gemini", "GEMINI_API_KEY");
  const res = await call("gemini", `${geminiUrl(await aiModel("gemini"))}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: gen.temperature, maxOutputTokens: gen.maxTokens, responseMimeType: "application/json" } }),
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
 *   거의 같은 글이 나와 비교할 게 없다. 관리자가 옵션에서 정하면 그 값
 * @param maxTokens 출력 토큰 상한(기본 1024)
 * @param provider 이번 요청만 이 공급자로(설정의 순서 · 자동 전환을 건너뛴다)
 */
export async function generateSummary(
  prompt: string,
  logPrefix: string,
  { temperature = 0.2, maxTokens = 1024, provider: only }: { temperature?: number; maxTokens?: number; provider?: SummaryProvider } = {},
): Promise<SummaryResult & { failures: ProviderFailure[] }> {
  const gen: GenParams = { temperature, maxTokens };
  /* 여러 번 이어 실패해 꺼 둔 공급자는 부르지 않는다(lib/ai/health) */
  const { enabled, skipped } = await filterEnabled(only ? [only] : await buildSummaryProviderList(), (p) => p);
  const failures: ProviderFailure[] = [...skipped];
  let lastError = skipped.length ? "All providers disabled" : "Unknown error";
  const failed: { provider: string; error: string }[] = [];

  for (const provider of enabled) {
    try {
      const result = provider === "openai" ? await callOpenAI(prompt, gen)
        : provider === "groq" ? await callGroq(prompt, gen)
        : provider === "claude" ? await callClaude(prompt, gen)
        : await callGemini(prompt, gen);
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
