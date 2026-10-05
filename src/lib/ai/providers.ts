/**
 * AI·유료 API 공급자 목록 — 서버(상태 기록·차단)와 화면(설정 › 서비스의 상태 패널)이 같이 쓴다.
 *
 * 같은 키를 여러 기능이 나눠 쓰면 공급자 하나로 센다(Gemini 는 번역·요약, Claude 도 번역·요약).
 * 같은 회사라도 키가 다르면 따로 센다(Google 번역 키와 Google TTS 키).
 */

export const AI_PROVIDERS = [
  "deepl",
  "google_translate",
  "gemini",
  "openai",
  "claude",
  "nanobanana",
  "huggingface",
  "fish",
  "google_tts",
  "edge",
  "unsplash",
  "pexels",
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiFeature = "translation" | "summary" | "cover" | "tts" | "stock";

export const AI_PROVIDER_INFO: Record<AiProvider, {
  label: string;
  /** 이 공급자가 쓰이는 기능 */
  features: AiFeature[];
  /** 키 이름(설정 › 서비스 › 환경 변수). 키가 없는 공급자는 비운다 */
  key?: string;
  /** 사용량을 세는 단위 — chars 는 보낸 글자 수, bytes 는 UTF-8 바이트, requests 는 호출 수 */
  unit: "chars" | "bytes" | "requests";
  /** 한 달 무료 한도(unit 기준). 공식 문서에 고정 수치가 없으면 비운다 */
  freeMonthly?: number;
  /** 이 앱이 스스로 멈추는 달마다의 상한 */
  appCap?: number;
  /** 무료 이용 기한(YYYY-MM-DD) */
  freeUntil?: string;
  /** 한도·결제를 확인하는 곳 */
  console?: string;
  /** 달 한도 말고 따로 알릴 한도(로케일 admin.aiHealth.note.<값>) */
  note?: string;
}> = {
  deepl: { label: "DeepL", features: ["translation"], key: "DEEPL_API_KEY", unit: "chars", console: "https://www.deepl.com/your-account/usage" },
  google_translate: { label: "Google Translate", features: ["translation"], key: "GOOGLE_TRANSLATE_API_KEY", unit: "chars", freeMonthly: 500_000, console: "https://console.cloud.google.com/billing" },
  gemini: { label: "Gemini", features: ["translation", "summary"], key: "GEMINI_API_KEY", unit: "requests", console: "https://aistudio.google.com/rate-limit" },
  openai: { label: "OpenAI", features: ["summary"], key: "OPENAI_API_KEY", unit: "requests", console: "https://platform.openai.com/usage" },
  claude: { label: "Claude", features: ["translation", "summary"], key: "ANTHROPIC_API_KEY", unit: "requests", console: "https://console.anthropic.com/settings/billing" },
  nanobanana: { label: "NanoBanana", features: ["cover"], key: "NANOBANANA_API_KEY", unit: "requests", console: "https://nanobananaapi.ai" },
  huggingface: { label: "Hugging Face", features: ["cover"], key: "HUGGINGFACE_API_KEY", unit: "requests", console: "https://huggingface.co/settings/billing" },
  fish: { label: "Fish Audio", features: ["tts"], key: "FISH_AUDIO_API_KEY", unit: "chars", freeUntil: "2026-11-30", console: "https://fish.audio/app/api-keys" },
  google_tts: { label: "Google Cloud TTS", features: ["tts"], key: "GOOGLE_TTS_API_KEY", unit: "bytes", freeMonthly: 1_000_000, appCap: 800_000, console: "https://console.cloud.google.com/billing" },
  edge: { label: "Edge TTS", features: ["tts"], unit: "requests" },
  unsplash: { label: "Unsplash", features: ["stock"], key: "UNSPLASH_ACCESS_KEY", unit: "requests", note: "unsplash", console: "https://unsplash.com/oauth/applications" },
  pexels: { label: "Pexels", features: ["stock"], key: "PEXELS_API_KEY", unit: "requests", freeMonthly: 20_000, note: "pexels", console: "https://www.pexels.com/api/" },
};

/** 키 이름 → 공급자. 키를 바꾸면 그 공급자의 오류 기록과 차단을 푼다 */
export const PROVIDER_BY_KEY: Record<string, AiProvider[]> = Object.entries(AI_PROVIDER_INFO).reduce<Record<string, AiProvider[]>>((acc, [p, info]) => {
  if (info.key) (acc[info.key] ??= []).push(p as AiProvider);
  return acc;
}, {});

/**
 * 실패 원인.
 * - no_key: 키가 없다(요청을 보내지 않았다) — 기록하지 않는다
 * - invalid_key·expired·forbidden·quota·billing: 사람이 고쳐야 풀린다(키 교체·기한 연장·권한·결제)
 * - rate_limit·server·network·bad_request·unknown: 잠깐 뒤 저절로 풀릴 수 있다
 */
export const FAILURE_KINDS = [
  "no_key",
  "invalid_key",
  "expired",
  "forbidden",
  "quota",
  "billing",
  "rate_limit",
  "server",
  "network",
  "bad_request",
  "unknown",
  /** 사람이 설정 화면에서 직접 껐다 — 실패가 아니라 차단 이유로만 쓴다. 다시 켤 때까지 그대로 */
  "manual",
] as const;
export type FailureKind = (typeof FAILURE_KINDS)[number];

/** 사람이 고쳐야 하는 원인 — 이 원인으로 FATAL_LIMIT 번 이어 실패하면 그 공급자를 끈다 */
export const FATAL_KINDS: ReadonlySet<FailureKind> = new Set(["invalid_key", "expired", "forbidden", "quota", "billing", "manual"]);
export const FATAL_LIMIT = 3;
/** 저절로 풀릴 수 있는 원인은 더 많이 기다린다 */
export const TRANSIENT_LIMIT = 5;

/** 한 기능 요청에서 공급자 하나가 실패한 기록 — 응답에 실어 화면이 토스트로 알린다 */
export interface ProviderFailure {
  provider: AiProvider;
  kind: FailureKind;
  /** 이번 실패로 이 공급자가 꺼졌다 */
  disabled?: boolean;
}

export interface ProviderHealth {
  /** 이어진 실패 횟수 — 성공하면 0 */
  fails: number;
  kind?: FailureKind;
  status?: number;
  /** 공급자가 보낸 문장(키 등은 가린다) */
  message?: string;
  at?: string;
  okAt?: string;
  /** 꺼진 때와 원인. 있으면 요청을 보내지 않는다(원인에 따라 시간이 지나면 다시 시도) */
  disabled?: { kind: FailureKind; at: string };
}

export interface ProviderUsage {
  requests: number;
  /** unit 기준 누계(chars·bytes). requests 단위면 requests 와 같다 */
  units: number;
}
