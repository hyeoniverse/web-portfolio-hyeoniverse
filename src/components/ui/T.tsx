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
  /** locale key (기존 방식) */
  k?: string;
  /** 직접 ko/en 값 전달 (사이트 설정 등 동적 값) */
  ko?: string;
  en?: string;
  delay?: number;
  /** 설명 tooltip — 번역과 한 말풍선에 통합 */
  tooltip?: string;
  /** tooltip 위치 */
  placement?: "top" | "bottom" | "auto";
  /** ko=en 이어도 항상 번역 tooltip 표시 */
  alwaysTooltip?: boolean;
  /** 외부 Tooltip과 함께 쓸 때 내부 tooltip 비활성화 */
  noTooltip?: boolean;
}

export default function T({ k, ko, en, delay = 600, tooltip, placement, alwaysTooltip, noTooltip, ...rest }: TProps) {
  const { t, tAlt, language } = useLanguage();

  let text: string;
  let altText: string;

  if (ko !== undefined || en !== undefined) {
    text = language === "ko" ? (ko ?? en ?? "") : (en ?? ko ?? "");
    altText = language === "ko" ? (en ?? ko ?? "") : (ko ?? en ?? "");
  } else if (k) {
    text = t(k);
    altText = tAlt(k);
  } else {
    return null;
  }

  // 같은 텍스트이거나 번역이 없으면 tooltip 생략 (alwaysTooltip 시 강제 표시)
  const hasTranslation = alwaysTooltip || (altText !== text && (k ? altText !== k : true));

  if (noTooltip || (!hasTranslation && !tooltip)) {
    return <span {...rest}>{text}</span>;
  }

  const langLabel = language === "ko" ? "EN" : "KO";

  const tooltipContent = (
    <>
      {hasTranslation && <div>{langLabel} {altText}</div>}
      {tooltip && <div>{tooltip}</div>}
    </>
  );

  return (
    <Tooltip
      content={tooltipContent}
      delay={delay}
      placement={placement}
    >
      <span {...rest}>{text}</span>
    </Tooltip>
  );
}
