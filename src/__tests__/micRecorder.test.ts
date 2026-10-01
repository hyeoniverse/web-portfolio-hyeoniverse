import { describe, expect, it } from "vitest";
import { encodeWav } from "@/lib/micRecorder";
import { wavToPcm } from "@/lib/wav";

describe("micRecorder encodeWav", () => {
  it("48kHz 표본을 이어 24kHz 16비트 WAV 로 줄인다(구간 평균)", () => {
    const a = new Float32Array([0.5, 0.5, -0.5, -0.5]);
    const b = new Float32Array([1, 1, 0, 0]);
    const wav = encodeWav([a, b], 8, 48000);
    const { pcm, sampleRate } = wavToPcm(wav)!;
    expect(sampleRate).toBe(24000);
    const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    const samples = Array.from({ length: pcm.byteLength / 2 }, (_, i) => view.getInt16(i * 2, true));
    expect(samples).toEqual([Math.trunc(0.5 * 0x7fff), Math.trunc(-0.5 * 0x8000), 0x7fff, 0]);
  });

  it("더 낮은 표본율이면 줄이지 않고 그대로 두며, 넘치는 값은 자른다", () => {
    const wav = encodeWav([new Float32Array([2, -2])], 2, 16000);
    const { pcm, sampleRate } = wavToPcm(wav)!;
    expect(sampleRate).toBe(16000);
    const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    expect([view.getInt16(0, true), view.getInt16(2, true)]).toEqual([0x7fff, -0x8000]);
  });
});
