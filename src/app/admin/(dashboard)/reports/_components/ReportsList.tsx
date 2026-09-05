"use client";

import { useState, useEffect, useCallback } from "react";
import { Flag, ExternalLink, Check, X, Trash2 } from "@/components/icons";
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
import ReportDetail from "./ReportDetail";
import styles from "../Reports.module.css";
import type { Report, StatusFilter } from "../_types";
import { formatRelativeTime } from "@/utils/relativeTime";
import { useNow } from "@/hooks/useNow";

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
export default function ReportsList({
  showTitle = false,
  filter: controlledFilter,
  onFilterChange,
}: {
  showTitle?: boolean;
  /** 상태 필터를 부모가 쥘 때 — 알림 페이지는 탭의 하위 세그먼트로 이 필터를 그린다.
   *  주면 여기서는 필터 UI 를 그리지 않는다. 같은 필터가 두 벌 보이면 안 된다. */
  filter?: StatusFilter;
  onFilterChange?: (v: StatusFilter) => void;
}) {
  const { language, t } = useLanguage();
  /* 상대시간 기준 시각. 렌더에서 Date.now() 를 부르면 매 렌더 값이 달라진다. */
  const now = useNow();
  const { openModal } = useModalStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<StatusFilter, number>>({
    pending: 0, resolved: 0, dismissed: 0, all: 0,
  });
  const [ownFilter, setOwnFilter] = useState<StatusFilter>("pending");
  const controlled = controlledFilter !== undefined;
  const filter = controlled ? controlledFilter : ownFilter;
  const setFilter = controlled ? (onFilterChange ?? (() => {})) : setOwnFilter;
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
        setPendingCount(data.pendingCount ?? 0);
        setStatusCounts(data.statusCounts ?? { pending: 0, resolved: 0, dismissed: 0, all: 0 });
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

  const formatDate = (iso: string) => formatRelativeTime(iso, now, language);

  const commentUrl = (r: Report) => {
    if (!r.comment?.parentSlug) return null;
    const base = r.comment_type === "post" ? "/posts" : "/works";
    return `${base}/${r.comment.parentSlug}#comment-${r.comment_id}`;
  };

  /** 행 클릭 → 상세. 목록에서는 본문이 잘리고 사유·처리 이력은 보이지 않는다. */
  const openDetail = (r: Report) => {
    openModal(
      <ReportDetail
        report={r}
        icon={<Flag size={18} strokeWidth={1.6} aria-hidden />}
        url={commentUrl(r)}
        onResolve={() => updateStatus(r.id, "resolved")}
        onDismiss={() => updateStatus(r.id, "dismissed")}
        onDeleteComment={() => confirmDeleteComment(r)}
      />,
      { id: "report-detail", header: { title: t("admin.reports.detailTitle") }, closeButton: true, width: "520px" },
    );
  };

  const filterControl = (
    <SegmentedControl<StatusFilter>
      items={[
        { value: "pending", label: <><T k="admin.reports.filter.pending" /> <span className={styles.tabCount}>{statusCounts.pending}</span></> },
        { value: "resolved", label: <><T k="admin.reports.filter.resolved" /> <span className={styles.tabCount}>{statusCounts.resolved}</span></> },
        { value: "dismissed", label: <><T k="admin.reports.filter.dismissed" /> <span className={styles.tabCount}>{statusCounts.dismissed}</span></> },
        { value: "all", label: <><T k="admin.reports.filter.all" /> <span className={styles.tabCount}>{statusCounts.all}</span></> },
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
            {/* 본문 쪽만 클릭 대상 — 우측 조작 버튼까지 상세로 열리면 처리하려다 모달이 뜬다 */}
            <div
              className={`${styles.itemMain} ${styles.itemMainClickable}`}
              role="button"
              tabIndex={0}
              data-clickable="true"
              title={t("admin.reports.tipItemDetail")}
              onClick={() => openDetail(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(r); }
              }}
            >
              <div className={styles.itemHeader}>
                <span className={styles.itemType}>
                  {r.comment_type === "post" ? <T k="admin.reports.fromPost" /> : <T k="admin.reports.fromWork" />}
                  {r.comment?.parentTitle && <> · {r.comment.parentTitle}</>}
                </span>
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
              <span className={styles.itemDate}>{formatDate(r.created_at)}</span>
              <div className={styles.itemActionBtns}>
                {url && (
                  <Tooltip content={t("admin.reports.view")} placement="top" delay={200}>
                    <Button href={url} external shape="square" variant="ghost" size="sm" aria-label={t("admin.reports.view")} icon={<ExternalLink size={15} strokeWidth={1.8} />} />
                  </Tooltip>
                )}
                {r.status === "pending" && (
                  <>
                    {!r.comment?.is_deleted && r.comment && (
                      <Tooltip content={t("admin.reports.deleteComment")} placement="top" delay={200}>
                        <Button shape="square" variant="ghost" size="sm" tone="danger" aria-label={t("admin.reports.deleteComment")} icon={<Trash2 size={15} strokeWidth={1.8} />} onClick={() => confirmDeleteComment(r)} />
                      </Tooltip>
                    )}
                    <Tooltip content={t("admin.reports.resolve")} placement="top" delay={200}>
                      <Button shape="square" variant="ghost" size="sm" aria-label={t("admin.reports.resolve")} icon={<Check size={15} strokeWidth={1.8} />} onClick={() => updateStatus(r.id, "resolved")} />
                    </Tooltip>
                    <Tooltip content={t("admin.reports.dismiss")} placement="top" delay={200}>
                      <Button shape="square" variant="ghost" size="sm" aria-label={t("admin.reports.dismiss")} icon={<X size={15} strokeWidth={1.8} />} onClick={() => updateStatus(r.id, "dismissed")} />
                    </Tooltip>
                  </>
                )}
              </div>
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
        {!controlled && <div className={styles.reportsFilterRow}>{filterControl}</div>}
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
