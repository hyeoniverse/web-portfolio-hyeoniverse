"use client";

import { forwardRef } from "react";
import Button from "./Button";

/* 사이트 전역 도움말(?) 버튼 — 아이콘이 아니라 텍스트 "?" + Button subtle/circle 로 고정.
   variant 가 subtle 인 이유: 기준인 posts 검색창의 ? 버튼이 outline 에 `border: var(--border-light)`
   를 덮어써서 "옅은 보더"를 만들고 있었는데, 그건 공통 Button 의 subtle 이 이미 하는 일이다.
   → override 를 지우고 subtle 을 쓰면 같은 모양이 되고, 도움말은 저강조 액션이라 의미도 맞다.
   variant / shape / children 은 통일이 목적이라 호출부에서 못 바꾼다.
   size 만 열어둔다 — 폼 라벨 옆(작게) / 섹션 헤더(기본) 처럼 놓이는 자리마다 적정 크기가 달라서,
   크기를 못 바꾸면 그 자리들이 통일 대상에서 아예 빠져버린다.
   나머지 props (onClick, aria-label, title, className, tabIndex 등) 는 그대로 Button 에 전달 —
   Popover / Tooltip 이 trigger 에 핸들러·ref 를 주입하는 케이스가 깨지지 않도록. */
type HelpButtonSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl";

export type HelpButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  /** 기본 "sm"(28px). 폼 라벨 옆처럼 좁은 자리는 "2xs"(20px) / "xs"(24px) */
  size?: HelpButtonSize;
  /** 표시 글리프 — 도움말 "?"(기본) 또는 정보 "i". 둘 다 circle 규격 공유 */
  symbol?: "?" | "i";
  /** 기본 "subtle"(옅은 보더 칩). 이미지 뷰어 툴바처럼 투명 아이콘 버튼들과 톤을 맞춰야 하는
   *  표면은 "ghost"(투명·저강조) 로 얹는다. 그 외 시각 override 는 여전히 금지. */
  variant?: "subtle" | "ghost";
  /** 팝오버 등이 열려 있을 때 눌린 상태 표시 (Button.active 로 전달) */
  active?: boolean;
  /** 배치용 className 만 (색·보더·radius·padding 시각 override 금지 — 필요하면 부모 래퍼로) */
  className?: string;
  soundDisabled?: boolean;
};

const HelpButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, HelpButtonProps>(
  ({ size = "sm", symbol = "?", variant = "subtle", ...props }, ref) => (
    <Button ref={ref} variant={variant} shape="circle" size={size} {...props}>
      {symbol}
    </Button>
  ),
);

HelpButton.displayName = "HelpButton";
export default HelpButton;
