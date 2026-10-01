import { describe, expect, it } from "vitest";
import { clipsOf, deleteSpan, insertClip, keepSpan, moveClip, splitAt, type ClipTake } from "@/lib/audioClips";

/* 10Hz, 0~9 — 1초에 10표본이라 초와 표본을 바로 맞춰 본다 */
const take = (cuts: number[] = []): ClipTake => ({ audio: { samples: Float32Array.from({ length: 10 }, (_, i) => i), rate: 10 }, cuts });
const values = (t: ClipTake) => Array.from(t.audio.samples);

describe("audioClips", () => {
  it("나누면 클립이 생기고, 끝·같은 자리는 무시한다", () => {
    const t = splitAt(splitAt(take(), 0.4), 0.4);
    expect(t.cuts).toEqual([0.4]);
    expect(clipsOf(t)).toEqual([[0, 0.4], [0.4, 1]]);
    expect(splitAt(t, 0.99).cuts).toEqual([0.4]);
  });

  it("구간을 지우면 뒤 경계를 당기고, 클립에 걸치면 지운 자리가 경계가 된다", () => {
    expect(deleteSpan(take([0.7]), 0.2, 0.4).cuts).toEqual([0.5]);
    const t = deleteSpan(take([0.4]), 0.3, 0.6);
    expect(values(t)).toEqual([0, 1, 2, 6, 7, 8, 9]);
    expect(t.cuts.map((c) => +c.toFixed(2))).toEqual([0.3]);
  });

  it("붙여 넣은 조각은 제 클립이 된다", () => {
    const clip = { samples: Float32Array.from([-1, -2]), rate: 10 };
    const t = insertClip(take([0.5]), 0.3, clip);
    expect(values(t)).toEqual([0, 1, 2, -1, -2, 3, 4, 5, 6, 7, 8, 9]);
    expect(t.cuts.map((c) => +c.toFixed(2))).toEqual([0.3, 0.5, 0.7]);
  });

  it("구간만 남기면 안의 경계만 앞으로 당겨 남는다", () => {
    expect(keepSpan(take([0.2, 0.5, 0.8]), 0.3, 0.9).cuts.map((c) => +c.toFixed(2))).toEqual([0.2, 0.5]);
  });

  it("클립을 다른 자리로 옮긴다", () => {
    const t = take([0.3, 0.6]); // [0,1,2] [3,4,5] [6,7,8,9]
    expect(values(moveClip(t, 2, 0))).toEqual([6, 7, 8, 9, 0, 1, 2, 3, 4, 5]);
    expect(moveClip(t, 2, 0).cuts.map((c) => +c.toFixed(2))).toEqual([0.4, 0.7]);
    expect(values(moveClip(t, 0, 3))).toEqual([3, 4, 5, 6, 7, 8, 9, 0, 1, 2]);
    expect(moveClip(t, 1, 1)).toBe(t);
    expect(moveClip(t, 1, 2)).toBe(t);
  });
});

describe("audioClips 구간 나누기", () => {
  it("고른 구간의 양 끝을 나누면 그 구간이 한 클립이 된다", () => {
    const t = splitAt(splitAt(take(), 0.3), 0.7);
    expect(clipsOf(t)).toEqual([[0, 0.3], [0.3, 0.7], [0.7, 1]]);
  });
});
