/**
 * 이미지에서 dominant 색 N개 추출 — canvas 로 픽셀 샘플링 후 4비트/채널 양자화 + 빈도수 정렬.
 *
 * - CORS 제한: external image 는 crossorigin 헤더가 있어야 함 (Supabase / Unsplash 모두 OK).
 *   anonymous 로 로드 실패 시 reject.
 * - 평균 색을 그룹별 합산 후 산출 — 양자화 손실 보정.
 */
export async function extractPalette(url: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        // 작게 샘플 (200px 너비) — 속도 + 정확도 trade-off
        const targetW = 200;
        const targetH = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * targetW));
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return reject(new Error("Canvas 2d context failed"));
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const data = ctx.getImageData(0, 0, targetW, targetH).data;

        // 4 비트/채널 양자화 — 16^3 = 4096 bucket
        const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // 거의 회색(채도 매우 낮음) 은 skip 옵션 — 풍부한 팔레트 우선
          // 단순 skip: max-min < 8 인 grey
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 8 && max > 230) continue; // 거의 흰색
          if (max - min < 8 && max < 25) continue;  // 거의 검정
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const existing = buckets.get(key);
          if (existing) {
            existing.r += r; existing.g += g; existing.b += b; existing.count += 1;
          } else {
            buckets.set(key, { r, g, b, count: 1 });
          }
        }

        // 비슷한 hue 끼리 너무 몰리지 않게 — 정렬 후 ΔE 거리 가까운 것 skip
        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
        const picked: { r: number; g: number; b: number }[] = [];
        for (const b of sorted) {
          if (picked.length >= count) break;
          const ar = Math.round(b.r / b.count);
          const ag = Math.round(b.g / b.count);
          const ab = Math.round(b.b / b.count);
          // 이미 뽑힌 색과 거리 < 30 이면 skip (RGB 직선 거리)
          const tooClose = picked.some((p) =>
            Math.hypot(p.r - ar, p.g - ag, p.b - ab) < 30,
          );
          if (tooClose) continue;
          picked.push({ r: ar, g: ag, b: ab });
        }

        const hex = picked.map((p) => {
          const t = (n: number) => n.toString(16).padStart(2, "0");
          return `#${t(p.r)}${t(p.g)}${t(p.b)}`;
        });
        resolve(hex);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => reject(new Error("Image load failed (CORS or 404)"));
    img.src = url;
  });
}
