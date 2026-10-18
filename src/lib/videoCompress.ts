/**
 * 비디오 압축 / 포맷 변환 — client-side ffmpeg.wasm.
 * lazy load — 압축 시도 시점에만 wasm core (~30MB) 다운로드.
 * 일반 admin 페이지 로드엔 영향 X.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

export type TargetFormat = "webm-vp9" | "mp4-h264";

export interface CompressOptions {
  format: TargetFormat;
  /** CRF 값 — 낮을수록 고화질/대용량. WebM VP9 권장 30, MP4 H.264 권장 23 */
  crf?: number;
  /** 가로 너비 강제 (예: 1280). 미지정 시 원본 유지. 비율 맞춰 height 자동. */
  maxWidth?: number;
  /** 진행률 콜백 (0~1) */
  onProgress?: (ratio: number) => void;
}

/** ffmpeg.wasm 의 ESM 진입 파일 — scripts/copy-ffmpeg.mjs 가 복사해 둔다 */
const FFMPEG_ESM = "/vendor/ffmpeg/index.js";

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    /* 번들에 넣지 않고 public/vendor/ffmpeg(scripts/copy-ffmpeg.mjs 가 복사)에서 불러온다 — Turbopack 이 이 패키지의
       워커 주소(변수)를 해석하지 못해 빌드가 실패했다(#1503). 같은 출처라 워커(worker.js)도 그대로 뜬다 */
    const { FFmpeg } = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ FFMPEG_ESM)) as typeof import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ffmpeg = new FFmpeg();
    // CDN 에서 wasm core 로드 (Vercel 대역폭 절약). ESM 판 — 워커가 module 워커라 UMD 판은 불러오지 못한다
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  return loadingPromise;
}

/**
 * 비디오 파일 압축.
 * @returns 새 Blob + 새 파일명 (확장자 변경)
 */
export async function compressVideo(
  file: File,
  options: CompressOptions,
): Promise<{ blob: Blob; name: string }> {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const inputName = `in_${Date.now()}.${file.name.split(".").pop() || "mp4"}`;
  const isWebm = options.format === "webm-vp9";
  const outName = `out_${Date.now()}.${isWebm ? "webm" : "mp4"}`;
  const crf = options.crf ?? (isWebm ? 30 : 23);

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  if (options.onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      options.onProgress?.(Math.max(0, Math.min(1, progress)));
    });
  }

  const args: string[] = ["-i", inputName];
  // 가로 너비 스케일 (비율 유지)
  if (options.maxWidth) {
    args.push("-vf", `scale='min(${options.maxWidth},iw)':-2`);
  }
  if (isWebm) {
    // WebM VP9 — 화질 대비 용량 최적. 무음 (intro 배경 영상이라).
    args.push("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-an");
  } else {
    // MP4 H.264 — 호환성 위주.
    args.push("-c:v", "libx264", "-crf", String(crf), "-preset", "medium", "-an", "-movflags", "+faststart");
  }
  args.push(outName);

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outName);
  // cleanup
  try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }

  const arrayBuffer = (data as Uint8Array).buffer.slice(
    (data as Uint8Array).byteOffset,
    (data as Uint8Array).byteOffset + (data as Uint8Array).byteLength,
  );
  const blob = new Blob([arrayBuffer as ArrayBuffer], { type: isWebm ? "video/webm" : "video/mp4" });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const newName = `${baseName}.${isWebm ? "webm" : "mp4"}`;
  return { blob, name: newName };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
