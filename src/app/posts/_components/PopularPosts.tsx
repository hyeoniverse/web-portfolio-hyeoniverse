"use client";

import { useState, useEffect } from "react";
import type { Post } from "@/types/post";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { Flame } from "lucide-react";
import T from "@/components/ui/T";
import SegmentedControl from "@/components/ui/SegmentedControl";
import styles from "./PopularPosts.module.css";

type Metric = "score" | "views" | "comments" | "likes";

const METRICS = [
  { value: "score" as const, label: <T k="postsPage.popularScore" /> },
  { value: "views" as const, label: <T k="postsPage.popularViews" /> },
  { value: "comments" as const, label: <T k="postsPage.popularComments" /> },
  { value: "likes" as const, label: <T k="postsPage.popularLikes" /> },
];

export default function PopularPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [metric, setMetric] = useState<Metric>("score");
  const { navigateWithTransition } = usePageTransition();

  useEffect(() => {
    // score 는 API 의 "popular" 와 매핑, 나머지 metric 은 그대로 sort 파라미터
    const sortParam = metric === "score" ? "popular" : metric;
    const ac = new AbortController();
    fetch(`/api/posts?sort=${sortParam}&limit=5&pinned=false`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => setPosts((data.posts ?? []).filter((p: Post) => p.view_count > 0)))
      .catch(() => {});
    return () => ac.abort();
  }, [metric]);

  if (posts.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <Flame size={14} className={styles.flameIcon} fill="currentColor" />
        <T k="postsPage.popular" />
        <SegmentedControl<Metric>
          items={METRICS}
          value={metric}
          onChange={setMetric}
          className={styles.metricControl}
        />
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
