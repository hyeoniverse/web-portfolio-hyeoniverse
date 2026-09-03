"use client";

import { useState, useCallback } from "react";
import type { Post } from "@/types/post";

/* 글 상세 번역 — 보기 언어(viewLang) · 그 언어의 제목/본문/발췌 파생 · 없는 언어면 자동 번역(/api/posts/<id>/auto-translate).
   번역 결과가 post 의 *_en / 원문 필드를 갱신하므로 post state 도 여기서 든다. 초기 언어는 있는 쪽 우선, 둘 다 있으면 사이트 언어. */
export function usePostTranslation(initialPost: Post, language: string) {
  const [post, setPost] = useState<Post>(initialPost);
  const [viewLang, setViewLang] = useState<"ko" | "en">(
    !initialPost.content_en ? "ko" : !initialPost.content ? "en" : language === "en" ? "en" : "ko"
  );
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);

  const needsTranslation =
    (viewLang === "en" && !post?.content_en) ||
    (viewLang === "ko" && !post?.content);
  const displayTitle = viewLang === "en"
    ? (post?.title_en || post?.title || "")
    : (post?.title || post?.title_en || "");
  const displayContent = viewLang === "en"
    ? (post?.content_en || post?.content || "")
    : (post?.content || post?.content_en || "");
  const displayExcerpt = viewLang === "en"
    ? (post?.excerpt_en || post?.excerpt || "")
    : (post?.excerpt || post?.excerpt_en || "");

  const handleAutoTranslate = useCallback(async () => {
    if (autoTranslating) return;
    setAutoTranslating(true);
    setTranslateError(false);
    const direction = viewLang === "en" ? "ko-en" : "en-ko";
    try {
      const res = await fetch(`/api/posts/${post.id}/auto-translate?direction=${direction}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (direction === "ko-en") {
          setPost((prev) => ({ ...prev, title_en: data.title_en, content_en: data.content_en, excerpt_en: data.excerpt_en }));
        } else {
          setPost((prev) => ({ ...prev, title: data.title, content: data.content, excerpt: data.excerpt }));
        }
      } else {
        setTranslateError(true);
      }
    } catch {
      setTranslateError(true);
    } finally {
      setAutoTranslating(false);
    }
  }, [post.id, autoTranslating, viewLang]);

  return {
    post, viewLang, setViewLang, needsTranslation, displayTitle, displayContent, displayExcerpt,
    autoTranslating, translateError, handleAutoTranslate,
  };
}
