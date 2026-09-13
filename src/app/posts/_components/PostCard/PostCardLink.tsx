"use client";

import TransitionLink from "@/components/ui/TransitionLink";
import base from "./PostCard.module.css";

/* 카드 전체를 덮는 글 링크(#931). 카드 안에 태그 링크가 있어 카드를 <a> 로 감쌀 수 없어, 빈 링크를 카드 위에 겹친다.
   이름은 제목으로 읽힌다. 카드의 클릭 처리가 한 번 더 받지 않게 여기서 멈춘다. 선불러오기는 카드의 hover·초점 처리
   (handlePrefetch)가 맡는다 */
export default function PostCardLink({
  href,
  title,
  image,
  getRect,
}: {
  href: string;
  title: string;
  image: string;
  getRect: (link: HTMLAnchorElement) => DOMRect;
}) {
  return (
    <TransitionLink
      href={href}
      image={image}
      getRect={getRect}
      className={base.cardLink}
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
