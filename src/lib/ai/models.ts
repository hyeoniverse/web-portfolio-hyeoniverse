import { getSiteConfig } from "@/lib/getSiteConfig";

/** 모델 이름을 코드에 박지 않는다 — 공급자가 모델을 은퇴시키면 설정 › 서비스 › AI 모델에서 바꾼다.
 *  기본값은 공급자가 "지금 최신"을 가리키라고 둔 별칭이라 코드를 안 고쳐도 따라간다.
 *  OpenAI 는 날짜 없는 이름이 그 역할이다(gpt-4o-mini → 최신 스냅샷).
 *  Hugging Face 에는 별칭이 없어 "latest" 를 우리가 센티널로 두고, 부를 때 Hub 에서
 *  지금 추론이 되는 text-to-image 모델 가운데 인기 1위로 푼다(resolveHfLatest).
 *  NanoBanana(리셀러 nanobananaapi.ai)는 엔드포인트가 곧 모델이다 — generate-2 가 최신. */
export type AiModelProvider = "gemini" | "openai" | "claude" | "huggingface" | "nanobanana";

export const HF_LATEST = "latest";
/** Hub 가 안 응답할 때 쓸 마지막 보루 */
export const HF_FALLBACK_MODEL = "black-forest-labs/FLUX.1-schnell";

export type NanoBananaModel = "nanobanana" | "nanobanana-2" | "nanobanana-pro";
export const NANOBANANA_MODELS: NanoBananaModel[] = ["nanobanana-2", "nanobanana-pro", "nanobanana"];

export const DEFAULT_AI_MODELS: Record<AiModelProvider, string> = {
  gemini: "gemini-flash-latest",
  openai: "gpt-4o-mini",
  claude: "claude-haiku-4-5",
  huggingface: HF_LATEST,
  nanobanana: "nanobanana-2",
};

/** 설정에 적은 모델 이름, 비어 있으면 기본 별칭(HF 는 "latest" 센티널 그대로 — 부르는 쪽이 resolveHfLatest 로 푼다) */
export async function aiModel(provider: AiModelProvider): Promise<string> {
  const cfg = await getSiteConfig();
  const custom = (cfg?.aiModels as Partial<Record<AiModelProvider, string>> | undefined)?.[provider]?.trim();
  return custom || DEFAULT_AI_MODELS[provider];
}

/* ── Hugging Face "latest" ── */

const HF_LIST_URL =
  "https://huggingface.co/api/models?pipeline_tag=text-to-image&inference=warm&sort=trendingScore&direction=-1&limit=40";
/* LoRA · 체크포인트 파일 같은 것은 Hub 목록에 섞여 있어도 라우터로 못 부른다 */
const HF_NOT_MODEL = /lora|safetensors|filter|distill|spritesheet/i;

let hfListCache: { at: number; models: string[] } | null = null;
const HF_LIST_TTL = 60 * 60 * 1000;

/** 지금 Inference Providers 로 돌릴 수 있는 text-to-image 모델, 인기순. 한 시간 캐시, 실패하면 빈 배열 */
export async function listHfImageModels(): Promise<string[]> {
  if (hfListCache && Date.now() - hfListCache.at < HF_LIST_TTL) return hfListCache.models;
  try {
    const res = await fetch(HF_LIST_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { id: string }[];
    const models = data.map((m) => m.id).filter((id) => !HF_NOT_MODEL.test(id));
    if (models.length) hfListCache = { at: Date.now(), models };
    return models;
  } catch {
    return hfListCache?.models ?? [];
  }
}

/** "latest" 를 실제 모델 ID 로 — 인기 1위, Hub 가 죽어 있으면 FLUX.1-schnell */
export async function resolveHfLatest(): Promise<string> {
  const [first] = await listHfImageModels();
  return first ?? HF_FALLBACK_MODEL;
}

export async function hfModel(): Promise<string> {
  const m = await aiModel("huggingface");
  return m === HF_LATEST ? resolveHfLatest() : m;
}

export async function nanoBananaModel(): Promise<NanoBananaModel> {
  const m = await aiModel("nanobanana");
  return (NANOBANANA_MODELS as string[]).includes(m) ? (m as NanoBananaModel) : "nanobanana-2";
}
