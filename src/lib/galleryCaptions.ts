import type { GalleryNote } from "@/data/projects";
import { captionCues } from "@/lib/captionCues";
import { splitForSpeech } from "@/lib/speech";
import { displayScript } from "@/lib/ttsLexicon";

/**
 * 갤러리 한 장의 자막 줄 — 화면(useGalleryNarration)이 자막을 띄우는 단위 그대로.
 *
 *   음성 파일이 있는 장: 만들 때 쓴 대본(TTS) 또는 지금 대본을 captionCues 로 나눈 줄 — 재생 자리(글자 수 비율)에 맞춰 띄운다
 *   대본만 있는 장    : 브라우저 음성이 읽는 문장(splitForSpeech) — 문장을 읽기 시작할 때 띄운다
 *
 * "다른 언어로 읽기"는 이 줄을 하나씩 번역해 같은 순번에 끼운다. 음성은 원문 그대로라 자막의 시각(줄의 시작 자리)은
 * 원문 줄로 정하고, 보이는 글자만 번역으로 바꾼다 — 그래서 서버와 화면이 같은 함수로 줄을 나눠야 순번이 맞는다.
 */
export function captionLines(note: Omit<GalleryNote, "en"> | undefined): string[] {
  if (!note) return [];
  const script = note.script?.trim() ?? "";
  if (note.audio) {
    const shown = displayScript((note.audioSource === "tts" && note.audioScript?.trim()) || script);
    return captionCues(shown).map((c) => c.text);
  }
  return script ? splitForSpeech(displayScript(script)) : [];
}
