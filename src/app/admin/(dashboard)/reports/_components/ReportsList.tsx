"use client";

import { useState, useEffect, useCallback } from "react";
import { Flag, ExternalLink, Check, X } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import Button from "@/components/ui/Button";
import { SkeletonLine, SkeletonPill } from "@/components/ui/Skeleton";
import SegmentedControl from "@/components/ui/SegmentedControl";
import AdminListShell from "@/components/admin/AdminListShell";
import EmptyState from "@/components/ui/EmptyState/EmptyState";
import styles from "../Reports.module.css";
import type { Report, StatusFilter } from "../_types";

function ReportsSkeleton() {
  return (
    <ul className={styles.list} aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
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

/**
 * 신고 관리 리스트 — /admin/reports 독립 페이지와 알림 페이지 "신고" 탭 공용.
 * showTitle=true  → 독립 페이지: 제목 헤더(Flag + pending 배지) + 필터를 한 줄에.
 * showTitle=false → 임베드(탭 안): 제목 없이 필터 행만. 페이지 title/container 는 부모가 책임.
 */
export default function ReportsList({ showTitle = false }: { showTitle?: boolean }) {
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

  const filterControl = (
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
  );

  const body = loading ? (
    <ReportsSkeleton />
  ) : reports.length === 0 ? (
    <EmptyState circle><T k="admin.reports.empty" /></EmptyState>
  ) : (
    <ul className={styles.list}>
      {reports.map((r) => {
        const url = commentUrl(r);
        return (
          <li key={r.id} className={`${styles.item} ${styles[`status_${r.status}`] ?? ""}`}>
            <div className={styles.itemMain}>
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
                  <Flag size={12} strokeWidth={1.8} aria-hidden />
                  <span>{r.reason}</span>
                </p>
              )}
            </div>
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
  );

  // 임베드(탭 안) — 제목 없이 필터 행 + 리스트만. 페이지 chrome 은 부모가 담당.
  if (!showTitle) {
    return (
      <>
        <div className={styles.reportsFilterRow}>{filterControl}</div>
        {body}
      </>
    );
  }

  // 독립 페이지 — 공통 AdminListShell(posts/works 와 같은 제목 헤더 + Lenis 진입). Flag+배지는 title, 필터는 headerExtra.
  return (
    <AdminListShell
      title={
        <span className={styles.titleRow}>
          <Flag size={20} strokeWidth={1.6} aria-hidden />
          <T k="admin.reports.title" />
          {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
        </span>
      }
      headerExtra={filterControl}
    >
      {body}
    </AdminListShell>
  );
}
