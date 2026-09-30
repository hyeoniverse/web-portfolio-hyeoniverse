"use client";

import { useEffect, useState } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { hexToRgb, type Rgb } from "@/utils/color";
import { readableAccent } from "@/lib/themeColors";
import { analyzeLogo, recolorPixels } from "@/lib/logoRecolor";

/** 이보다 큰 로고는 줄여서 칠한다 — nav 는 32px, 로딩 워드마크도 120px 이라 넉넉하다 */
const MAX_SIDE = 512;

/* 같은 로고·같은 색이면 한 번만 칠한다. 결과는 blob 주소, 칠할 수 없으면 null */
const cache = new Map<string, Promise<string | null>>();

function recolor(src: string, ink: Rgb, accent: Rgb): Promise<string | null> {
  const key = `${src}|${ink}|${accent}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = new Promise<string | null>((resolve) => {
    const img = new Image();
    // 업로드 로고는 스토리지 도메인이라 CORS 로 불러와야 캔버스에서 픽셀을 읽을 수 있다
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const w = Math.max(1, Math.round((img.naturalWidth || MAX_SIDE) * scale));
        const h = Math.max(1, Math.round((img.naturalHeight || MAX_SIDE) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h);
        const palette = analyzeLogo(pixels.data, w);
        if (!palette) return resolve(null);
        recolorPixels(pixels.data, palette, ink, accent);
        ctx.putImageData(pixels, 0, 0);
        canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), "image/png");
      } catch {
        // CORS 헤더가 없는 주소면 캔버스가 오염돼 픽셀을 못 읽는다 — 원래 로고를 쓴다
        resolve(null);
      }
    };
    img.src = src;
  });
  cache.set(key, job);
  return job;
}

/**
 * 로고 이미지를 현재 테마 색으로 칠한 주소. 잉크는 그 배경의 본문 글자색, 포인트는 강조색.
 * 칠할 수 없는 로고(색이 많거나 배경이 있음), 설정에서 끈 경우, 칠하는 중에는 null — 원래 이미지를 쓴다.
 */
export function useThemedLogo(src: string, bg: "light" | "dark", enabled = true): string | null {
  const { theme, brand } = useSiteConfig();
  const on = enabled && !!src && brand.logoFollowTheme !== false;
  const bgHex = bg === "dark" ? theme.darkBg : theme.lightBg;
  const inkHex = bg === "dark" ? theme.darkText : theme.lightText;
  // 포인트는 그래픽이라 대비 3 이면 충분하다 — 배경에 묻히는 강조색만 명도를 옮긴다
  const accentHex = readableAccent(theme.accentColor, bgHex, 3);
  const [result, setResult] = useState<{ key: string; url: string | null } | null>(null);
  const key = `${src}|${inkHex}|${accentHex}`;

  useEffect(() => {
    if (!on) return;
    const ink = hexToRgb(inkHex), accent = hexToRgb(accentHex);
    if (!ink || !accent) return;
    let alive = true;
    recolor(src, ink, accent).then((url) => alive && setResult({ key, url }));
    return () => {
      alive = false;
    };
  }, [on, src, inkHex, accentHex, key]);

  return on && result?.key === key ? result.url : null;
}
