"use client";

import { useEffect } from "react";
import { useCustomFonts } from "@/hooks/useCustomFonts";
import { injectFontFace } from "@/lib/customFonts";

/**
 * 커스텀 폰트(@font-face) 전역 주입 — 로고(nav·로딩)·본문 타이포·에디터 콘텐츠 등
 * FontPicker 바깥에서 이름/CSS 문자열로 참조되는 폰트가 실제로 렌더되도록 한다.
 * injectFontFace 가 이름 기준 dedupe 하므로 FontPicker 자체 주입과 겹쳐도 안전.
 */
export default function CustomFontsLoader() {
  const fonts = useCustomFonts();
  useEffect(() => {
    fonts.forEach(injectFontFace);
  }, [fonts]);
  return null;
}
