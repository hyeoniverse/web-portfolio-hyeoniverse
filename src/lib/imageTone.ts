/**
 * 이미지 한 구역의 밝기로 어둡다/밝다를 가린다 — nav 로고 밑 이미지가 어두운지 재는 데 쓴다(lib/navBackdrop).
 *
 * 원본 대신 Next 이미지 최적화 주소의 작은 사본(64px)을 캔버스에 그린다 — 같은 도메인이라 픽셀을 읽을 수 있고
 * (다른 도메인 원본은 캔버스가 오염돼 읽지 못한다) 받는 양도 작다.
 */

/** 상대 밝기(0~1, sRGB 근사) */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * RGBA 픽셀 배열의 한 구역(비율 좌표) 평균 밝기. dim 은 위에 덮인 검은 막의 불투명도(0~1) —
 * 커버 윗부분에 깔린 막(DetailLayout 의 heroOverlay)만큼 어둡게 본다
 */
export function regionLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: { x0: number; y0: number; x1: number; y1: number },
  dim = 0,
): number {
  const xs = Math.max(0, Math.floor(region.x0 * width));
  const xe = Math.min(width, Math.max(xs + 1, Math.ceil(region.x1 * width)));
  const ys = Math.max(0, Math.floor(region.y0 * height));
  const ye = Math.min(height, Math.max(ys + 1, Math.ceil(region.y1 * height)));
  let sum = 0;
  let n = 0;
  for (let y = ys; y < ye; y++) {
    for (let x = xs; x < xe; x++) {
      const i = (y * width + x) * 4;
      sum += luminance(data[i], data[i + 1], data[i + 2]);
      n++;
    }
  }
  return n ? (sum / n) * (1 - dim) : 0.5;
}

/** 밝기 경계 — 이보다 어두우면 어두운 배경으로 본다 */
export const DARK_THRESHOLD = 0.5;

/** 브라우저에서 이미지 구역이 어두운지 잰다. 잴 수 없으면(영상·읽기 실패) null */
export async function measureImageTone(
  src: string,
  region: { x0: number; y0: number; x1: number; y1: number },
  dim = 0,
): Promise<"dark" | "light" | null> {
  if (typeof window === "undefined" || !src) return null;
  const url = `/_next/image?url=${encodeURIComponent(src)}&w=64&q=75`;
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const lum = regionLuminance(ctx.getImageData(0, 0, w, h).data, w, h, region, dim);
    return lum < DARK_THRESHOLD ? "dark" : "light";
  } catch {
    return null;
  }
}
