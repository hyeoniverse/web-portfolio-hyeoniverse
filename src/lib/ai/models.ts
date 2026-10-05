import { getSiteConfig } from "@/lib/getSiteConfig";

/** 모델 이름을 코드에 박지 않는다 — 공급자가 모델을 은퇴시키면 설정 › 서비스 › AI 모델에서 바꾼다.
 *  기본값은 공급자가 "지금 최신"을 가리키라고 둔 별칭이라 코드를 안 고쳐도 따라간다.
 *  OpenAI 는 날짜 없는 이름이 그 역할이다(gpt-4o-mini → 최신 스냅샷).
 *  Hugging Face 에는 별칭이 없어 "latest" 를 우리가 센티널로 두고, 부를 때 Hub 에서
 *  지금 추론이 되는 text-to-image 모델 가운데 인기 1위로 푼다(resolveHfLatest).
 *  NanoBanana(리셀러 nanobananaapi.ai)는 엔드포인트가 곧 모델이다 — generate-2 가 최신. */
export type AiModelProvider = "gemini" | "openai" | "groq" | "claude" | "huggingface" | "nanobanana" | "google_tts";

export const HF_LATEST = "latest";
/** Hub 가 안 응답할 때 쓸 마지막 보루 */
export const HF_FALLBACK_MODEL = "black-forest-labs/FLUX.1-schnell";

/** Google Cloud TTS 는 모델이 아니라 목소리 등급(Chirp3-HD · Neural2 · Wavenet · Standard …)이 단위다.
 *  "latest" 는 voices API 에 지금 있는 등급 가운데 가장 새 것(GOOGLE_TTS_TIER_RANK 앞쪽), 성별×언어(ko/en) 네 목소리를 다 갖춘 등급만 */
export const GOOGLE_TTS_LATEST = "latest";
export const GOOGLE_TTS_TIER_RANK = ["Chirp3-HD", "Chirp-HD", "Neural2", "Studio", "Wavenet", "Standard"];

/** Groq "latest" — 그 키의 모델 목록에서 GROQ_PREFER 순으로 첫 번째. 목록을 못 받으면 보루 */
export const GROQ_LATEST = "latest";
export const GROQ_PREFER: RegExp[] = [/^openai\/gpt-oss-120b/, /llama-4.*maverick/i, /^llama-3\.3-70b/, /qwen.*(32b|235b)/i, /^openai\/gpt-oss-20b/, /llama-4.*scout/i, /^llama-3\.1-8b/];
export const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";
/* 글 요약에 못 쓰는 것 — 음성 · 안전 필터 · 에이전트 · 번역 전용 */
export const GROQ_NOT_TEXT = /guard|compound|whisper|tts|orpheus|playai|safeguard/i;

export type NanoBananaModel = "nanobanana" | "nanobanana-2" | "nanobanana-pro";
export const NANOBANANA_MODELS: NanoBananaModel[] = ["nanobanana-2", "nanobanana-pro", "nanobanana"];

export const DEFAULT_AI_MODELS: Record<AiModelProvider, string> = {
  gemini: "gemini-flash-latest",
  openai: "gpt-4o-mini",
  /* Groq 에는 최신 별칭이 없고 모델이 자주 은퇴한다(llama-3.3-70b-versatile 도 404) — 목록에서 선호 순으로 고른다 */
  groq: GROQ_LATEST,
  claude: "claude-haiku-4-5",
  huggingface: HF_LATEST,
  nanobanana: "nanobanana-2",
  google_tts: GOOGLE_TTS_LATEST,
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

/* ── Google Cloud TTS 등급 ── */

export type GoogleTtsGender = "female" | "male";
export type GoogleTtsLang = "ko-KR" | "en-US";
type GoogleVoice = { name: string; languageCodes: string[]; ssmlGender: "FEMALE" | "MALE" | "NEUTRAL" | "SSML_VOICE_GENDER_UNSPECIFIED" };

let googleVoicesCache: { at: number; voices: GoogleVoice[] } | null = null;
const GOOGLE_VOICES_TTL = 60 * 60 * 1000;

/** 그 키로 쓸 수 있는 목소리 전부(ko-KR · en-US). 한 시간 캐시, 실패하면 빈 배열 */
export async function listGoogleVoices(key: string): Promise<GoogleVoice[]> {
  if (googleVoicesCache && Date.now() - googleVoicesCache.at < GOOGLE_VOICES_TTL) return googleVoicesCache.voices;
  try {
    const all: GoogleVoice[] = [];
    for (const lang of ["ko-KR", "en-US"] as const) {
      const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=${lang}`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { voices?: GoogleVoice[] };
      all.push(...(data.voices ?? []));
    }
    if (all.length) googleVoicesCache = { at: Date.now(), voices: all };
    return all;
  } catch {
    return googleVoicesCache?.voices ?? [];
  }
}

/** 목소리 이름에서 등급 — "ko-KR-Chirp3-HD-Aoede" → "Chirp3-HD", "en-US-Neural2-F" → "Neural2" */
export const googleTierOf = (name: string) => name.replace(/^[a-z]{2}-[A-Z]{2}-/, "").replace(/-[^-]+$/, "");

/** 성별 · 언어마다 그 등급의 첫 목소리 — 네 칸이 다 차는 등급만 쓸 수 있다 */
export function googleTierVoices(voices: GoogleVoice[], tier: string): Record<GoogleTtsGender, Record<GoogleTtsLang, string>> | null {
  const pick = (gender: GoogleTtsGender, lang: GoogleTtsLang) =>
    voices.find((v) => v.languageCodes.includes(lang) && googleTierOf(v.name) === tier && v.ssmlGender === (gender === "female" ? "FEMALE" : "MALE"))?.name;
  const f = { "ko-KR": pick("female", "ko-KR"), "en-US": pick("female", "en-US") };
  const m = { "ko-KR": pick("male", "ko-KR"), "en-US": pick("male", "en-US") };
  if (!f["ko-KR"] || !f["en-US"] || !m["ko-KR"] || !m["en-US"]) return null;
  return { female: f as Record<GoogleTtsLang, string>, male: m as Record<GoogleTtsLang, string> };
}

/** 지금 고를 수 있는 등급, 새 것부터. 순위표에 없는 등급은 뒤에 이름순 */
export function listGoogleTiers(voices: GoogleVoice[]): string[] {
  const tiers = [...new Set(voices.map((v) => googleTierOf(v.name)))].filter((t) => googleTierVoices(voices, t));
  const rank = (t: string) => { const i = GOOGLE_TTS_TIER_RANK.indexOf(t); return i === -1 ? GOOGLE_TTS_TIER_RANK.length : i; };
  return tiers.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** 설정의 등급("latest" 면 가장 새 등급)과 그 등급의 목소리 네 칸. 목록을 못 받으면 null — 부르는 쪽이 고정 목소리로 */
export async function resolveGoogleTts(key: string): Promise<{ tier: string; voices: Record<GoogleTtsGender, Record<GoogleTtsLang, string>> } | null> {
  const want = await aiModel("google_tts");
  const voices = await listGoogleVoices(key);
  if (!voices.length) return null;
  const tiers = listGoogleTiers(voices);
  const tier = want !== GOOGLE_TTS_LATEST && tiers.includes(want) ? want : tiers[0];
  if (!tier) return null;
  const picked = googleTierVoices(voices, tier);
  return picked ? { tier, voices: picked } : null;
}

/* ── Groq 모델 목록 ── */

let groqListCache: { at: number; models: string[] } | null = null;
const GROQ_LIST_TTL = 60 * 60 * 1000;

/** 그 키로 지금 부를 수 있는 글 모델. 한 시간 캐시, 실패하면 빈 배열 */
export async function listGroqModels(key: string): Promise<string[]> {
  if (groqListCache && Date.now() - groqListCache.at < GROQ_LIST_TTL) return groqListCache.models;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { data?: { id: string; active?: boolean }[] };
    const models = (data.data ?? []).filter((m) => m.active !== false).map((m) => m.id).filter((id) => !GROQ_NOT_TEXT.test(id));
    if (models.length) groqListCache = { at: Date.now(), models };
    return models;
  } catch {
    return groqListCache?.models ?? [];
  }
}

/** 선호 순으로 첫 모델 — 선호 목록에 없으면 목록의 첫 번째, 목록이 비면 보루 */
export function pickGroqLatest(models: string[]): string {
  for (const re of GROQ_PREFER) {
    const hit = models.find((m) => re.test(m));
    if (hit) return hit;
  }
  return models[0] ?? GROQ_FALLBACK_MODEL;
}

export async function groqModel(key: string): Promise<string> {
  const m = await aiModel("groq");
  return m === GROQ_LATEST ? pickGroqLatest(await listGroqModels(key)) : m;
}
