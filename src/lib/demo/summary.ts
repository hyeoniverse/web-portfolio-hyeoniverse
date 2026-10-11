import { getSiteConfig } from "@/lib/getSiteConfig";
import { AiSummaryError, buildSummaryPrompt, buildSummaryProviderList, generateSummary, toStored } from "@/lib/api/aiSummaryProviders";
import { sanitizeSummaryOptions, summaryHash } from "@/lib/ai/summary";
import { sanitizeSummaryGuide } from "@/lib/ai/summaryGuide";
import { demoText } from "@/lib/demo/input";
import { allUnavailable, anyProviderUsable, providerLabel, publicFailures, succeededProvider, type DemoOutcome } from "@/lib/demo/handler";

/**
 * 요약 데모 — 글 상세의 AI 요약과 같은 프롬프트 · 같은 사이트 기본 옵션 · 같은 작성 지침 · 같은 공급자 순서로 만든다.
 * 결과는 posts.summary_ko 에 저장하는 것과 같은 JSON 문자열이라 화면은 parseStoredSummary(lib/ai/summary)로 읽는다.
 * 저장하지는 않는다. 공급자 상태 · 사용량 기록(ai_usage)은 generateSummary 가 실제 경로와 똑같이 남긴다.
 */
export const SUMMARY_MAX = 4000;

export interface SummaryInput {
  text: string;
}

export function parseSummary(body: Record<string, unknown>): SummaryInput {
  return {
    text: demoText(body.text, { max: SUMMARY_MAX, empty: "요약할 글을 붙여 넣어 주세요.", refused: "이 글은 요약해 드릴 수 없습니다.", lines: true, allowLinks: true }),
  };
}

export async function summaryUnavailable(): Promise<string | null> {
  const config = await getSiteConfig();
  return config?.aiSummary?.enabled === false ? "지금은 AI 요약 기능을 쓸 수 없습니다." : null;
}

const HANGUL = /[가-힣]/;

/** 요약 공급자 — aiSummaryProviders 가 내보내지 않아 그 목록 함수의 반환 타입에서 꺼낸다 */
type SummaryProvider = Awaited<ReturnType<typeof buildSummaryProviderList>>[number];

/** 지금 쓸 수 있나 — 꺼 두지 않았고, 부를 공급자가 있다 */
export async function summaryUsable(): Promise<boolean> {
  return !(await summaryUnavailable()) && anyProviderUsable(await buildSummaryProviderList());
}

export async function runSummary({ text }: SummaryInput): Promise<DemoOutcome<{ summary: string; provider: string }>> {
  const cfg = (await getSiteConfig())?.aiSummary as { options?: unknown; guide?: unknown } | undefined;
  /* 방문자 첫 생성(aiSummaryRoute 의 public 요청)과 같이 — 요청의 옵션은 받지 않고 사이트 기본값 그대로 */
  const opts = sanitizeSummaryOptions(cfg?.options);
  const only = opts.provider === "auto" ? undefined : (opts.provider as SummaryProvider);
  /* 붙여 넣은 글의 언어로 원문 칸을 고르고, 그 언어의 요약을 돌려준다 */
  const ko = HANGUL.test(text);
  const prompt = buildSummaryPrompt("post", { title: null, ko: ko ? text : null, en: ko ? null : text }, opts, sanitizeSummaryGuide(cfg?.guide));

  try {
    const result = await generateSummary(prompt, "demo/summary", { temperature: opts.temperature ?? 0.2, maxTokens: opts.maxTokens, provider: only });
    const picked = ko ? result.ko : result.en;
    const chosen = picked.tldr ? picked : ko ? result.en : result.ko;
    if (!chosen.tldr) return { ok: false, status: 502, message: "요약하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
    const order = only ? [only] : await buildSummaryProviderList();
    const id = succeededProvider(order, result.failures, (p) => p);
    return { ok: true, data: { summary: toStored(chosen, summaryHash(text)), provider: id ? providerLabel(id) : "" } };
  } catch (e) {
    if (e instanceof AiSummaryError) {
      return allUnavailable(e.failures) || e.statusCode === 503
        ? { ok: false, status: 503, message: "지금은 AI 요약 기능을 쓸 수 없습니다.", failures: publicFailures(e.failures) }
        : { ok: false, status: 502, message: "요약하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", failures: publicFailures(e.failures) };
    }
    throw e;
  }
}
