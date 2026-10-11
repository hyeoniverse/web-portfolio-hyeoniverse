import { getSiteConfig } from "@/lib/getSiteConfig";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthesize, TtsError } from "@/lib/tts";
import { speechLangOf } from "@/lib/speech";
import { LEXICON_ROW, lexiconOf, spokenScript, type LexiconConfig } from "@/lib/ttsLexicon";
import { TTS_PROVIDERS, parseVoice, voiceOf, type TtsGender, type TtsProvider } from "@/lib/ttsVoices";
import { demoChoice, demoText } from "@/lib/demo/input";
import { anyProviderUsable, providerLabel, type DemoOutcome } from "@/lib/demo/handler";

/**
 * 음성 데모 — 슬라이드 음성(/api/works/tts)과 같은 제공자 순서(설정 › 서비스 › 슬라이드 음성)와 읽기 사전으로 만든다.
 * 목소리는 설정의 기본 제공자에서 고른 성별의 첫 목소리. 파일로 올리지 않고 MP3 를 data URL 로 바로 돌려준다.
 * 공급자 상태 · 사용량 기록(ai_usage)은 synthesize 가 실제 경로와 똑같이 남긴다.
 */
export const SPEECH_MAX = 200;

export interface SpeechInput {
  text: string;
  gender: TtsGender;
}

export function parseSpeech(body: Record<string, unknown>): SpeechInput {
  return {
    text: demoText(body.text, { max: SPEECH_MAX, empty: "읽을 글을 써 주세요.", refused: "이 글은 읽어 드릴 수 없습니다." }),
    gender: demoChoice(body.voice, ["female", "male"] as const, "female", "목소리는 female 또는 male 만 고를 수 있습니다."),
  };
}

export async function speechUnavailable(): Promise<string | null> {
  const tts = (await getSiteConfig())?.tts;
  return tts?.enabled === false ? "지금은 음성 기능을 쓸 수 없습니다." : null;
}

const AI_ID = { fish: "fish", google: "google_tts", edge: "edge" } as const;

/** 기본 제공자와 fallback — works/tts 와 같다(꺼 두면 고른 제공자만) */
async function speechOrder(): Promise<{ primary: TtsProvider; fallback: TtsProvider[] }> {
  const tts = (await getSiteConfig())?.tts;
  const primary: TtsProvider = (TTS_PROVIDERS as readonly string[]).includes(tts?.provider as string) ? (tts!.provider as TtsProvider) : TTS_PROVIDERS[0];
  const fallback: TtsProvider[] = tts?.fallback?.enabled === false ? []
    : tts?.fallback?.priority?.length
      ? (tts.fallback.priority as TtsProvider[]).filter((p) => !(tts.fallback?.excluded ?? []).includes(p))
      : [...TTS_PROVIDERS];
  return { primary, fallback };
}

/** 지금 쓸 수 있나 — 꺼 두지 않았고, 부를 제공자가 있다 */
export async function speechUsable(): Promise<boolean> {
  if (await speechUnavailable()) return false;
  const { primary, fallback } = await speechOrder();
  return anyProviderUsable([primary, ...fallback].map((p) => AI_ID[p]));
}

export async function runSpeech({ text, gender }: SpeechInput): Promise<DemoOutcome<{ audio: string; provider: string }>> {
  const { primary, fallback } = await speechOrder();

  const lang = speechLangOf(text);
  const noteLang = lang === "en-US" ? "en" : "ko";
  /* 기본 제공자의 그 성별 · 그 언어 첫 목소리 — Fish 면 목록의 첫 화자, Google · Edge 면 "제공자:성별" */
  const voice = voiceOf(primary, parseVoice(`edge:${gender}`, noteLang));

  const { data: lexRow } = await createAdminClient().from("site_settings").select("config").eq("id", LEXICON_ROW).maybeSingle();
  const spoken = spokenScript(text, lexiconOf(lexRow?.config as LexiconConfig | null, noteLang));

  try {
    const result = await synthesize(spoken, voice, { fallback, lang });
    return { ok: true, data: { audio: `data:audio/mpeg;base64,${result.audio.toString("base64")}`, provider: providerLabel(AI_ID[result.provider]) } };
  } catch (e) {
    if (e instanceof TtsError) {
      console.error("[demo/speech] 모든 제공자 실패:", e.message);
      return { ok: false, status: 502, message: "음성을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
    }
    throw e;
  }
}
