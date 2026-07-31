"use client";

import { useState, useEffect } from "react";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { MessageSquare } from "@/components/icons";
import T from "@/components/ui/T";
import styles from "./RecentComments.module.css";
import { stripMarkdown } from "@/utils/stripMarkdown";

interface RecentComment {
  id: string;
  nickname: string;
  content: string;
  is_admin: boolean;
  created_at: string;
  post_title: string;
  post_slug: string;
}

function timeAgo(dateStr: string, t: TFunction) {
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
  const { navigateWithTransition } = usePageTransition();
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
        <MessageSquare size={14} />
        <T k="postsPage.recentComments" />
      </div>
      {comments.length === 0 ? (
        <p className={styles.empty}><T k="postsPage.noCommentsYet" /></p>
      ) : (
        <div className="tw:flex tw:flex-col">
          {comments.map((c) => (
            <div key={c.id} onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); navigateWithTransition(`/posts/${c.post_slug}`, "", rect); }} style={{ cursor: "pointer" }} className={styles.item}>
              <div className="tw:flex tw:items-center tw:justify-between">
                <span className={styles.nickname}>
                  {c.nickname}
                  {c.is_admin && <span className={styles.adminBadge}>Admin</span>}
                </span>
                <span className={styles.time}>{timeAgo(c.created_at, t)}</span>
              </div>
              {/* 댓글은 마크다운 원문 — 2줄 클램프 미리보기라 렌더하면 제목/목록/코드블록이 튀어나온다.
                  기호만 벗겨 평문으로 표시. */}
              <p className={styles.content}>{stripMarkdown(c.content)}</p>
              <span className={styles.postTitle}>{c.post_title}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
