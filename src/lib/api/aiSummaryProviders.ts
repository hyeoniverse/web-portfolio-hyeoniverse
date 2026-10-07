import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { filterEnabled, missingKey, networkError, providerErrorFrom, recordFailure, recordOk, toProviderError } from "@/lib/ai/health";
import type { AiProvider, ProviderFailure } from "@/lib/ai/providers";
import { aiModel, groqModel } from "@/lib/ai/models";
import { DEFAULT_SUMMARY_OPTIONS, coerceSummary, extractSkeleton, serializeSummary, type StructuredSummary, type SummaryOptions } from "@/lib/ai/summary";
import { sanitizeSummaryGuide } from "@/lib/ai/summaryGuide";

/* 모델 이름은 설정(lib/ai/models)에서 — 코드에 박아 두면 은퇴할 때마다 고쳐야 한다 */
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * 요약 프롬프트 — 글(posts)과 작업물(works)이 같은 틀을 쓰고, 네 공급자에 같은 문장이 간다.
 *
 * 고정 칸은 제목 한 줄(tldr)과 키워드뿐이다. 나머지는 모델이 블록(문단 · 목록 · 단계 · 수치 카드 · 전후 비교 · 콜아웃 ·
 * 인용 · 소제목) 가운데 글에 맞는 것을 골라 쌓는다 — 튜토리얼 · 회고 · 성능 개선 · 에세이는 모양이 달라서, 칸을 정해 두면
 * 모든 글이 같은 틀에 눌렸다. 예시도 모양이 다른 셋을 보여 준다(모델은 예시 하나를 주면 그 모양을 따라 한다).
 *
 * 두 부분으로 나뉜다.
 *  - 고칠 수 있는 부분: 작성 지침(문체 · 블록 고르는 요령 · 피할 예) — 설정 › 서비스. 비우면 lib/ai/summaryGuide 의 기본값.
 *  - 고정 부분(여기 코드): 블록 정의 · 옵션(말투 · 분량 · 초점 · 키워드 · 주의 블록) · 출력 형식 · 예시 · 원문 자리.
 *    출력 형식이 바뀌면 화면이 요약을 읽지 못하므로 관리자에게 열지 않는다.
 * 본문은 뼈대만(lib/ai/summary.extractSkeleton) — 길이와 상관없이 보내는 양이 같다.
 */
/** 원문 뼈대 상한 — 한국어 3,500자는 대략 2~3천 토큰. 지침 · 예시까지 합쳐 한 요청이 5K 토큰 안팎에 들게 */
const OUTLINE_MAX_CHARS = 3500;

/* 예시 — 모두 지어낸 내용(이 사이트의 실제 수치를 넣으면 다른 글 요약에 섞여 나온다). 모양이 서로 다른 셋.
   토큰을 아끼려고 한국어만 싣는다(영어는 같은 블록 구성으로 쓰라고 적는다) */
const EXAMPLE_TUTORIAL = {
  emoji: "🧩",
  tldr: "Docker Compose 로 로컬 Postgres 띄우기",
  blocks: [
    { type: "paragraph", text: "설치 없이 컨테이너 하나로 개발용 DB 를 준비하는 방법입니다." },
    { type: "steps", items: [
      { text: "`compose.yaml` 에 `postgres:16` 서비스를 정의합니다." },
      { text: "볼륨을 붙여 ==재시작해도 데이터가 남게== 합니다." },
      { text: "`docker compose up -d` 로 띄우고 5432 포트로 접속합니다." },
    ] },
    { type: "callout", tone: "warn", text: "포트가 이미 쓰이고 있으면 `5433:5432` 처럼 바깥 포트만 바꿉니다." },
  ],
  keywords: ["Docker Compose", "PostgreSQL", "로컬 개발"],
};
const EXAMPLE_RETRO = {
  emoji: "🌱",
  tldr: "첫 사이드 프로젝트 3개월 회고",
  blocks: [
    { type: "quote", text: "기능을 늘리기보다 매주 내보내는 쪽이 오래 갔습니다." },
    { type: "heading", text: "잘한 것" },
    { type: "list", items: [
      { emoji: "🚢", label: "작게 배포", text: "매주 금요일마다 **한 가지**만 내보냈습니다." },
      { emoji: "🗒️", label: "기록", text: "막힌 지점을 그날 바로 적어 두었습니다." },
    ] },
    { type: "heading", text: "다음에" },
    { type: "list", items: [
      { emoji: "🧪", label: "테스트", text: "결제 흐름만큼은 ==자동 테스트를 먼저== 씁니다." },
    ] },
  ],
  keywords: ["회고", "사이드 프로젝트", "배포 주기"],
};
const EXAMPLE_RESULT = {
  emoji: "⚡",
  tldr: "검색 800ms → 200ms, 사내 일정 앱",
  blocks: [
    { type: "metrics", items: [
      { label: "검색 응답", value: "200ms", from: "800ms" },
      { label: "캐시 적중률", value: "90%", from: "40%" },
    ] },
    { type: "compare", beforeLabel: "전", afterLabel: "후", items: [
      { label: "검색", before: "요청마다 전체 조회", after: "색인 + 결과 캐시" },
      { label: "목록", before: "한 번에 전부", after: "50개씩 나눠 불러오기" },
    ] },
    { type: "list", items: [
      { label: "색인", text: "자주 거르는 두 칼럼에 ==복합 색인==을 걸었습니다." },
      { label: "캐시", text: "같은 검색어는 **5분** 동안 저장된 결과를 씁니다." },
    ] },
    { type: "callout", tone: "info", text: "사용자 열 명 안팎에서 잰 값입니다." },
  ],
  keywords: ["PostgreSQL", "색인", "캐시"],
};

export function buildSummaryPrompt(
  kind: "post" | "work",
  input: { title?: string | null; ko?: string | null; en?: string | null },
  opts: SummaryOptions = DEFAULT_SUMMARY_OPTIONS,
  /** 고칠 수 있는 부분(설정 › 서비스의 작성 지침). 비우면 기본값 */
  guide?: string | null,
): string {
  const what = kind === "post" ? "blog post" : "portfolio project description";
  /* 원문은 한 언어만 — 한국어가 있으면 한국어, 없으면 영어. 두 언어를 다 실으면 같은 내용으로 토큰이 두 배가 되고
     분당 토큰 한도(Groq 무료 8K 등)에 바로 걸렸다. 영어 요약도 이 원문에서 쓴다 */
  const srcLang = (input.ko || "").trim() ? "Korean" : "English";
  const outline = extractSkeleton(srcLang === "Korean" ? input.ko : input.en, OUTLINE_MAX_CHARS);

  const tone = {
    formal: 'Korean ends sentences in 합니다체 ("-합니다", "-입니다", "-했습니다").',
    friendly: 'Korean ends sentences in 해요체 ("-해요", "-예요", "-했어요"). Warm but not chatty.',
    plain: 'Korean ends sentences in 평서체 ("-다", "-했다"), like a technical note.',
  }[opts.tone];
  const length = {
    short: "2 to 3 blocks, about 250 Korean characters in total",
    normal: "3 to 5 blocks, about 500 Korean characters in total",
    detailed: "4 to 7 blocks, about 850 Korean characters in total",
  }[opts.length];
  const focus = {
    auto: "Lead with whatever matters most in this text: the results if it reports results, the method if it explains how, the lesson if it reflects.",
    outcome: "Lead with results: numbers, before → after, what now works that did not.",
    process: "Lead with how: the approach, the key decisions and why they were made, the trade-offs.",
    reader: "Lead with takeaways: what the reader can learn from it and apply themselves.",
  }[opts.focus];
  const keywordsRule = opts.keywords === 0
    ? '"keywords": always an empty array [].'
    : `"keywords": exactly ${opts.keywords} short tags (1-3 words) a reader would search for. Real technologies, techniques, or topics named in the text. Keep product names as written (Next.js, Supabase).`;
  const caveatRule = opts.note
    ? "Add a caveat (a callout) only when the text itself states a limitation, precondition, or warning. Never invent one."
    : "Do not add caveats or limitations.";
  const examples = kind === "post" ? [EXAMPLE_TUTORIAL, EXAMPLE_RETRO, EXAMPLE_RESULT] : [EXAMPLE_RESULT, EXAMPLE_RETRO];

  return `You write the summary box for a ${what} on the author's personal site. It appears above the article like a Notion AI summary: a reader should get the point in five seconds, and it should look edited — structure, labels, emphasis — not like a flat paragraph.

The content below is an outline (title, headings, first sentences, bullets) in ${srcLang}, not the full text. Use only facts that appear in it, and write both "ko" and "en" from it.

## Fixed fields
- "emoji": one emoji that fits the subject, or "".
- "tldr": the headline. A noun phrase or short statement under 50 characters that names the subject and the most specific fact (a number, a technology, a result). It is a title, so no sentence ending.
- ${keywordsRule}

## Blocks — you choose
"blocks" is an ordered array. Pick the block types that fit THIS text and order them the way a reader would scan it. Writing differs a lot — a tutorial, a retrospective, a performance write-up, an essay, a comparison — so the shape should differ too. Do not use a block just because it exists, and do not force the same shape on every text.
- {"type": "paragraph", "text": "..."} — one or two sentences of framing or story. Never a wall of facts.
- {"type": "list", "title": "(optional)", "items": [{"emoji": "(optional)", "label": "(optional, 1-4 words)", "text": "one sentence"}]} — parallel points. Labels when the points cover different areas; emoji when it helps scanning.
- {"type": "steps", "title": "(optional)", "items": [{"label": "(optional)", "text": "one sentence"}]} — an ordered procedure the reader can follow.
- {"type": "metrics", "items": [{"label": "1-3 words", "value": "number with unit", "from": "previous value (optional)"}]} — 2 to 4 numbers the text actually states. Never estimate or invent a number.
- {"type": "compare", "title": "(optional)", "beforeLabel": "e.g. 전 / A", "afterLabel": "e.g. 후 / B", "items": [{"label": "...", "before": "...", "after": "..."}]} — before vs after, or option A vs B, row by row.
- {"type": "callout", "tone": "tip" | "warn" | "info", "text": "..."} — one tip, warning, or limitation worth stopping for.
- {"type": "quote", "text": "..."} — one line that carries the spirit of the text (a lesson, a conclusion).
- {"type": "heading", "text": "1-3 words"} — only to group the blocks that follow when there are several groups (e.g. 잘한 것 / 다음에, 문제 / 해결).
Inline marks inside any text: **bold** for the key number or result, ==highlight== for the key phrase, \`backticks\` for code. At most one mark per sentence. No other markdown, no HTML.

## This request
- Size: ${length}. Count every block's text.
- ${tone}
- ${focus}
- ${caveatRule}
- "en" uses the same blocks in the same order, rewritten naturally in English (not word for word). English "tldr" has no trailing period.

${sanitizeSummaryGuide(guide)}

## Output
Return ONLY one JSON object, no markdown, no code fence:
{"ko": {"emoji": "", "tldr": "", "blocks": [], "keywords": []}, "en": {...same keys...}}

## Examples of different shapes (made up; shown in Korean only. Copy neither the facts nor the shape — choose blocks for THIS text)
${examples.map((e) => JSON.stringify(e)).join("\n")}
${opts.instruction ? `\n## Extra instruction from the author (follow it unless it conflicts with the output format)\n${opts.instruction}\n` : ""}
## Content
Title: ${(input.title || "").trim() || "(none)"}

Outline (${srcLang}):
${outline || "(none)"}`;
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
  let jsonMode = true;
  let maxTokens = gen.maxTokens;
  const send = async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: gen.temperature, max_completion_tokens: maxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
      });
    } catch (e) {
      throw networkError(provider, e);
    }
    return res;
  };
  let res = await send();
  /* 공급자가 거절하면 고쳐서 한 번씩만 더 — ① JSON 모드를 못 따른 모델(json_validate_failed)은 모드 없이,
     ② 분당 출력 토큰 한도보다 큰 max_completion_tokens 를 요청했으면(Groq 무료 qwen: OTPM 1,000 < 1,024) 한도의 90% 로 */
  for (let attempt = 0; attempt < 2 && !res.ok; attempt++) {
    const body = await res.clone().text().catch(() => "");
    if (res.status === 400 && jsonMode && /json_validate_failed|response_format/i.test(body)) {
      jsonMode = false;
    } else {
      const cap = outputTokenCap(body);
      if (cap === null || cap >= maxTokens) break;
      maxTokens = cap;
    }
    res = await send();
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

/** "output tokens per minute (OTPM): Limit 1000, Requested 1024" — 요청한 출력 토큰이 분당 한도를 넘었다는 거절에서
 *  다시 보낼 상한(한도의 90%). 그런 거절이 아니면 null */
export function outputTokenCap(body: string): number | null {
  const m = body.match(/output tokens[^:]*:\s*Limit\s*(\d+),\s*Requested\s*(\d+)/i);
  if (!m) return null;
  const limit = Number(m[1]);
  return limit > 0 ? Math.max(256, Math.floor(limit * 0.9)) : null;
}

/** "Please try again in 10.7175s" · "retry after 3s" 같은 문장에서 기다릴 초 — 없으면 null */
export function retryAfterSeconds(message: string): number | null {
  const m = message.match(/(?:try again in|retry after)\s*([\d.]+)\s*(ms|s)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2].toLowerCase() === "ms" ? n / 1000 : n;
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

  const callOnce = (provider: SummaryProvider) =>
    provider === "openai" ? callOpenAI(prompt, gen)
      : provider === "groq" ? callGroq(prompt, gen)
      : provider === "claude" ? callClaude(prompt, gen)
      : callGemini(prompt, gen);

  for (const provider of enabled) {
    try {
      let result: SummaryResult;
      try {
        result = await callOnce(provider);
      } catch (e) {
        /* 분당 한도(429)이고 공급자가 "Xs 뒤 다시" 를 짧게 알려 주면 그만큼 기다렸다 한 번만 더 — 다음 공급자로 넘기기 전에.
           길면(12초 넘게) 기다리지 않는다(서버 함수 시간 · 사용자가 기다리는 시간) */
        const err = toProviderError(provider, e);
        const wait = err.kind === "rate_limit" ? retryAfterSeconds(err.message) : null;
        if (wait === null || wait > 12) throw e;
        await new Promise((r) => setTimeout(r, Math.ceil(wait * 1000) + 300));
        result = await callOnce(provider);
      }
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
