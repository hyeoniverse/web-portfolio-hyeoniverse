/**
 * 슬라이드 음성으로 고를 수 있는 목소리. 첫째가 기본.
 *
 * - Fish Audio: fish.audio 에 공개된 목소리 가운데 발표에 어울리는 톤을 언어(한국어·영어)마다 골라 둔 목록(FISH_VOICES).
 *   값은 "fish:<목소리 ID>" 이고 목소리 페이지는 fish.audio/m/<ID>. 실제 인물을 흉내 낸 목소리는 넣지 않는다.
 *   공개 목소리는 올린 사람이 지우면 사라진다 — 그러면 Fish 요청이 실패해 다른 제공자의 같은 성별로 넘어가므로,
 *   알림을 보고 이 목록에서 빼면 된다.
 * - Google·Edge: "제공자:성별". 대본이 한국어일 수도 영어일 수도 있어 성별마다 언어별 목소리를 짝으로 둔다.
 *
 * 대본 언어는 편집 화면의 KO/EN 을 따른다. 목록도 그 언어의 목소리만 보이고(voicesFor), 한국어 Fish 목소리를
 * 고른 채 영어 대본을 만들게 되면 같은 성별의 영어 Fish 목소리로 만든다(parseVoice 의 lang).
 *
 * 고른 목소리로 만들고, 그 제공자가 실패할 때만 다른 제공자의 같은 성별로 넘어간다(lib/tts).
 * 넘어갔으면 편집 화면이 알리고, 장마다 실제로 쓴 목소리를 gallery_notes 의 audioVoice 로 남긴다.
 */
export const TTS_PROVIDERS = ["fish", "google", "edge"] as const;
export type TtsProvider = (typeof TTS_PROVIDERS)[number];
export type TtsGender = "female" | "male";

/** 목소리 느낌 — 목록에서 고를 때 보이는 말(locale: narrationStyle.<style>) */
type Style = "bright" | "clear" | "smooth" | "lively" | "friendly";

/** 대본 언어 — 편집 화면의 KO/EN */
export type VoiceLang = "ko" | "en";

/* 각 언어의 성별마다 첫 목소리가 다른 제공자에서 Fish 로 넘어갈 때 쓰는 기본이다 */
const FISH_VOICES: { id: string; lang: VoiceLang; gender: TtsGender; style: Style; name: string }[] = [
  { id: "4a81bbbb5cd44f22922bf934cb93b369", lang: "ko", gender: "female", style: "bright", name: "일반여성2" },
  { id: "d74f023d1525420797aed41b5d421c05", lang: "ko", gender: "female", style: "clear", name: "긍정 아나운서" },
  { id: "0ccd4dc7f23d4935956e225e158484c9", lang: "ko", gender: "female", style: "smooth", name: "20대 여성" },
  { id: "4e118bfbb83e401c84699c09b5f08257", lang: "ko", gender: "female", style: "lively", name: "나긋나긋" },
  { id: "8cf5ee4cb0224c109852a206f185a05f", lang: "ko", gender: "male", style: "bright", name: "보이스1" },
  { id: "ed763b05d90b470284150bbc49a8d9e1", lang: "ko", gender: "male", style: "friendly", name: "애덤" },
  { id: "5a53fa5e9d3147c692abbc9327e588ba", lang: "ko", gender: "male", style: "smooth", name: "유툽" },
  { id: "67ede89a20a0433fb4c8d3de046e03ae", lang: "ko", gender: "male", style: "lively", name: "남학생" },
  { id: "81b6895ca7484e308ca5f30f7b0a4255", lang: "en", gender: "female", style: "clear", name: "Aviavox English V2" },
  { id: "206be037d8a04971a9d1c839dc3bf43d", lang: "en", gender: "female", style: "friendly", name: "Clear Conversational Female" },
  { id: "c9668514a19a4a049ae499167d17ff89", lang: "en", gender: "female", style: "smooth", name: "FEMALE NEW" },
  { id: "42e70f5bc7b34a9e84abbbd6ec5572d0", lang: "en", gender: "female", style: "bright", name: "Female voice - Sassy" },
  { id: "efc2f5153a24463dbfe54acd93a145f8", lang: "en", gender: "male", style: "friendly", name: "Male Narrator" },
  { id: "bbb58d698b5f46719fd04688dfac7359", lang: "en", gender: "male", style: "smooth", name: "Nathan (US)" },
  { id: "b86c46f504b54aec91cb489b05f3cb45", lang: "en", gender: "male", style: "lively", name: "Arthur" },
  { id: "1ca5d32c6b9f432db87be6fdbca86bfd", lang: "en", gender: "male", style: "clear", name: "Deep British Narrator" },
];

const OTHER_VOICES = ["google:female", "google:male", "edge:female", "edge:male"] as const;

export const TTS_VOICES: readonly string[] = [...FISH_VOICES.map((v) => `fish:${v.id}`), ...OTHER_VOICES];
export type TtsVoice = string;

/** 그 언어로 고를 수 있는 목소리 — 그 언어의 Fish 목소리와 Google·Edge(언어에 맞는 목소리를 스스로 고른다) */
export const voicesFor = (lang: VoiceLang): readonly TtsVoice[] =>
  [...FISH_VOICES.filter((v) => v.lang === lang).map((v) => `fish:${v.id}`), ...OTHER_VOICES];

export const isTtsVoice = (v: unknown): v is TtsVoice => typeof v === "string" && TTS_VOICES.includes(v);

export interface ParsedVoice {
  provider: TtsProvider;
  gender: TtsGender;
  /** Fish Audio 목소리 ID — Fish 가 아닌 목소리를 골랐다가 Fish 로 넘어가거나, 다른 언어의 Fish 목소리면 그 언어·성별의 첫 목소리 */
  fishId: string;
}

const firstFish = (gender: TtsGender, lang: VoiceLang) => FISH_VOICES.find((v) => v.gender === gender && v.lang === lang)!.id;

/** 목소리 값을 푼다. lang 을 주면 Fish 목소리를 그 언어의 것으로 맞춘다 — 없으면 고른 목소리 그대로(한국어 기본) */
export function parseVoice(voice: TtsVoice, lang?: VoiceLang): ParsedVoice {
  const [provider, rest] = voice.split(":") as [TtsProvider, string];
  if (provider === "fish") {
    const fish = FISH_VOICES.find((v) => v.id === rest) ?? FISH_VOICES[0];
    return { provider, gender: fish.gender, fishId: !lang || fish.lang === lang ? fish.id : firstFish(fish.gender, lang) };
  }
  const gender = rest as TtsGender;
  return { provider, gender, fishId: firstFish(gender, lang ?? "ko") };
}

/** 제공자와 성별로 목소리 값을 만든다 — 다른 제공자로 넘어갔을 때 실제로 쓴 목소리를 적는다 */
export function voiceOf(provider: TtsProvider, parsed: ParsedVoice): TtsVoice {
  return provider === "fish" ? `fish:${parsed.fishId}` : `${provider}:${parsed.gender}`;
}

type Lang = "ko-KR" | "en-US";

const GOOGLE_VOICES: Record<TtsGender, Record<Lang, string>> = {
  female: { "ko-KR": "ko-KR-Neural2-A", "en-US": "en-US-Neural2-F" },
  male: { "ko-KR": "ko-KR-Neural2-C", "en-US": "en-US-Neural2-D" },
};

const EDGE_VOICES: Record<TtsGender, Record<Lang, string>> = {
  female: { "ko-KR": "ko-KR-SunHiNeural", "en-US": "en-US-AvaNeural" },
  male: { "ko-KR": "ko-KR-InJoonNeural", "en-US": "en-US-AndrewNeural" },
};

export const googleVoiceName = (gender: TtsGender, lang: Lang) => GOOGLE_VOICES[gender][lang];
export const edgeVoiceName = (gender: TtsGender, lang: Lang) => EDGE_VOICES[gender][lang];

const PROVIDER_LABEL: Record<TtsProvider, string> = { fish: "Fish Audio", google: "Google", edge: "Edge" };
const DETAIL: Record<string, string> = {
  "google:female": "Neural2-A · F",
  "google:male": "Neural2-C · D",
  "edge:female": "SunHi · Ava",
  "edge:male": "InJoon · Andrew",
};

/** 화면에 보일 목소리 이름 — "Fish Audio · 여성 · 밝음 (일반여성2)", "Google · 여성 (Neural2-A · F)" */
export function voiceLabel(voice: TtsVoice, tw: (key: string) => string): string {
  const { provider, gender, fishId } = parseVoice(voice);
  const genderText = tw(gender === "female" ? "narrationVoiceFemale" : "narrationVoiceMale");
  if (provider === "fish") {
    const fish = FISH_VOICES.find((v) => v.id === fishId)!;
    return `${PROVIDER_LABEL.fish} · ${genderText} · ${tw(`narrationStyle.${fish.style}`)} (${fish.name})`;
  }
  return `${PROVIDER_LABEL[provider]} · ${genderText} (${DETAIL[voice]})`;
}
