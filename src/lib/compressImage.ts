/**
 * 클라이언트 이미지 압축 파이프라인
 *
 * 1. SVG / GIF → 스킵
 * 2. WebP 변환 (quality 0.85)
 * 3. 아직 크면 → 해상도 축소 (max 2560px)
 * 4. 아직 크면 → 품질 0.05씩 하향 (최저 0.7)
 * 5. 그래도 크면 → 그냥 반환
 */

const SKIP_TYPES = new Set(["image/svg+xml", "image/gif"]);
const MAX_DIMENSION = 2560;
const QUALITY_START = 0.85;
const QUALITY_STEP = 0.05;
const QUALITY_MIN = 0.7;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/webp",
      quality,
    );
  });
}

function drawScaled(
  img: HTMLImageElement,
  maxDim: number,
): HTMLCanvasElement {
  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

export interface CompressOptions {
  /** 최대 파일 크기 (bytes). 기본 10MB */
  maxBytes?: number;
}

/**
 * 이미지 파일을 WebP로 변환 + 리사이즈 + 품질 조절하여 maxBytes 이하로 압축.
 * SVG/GIF는 그대로 반환.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { maxBytes = 10 * 1024 * 1024 } = options;

  // 스킵 대상
  if (SKIP_TYPES.has(file.type)) return file;

  // 이미 작으면 스킵
  if (file.size <= maxBytes) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    // Step 1: WebP 변환 (원본 해상도, quality 0.85)
    let canvas = drawScaled(img, Math.max(img.naturalWidth, img.naturalHeight));
    let blob = await canvasToBlob(canvas, QUALITY_START);

    if (blob.size <= maxBytes) {
      return new File([blob], replaceExt(file.name, "webp"), { type: "image/webp" });
    }

    // Step 2: 해상도 축소 (max 2560px)
    if (img.naturalWidth > MAX_DIMENSION || img.naturalHeight > MAX_DIMENSION) {
      canvas = drawScaled(img, MAX_DIMENSION);
      blob = await canvasToBlob(canvas, QUALITY_START);

      if (blob.size <= maxBytes) {
        return new File([blob], replaceExt(file.name, "webp"), { type: "image/webp" });
      }
    }

    // Step 3: 품질 단계적 하향
    let quality = QUALITY_START - QUALITY_STEP;
    while (quality >= QUALITY_MIN) {
      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= maxBytes) {
        return new File([blob], replaceExt(file.name, "webp"), { type: "image/webp" });
      }
      quality -= QUALITY_STEP;
    }

    // 최저 품질로도 안 되면 그대로 반환
    return new File([blob], replaceExt(file.name, "webp"), { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function replaceExt(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}
