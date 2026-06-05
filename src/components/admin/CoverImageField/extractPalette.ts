/**
 * 이미지/비디오에서 dominant 색 N개 추출 — canvas 로 픽셀 샘플링 후 4비트/채널 양자화 + 빈도수 정렬.
 *
 * - 이미지: <img> crossorigin anonymous 로 로드.
 * - 비디오: <video> metadata 만 받고 중간 프레임 캡처.
 * - CORS 제한: external image/video 는 anonymous 헤더 필요 (Supabase / Pexels / Unsplash 모두 OK).
 */
import { isVideoUrl } from "@/lib/isVideoUrl";

/** drawn 픽셀에서 dominant N 색 추출 — 공통 로직 (image / video 공통). */
function quantize(data: Uint8ClampedArray, count: number): string[] {
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 8 && max > 230) continue;
    if (max - min < 8 && max < 25) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r; existing.g += g; existing.b += b; existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const picked: { r: number; g: number; b: number }[] = [];
  for (const b of sorted) {
    if (picked.length >= count) break;
    const ar = Math.round(b.r / b.count);
    const ag = Math.round(b.g / b.count);
    const ab = Math.round(b.b / b.count);
    const tooClose = picked.some((p) =>
      Math.hypot(p.r - ar, p.g - ag, p.b - ab) < 30,
    );
    if (tooClose) continue;
    picked.push({ r: ar, g: ag, b: ab });
  }

  return picked.map((p) => {
    const t = (n: number) => n.toString(16).padStart(2, "0");
    return `#${t(p.r)}${t(p.g)}${t(p.b)}`;
  });
}

function drawToCanvas(
  source: HTMLImageElement | HTMLVideoElement,
  naturalW: number,
  naturalH: number,
): Uint8ClampedArray {
  const targetW = 200;
  const targetH = Math.max(1, Math.round((naturalH / naturalW) * targetW));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2d context failed");
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH).data;
}

function extractFromImage(url: string, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const data = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
        resolve(quantize(data, count));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => reject(new Error("Image load failed (CORS or 404)"));
    img.src = url;
  });
}

function extractFromVideo(url: string, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let settled = false;
    const timer = setTimeout(() => fail(new Error("Video extract timeout")), 8000);
    const cleanup = () => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };
    const done = (colors: string[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(colors);
    };
    video.onloadedmetadata = () => {
      try {
        const d = video.duration;
        // 중간 프레임 — duration 불명 시 0.5s 로 fallback
        video.currentTime = Number.isFinite(d) && d > 0 ? d / 2 : 0.5;
      } catch { fail(new Error("Video seek failed")); }
    };
    video.onseeked = () => {
      try {
        const data = drawToCanvas(video, video.videoWidth, video.videoHeight);
        done(quantize(data, count));
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)));
      }
    };
    video.onerror = () => fail(new Error("Video load failed (CORS or 404)"));
    video.src = url;
  });
}

export async function extractPalette(url: string, count = 5): Promise<string[]> {
  if (isVideoUrl(url)) return extractFromVideo(url, count);
  return extractFromImage(url, count);
}
