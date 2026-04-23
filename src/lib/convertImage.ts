import sharp from "sharp";

// 브라우저에서 네이티브 렌더 불가능한 이미지 포맷 → WebP 변환
const CONVERTIBLE_MIMES = new Set([
  "image/heic",
  "image/heif",
  "image/tiff",
]);

export function needsConversion(mime: string): boolean {
  return CONVERTIBLE_MIMES.has(mime);
}

export interface ConvertedImage {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
  originalMime: string;
}

/**
 * HEIC/HEIF/TIFF → WebP 변환 (sharp 사용).
 * 이 함수는 `needsConversion(mime)`이 true인 경우에만 호출해야 함.
 */
export async function convertToWebp(
  input: Buffer,
  originalMime: string,
): Promise<ConvertedImage> {
  const buffer = await sharp(input).webp({ quality: 85 }).toBuffer();
  return {
    buffer,
    contentType: "image/webp",
    extension: "webp",
    originalMime,
  };
}
