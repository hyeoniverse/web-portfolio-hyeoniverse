"use client";

import { useState, useEffect } from "react";
import type { Post } from "@/types/post";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { Flame } from "lucide-react";
import T from "@/components/ui/T";
import styles from "./PopularPosts.module.css";

export default function PopularPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const { navigateWithTransition } = usePageTransition();

  useEffect(() => {
    fetch("/api/posts?sort=popular&limit=5&pinned=false")
      .then((res) => res.json())
      .then((data) => setPosts((data.posts ?? []).filter((p: Post) => p.view_count > 0)))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <Flame size={14} className={styles.flameIcon} fill="currentColor" />
        <T k="postsPage.popular" />
      </div>
      <div className={styles.list} data-more="true" data-clickable="true">
        {posts.map((post, idx) => (
          <div key={post.id} onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); navigateWithTransition(`/posts/${post.slug}`, "", rect); }} className={styles.item}>
            <span className={`${styles.rank} ${idx === 0 ? styles.rankTop : idx <= 2 ? styles.rankHigh : ""}`}>
              {String(idx + 1).padStart(2, "0")}
            </span>
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
