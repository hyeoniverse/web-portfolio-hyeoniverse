/* AI 모델 기본값 — 설정 화면(ServicesTab)과 서버(models.ts)가 같이 쓴다.
   models.ts 는 설정을 DB 에서 읽는 서버 코드라, 화면이 거기서 상수를 가져가면 Supabase 관리자 클라이언트까지 번들에 실린다.
   별칭을 쓰는 이유 · "latest" 를 푸는 방법은 models.ts 머리말 */

export type AiModelProvider = "gemini" | "openai" | "groq" | "claude" | "huggingface" | "nanobanana" | "google_tts";

/** Hugging Face 에는 최신 별칭이 없어 우리가 센티널로 둔다 — 부를 때 Hub 인기 1위로 푼다(resolveHfLatest) */
export const HF_LATEST = "latest";
/** Google Cloud TTS — voices API 에 지금 있는 가장 새 목소리 등급(resolveGoogleTts) */
export const GOOGLE_TTS_LATEST = "latest";
/** Groq — 그 키의 모델 목록에서 선호 순으로 첫 번째(groqModel) */
export const GROQ_LATEST = "latest";

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
