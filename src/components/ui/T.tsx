"use client";

import { type HTMLAttributes } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "./Tooltip";

/* --------------------------------------------------------------------------
   T — 번역 텍스트 + 반대 언어 tooltip

   사용법: {t("nav.home")} 대신 <T k="nav.home" />
   Long hover 시 반대 언어 번역을 tooltip으로 표시
   -------------------------------------------------------------------------- */

/**
 * 공통 prop — k 분기 / ko·en 분기 양쪽이 다 공유함.
 */
type TCommonProps = HTMLAttributes<HTMLSpanElement> & {
  delay?: number;
  /** 설명 tooltip — 번역과 한 말풍선에 통합 */
  tooltip?: string;
  /** tooltip 위치 */
  placement?: "top" | "bottom" | "auto";
  /** ko=en 이어도 항상 번역 tooltip 표시 */
  alwaysTooltip?: boolean;
  /** 외부 Tooltip과 함께 쓸 때 내부 tooltip 비활성화 */
  noTooltip?: boolean;
};

/**
 * Discriminated union: 반드시 `k` 또는 `ko`/`en` 중 하나는 들어와야 함.
 * - `<T />` (빈 호출) 컴파일 에러
 * - `<T k="..." ko="..." />` (혼합) 컴파일 에러
 */
type TProps =
  | (TCommonProps & { k: string; ko?: never; en?: never })
  | (TCommonProps & { k?: never; ko: string; en?: string })
  | (TCommonProps & { k?: never; ko?: string; en: string });

export default function T(props: TProps) {
  const {
    k,
    ko,
    en,
    delay = 600,
    tooltip,
    placement,
    alwaysTooltip,
    noTooltip,
    ...rest
  } = props;
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
    // discriminated union 상 도달 불가 — 런타임 안전망
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
