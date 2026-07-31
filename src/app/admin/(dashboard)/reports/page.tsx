"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Flag, ExternalLink, Check, X } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import Button from "@/components/ui/Button";
import { SkeletonLine, SkeletonPill } from "@/components/ui/Skeleton";
import SegmentedControl from "@/components/ui/SegmentedControl";
import styles from "./Reports.module.css";
import type { Report, StatusFilter } from "./_types";

function ReportsSkeleton() {
  return (
    <ul className={styles.list} aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className={styles.item}>
          <div className={styles.skelHeader}>
            <SkeletonLine width={160} height="var(--skeleton-h-line-sm)" />
            <SkeletonLine width={60} height="var(--skeleton-h-line-sm)" />
          </div>
          <div className={styles.skelNick}>
            <SkeletonLine width={100} />
          </div>
          <div className={styles.skelBody}>
            <SkeletonLine width="92%" />
            <SkeletonLine width="68%" />
          </div>
          <div className={styles.skelActions}>
            <SkeletonPill width={72} />
            <SkeletonPill width={84} />
            <SkeletonPill width={64} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ReportsPage() {
  const { language, t } = useLanguage();
  const { openModal } = useModalStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
        setPendingCount(data.pendingCount ?? 0);
      }
    } catch {
      setReports([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = useCallback(
    async (id: string, status: "resolved" | "dismissed") => {
      await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchReports();
    },
    [fetchReports],
  );

  const deleteComment = useCallback(
    async (report: Report) => {
      const apiBase = report.comment_type === "work" ? "/api/work-comments" : "/api/comments";
      await fetch(`${apiBase}/${report.comment_id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      // 댓글 삭제 후 신고 처리 완료로
      await updateStatus(report.id, "resolved");
    },
    [updateStatus],
  );

  const confirmDeleteComment = (report: Report) => {
    openModal(
      <ModalConfirm
        desc={t("admin.reports.deleteCommentDesc")}
        confirmText={t("admin.reports.deleteComment")}
        danger
        onConfirm={() => deleteComment(report)}
      />,
      { id: "report-del-comment", header: { title: t("admin.reports.deleteCommentTitle") }, closeButton: true, width: "400px" },
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return language === "ko" ? "방금 전" : "just now";
    if (mins < 60) return language === "ko" ? `${mins}분 전` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return language === "ko" ? `${hours}시간 전` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return language === "ko" ? `${days}일 전` : `${days}d ago`;
    return d.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const commentUrl = (r: Report) => {
    if (!r.comment?.parentSlug) return null;
    const base = r.comment_type === "post" ? "/posts" : "/works";
    return `${base}/${r.comment.parentSlug}#comment-${r.comment_id}`;
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className={styles.title}>
          <Flag size={20} strokeWidth={1.6} aria-hidden />
          <T k="admin.reports.title" />
          {pendingCount > 0 && (
            <span className={styles.badge}>{pendingCount}</span>
          )}
        </h1>
        <SegmentedControl<StatusFilter>
          items={[
            { value: "pending", label: <T k="admin.reports.filter.pending" /> },
            { value: "resolved", label: <T k="admin.reports.filter.resolved" /> },
            { value: "dismissed", label: <T k="admin.reports.filter.dismissed" /> },
            { value: "all", label: <T k="admin.reports.filter.all" /> },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </motion.div>

      {loading ? (
        <ReportsSkeleton />
      ) : reports.length === 0 ? (
        <div className={styles.empty}>
          <T k="admin.reports.empty" />
        </div>
      ) : (
        <ul className={styles.list}>
          {reports.map((r) => {
            const url = commentUrl(r);
            return (
              <li key={r.id} className={`${styles.item} ${styles[`status_${r.status}`] ?? ""}`}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemType}>
                    {r.comment_type === "post" ? <T k="admin.reports.fromPost" /> : <T k="admin.reports.fromWork" />}
                    {r.comment?.parentTitle && <> · {r.comment.parentTitle}</>}
                  </span>
                  <span className={styles.itemDate}>{formatDate(r.created_at)}</span>
                </div>
                {r.comment ? (
                  <>
                    <div className={styles.commentNick}>
                      {r.comment.nickname}
                      {r.comment.is_deleted && <span className={styles.deletedBadge}><T k="admin.reports.commentDeleted" /></span>}
                    </div>
                    <p className={styles.commentBody}>{r.comment.content || "—"}</p>
                  </>
                ) : (
                  <p className={styles.commentBody}><T k="admin.reports.commentGone" /></p>
                )}
                {r.reason && (
                  <p className={styles.reason}>
                    <span className={styles.reasonLabel}><T k="admin.reports.reason" />:</span> {r.reason}
                  </p>
                )}
                <div className={styles.itemActions}>
                  {url && (
                    <Tooltip content={t("admin.reports.viewTooltip")} placement="top" delay={200}>
                      <Button
                        href={url}
                        external
                        variant="outline"
                        size="xs"
                        icon={<ExternalLink size={13} strokeWidth={1.8} />}
                      >
                        <T k="admin.reports.view" />
                      </Button>
                    </Tooltip>
                  )}
                  {r.status === "pending" && (
                    <>
                      {!r.comment?.is_deleted && r.comment && (
                        <Button variant="outline" size="xs" tone="danger" onClick={() => confirmDeleteComment(r)}>
                          <T k="admin.reports.deleteComment" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="xs"
                        icon={<Check size={13} strokeWidth={1.8} />}
                        onClick={() => updateStatus(r.id, "resolved")}
                      >
                        <T k="admin.reports.resolve" />
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        icon={<X size={13} strokeWidth={1.8} />}
                        onClick={() => updateStatus(r.id, "dismissed")}
                      >
                        <T k="admin.reports.dismiss" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
