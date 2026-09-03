"use client";

import type { PostCardVariantProps } from "./PostCardStandard";
import PostCardStandard from "./PostCardStandard";
import PostCardTimeline from "./PostCardTimeline";
import PostCardCompact from "./PostCardCompact";

/* 글 카드 — 목록 레이아웃(설정 posts.layout)과 variant 에 따라 변형 컴포넌트로 넘긴다.
   timeline(/posts/history)·compact 는 마크업이 아예 달라 전용 컴포넌트, 나머지(standard·featured·hero·
   list·masonry·grid·magazine)는 같은 마크업에 CSS 변형이라 PostCardStandard 가 맡는다. */
export default function PostCard(props: PostCardVariantProps) {
  if (props.layout === "timeline") {
    return <PostCardTimeline post={props.post} isHot={props.isHot} onImgError={props.onImgError} imgError={props.imgError} />;
  }
  if (props.layout === "compact") {
    return <PostCardCompact post={props.post} isHot={props.isHot} onImgError={props.onImgError} imgError={props.imgError} />;
  }
  return <PostCardStandard {...props} />;
}
