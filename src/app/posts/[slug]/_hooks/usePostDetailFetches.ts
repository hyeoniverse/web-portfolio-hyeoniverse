"use client";

import { useState, useEffect } from "react";
import type { RecommendedPost } from "../_components/types";

interface AdjacentPost {
  id: string;
  title: string;
  slug: string;
  cover_image: string;
  title_en: string;
}

/* 글 상세 부가 데이터 — 조회수 기록(admin 본인은 제외) · 이전/다음 글 · 추천 글을 한 효과에서 받는다(AbortController 공유).
   관련 작업은 본문 위에 그려져 늦게 받으면 본문을 밀어내므로 서버가 넘긴다(#917).
   isAdmin 은 mount 뒤 판정이 바뀔 수 있어 deps 에 들어 있다 — 바뀌면 다시 받는다(원래 동작). */
export function usePostDetailFetches({ postId, isAdmin }: { postId: string; isAdmin: boolean }) {
  const [adjacentPosts, setAdjacentPosts] = useState<{ prev: AdjacentPost | null; next: AdjacentPost | null }>({ prev: null, next: null });
  const [recommendedPosts, setRecommendedPosts] = useState<RecommendedPost[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    // admin 본인 조회는 skip — 자기 글 inflate 방지 (서버측에서도 한 번 더 거름)
    if (!isAdmin) {
      fetch(`/api/posts/${postId}/view`, { method: "POST", signal }).catch(() => {});
    }

    fetch(`/api/posts/${postId}/adjacent`, { signal })
      .then((r) => r.json())
      .then((d) => setAdjacentPosts(d))
      .catch(() => {});

    fetch(`/api/posts/${postId}/related`, { signal })
      .then((r) => r.json())
      .then((d) => setRecommendedPosts(d))
      .catch(() => {});

    return () => {
      ac.abort();
    };
  }, [postId, isAdmin]);

  return { adjacentPosts, recommendedPosts };
}
