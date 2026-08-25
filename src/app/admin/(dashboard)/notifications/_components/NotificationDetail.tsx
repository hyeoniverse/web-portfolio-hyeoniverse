"use client";

import { useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
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
const META_LABELS: Record<string, { ko: string; en: string }> = {
  url: { ko: "바로가기", en: "Link" },
  postId: { ko: "글 id", en: "Post id" },
  workId: { ko: "작업물 id", en: "Work id" },
  commentId: { ko: "댓글 id", en: "Comment id" },
  requestedBy: { ko: "요청자", en: "Requested by" },
  userId: { ko: "계정 id", en: "Account id" },
  authorId: { ko: "저자 프로필", en: "Author profile" },
  resolved: { ko: "처리 결과", en: "Outcome" },
  resolvedAt: { ko: "처리 시각", en: "Resolved at" },
  nickname: { ko: "닉네임", en: "Nickname" },
  reason: { ko: "사유", en: "Reason" },
  ip: { ko: "IP", en: "IP" },
  userAgent: { ko: "브라우저", en: "Browser" },
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
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
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
    if (!res.ok) setError(res.reason ?? L("처리하지 못했습니다.", "Could not complete."));
  };

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div className={styles.headText}>
          <span className={styles.type}>{data.typeLabel}</span>
          <h3 className={styles.title}>{data.title}</h3>
        </div>
      </div>

      {data.message && <p className={styles.message}>{data.message}</p>}

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>{L("받은 시각", "Received")}</dt>
          <dd>{data.createdAt}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>{L("상태", "Status")}</dt>
          <dd>{data.read ? L("읽음", "Read") : L("읽지 않음", "Unread")}</dd>
        </div>
        {entries.map(([k, v]) => (
          <div key={k} className={styles.metaRow}>
            <dt>{META_LABELS[k] ? L(META_LABELS[k].ko, META_LABELS[k].en) : k}</dt>
            <dd className={styles.metaValue}>{String(v)}</dd>
          </div>
        ))}
      </dl>

      {error && <p className={styles.error}>{error}</p>}

      {footerEl && createPortal(
        <>
          <Button variant="ghost" size="sm" onClick={() => closeModal()} disabled={!!resolving}>
            {L("닫기", "Close")}
          </Button>
          {canResolve && (
            <Button
              variant="outline"
              size="sm"
              tone="danger"
              onClick={() => resolve("reject")}
              disabled={!!resolving}
            >
              {resolving === "reject" ? L("처리 중...", "Working...") : L("거절", "Reject")}
            </Button>
          )}
          {canResolve && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => resolve("grant")}
              disabled={!!resolving}
            >
              {resolving === "grant" ? L("처리 중...", "Working...") : L("권한 부여", "Grant access")}
            </Button>
          )}
          {onGo && !canResolve && (
            <Button variant="primary" size="sm" onClick={() => { closeModal(); onGo(); }}>
              {L("바로가기", "Open")}
            </Button>
          )}
        </>,
        footerEl,
      )}
    </div>
  );
}
