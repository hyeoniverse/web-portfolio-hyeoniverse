import { pcmToWav } from "@/lib/wav";

/**
 * 마이크 녹음 — 편집 화면에서 슬라이드 음성을 바로 녹음하고, 들어 보고 앞뒤를 잘라 WAV 로 올린다.
 *
 * MediaRecorder 는 브라우저마다 형식이 다르다(크롬 WebM, 사파리 MP4). WebM 은 업로드가 받지 않는 형식이고
 * 잘라 내기도 어렵다. 그래서 Web Audio 로 원시 표본을 받아 두고(자르기는 표본을 자르면 된다) WAV 로 만든다 —
 * 어느 브라우저든 같은 형식이고, TTS 음성(Gemini)과도 같다.
 * 말소리라 24kHz 단일 채널 16비트로 줄인다(1초에 48KB, 업로드 기본 한도 20MB 면 7분 남짓).
 */

export const RECORD_RATE = 24000;

/** 녹음한 소리 — 24kHz 단일 채널 표본(-1~1) */
export interface RecordedAudio {
  samples: Float32Array;
  rate: number;
}

/* 표본을 받아 주 스레드로 넘기는 작은 처리기 — 파일 없이 Blob 주소로 싣는다 */
const WORKLET = `
class Tap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor("mic-tap", Tap);
`;

export interface MicRecording {
  /** 지금 소리 크기(0~1) — 녹음 중 표시용. 일시정지 중이면 0 */
  level(): number;
  /** 지금까지 녹음한 길이(초) — 일시정지한 동안은 늘지 않는다 */
  seconds(): number;
  /** 잠깐 멈춘다 — 그동안 들어온 소리는 버린다 */
  pause(): void;
  /** 이어서 녹음한다 */
  resume(): void;
  /** 녹음을 끝내고 마이크를 닫는다 — 녹음한 소리를 돌려준다 */
  finish(): RecordedAudio;
  /** 녹음을 끝내고 버린다 */
  cancel(): void;
}

/** 녹음할 수 있는 브라우저인지 — 보안 연결(https·localhost)이어야 마이크를 쓸 수 있다 */
export function canRecord(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== "undefined";
}

/** 마이크를 열고 녹음을 시작한다. 마이크 권한을 거절하면 getUserMedia 의 오류(NotAllowedError 등)를 그대로 던진다 */
export async function startMicRecording(): Promise<MicRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext();
  const release = () => {
    stream.getTracks().forEach((tr) => tr.stop());
    void ctx.close();
  };
  try {
    const moduleUrl = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
    try { await ctx.audioWorklet.addModule(moduleUrl); } finally { URL.revokeObjectURL(moduleUrl); }
    /* 누르는 동작 뒤 await 를 거쳐 멈춘 채로 만들어지는 브라우저가 있다(사파리) */
    if (ctx.state === "suspended") await ctx.resume();
  } catch (e) {
    release();
    throw e;
  }

  const source = ctx.createMediaStreamSource(stream);
  const tap = new AudioWorkletNode(ctx, "mic-tap");
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  /* 처리기는 출력에 이어야 돌아간다 — 소리가 나지 않게 크기 0 으로 */
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(tap).connect(mute).connect(ctx.destination);
  source.connect(analyser);

  const chunks: Float32Array[] = [];
  let length = 0;
  let paused = false;
  tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
    if (paused) return;
    chunks.push(e.data);
    length += e.data.length;
  };
  const buf = new Uint8Array(analyser.fftSize);

  const end = () => {
    tap.port.onmessage = null;
    source.disconnect();
    tap.disconnect();
    release();
  };

  return {
    level() {
      if (paused) return 0;
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      return Math.min(1, peak / 128);
    },
    seconds: () => length / ctx.sampleRate,
    pause: () => { paused = true; },
    resume: () => { paused = false; },
    finish() {
      const rate = ctx.sampleRate;
      end();
      return downsample(chunks, length, rate);
    },
    cancel: end,
  };
}

/** 받은 표본을 이어 24kHz 로 줄인다(구간 평균). 더 낮은 표본율이면 그대로 둔다 */
export function downsample(chunks: Float32Array[], length: number, fromRate: number, toRate = RECORD_RATE): RecordedAudio {
  const all = new Float32Array(length);
  let at = 0;
  for (const c of chunks) { all.set(c.subarray(0, Math.min(c.length, length - at)), at); at += c.length; if (at >= length) break; }
  const ratio = Math.max(1, fromRate / toRate);
  if (ratio === 1) return { samples: all, rate: fromRate };
  const n = Math.floor(length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s0 = Math.floor(i * ratio);
    const s1 = Math.min(length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = s0; j < s1; j++) sum += all[j];
    out[i] = sum / Math.max(1, s1 - s0);
  }
  return { samples: out, rate: Math.round(fromRate / ratio) };
}

/** 길이(초) */
export const durationOf = (a: RecordedAudio) => a.samples.length / a.rate;

/** start~end 초만 남긴다 */
export function sliceAudio(a: RecordedAudio, start: number, end: number): RecordedAudio {
  const s = Math.max(0, Math.floor(start * a.rate));
  const e = Math.min(a.samples.length, Math.max(s, Math.round(end * a.rate)));
  return { samples: a.samples.slice(s, e), rate: a.rate };
}

/** 16비트 WAV — 넘치는 값은 자른다 */
export function encodeWav(a: RecordedAudio): Uint8Array {
  const pcm = new Uint8Array(a.samples.length * 2);
  const view = new DataView(pcm.buffer);
  a.samples.forEach((x, i) => {
    const v = Math.max(-1, Math.min(1, x));
    view.setInt16(i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  });
  return pcmToWav(pcm, a.rate);
}

/**
 * 앞뒤 무음을 뺀 구간(초) — 20ms 창의 가장 큰 소리가 threshold 를 넘는 첫·마지막 창을 찾고 pad 만큼 여유를 둔다.
 * 소리가 전혀 없으면 전체 구간을 돌려준다
 */
export function silenceBounds(a: RecordedAudio, threshold = 0.03, pad = 0.15): [number, number] {
  const win = Math.max(1, Math.round(a.rate * 0.02));
  const loud = (w: number) => {
    let peak = 0;
    for (let i = w * win; i < Math.min(a.samples.length, (w + 1) * win); i++) peak = Math.max(peak, Math.abs(a.samples[i]));
    return peak >= threshold;
  };
  const wins = Math.ceil(a.samples.length / win);
  let first = 0;
  while (first < wins && !loud(first)) first++;
  if (first === wins) return [0, durationOf(a)];
  let last = wins - 1;
  while (last > first && !loud(last)) last--;
  const dur = durationOf(a);
  return [Math.max(0, (first * win) / a.rate - pad), Math.min(dur, ((last + 1) * win) / a.rate + pad)];
}

/** 파형 — 구간마다 가장 큰 소리(0~1) */
export function peaksOf(a: RecordedAudio, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  const per = a.samples.length / buckets;
  for (let b = 0; b < buckets; b++) {
    let peak = 0;
    for (let i = Math.floor(b * per); i < Math.min(a.samples.length, Math.floor((b + 1) * per)); i++) peak = Math.max(peak, Math.abs(a.samples[i]));
    out[b] = Math.min(1, peak);
  }
  return out;
}
