/**
 * 원시 PCM(부호 있는 16비트, 리틀엔디언) → WAV 파일.
 *
 * Gemini TTS 는 머리 없는 PCM(audio/L16; rate=24000)을 돌려준다. 그대로는 <audio> 가 틀지 못해
 * 44바이트 RIFF 머리를 붙인다. MP3 로 줄이려면 인코더(대개 LGPL)를 들여야 해서 WAV 로 둔다 —
 * 24kHz 단일 채널이라 1초에 48KB, 슬라이드 한 장(20초 안팎)에 1MB 남짓이다.
 */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16): Uint8Array {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const ascii = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) out[offset + i] = s.charCodeAt(i); };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt 덩어리 크기
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  ascii(36, "data");
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

/** "audio/L16;codec=pcm;rate=24000" 에서 표본율 — 없으면 24000 */
export function pcmRateFromMime(mime: string | undefined): number {
  const m = /rate=(\d+)/.exec(mime ?? "");
  return m ? Number(m[1]) : 24000;
}

/**
 * WAV 파일 → 원시 PCM 과 표본율. 머리 뒤의 덩어리를 차례로 훑어 "fmt "·"data" 를 찾는다
 * (머리가 늘 44바이트라고 가정하지 않는다 — 녹음 프로그램은 덩어리를 더 붙이기도 한다).
 */
export function wavToPcm(wav: Uint8Array): { pcm: Uint8Array; sampleRate: number; channels: number; bitsPerSample: number } | null {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const tag = (offset: number) => String.fromCharCode(...wav.subarray(offset, offset + 4));
  if (wav.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
  let offset = 12;
  let fmt: { sampleRate: number; channels: number; bitsPerSample: number } | null = null;
  while (offset + 8 <= wav.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      fmt = { channels: view.getUint16(body + 2, true), sampleRate: view.getUint32(body + 4, true), bitsPerSample: view.getUint16(body + 14, true) };
    } else if (id === "data" && fmt) {
      return { pcm: wav.subarray(body, Math.min(body + size, wav.length)), ...fmt };
    }
    offset = body + size + (size % 2);
  }
  return null;
}
