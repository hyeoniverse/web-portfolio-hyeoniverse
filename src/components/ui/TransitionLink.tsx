"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { isPlainClick } from "@/utils/gestureUtils";

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
  /** 전환 연출이 키울 커버. 없으면 색(color)이나 빈 판으로 커진다 */
  image?: string;
  color?: string;
  /** 연출이 커지기 시작할 영역. 없으면 링크 자신 */
  getRect?: (link: HTMLAnchorElement) => DOMRect;
  /** 그냥 누른 클릭에서 넘어가는 방식을 쓰는 쪽이 정할 때(작업물 배치의 전환 덮개, 관리자 미리보기의 router.push 등).
      없으면 전환 연출로 넘어간다 */
  navigate?: (rect: DOMRect) => void;
};

/**
 * 페이지 전환 연출(누른 자리에서 커버가 커지며 넘어감)로 가는 링크(#931·#933).
 * 그냥 누르면 연출로 넘어가고, 가운데 버튼이나 ⌘·Ctrl·Shift·Alt 를 누른 클릭은 막지 않아 브라우저가 새 탭·새 창으로 연다.
 * 쓰는 쪽의 onClick 이 먼저 돌고, 거기서 기본 동작을 막으면 넘어가지 않는다(예: 가운데가 아닌 배너 카드는 선택만).
 * 선불러오기는 기본으로 끈다 — 화면에 링크가 여럿이라, 필요한 곳은 hover·초점 때 router.prefetch 로 부르거나 prefetch 를 넘긴다.
 */
export default function TransitionLink({ href, image = "", color, getRect, navigate, onClick, prefetch = false, ...rest }: TransitionLinkProps) {
  const { navigateWithTransition } = usePageTransition();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !isPlainClick(e)) return;
    e.preventDefault();
    const rect = getRect ? getRect(e.currentTarget) : e.currentTarget.getBoundingClientRect();
    if (navigate) navigate(rect);
    else navigateWithTransition(href, image, rect, color);
  };
  return <Link href={href} prefetch={prefetch} onClick={handleClick} {...rest} />;
}
