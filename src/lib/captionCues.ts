import { splitForSpeech } from "@/lib/speech";

/**
 * 음성 파일에 맞춰 띄울 자막 — 대본을 문장으로 나누고, 문장마다 음성 안에서 시작하는 자리(0~1)를 글자 수 비율로 잡는다.
 *
 * TTS 는 읽는 빠르기가 고르므로 문장 단위로는 글자 수 비율이 실제 시각과 잘 맞는다. 직접 녹음한 음성은 말 빠르기가
 * 들쭉날쭉해 조금 어긋날 수 있다. 문장 사이 쉼을 셈에 넣으려고 문장마다 몇 글자를 더 쳐 준다.
 * 한 자막이 두 줄을 넘지 않게 긴 문장은 쉼표·빈칸에서 한 번 더 끊는다.
 */
const CAPTION_MAX = 80;
const PAUSE_CHARS = 4;

export interface CaptionCue {
  text: string;
  /** 음성 전체 길이에서 이 자막이 시작하는 자리(0~1) */
  start: number;
}

export function captionCues(script: string): CaptionCue[] {
  const lines = splitForSpeech(script, CAPTION_MAX);
  const weights = lines.map((l) => l.length + PAUSE_CHARS);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return lines.map((text, i) => {
    const start = total ? acc / total : 0;
    acc += weights[i];
    return { text, start };
  });
}

/** 재생 자리(0~1)에 맞는 자막 — 없으면 "" */
export function cueAt(cues: CaptionCue[], progress: number): string {
  let text = "";
  for (const cue of cues) {
    if (cue.start > progress) break;
    text = cue.text;
  }
  return text;
}
