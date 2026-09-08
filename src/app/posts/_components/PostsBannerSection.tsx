"use client";

import { useState, useCallback } from "react";
import PostsBanner from "./PostsBanner/PostsBanner";
import type { Post } from "@/types/post";
import styles from "../Posts.module.css";

/* 상단 고정글 배너.
   PostsClient(=Suspense 경계 안) 밖에서 렌더한다. 경계 안은 프리렌더에서 통째로 빠지므로
   배너가 그 안에 있으면 서버 HTML 에 <img> 가 없고, 이미지 요청이 하이드레이션 이후로 밀린다.
   배너는 고정글만 쓰고 필터·검색·페이지와 무관해서 밖으로 뺄 수 있다. */
export default function PostsBannerSection({ posts }: { posts: Post[] }) {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className={styles.bannerSlider}>
      <PostsBanner posts={posts} imgErrors={imgErrors} onImgError={handleImgError} />
    </div>
  );
}
