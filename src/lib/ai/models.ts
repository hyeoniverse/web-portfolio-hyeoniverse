import { getSiteConfig } from "@/lib/getSiteConfig";

/** 모델 이름을 코드에 박지 않는다 — 공급자가 모델을 은퇴시키면 설정 › 서비스 › AI 모델에서 바꾼다.
 *  기본값은 공급자가 "지금 최신"을 가리키라고 둔 별칭이라 코드를 안 고쳐도 따라간다.
 *  OpenAI 는 날짜 없는 이름이 그 역할이다(gpt-4o-mini → 최신 스냅샷). */
export type AiModelProvider = "gemini" | "openai" | "claude";

export const DEFAULT_AI_MODELS: Record<AiModelProvider, string> = {
  gemini: "gemini-flash-latest",
  openai: "gpt-4o-mini",
  claude: "claude-haiku-4-5",
};

/** 설정에 적은 모델 이름, 비어 있으면 기본 별칭 */
export async function aiModel(provider: AiModelProvider): Promise<string> {
  const cfg = await getSiteConfig();
  const custom = (cfg?.aiModels as Partial<Record<AiModelProvider, string>> | undefined)?.[provider]?.trim();
  return custom || DEFAULT_AI_MODELS[provider];
}
