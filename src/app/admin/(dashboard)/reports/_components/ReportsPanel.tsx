"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Check, X, Trash2, RefreshCw } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { matchesSearch } from "@/lib/koSearch";
import ReportDetail from "./ReportDetail";
import styles from "../Reports.module.css";
import type { Report, StatusFilter } from "../_types";

const ZERO_COUNTS: Record<StatusFilter, number> = { pending: 0, resolved: 0, dismissed: 0, all: 0 };

/**
 * 신고 목록 + 상태 필터 + 검색 + 처리 동작.
 *
 * 신고 관리 페이지와 알림 페이지의 "신고" 탭이 같은 일을 한다. 예전에는 두 곳이 거의 같은
 * 코드를 따로 들고 있어서, 한쪽만 고치면 다른 쪽이 옛 모습으로 남았다. 목록 부분을 여기로
 * 모으고 페이지 제목·새로고침 같은 바깥 껍데기만 각자 갖는다.
 */
export default function ReportsPanel({
  onCountsChange,
  filter: controlledFilter,
  onFilterChange,
}: {
  onCountsChange?: (counts: Record<StatusFilter, number>) => void;
  /** 상태 필터를 부모가 쥘 때 — 알림 페이지는 탭의 하위 세그먼트로 이 필터를 그린다.
   *  주면 패널은 자기 필터 UI 를 그리지 않는다. 같은 필터가 두 벌 보이면 안 된다. */
  filter?: StatusFilter;
  onFilterChange?: (v: StatusFilter) => void;
}) {
  const { language, t } = useLanguage();
  const { openModal } = useModalStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<StatusFilter, number>>(ZERO_COUNTS);
  const [ownFilter, setOwnFilter] = useState<StatusFilter>("pending");
  const controlled = controlledFilter !== undefined;
  const filter = controlled ? controlledFilter : ownFilter;
  const setFilter = controlled ? (onFilterChange ?? (() => {})) : setOwnFilter;
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
        setStatusCounts(data.statusCounts ?? ZERO_COUNTS);
        onCountsChange?.(data.statusCounts ?? ZERO_COUNTS);
      } else {
        setReports([]);
        setStatusCounts(ZERO_COUNTS);
      }
    } catch {
      setReports([]);
      setStatusCounts(ZERO_COUNTS);
    }
    setLoading(false);
  }, [filter, onCountsChange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /* 신고는 닉네임·본문·사유 어느 쪽으로도 찾게 된다 — 셋을 한 번에 훑는다. */
  const visible = useMemo(() => {
    const q = search.trim();
    if (!q) return reports;
    return reports.filter((r) =>
      matchesSearch(q, r.comment?.nickname ?? "", r.comment?.content ?? "", r.reason ?? "", r.comment?.parentTitle ?? ""),
    );
  }, [reports, search]);

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

  const confirmDeleteComment = useCallback((report: Report) => {
    openModal(
      <ModalConfirm
        desc={t("admin.reports.deleteCommentDesc")}
        confirmText={t("admin.reports.deleteComment")}
        danger
        onConfirm={() => deleteComment(report)}
      />,
      { id: "report-del-comment", header: { title: t("admin.reports.deleteCommentTitle") }, closeButton: true, width: "400px" },
    );
  }, [openModal, t, deleteComment]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
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

  /** 신고 클릭 → 상세. 목록은 한 줄로 잘리므로 본문 전문·사유·처리 이력은 여기서만 보인다. */
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

  return (
    <>

      {/* 상태 필터 + 검색 — 알림 페이지와 같은 배치라 두 화면을 오갈 때 같은 자리에서 찾는다 */}
      <div className={`${styles.tabsRow} ${controlled ? styles.tabsRowActionsOnly : ""}`}>
        {!controlled && (
          <SegmentedControl<StatusFilter>
            items={[
              { value: "pending", label: <>{t("admin.reports.filter.pending")} <span className={styles.tabCount}>{statusCounts.pending}</span></> },
              { value: "resolved", label: <>{t("admin.reports.filter.resolved")} <span className={styles.tabCount}>{statusCounts.resolved}</span></> },
              { value: "dismissed", label: <>{t("admin.reports.filter.dismissed")} <span className={styles.tabCount}>{statusCounts.dismissed}</span></> },
              { value: "all", label: <>{t("admin.reports.filter.all")} <span className={styles.tabCount}>{statusCounts.all}</span></> },
            ]}
            value={filter}
            onChange={setFilter}
          />
        )}
        <div className={styles.filterActions}>
          <div className={styles.searchWrap}>
            <SearchCapsule
              search={search}
              onSearchChange={setSearch}
              placeholder={t("admin.reports.searchPlaceholder")}
            />
          </div>
          {/* 새로고침은 목록 옆에 둔다 — 알림 탭에서도 같이 쓰이므로 페이지 헤더에 두면 한쪽에만 생긴다 */}
          <Tooltip content={t("admin.reports.tipRefresh")} placement="bottom" delay={250}>
            <Button
              variant="ghost"
              shape="circle"
              size="sm"
              onClick={fetchReports}
              disabled={loading}
              aria-label={t("admin.reports.refresh")}
              icon={<RefreshCw size={14} strokeWidth={1.8} className={loading ? styles.refreshSpinning : ""} />}
            />
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div className={styles.list} aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.item}>
              <SkeletonCircle className={styles.icon} size={36} />
              <div className={styles.skelBody}>
                <SkeletonLine width="35%" height="var(--skeleton-h-line-lg)" />
                <SkeletonLine width="88%" />
                <SkeletonLine width="22%" height="var(--skeleton-h-line-sm)" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <motion.p
          className={styles.empty}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className={styles.emptyTitle}>
            <T k={search ? "admin.reports.searchEmpty" : "admin.reports.empty"} />
          </span>
          {!search && <span className={styles.emptyHint}><T k="admin.reports.emptyHint" /></span>}
        </motion.p>
      ) : (
        <motion.div
          className={styles.list}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          <AnimatePresence initial={false}>
            {visible.map((r) => (
              <Tooltip
                key={r.id}
                content={t("admin.reports.tipItemDetail")}
                placement="left"
                delay={400}
                wrapperStyle={{ display: "block", width: "100%" }}
              >
                <motion.div
                  layout
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className={`${styles.item} ${styles.itemClickable} ${styles[`status_${r.status}`] ?? ""}`}
                  data-clickable="true"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(r); }
                  }}
                >
                  <span className={styles.icon}>
                    <Flag size={18} strokeWidth={1.6} aria-hidden />
                  </span>
                  <div className={styles.body}>
                    <div className={styles.itemTitle}>
                      <span className={styles.nickname}>
                        {r.comment?.nickname ?? t("admin.reports.commentGone")}
                      </span>
                      {r.comment?.is_deleted && (
                        <span className={styles.deletedBadge}><T k="admin.reports.commentDeleted" /></span>
                      )}
                    </div>
                    <div className={styles.itemMessage}>
                      {r.comment ? r.comment.content || "—" : <T k="admin.reports.commentGone" />}
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemSource}>
                        {r.comment_type === "post" ? <T k="admin.reports.fromPost" /> : <T k="admin.reports.fromWork" />}
                        {r.comment?.parentTitle && <> · {r.comment.parentTitle}</>}
                      </span>
                      <span className={styles.itemDot} aria-hidden />
                      <span className={styles.itemDate}>{formatDate(r.created_at)}</span>
                      {r.reason && (
                        <>
                          <span className={styles.itemDot} aria-hidden />
                          <span className={styles.itemReason}>{r.reason}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 처리 대기만 즉시 조작을 둔다 — 목록에서 훑으며 비우는 흐름이 중재의 기본이다.
                      상세를 거치지 않아도 되게 하되, 클릭이 상세로 새지 않도록 전파를 끊는다. */}
                  {r.status === "pending" ? (
                    <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
                      {r.comment && !r.comment.is_deleted && (
                        <Tooltip content={t("admin.reports.deleteComment")} placement="top" delay={200}>
                          <Button
                            variant="ghost"
                            shape="circle"
                            size="xs"
                            tone="danger"
                            icon={<Trash2 size={14} strokeWidth={1.8} />}
                            aria-label={t("admin.reports.deleteComment")}
                            onClick={() => confirmDeleteComment(r)}
                          />
                        </Tooltip>
                      )}
                      <Tooltip content={t("admin.reports.dismiss")} placement="top" delay={200}>
                        <Button
                          variant="ghost"
                          shape="circle"
                          size="xs"
                          icon={<X size={14} strokeWidth={1.8} />}
                          aria-label={t("admin.reports.dismiss")}
                          onClick={() => updateStatus(r.id, "dismissed")}
                        />
                      </Tooltip>
                      <Tooltip content={t("admin.reports.resolve")} placement="top" delay={200}>
                        <Button
                          variant="ghost"
                          shape="circle"
                          size="xs"
                          icon={<Check size={14} strokeWidth={1.8} />}
                          aria-label={t("admin.reports.resolve")}
                          onClick={() => updateStatus(r.id, "resolved")}
                        />
                      </Tooltip>
                    </div>
                  ) : (
                    <span className={`${styles.statusChip} ${styles[`chip_${r.status}`]}`}>
                      {r.status === "resolved"
                        ? t("admin.reports.filter.resolved")
                        : t("admin.reports.filter.dismissed")}
                    </span>
                  )}
                </motion.div>
              </Tooltip>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
