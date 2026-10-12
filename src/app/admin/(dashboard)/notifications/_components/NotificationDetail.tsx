"use client";

import { useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAdminTexts } from "@/hooks/useAdminTexts";
import styles from "./NotificationDetail.module.css";

export interface NotificationDetailData {
  type: string;
  typeLabel: string;
  title: string;
  message: string;
  metadata: Record<string, string>;
  createdAt: string;
  read: boolean;
}

/** metadata 키의 사람이 읽는 이름. 없는 키는 원래 이름 그대로 보여준다. */
const META_LABELS: Record<string, string> = {
  url: "admin.inline.notificationDetail.metaUrl",
  postId: "admin.inline.notificationDetail.metaPostId",
  workId: "admin.inline.notificationDetail.metaWorkId",
  commentId: "admin.inline.notificationDetail.metaCommentId",
  requestedBy: "admin.inline.notificationDetail.metaRequestedBy",
  userId: "admin.inline.notificationDetail.metaUserId",
  authorId: "admin.inline.notificationDetail.metaAuthorId",
  resolved: "admin.inline.notificationDetail.metaResolved",
  resolvedAt: "admin.inline.notificationDetail.metaResolvedAt",
  nickname: "admin.inline.notificationDetail.metaNickname",
  reason: "admin.inline.notificationDetail.metaReason",
  ip: "admin.inline.notificationDetail.metaIp",
  userAgent: "admin.inline.notificationDetail.metaUserAgent",
};

/**
 * 알림 상세.
 *
 * 목록에서는 제목·본문이 줄 수에 맞춰 잘리고, metadata 는 아예 보이지 않는다.
 * 링크가 붙은 알림만 클릭이 동작해서, 나머지는 내용을 끝까지 볼 방법이 없었다.
 */
export default function NotificationDetail({
  data, icon, onGo, onResolve,
}: {
  data: NotificationDetailData;
  /** 목록과 같은 타입 아이콘 — 어느 알림을 열었는지 바로 알아보게 한다. */
  icon?: ReactNode;
  /** metadata.url 이 있을 때의 이동 동작. */
  onGo?: () => void;
  /** 권한 요청을 이 자리에서 처리한다. 실패 사유를 돌려주면 모달 안에 띄운다. */
  onResolve?: (action: "grant" | "reject") => Promise<{ ok: boolean; reason?: string }>;
}) {
  const { t } = useLanguage();
  /* 제목 · 본문은 서버가 만든 정해진 글 — 다른 언어로 볼 때 번역한다 */
  const ts = useAdminTexts([data.title, data.message]);
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);
  const [resolving, setResolving] = useState<"grant" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entries = Object.entries(data.metadata ?? {}).filter(([, v]) => v !== "" && v != null);

  /* 이미 처리된 요청에는 버튼을 그리지 않는다 — 결과만 metadata 로 보인다. */
  const canResolve = !!onResolve && data.type === "access_request" && !data.metadata?.resolved;

  const resolve = async (action: "grant" | "reject") => {
    if (!onResolve) return;
    setResolving(action);
    setError(null);
    const res = await onResolve(action);
    setResolving(null);
    /* 성공하면 목록이 갱신되며 모달이 닫힌다. 실패는 여기에 남겨야 한다 —
       모달이 화면을 덮고 있어 페이지 상단 메시지는 보이지 않는다. */
    if (!res.ok) setError(res.reason ?? t("admin.inline.notificationDetail.couldNotComplete"));
  };

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div className={styles.headText}>
          <span className={styles.type}>{data.typeLabel}</span>
          <h3 className={styles.title}>{ts(data.title)}</h3>
        </div>
      </div>

      {data.message && <p className={styles.message}>{ts(data.message)}</p>}

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>{t("admin.inline.notificationDetail.received")}</dt>
          <dd>{data.createdAt}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>{t("admin.inline.notificationDetail.status")}</dt>
          <dd>{data.read ? t("admin.inline.notificationDetail.read") : t("admin.inline.notificationDetail.unread")}</dd>
        </div>
        {entries.map(([k, v]) => (
          <div key={k} className={styles.metaRow}>
            <dt>{META_LABELS[k] ? t(META_LABELS[k]) : k}</dt>
            <dd className={styles.metaValue}>{String(v)}</dd>
          </div>
        ))}
      </dl>

      {error && <p className={styles.error}>{error}</p>}

      {footerEl && createPortal(
        <>
          <Button variant="ghost" onClick={() => closeModal()} disabled={!!resolving}>
            {t("admin.inline.notificationDetail.close")}
          </Button>
          {canResolve && (
            <Button
              variant="outline"
              tone="danger"
              onClick={() => resolve("reject")}
              disabled={!!resolving}
            >
              {resolving === "reject" ? t("admin.inline.notificationDetail.working") : t("admin.inline.notificationDetail.reject")}
            </Button>
          )}
          {canResolve && (
            <Button
              variant="primary"
              onClick={() => resolve("grant")}
              disabled={!!resolving}
            >
              {resolving === "grant" ? t("admin.inline.notificationDetail.working") : t("admin.inline.notificationDetail.grantAccess")}
            </Button>
          )}
          {onGo && !canResolve && (
            <Button variant="primary" onClick={() => { closeModal(); onGo(); }}>
              {t("admin.inline.notificationDetail.open")}
            </Button>
          )}
        </>,
        footerEl,
      )}
    </div>
  );
}
