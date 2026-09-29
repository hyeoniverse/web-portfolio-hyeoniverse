/**
 * 슬라이드 음성으로 고를 수 있는 목소리. 첫째가 기본.
 *
 * - Fish Audio: fish.audio 에 공개된 한국어 목소리 가운데 발표에 어울리는 밝은 톤을 골라 둔 목록(FISH_VOICES).
 *   값은 "fish:<목소리 ID>" 이고 목소리 페이지는 fish.audio/m/<ID>. 실제 인물을 흉내 낸 목소리는 넣지 않는다.
 *   공개 목소리는 올린 사람이 지우면 사라진다 — 그러면 Fish 요청이 실패해 다른 제공자의 같은 성별로 넘어가므로,
 *   알림을 보고 이 목록에서 빼면 된다.
 * - Google·Edge: "제공자:성별". 대본이 한국어일 수도 영어일 수도 있어 성별마다 언어별 목소리를 짝으로 둔다.
 *
 * 고른 목소리로 만들고, 그 제공자가 실패할 때만 다른 제공자의 같은 성별로 넘어간다(lib/tts).
 * 넘어갔으면 편집 화면이 알리고, 장마다 실제로 쓴 목소리를 gallery_notes 의 audioVoice 로 남긴다.
 */
export const TTS_PROVIDERS = ["fish", "google", "edge"] as const;
export type TtsProvider = (typeof TTS_PROVIDERS)[number];
export type TtsGender = "female" | "male";

/** 목소리 느낌 — 목록에서 고를 때 보이는 말(locale: narrationStyle.<style>) */
type Style = "bright" | "clear" | "smooth" | "lively" | "friendly";

const FISH_VOICES: { id: string; gender: TtsGender; style: Style; name: string }[] = [
  { id: "4a81bbbb5cd44f22922bf934cb93b369", gender: "female", style: "bright", name: "일반여성2" },
  { id: "d74f023d1525420797aed41b5d421c05", gender: "female", style: "clear", name: "긍정 아나운서" },
  { id: "0ccd4dc7f23d4935956e225e158484c9", gender: "female", style: "smooth", name: "20대 여성" },
  { id: "4e118bfbb83e401c84699c09b5f08257", gender: "female", style: "lively", name: "나긋나긋" },
  { id: "8cf5ee4cb0224c109852a206f185a05f", gender: "male", style: "bright", name: "보이스1" },
  { id: "ed763b05d90b470284150bbc49a8d9e1", gender: "male", style: "friendly", name: "애덤" },
  { id: "5a53fa5e9d3147c692abbc9327e588ba", gender: "male", style: "smooth", name: "유툽" },
  { id: "67ede89a20a0433fb4c8d3de046e03ae", gender: "male", style: "lively", name: "남학생" },
];

export const TTS_VOICES: readonly string[] = [
  ...FISH_VOICES.map((v) => `fish:${v.id}`),
  "google:female",
  "google:male",
  "edge:female",
  "edge:male",
];
export type TtsVoice = string;

export const isTtsVoice = (v: unknown): v is TtsVoice => typeof v === "string" && TTS_VOICES.includes(v);

export interface ParsedVoice {
  provider: TtsProvider;
  gender: TtsGender;
  /** Fish Audio 목소리 ID — Fish 가 아닌 목소리를 골랐다가 Fish 로 넘어가면 그 성별의 첫 목소리 */
  fishId: string;
}

const firstFish = (gender: TtsGender) => FISH_VOICES.find((v) => v.gender === gender)!.id;

export function parseVoice(voice: TtsVoice): ParsedVoice {
  const [provider, rest] = voice.split(":") as [TtsProvider, string];
  if (provider === "fish") {
    const fish = FISH_VOICES.find((v) => v.id === rest) ?? FISH_VOICES[0];
    return { provider, gender: fish.gender, fishId: fish.id };
  }
  const gender = rest as TtsGender;
  return { provider, gender, fishId: firstFish(gender) };
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
