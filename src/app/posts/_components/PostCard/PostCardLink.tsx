"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import base from "./PostCard.module.css";

/* 카드 전체를 덮는 글 링크(#931). 카드 안에 태그 링크가 있어 카드를 <a> 로 감쌀 수 없어, 빈 링크를 카드 위에 겹친다.
   이름은 제목으로 읽힌다. 선불러오기는 끄고, 카드의 hover·초점 처리(handlePrefetch)가 지금처럼 맡는다 */
export default function PostCardLink({
  href,
  title,
  onClick,
}: {
  href: string;
  title: string;
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return <Link href={href} prefetch={false} className={base.cardLink} aria-label={title} onClick={onClick} />;
}
