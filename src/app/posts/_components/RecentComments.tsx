"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
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

function timeAgo(dateStr: string, t: (k: string) => string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("postsPage.justNow");
  if (mins < 60) return `${mins}${t("postsPage.minutesAgo")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t("postsPage.hoursAgo")}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}${t("postsPage.daysAgo")}`;
  return `${Math.floor(days / 30)}${t("postsPage.monthsAgo")}`;
}

export default function RecentComments() {
  const { t } = useLanguage();
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
        {t("postsPage.recentComments")}
      </div>
      {comments.length === 0 ? (
        <p className={styles.empty}>{t("postsPage.noCommentsYet")}</p>
      ) : (
        <div className={styles.list}>
          {comments.map((c) => (
            <Link key={c.id} href={`/posts/${c.post_slug}`} className={styles.item}>
              <div className={styles.itemTop}>
                <span className={styles.nickname}>
                  {c.nickname}
                  {c.is_admin && <span className={styles.adminBadge}>Admin</span>}
                </span>
                <span className={styles.time}>{timeAgo(c.created_at, t)}</span>
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
