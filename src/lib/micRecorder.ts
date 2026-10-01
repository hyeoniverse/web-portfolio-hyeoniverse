import { pcmToWav } from "@/lib/wav";

/**
 * 마이크 녹음 → WAV — 편집 화면에서 슬라이드 음성을 바로 녹음한다.
 *
 * MediaRecorder 는 브라우저마다 형식이 다르다(크롬 WebM, 사파리 MP4). WebM 은 업로드가 받지 않는 형식이라
 * Web Audio 로 원시 표본을 받아 WAV 로 만든다 — 어느 브라우저든 같은 형식이고, TTS 음성(Gemini)과도 같다.
 * 말소리라 24kHz 단일 채널 16비트로 줄인다(1초에 48KB, 업로드 기본 한도 20MB 면 7분 남짓).
 */

const SAMPLE_RATE = 24000;

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
  /** 지금 소리 크기(0~1) — 녹음 중 표시용 */
  level(): number;
  /** 지금까지 녹음한 길이(초) */
  seconds(): number;
  /** 멈추고 WAV 를 돌려준다 */
  stop(): Promise<Blob>;
  /** 멈추고 버린다 */
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
  tap.port.onmessage = (e: MessageEvent<Float32Array>) => { chunks.push(e.data); length += e.data.length; };
  const buf = new Uint8Array(analyser.fftSize);

  const end = () => {
    tap.port.onmessage = null;
    source.disconnect();
    tap.disconnect();
    release();
  };

  return {
    level() {
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      return Math.min(1, peak / 128);
    },
    seconds: () => length / ctx.sampleRate,
    async stop() {
      const rate = ctx.sampleRate;
      end();
      return new Blob([encodeWav(chunks, length, rate) as BlobPart], { type: "audio/wav" });
    },
    cancel: end,
  };
}

/** 받은 표본을 이어 24kHz 로 줄이고(구간 평균) 16비트 WAV 로 */
export function encodeWav(chunks: Float32Array[], length: number, fromRate: number, toRate = SAMPLE_RATE): Uint8Array {
  const all = new Float32Array(length);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.length; }
  const ratio = Math.max(1, fromRate / toRate);
  const outRate = Math.round(fromRate / ratio);
  const n = Math.floor(length / ratio);
  const pcm = new Uint8Array(n * 2);
  const view = new DataView(pcm.buffer);
  for (let i = 0; i < n; i++) {
    const s0 = Math.floor(i * ratio);
    const s1 = Math.min(length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = s0; j < s1; j++) sum += all[j];
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, s1 - s0)));
    view.setInt16(i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return pcmToWav(pcm, outRate);
}
