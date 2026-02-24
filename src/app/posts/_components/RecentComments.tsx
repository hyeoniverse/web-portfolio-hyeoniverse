"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./RecentComments.module.css";

interface RecentComment {
  id: string;
  nickname: string;
  content: string;
  is_admin: boolean;
  created_at: string;
  post_title: string;
  post_slug: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function RecentComments() {
  const [comments, setComments] = useState<RecentComment[]>([]);

  useEffect(() => {
    fetch("/api/comments/recent?limit=5")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(() => {});
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Recent Comments
      </div>
      {comments.length === 0 ? (
        <p className={styles.empty}>No comments yet</p>
      ) : (
        <div className={styles.list}>
          {comments.map((c) => (
            <Link key={c.id} href={`/posts/${c.post_slug}`} className={styles.item}>
              <div className={styles.itemTop}>
                <span className={styles.nickname}>
                  {c.nickname}
                  {c.is_admin && <span className={styles.adminBadge}>Admin</span>}
                </span>
                <span className={styles.time}>{timeAgo(c.created_at)}</span>
              </div>
              <p className={styles.content}>{c.content}</p>
              <span className={styles.postTitle}>{c.post_title}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
