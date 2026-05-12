import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface SummaryResult {
  ko: string;
  en: string;
}

async function callOpenAI(prompt: string): Promise<SummaryResult> {
  const apiKey = await getSecret("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.2, response_format: { type: "json_object" } }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const parsed: { ko?: string; en?: string } = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
  return { ko: parsed.ko ?? "", en: parsed.en ?? "" };
}

async function callClaude(prompt: string, logPrefix: string): Promise<SummaryResult> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error(`[${logPrefix}] Claude detail:`, JSON.stringify(errBody));
    throw new Error(`Claude error: ${res.status}`);
  }
  const data = await res.json();
  const parsed: { ko?: string; en?: string } = JSON.parse(data?.content?.[0]?.text ?? "{}");
  return { ko: parsed.ko ?? "", en: parsed.en ?? "" };
}

async function callGemini(prompt: string): Promise<SummaryResult> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  const parsed: { ko?: string; en?: string } = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
  return { ko: parsed.ko ?? "", en: parsed.en ?? "" };
}

/** Config 기반 provider 우선순위 리스트 생성 */
async function buildProviderList(): Promise<string[]> {
  const config = await getSiteConfig();
  const primary = config?.aiSummary?.provider ?? "gemini";
  const fallbackCfg = config?.aiSummary?.fallback;
  const providerList: string[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    const excl = new Set(fallbackCfg.excluded ?? []);
    for (const p of fallbackCfg.priority) {
      if (p !== primary && !excl.has(p)) providerList.push(p);
    }
  }
  return providerList;
}

/** Provider fallback 순회하며 요약 생성 */
export async function generateSummary(
  prompt: string,
  logPrefix: string,
): Promise<SummaryResult> {
  const providerList = await buildProviderList();
  let lastError = "Unknown error";

  for (const provider of providerList) {
    try {
      if (provider === "openai") return await callOpenAI(prompt);
      if (provider === "claude") return await callClaude(prompt, logPrefix);
      return await callGemini(prompt);
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
      console.error(`[${logPrefix}]`, provider, lastError);
    }
  }

  throw new AiSummaryError(lastError);
}

/** 에러 상태코드 매핑용 커스텀 에러 */
export class AiSummaryError extends Error {
  readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "AiSummaryError";
    this.statusCode = message.includes("not configured") ? 503
      : message.includes("429") ? 429
      : message.includes("401") || message.includes("403") ? 401
      : message.includes("400") ? 400
      : 502;
  }
}
