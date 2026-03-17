/**
 * 클라이언트 이미지 압축 파이프라인
 *
 * 1. SVG / GIF → 스킵 (압축 불가)
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

// ── 형식별 업로드 크기 제한 (bytes) ──
const LIMIT_IMAGE = 5 * 1024 * 1024;   // 5MB
const LIMIT_GIF = 10 * 1024 * 1024;    // 10MB
const LIMIT_VIDEO = 50 * 1024 * 1024;  // 50MB

/** 파일 형식에 따른 최대 업로드 크기(bytes) 반환 */
export function getFileSizeLimit(file: File): number {
  if (file.type.startsWith("video/")) return LIMIT_VIDEO;
  if (file.type === "image/gif") return LIMIT_GIF;
  return LIMIT_IMAGE;
}

/** 파일 형식에 따른 최대 업로드 크기(MB) 반환 */
export function getFileSizeLimitMB(file: File): number {
  return getFileSizeLimit(file) / (1024 * 1024);
}

/** 파일이 형식별 제한을 초과하는지 확인. 초과 시 에러 메시지 반환, 통과 시 null */
export function validateFileSize(file: File): string | null {
  const limit = getFileSizeLimit(file);
  if (file.size <= limit) return null;
  const limitMB = limit / (1024 * 1024);
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  if (file.type.startsWith("video/")) return `동영상 크기 제한 초과: ${sizeMB}MB / 최대 ${limitMB}MB`;
  if (file.type === "image/gif") return `GIF 크기 제한 초과: ${sizeMB}MB / 최대 ${limitMB}MB`;
  return null; // 일반 이미지는 압축 파이프라인이 처리
}

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
  /** 최대 파일 크기 (bytes). 기본값: 형식별 제한 자동 적용 */
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
  const { maxBytes = LIMIT_IMAGE } = options;

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
