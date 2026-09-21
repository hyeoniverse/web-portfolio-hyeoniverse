import { splitForSpeech } from "@/lib/speech";

/**
 * 긴 대본을 TTS 한 번에 보낼 조각으로 나눈다 — 편집 화면이 조각마다 음성을 만들고 서버(/api/works/tts/merge)가 이어 붙인다.
 *
 * 한 번에 길게 보내면 느리고 잘 실패한다. 1,573자를 한 번에 보냈더니 176초 걸려 빈 응답이 왔다(2026-09-22,
 * gemini-2.5-flash-preview-tts). 조각은 문장 경계에서만 자른다 — 문장 가운데서 끊으면 억양이 어색하다.
 */
const TTS_CHUNK_CHARS = 600;

export function chunkScript(text: string, max = TTS_CHUNK_CHARS): string[] {
  const out: string[] = [];
  let cur = "";
  for (const piece of splitForSpeech(text, max)) {
    if (cur && cur.length + 1 + piece.length > max) {
      out.push(cur);
      cur = piece;
    } else {
      cur = cur ? `${cur} ${piece}` : piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}
