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

/** 압축 대상이 아닌 파일 (동영상 등) */
function isNonImage(file: File): boolean {
  return !file.type.startsWith("image/");
}
const MAX_DIMENSION = 2560;
const QUALITY_START = 0.85;
const QUALITY_STEP = 0.05;
const QUALITY_MIN = 0.7;

// ── 형식별 업로드 크기 제한 (기본값, MB) ── site.config.ts media.limits 와 동기화 유지 ──
const DEFAULT_LIMITS: Record<string, number> = {
  // image
  "image/jpeg": 5,
  "image/png": 5,
  "image/webp": 5,
  "image/svg+xml": 2,
  "image/gif": 10,
  // video
  "video/mp4": 50,
  "video/webm": 50,
  "video/quicktime": 50,
  // audio
  "audio/mpeg": 20,
  "audio/wav": 20,
  "audio/ogg": 20,
  // document
  "text/markdown": 1,
  "text/plain": 1,
  "text/csv": 5,
  "application/pdf": 20,
  "application/msword": 20,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 20,
  "application/vnd.ms-excel": 20,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 20,
  "application/vnd.ms-powerpoint": 50,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 50,
  // archive
  "application/zip": 50,
  _default: 20,
};

// 차단 확장자
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif",
  "sh", "bash", "csh", "ksh",
  "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1",
  "dll", "sys", "drv",
]);

/** 설정에서 limits를 받아 사용, 없으면 기본값 */
function getFileSizeLimit(file: File, limits?: Record<string, number>): number {
  const l = limits ?? DEFAULT_LIMITS;
  const mb = l[file.type] ?? l._default ?? DEFAULT_LIMITS._default;
  return mb * 1024 * 1024;
}

/** 파일 확장자가 차단 목록에 있는지 확인 */
function isBlockedExtension(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return BLOCKED_EXTENSIONS.has(ext);
}

/** 파일 보안 + 크기 검증. 에러 시 메시지 반환, 통과 시 null.
 *
 * opts.skipCompressibleBypass=true 이면 jpg/png/webp 도 compress 파이프라인 후 재검증 목적으로
 * 검사 통과시키지 않고 limit 초과 시 에러 반환. 압축 후 호출 또는 압축 안 하는 경로 (contact form) 에서 사용. */
export function validateFileSize(
  file: File,
  limits?: Record<string, number>,
  opts?: { skipCompressibleBypass?: boolean },
): string | null {
  // 차단 확장자 검사
  if (isBlockedExtension(file)) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return `차단된 파일 형식: .${ext}`;
  }
  const limit = getFileSizeLimit(file, limits);
  if (file.size <= limit) return null;
  const limitMB = limit / (1024 * 1024);
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  // 압축 가능한 이미지는 compressImage 가 처리하니 pre-validation 단계에선 통과시킴.
  // 단 opts.skipCompressibleBypass 가 true 면 (post-compress 또는 압축 안 하는 경로) bypass 비활성.
  if (!opts?.skipCompressibleBypass && file.type.startsWith("image/") && !SKIP_TYPES.has(file.type)) return null;
  return `파일 크기 제한 초과: ${sizeMB}MB / 최대 ${limitMB}MB`;
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
  const { maxBytes = (DEFAULT_LIMITS["image/jpeg"] ?? 5) * 1024 * 1024 } = options;

  // 스킵 대상 (SVG, GIF, 비이미지 파일)
  if (SKIP_TYPES.has(file.type) || isNonImage(file)) return file;

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
