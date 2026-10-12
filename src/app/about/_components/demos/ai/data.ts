/* 실제 AI 를 부르는 네 데모(번역 · 요약 · 커버 · 음성)의 문구와 예시 글 — MacFolio 의 hyeoniverse 사례 데모에서 가져왔다.
   예시 글은 이 사이트 HYEONIVERSE 작업물(content/works/hyeoniverse.md)의 실제 부제 · 설명이다. 고쳐서 보낼 수 있다. */
import type { L10n } from "../../../_data/showcase";

export type DemoKind = "translate" | "summary" | "cover" | "speech";

/** 한 번에 보낼 수 있는 글자 수 — 서버(/api/demo)도 같은 값으로 막는다 */
export const MAX_CHARS: Record<DemoKind, number> = {
  translate: 1000,
  summary: 4000,
  cover: 300,
  speech: 200,
};

/** 남은 횟수를 받기 전(또는 서버가 아직 없을 때) 보여 줄 하루 상한 */
export const DEFAULT_PER_IP: Record<DemoKind, number> = {
  translate: 3,
  summary: 3,
  cover: 1,
  speech: 3,
};

/* ── 예시 글 — HYEONIVERSE 작업물 ── */

const SUBTITLE: L10n = {
  ko: "디자인 시스템부터 관리자 CMS 까지 혼자 설계하고 운영하는 포트폴리오 사이트",
  en: "A portfolio site designed, built and operated solo, from the design system to the admin CMS",
};

const DESCRIPTION: L10n = {
  ko: "흩어져 있던 프로젝트와 글을 한 곳에서 보여 주고 계속 갱신하기 위해 만든 개인 포트폴리오입니다. 공개 페이지, 디자인 시스템, 글 편집기와 관리자 CMS 까지 한 사람이 설계하고 운영합니다.",
  en: "A personal portfolio that gathers scattered projects and writing in one place and keeps them current. Public pages, the design system, the editor and the admin CMS are all designed and operated by one person.",
};

/** 번역할 글 — 부제와 설명. 원문 언어별로 */
export const TRANSLATE_SAMPLE: L10n = {
  ko: `${SUBTITLE.ko}\n\n${DESCRIPTION.ko}`,
  en: `${SUBTITLE.en}\n\n${DESCRIPTION.en}`,
};

/** 요약할 글 — 작업물 설명에 사례 페이지 첫 문단을 붙였다 */
export const SUMMARY_SAMPLE: L10n = {
  ko: `${DESCRIPTION.ko} 작업물과 글을 보여 주는 공개 화면부터, 그 글을 직접 쓰고 고치는 관리자 화면까지 한 저장소에 담았습니다. 글과 작업물은 한국어와 영어 칸을 따로 두고, 한쪽만 써도 나머지는 번역이 채웁니다. 발행할 때는 AI 가 한국어 · 영어 요약을 만들어 글 위에 붙이고, 커버가 없으면 제목으로 커버를 그립니다.`,
  en: `${DESCRIPTION.en} Everything lives in one repository, from the public pages that show the work and writing to the admin screens where it is written and edited. Each post and work keeps separate Korean and English fields, and when only one side is written, translation fills in the other. On publish, AI writes Korean and English summaries above the post and draws a cover from the title when there is none.`,
};

/** 커버 프롬프트 — 부제 */
export const COVER_SAMPLE: L10n = SUBTITLE;

/** 음성 대본 — 설명의 첫 문장 */
export const SPEECH_SAMPLE: L10n = {
  ko: "흩어져 있던 프로젝트와 글을 한 곳에서 보여 주고 계속 갱신하기 위해 만든 개인 포트폴리오입니다.",
  en: "A personal portfolio that gathers scattered projects and writing in one place and keeps them current.",
};

/** 커버 스타일 — 관리자 커버 선택창의 열 가지(src/data/aiCoverStyles.ts) 가운데 넷 */
export const COVER_STYLES = ["abstract", "minimal", "watercolor", "3d-render"] as const;
export type CoverStyle = (typeof COVER_STYLES)[number];
export const COVER_STYLE_LABEL: Record<CoverStyle, string> = {
  abstract: "Abstract",
  minimal: "Minimal",
  watercolor: "Watercolor",
  "3d-render": "3D",
};

/** 공급자 이름 — 서버가 소문자 키로 알려 준다. 모르는 키는 그대로 보인다 */
const PROVIDER_NAME: Record<string, string> = {
  /* 서버의 공급자 키(lib/ai/providers · translationProviders · tts)와 같게 둔다 */
  deepl: "DeepL",
  google: "Google",
  google_translate: "Google Translate",
  google_tts: "Google TTS",
  gemini: "Gemini",
  groq: "Groq",
  openai: "OpenAI",
  claude: "Claude",
  nanobanana: "NanoBanana",
  huggingface: "Hugging Face",
  fish: "Fish Audio",
  edge: "Edge",
  unsplash: "Unsplash",
  pexels: "Pexels",
};

export const providerName = (key: string | undefined) => (key ? (PROVIDER_NAME[key.toLowerCase()] ?? key) : "");

/* ── 공통 문구 ── */

export const common = {
  /** 남은 횟수 칩 */
  remaining: (n: number): L10n => ({ ko: `오늘 ${n}번 남음`, en: `${n} left today` }),
  perDay: (n: number): L10n => ({ ko: `하루 ${n}번`, en: `${n} a day` }),
  /** 칸 아래 글자 수가 넘쳤을 때 */
  tooLong: (max: number): L10n => ({
    ko: `${max}자까지 보낼 수 있습니다. 글을 조금 줄여 주세요.`,
    en: `Up to ${max} characters can be sent. Please shorten the text.`,
  }),
  empty: { ko: "보낼 글이 비어 있습니다.", en: "There is no text to send." } satisfies L10n,
  usedUp: {
    ko: "오늘 쓸 수 있는 횟수를 다 썼습니다. 내일 다시 해 보세요.",
    en: "You have used all of today's tries. Please come back tomorrow.",
  } satisfies L10n,
  /** 서버에 닿지 못했을 때 */
  network: {
    ko: "서버에 닿지 못했습니다. 잠시 뒤 다시 해 보세요.",
    en: "Could not reach the server. Please try again in a moment.",
  } satisfies L10n,
  /** 서버가 이유를 주지 않고 실패했을 때 */
  failed: {
    ko: "요청을 처리하지 못했습니다. 잠시 뒤 다시 해 보세요.",
    en: "The request could not be completed. Please try again in a moment.",
  } satisfies L10n,
  /** 남은 횟수 칩 자리 — 지금 쓸 수 없을 때 */
  offNow: { ko: "지금 사용 불가", en: "Unavailable now" } satisfies L10n,
  /** 서버 상태별 — 서버 문장은 한국어뿐이라 화면 언어에 맞춰 여기서 고른다 */
  unavailable: {
    ko: "지금은 이 기능을 쓸 수 없습니다.",
    en: "This feature isn't available right now.",
  } satisfies L10n,
  /** 공급자가 모두 실패했을 때 — 뒤에 공급자별 원인이 붙는다 */
  providersFailed: {
    ko: "AI 공급자가 모두 실패했습니다.",
    en: "Every AI provider failed.",
  } satisfies L10n,
  /** 공급자 실패 원인(lib/ai/providers FailureKind) — 짧게 */
  failureKind: {
    no_key: { ko: "키가 없음", en: "no API key" },
    invalid_key: { ko: "키가 잘못됨", en: "invalid API key" },
    expired: { ko: "키가 만료됨", en: "expired API key" },
    forbidden: { ko: "권한 없음", en: "access denied" },
    quota: { ko: "사용 한도 초과", en: "quota exceeded" },
    billing: { ko: "결제 · 크레딧 부족", en: "billing or credits needed" },
    rate_limit: { ko: "요청이 너무 많음", en: "rate limited" },
    server: { ko: "공급자 서버 오류", en: "provider server error" },
    network: { ko: "연결 실패", en: "network error" },
    bad_request: { ko: "요청을 받지 않음", en: "request rejected" },
    unknown: { ko: "알 수 없는 오류", en: "unknown error" },
  } satisfies Record<string, L10n>,
  /** 결과를 만든 공급자 */
  madeBy: (name: string): L10n => ({ ko: `${name}로 만들었습니다.`, en: `Made with ${name}.` }),
  live: (perIp: number, max: number): L10n => ({
    ko: `실제 AI 를 부릅니다. ${max}자까지, 하루 ${perIp}번 쓸 수 있습니다.`,
    en: `This calls a real AI. Up to ${max} characters, ${perIp} times a day.`,
  }),
};

/* ── 데모별 문구 ── */

export const translateCopy = {
  label: { ko: "원문", en: "Source" } satisfies L10n,
  result: { ko: "번역", en: "Translation" } satisfies L10n,
  direction: { ko: "번역 방향", en: "Direction" } satisfies L10n,
  from: { ko: "원문 언어", en: "From" } satisfies L10n,
  to: { ko: "번역할 언어", en: "To" } satisfies L10n,
  auto: { ko: "자동 감지", en: "Detect language" } satisfies L10n,
  same: { ko: "원문과 다른 언어를 골라 주세요.", en: "Pick a language different from the source." } satisfies L10n,
  /** 고를 수 있는 언어 — 서버(lib/api/translationProviders 의 TRANSLATE_LANGS)와 같은 목록 */
  langs: {
    ko: { ko: "한국어", en: "Korean" },
    en: { ko: "영어", en: "English" },
    ja: { ko: "일본어", en: "Japanese" },
    zh: { ko: "중국어(간체)", en: "Chinese (Simplified)" },
    es: { ko: "스페인어", en: "Spanish" },
    fr: { ko: "프랑스어", en: "French" },
    de: { ko: "독일어", en: "German" },
  } satisfies Record<string, L10n>,
  run: { ko: "번역하기", en: "Translate" } satisfies L10n,
  idle: {
    ko: "원문을 고치고 번역하기를 눌러 보세요.",
    en: "Edit the source and press Translate.",
  } satisfies L10n,
  busy: { ko: "번역하는 중입니다.", en: "Translating." } satisfies L10n,
  placeholder: { ko: "번역하면 여기에 결과가 나옵니다.", en: "The translation appears here." } satisfies L10n,
  stale: {
    ko: "원문이 바뀌었습니다. 다시 번역해 보세요.",
    en: "The source has changed. Translate again to update.",
  } satisfies L10n,
};

export const summaryCopy = {
  label: { ko: "본문", en: "Body" } satisfies L10n,
  result: { ko: "AI 요약", en: "AI summary" } satisfies L10n,
  run: { ko: "요약하기", en: "Summarize" } satisfies L10n,
  idle: {
    ko: "본문을 고치거나 붙여 넣고 요약하기를 눌러 보세요.",
    en: "Edit or paste a body and press Summarize.",
  } satisfies L10n,
  busy: { ko: "요약을 만드는 중입니다.", en: "Writing the summary." } satisfies L10n,
  placeholder: {
    ko: "요약하면 글 위에 붙는 요약 상자가 여기에 나옵니다.",
    en: "The summary box that sits above a post appears here.",
  } satisfies L10n,
  unreadable: {
    ko: "요약을 받았지만 읽을 수 없는 모양입니다.",
    en: "A summary arrived but could not be read.",
  } satisfies L10n,
};

export const coverCopy = {
  label: { ko: "프롬프트", en: "Prompt" } satisfies L10n,
  style: { ko: "스타일", en: "Style" } satisfies L10n,
  run: { ko: "커버 그리기", en: "Draw cover" } satisfies L10n,
  idle: {
    ko: "프롬프트를 고치고 스타일을 골라 그려 보세요.",
    en: "Edit the prompt, pick a style and draw.",
  } satisfies L10n,
  busy: {
    ko: "그리는 중입니다. 수십 초 걸릴 수 있습니다.",
    en: "Drawing. This can take a few dozen seconds.",
  } satisfies L10n,
  alt: (prompt: string): L10n => ({ ko: `"${prompt}" 로 그린 커버`, en: `Cover drawn from "${prompt}"` }),
  live: (perIp: number): L10n => ({
    ko: `실제로 그립니다. 그림은 무료 한도가 작아 하루 ${perIp}번만 그릴 수 있습니다.`,
    en: `This really draws. The free image quota is small, so it allows ${perIp} a day.`,
  }),
};

export const speechCopy = {
  label: { ko: "대본", en: "Script" } satisfies L10n,
  voice: { ko: "목소리", en: "Voice" } satisfies L10n,
  female: { ko: "여성", en: "Female" } satisfies L10n,
  male: { ko: "남성", en: "Male" } satisfies L10n,
  run: { ko: "음성 만들기", en: "Make voice" } satisfies L10n,
  idle: {
    ko: "대본을 고치고 음성을 만들어 보세요.",
    en: "Edit the script and make a voice.",
  } satisfies L10n,
  busy: { ko: "음성을 만드는 중입니다.", en: "Making the voice." } satisfies L10n,
  lyric: {
    ko: "만든 음성을 틀면 여기서 대본이 읽는 만큼 채워집니다.",
    en: "Play the voice and the script fills in as it is read.",
  } satisfies L10n,
  play: { ko: "재생", en: "Play" } satisfies L10n,
  pause: { ko: "일시정지", en: "Pause" } satisfies L10n,
  seek: { ko: "재생 위치", en: "Playback position" } satisfies L10n,
  blocked: {
    ko: "브라우저가 자동 재생을 막았습니다. 재생 단추를 눌러 들어 보세요.",
    en: "The browser blocked autoplay. Press play to listen.",
  } satisfies L10n,
};
