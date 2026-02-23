"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/post";
import styles from "./PopularPosts.module.css";

export default function PopularPosts() {
  const [posts, setPosts] = useState<Post[]>([]);

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.5-2.25 1.5-3" />
        </svg>
        Popular
      </div>
      <div className={styles.row}>
        {posts.map((post) => (
          <Link key={post.id} href={`/posts/${post.slug}`} className={styles.card}>
            <div className={styles.thumb}>
              {post.cover_image ? (
                <Image
                  src={post.cover_image}
                  alt={post.title}
                  fill
                  sizes="200px"
                  className={styles.thumbImg}
                />
              ) : (
                <div className={styles.thumbPlaceholder}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
            </div>
            <div className={styles.info}>
              <span className={styles.cardTitle}>{post.title}</span>
              <span className={styles.cardMeta}>
                {post.view_count} views
                {post.like_count > 0 && <> · {post.like_count} likes</>}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
