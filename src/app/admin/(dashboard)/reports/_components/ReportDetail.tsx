"use client";

import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Check, X, Trash2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Report } from "../_types";
import styles from "./ReportDetail.module.css";

/**
 * 신고 상세.
 *
 * 목록에서는 댓글 본문이 한 줄로 잘리고 사유도 함께 잘린다. 중재 판단에 필요한 것 —
 * 본문 전문, 신고 사유, 어느 글의 댓글인지, 이미 삭제된 댓글인지 — 을 한 화면에 모은다.
 * 처리 동작도 여기로 모아, 목록의 행은 읽는 데만 쓰이게 한다.
 */
export default function ReportDetail({
  report,
  icon,
  url,
  onResolve,
  onDismiss,
  onDeleteComment,
}: {
  report: Report;
  /** 목록과 같은 상태 아이콘 — 어느 신고를 열었는지 바로 알아보게 한다. */
  icon?: ReactNode;
  /** 원본 댓글 위치. 부모 글이 사라졌으면 없다. */
  url?: string | null;
  onResolve?: () => void;
  onDismiss?: () => void;
  onDeleteComment?: () => void;
}) {
  const { language, t } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);

  const STATUS_LABEL: Record<Report["status"], string> = {
    pending: t("admin.reports.filter.pending"),
    resolved: t("admin.reports.filter.resolved"),
    dismissed: t("admin.reports.filter.dismissed"),
  };

  const formatFull = (iso: string) =>
    new Date(iso).toLocaleString(language === "ko" ? "ko-KR" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const isPending = report.status === "pending";
  const withClose = (fn?: () => void) => () => { closeModal(); fn?.(); };

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div className={styles.headText}>
          <span className={styles.type}>
            {report.comment_type === "post" ? t("admin.reports.fromPost") : t("admin.reports.fromWork")}
            {report.comment?.parentTitle ? ` · ${report.comment.parentTitle}` : ""}
          </span>
          <h3 className={styles.title}>
            {report.comment?.nickname ?? L("(알 수 없는 작성자)", "(unknown author)")}
            {report.comment?.is_deleted && (
              <span className={styles.deletedBadge}>{t("admin.reports.commentDeleted")}</span>
            )}
          </h3>
        </div>
      </div>

      {/* 신고된 댓글 전문 — 인용부호로 남의 글임을 드러낸다 (알림 상세와 같은 처리) */}
      <p className={styles.comment}>
        {report.comment ? report.comment.content || "—" : t("admin.reports.commentGone")}
      </p>

      <dl className={styles.meta}>
        {report.reason && (
          <div className={styles.metaRow}>
            <dt>{t("admin.reports.reason")}</dt>
            <dd>{report.reason}</dd>
          </div>
        )}
        <div className={styles.metaRow}>
          <dt>{L("상태", "Status")}</dt>
          <dd>
            <span className={`${styles.statusChip} ${styles[`status_${report.status}`]}`}>
              {STATUS_LABEL[report.status]}
            </span>
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt>{L("신고 시각", "Reported")}</dt>
          <dd>{formatFull(report.created_at)}</dd>
        </div>
        {report.resolved_at && (
          <div className={styles.metaRow}>
            <dt>{L("처리 시각", "Handled")}</dt>
            <dd>{formatFull(report.resolved_at)}</dd>
          </div>
        )}
      </dl>

      {footerEl && createPortal(
        <>
          <Button variant="ghost" size="sm" onClick={() => closeModal()}>
            {L("닫기", "Close")}
          </Button>
          {url && (
            <Button
              href={url}
              external
              variant="outline"
              size="sm"
              icon={<ExternalLink size={13} strokeWidth={1.8} />}
            >
              {t("admin.reports.view")}
            </Button>
          )}
          {isPending && report.comment && !report.comment.is_deleted && (
            <Button
              variant="outline"
              size="sm"
              tone="danger"
              icon={<Trash2 size={13} strokeWidth={1.8} />}
              onClick={withClose(onDeleteComment)}
            >
              {t("admin.reports.deleteComment")}
            </Button>
          )}
          {isPending && (
            <Button
              variant="outline"
              size="sm"
              icon={<X size={13} strokeWidth={1.8} />}
              onClick={withClose(onDismiss)}
            >
              {t("admin.reports.dismiss")}
            </Button>
          )}
          {isPending && (
            <Button
              variant="primary"
              size="sm"
              icon={<Check size={13} strokeWidth={1.8} />}
              onClick={withClose(onResolve)}
            >
              {t("admin.reports.resolve")}
            </Button>
          )}
        </>,
        footerEl,
      )}
    </div>
  );
}
