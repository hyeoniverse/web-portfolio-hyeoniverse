import { describe, expect, it } from "vitest";
import { downsample, durationOf, encodeWav, peaksOf, silenceBounds, sliceAudio } from "@/lib/micRecorder";
import { wavToPcm } from "@/lib/wav";

const int16 = (wav: Uint8Array) => {
  const { pcm, sampleRate } = wavToPcm(wav)!;
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  return { sampleRate, samples: Array.from({ length: pcm.byteLength / 2 }, (_, i) => view.getInt16(i * 2, true)) };
};

describe("micRecorder", () => {
  it("48kHz 표본을 이어 24kHz 로 줄인다(구간 평균)", () => {
    const a = downsample([new Float32Array([0.5, 0.5, -0.5, -0.5]), new Float32Array([1, 1, 0, 0])], 8, 48000);
    expect(a.rate).toBe(24000);
    expect(Array.from(a.samples)).toEqual([0.5, -0.5, 1, 0]);
  });

  it("더 낮은 표본율이면 줄이지 않는다", () => {
    const a = downsample([new Float32Array([0.1, 0.2])], 2, 16000);
    expect(a.rate).toBe(16000);
    expect(a.samples).toHaveLength(2);
  });

  it("16비트 WAV 로 만들고 넘치는 값은 자른다", () => {
    const { sampleRate, samples } = int16(encodeWav({ samples: new Float32Array([0.5, 2, -2]), rate: 24000 }));
    expect(sampleRate).toBe(24000);
    expect(samples).toEqual([Math.trunc(0.5 * 0x7fff), 0x7fff, -0x8000]);
  });

  it("구간을 잘라 낸다", () => {
    const a = { samples: Float32Array.from({ length: 100 }, (_, i) => i / 100), rate: 10 };
    const s = sliceAudio(a, 2, 5);
    expect(durationOf(s)).toBe(3);
    expect(s.samples[0]).toBeCloseTo(0.2);
  });

  it("앞뒤 무음을 빼고 여유를 둔다 — 소리가 없으면 전체", () => {
    const rate = 1000;
    const samples = new Float32Array(rate * 3);
    samples.fill(0.5, 1000, 2000); // 1초~2초만 소리
    const [s, e] = silenceBounds({ samples, rate }, 0.03, 0.1);
    expect(s).toBeCloseTo(0.9);
    expect(e).toBeCloseTo(2.1);
    expect(silenceBounds({ samples: new Float32Array(3000), rate })).toEqual([0, 3]);
  });

  it("파형은 구간마다 가장 큰 소리", () => {
    expect(Array.from(peaksOf({ samples: new Float32Array([0.1, -0.8, 0.3, 0.2]), rate: 4 }, 2))).toEqual([expect.closeTo(0.8), expect.closeTo(0.3)]);
  });
});
