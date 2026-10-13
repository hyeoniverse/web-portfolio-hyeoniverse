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
import { localizeReportReason } from "@/lib/reportReasons";
import Badge from "@/components/ui/Badge";

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
  const { language, t, tLang } = useLanguage();
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
            {report.comment?.nickname ?? t("admin.inline.reportDetail.unknownAuthor")}
            {report.comment?.is_deleted && (
              <Badge>{t("admin.reports.commentDeleted")}</Badge>
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
            <dd>{localizeReportReason(report.reason, t, tLang)}</dd>
          </div>
        )}
        <div className={styles.metaRow}>
          <dt>{t("admin.inline.reportDetail.status")}</dt>
          <dd>
            {/* 처리 대기는 결정이 필요하다는 뜻이라 알림의 "처리 필요" 와 같은 warning */}
            <Badge tone={report.status === "pending" ? "warning" : report.status === "resolved" ? "success" : "neutral"}>
              {STATUS_LABEL[report.status]}
            </Badge>
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt>{t("admin.inline.reportDetail.reported")}</dt>
          <dd>{formatFull(report.created_at)}</dd>
        </div>
        {report.resolved_at && (
          <div className={styles.metaRow}>
            <dt>{t("admin.inline.reportDetail.handled")}</dt>
            <dd>{formatFull(report.resolved_at)}</dd>
          </div>
        )}
      </dl>

      {footerEl && createPortal(
        <>
          <Button variant="ghost" onClick={() => closeModal()}>
            {t("admin.inline.reportDetail.close")}
          </Button>
          {url && (
            <Button
              href={url}
              external
              variant="outline"
              icon={<ExternalLink size={13} strokeWidth={1.8} />}
            >
              {t("admin.reports.view")}
            </Button>
          )}
          {isPending && report.comment && !report.comment.is_deleted && (
            <Button
              variant="outline"
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
              icon={<X size={13} strokeWidth={1.8} />}
              onClick={withClose(onDismiss)}
            >
              {t("admin.reports.dismiss")}
            </Button>
          )}
          {isPending && (
            <Button
              variant="primary"
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
