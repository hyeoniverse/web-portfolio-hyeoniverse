"use client";

import { useState, useEffect, useCallback } from "react";
import type { Post } from "@/types/post";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { Shuffle, RefreshCw } from "lucide-react";
import T from "@/components/ui/T";
import styles from "./PopularPosts.module.css";

/** 랜덤 게시글 — sidebar 보조. mount 시 1회 fetch + 사용자가 shuffle 버튼 누르면 새 seed 로 재요청. */
export default function RandomPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const { navigateWithTransition } = usePageTransition();

  const fetchRandom = useCallback((s: number) => {
    fetch(`/api/posts?sort=random&limit=5&pinned=false&seed=${s}`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchRandom(seed); }, [seed, fetchRandom]);

  if (posts.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <Shuffle size={14} />
        <T k="postsPage.random" />
        <button
          type="button"
          className={styles.shuffleBtn}
          onClick={(e) => { e.stopPropagation(); setSeed(Math.floor(Math.random() * 1e9)); }}
          aria-label="Refresh"
          title="다시 섞기"
        >
          <RefreshCw size={11} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.list} data-more="true" data-clickable="true">
        {posts.map((post, idx) => (
          <div
            key={post.id}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              navigateWithTransition(`/posts/${post.slug}`, "", rect);
            }}
            className={styles.item}
          >
            <span className={styles.rank}>{String(idx + 1).padStart(2, "0")}</span>
            <div className={styles.info}>
              <div className={styles.titleRow}>
                <span className={styles.itemTitle}>{post.title}</span>
              </div>
              <span className={styles.itemMeta}>
                {post.view_count} <T k="postsPage.views" />
                {post.like_count > 0 && <> &middot; {post.like_count} <T k="postsPage.likes" /></>}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
