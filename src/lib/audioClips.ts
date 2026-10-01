import { deleteRange, durationOf, insertAt, sliceAudio, type RecordedAudio } from "@/lib/micRecorder";

/**
 * 녹음 클립 — 녹음 하나를 나눈 자리(cuts, 초)로 클립을 나눈다. 소리는 한 덩어리로 두고 경계만 들고 있어
 * 자르기·붙여넣기 같은 편집은 그대로 쓰고, 편집할 때 경계도 같이 옮긴다.
 * 편집기(RecordingEditor)는 { audio, cuts } 를 한 벌로 되돌리기에 쌓는다.
 */

export interface ClipTake {
  audio: RecordedAudio;
  /** 클립 경계(초) — 0 과 끝은 넣지 않는다. 늘 오름차순 */
  cuts: number[];
}

/* 경계끼리·끝과 이보다 가까우면 같은 자리로 친다(초) */
const NEAR = 0.05;

const clean = (cuts: number[], duration: number) =>
  /* 빼고 더하다 생긴 부동소수 찌꺼기를 지운다(0.49999… → 0.5) */
  cuts
    .map((c) => Math.round(c * 1e6) / 1e6)
    .sort((a, b) => a - b)
    .filter((c, i, arr) => c > NEAR && c < duration - NEAR && (i === 0 || c - arr[i - 1] > NEAR));

/** 클립 구간들 [시작, 끝] */
export function clipsOf(t: ClipTake): [number, number][] {
  const d = durationOf(t.audio);
  const edges = [0, ...t.cuts, d];
  return edges.slice(0, -1).map((s, i) => [s, edges[i + 1]]);
}

/** 그 자리에서 나눈다 — 끝이나 다른 경계와 너무 가까우면 그대로 */
export function splitAt(t: ClipTake, at: number): ClipTake {
  return { audio: t.audio, cuts: clean([...t.cuts, at], durationOf(t.audio)) };
}

/** 구간을 지운다 — 안의 경계는 없애고 뒤 경계는 당긴다. 지운 자리는 새 경계가 된다(앞뒤가 다른 소리라) */
export function deleteSpan(t: ClipTake, start: number, end: number): ClipTake {
  const [s, e] = start <= end ? [start, end] : [end, start];
  const audio = deleteRange(t.audio, s, e);
  const len = e - s;
  const kept = t.cuts.filter((c) => c <= s || c >= e).map((c) => (c >= e ? c - len : c));
  const joinsClips = t.cuts.some((c) => c > s && c < e) || t.cuts.includes(s) || t.cuts.includes(e);
  return { audio, cuts: clean(joinsClips ? [...kept, s] : kept, durationOf(audio)) };
}

/** 자리에 조각을 끼운다 — 끼운 조각은 제 클립이 된다 */
export function insertClip(t: ClipTake, at: number, clip: RecordedAudio): ClipTake {
  const len = durationOf(clip);
  const audio = insertAt(t.audio, at, clip);
  const moved = t.cuts.map((c) => (c >= at ? c + len : c));
  return { audio, cuts: clean([...moved, at, at + len], durationOf(audio)) };
}

/** 구간만 남긴다 */
export function keepSpan(t: ClipTake, start: number, end: number): ClipTake {
  const audio = sliceAudio(t.audio, start, end);
  return { audio, cuts: clean(t.cuts.filter((c) => c > start && c < end).map((c) => c - start), durationOf(audio)) };
}

/** from 번째 클립을 to 번째 자리(옮기기 전 순서 기준, 0~클립 수)로 옮긴다 */
export function moveClip(t: ClipTake, from: number, to: number): ClipTake {
  const clips = clipsOf(t);
  if (from < 0 || from >= clips.length || to === from || to === from + 1) return t;
  const order = clips.map((_, i) => i);
  order.splice(from, 1);
  order.splice(to > from ? to - 1 : to, 0, from);
  const parts = order.map((i) => sliceAudio(t.audio, clips[i][0], clips[i][1]));
  const total = parts.reduce((n, p) => n + p.samples.length, 0);
  const samples = new Float32Array(total);
  const cuts: number[] = [];
  let at = 0;
  parts.forEach((p, i) => {
    samples.set(p.samples, at);
    at += p.samples.length;
    if (i < parts.length - 1) cuts.push(at / t.audio.rate);
  });
  return { audio: { samples, rate: t.audio.rate }, cuts };
}
