import { describe, expect, it } from "vitest";
import { deleteRange, downsample, durationOf, encodeWav, insertAt, peaksOf, silenceBounds, sliceAudio } from "@/lib/micRecorder";
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

describe("micRecorder 편집", () => {
  const a = { samples: Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), rate: 10 };
  it("구간을 지우고 앞뒤를 잇는다(앞뒤가 바뀌어도)", () => {
    expect(Array.from(deleteRange(a, 0.2, 0.5).samples)).toEqual([0, 1, 5, 6, 7, 8, 9]);
    expect(Array.from(deleteRange(a, 0.5, 0.2).samples)).toEqual([0, 1, 5, 6, 7, 8, 9]);
  });
  it("자리에 끼워 넣는다 — 끝을 넘으면 맨 뒤에", () => {
    const clip = { samples: Float32Array.from([-1, -2]), rate: 10 };
    expect(Array.from(insertAt(a, 0.3, clip).samples)).toEqual([0, 1, 2, -1, -2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Array.from(insertAt(a, 5, clip).samples).slice(-3)).toEqual([9, -1, -2]);
  });
  it("잘라내기 = 복사(sliceAudio) + 지우기, 붙여넣기로 되돌아온다", () => {
    const clip = sliceAudio(a, 0.2, 0.5);
    const rest = deleteRange(a, 0.2, 0.5);
    expect(Array.from(insertAt(rest, 0.2, clip).samples)).toEqual(Array.from(a.samples));
  });
});
