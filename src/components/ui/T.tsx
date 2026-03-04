"use client";

import { type HTMLAttributes } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "./Tooltip";

/* --------------------------------------------------------------------------
   T — 번역 텍스트 + 반대 언어 tooltip

   사용법: {t("nav.home")} 대신 <T k="nav.home" />
   Long hover 시 반대 언어 번역을 tooltip으로 표시
   -------------------------------------------------------------------------- */

interface TProps extends HTMLAttributes<HTMLSpanElement> {
  k: string;
  delay?: number;
}

export default function T({ k, delay = 600, ...rest }: TProps) {
  const { t, tAlt, language } = useLanguage();
  const text = t(k);
  const altText = tAlt(k);

  // 같은 텍스트이거나 번역이 없으면 tooltip 생략
  const hasTranslation = altText !== text && altText !== k;

  if (!hasTranslation) {
    return <span {...rest}>{text}</span>;
  }

  const langLabel = language === "ko" ? "EN" : "KO";

  return (
    <Tooltip
      content={`${langLabel} ${altText}`}
      delay={delay}
    >
      <span {...rest}>{text}</span>
    </Tooltip>
  );
}
