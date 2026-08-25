"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Check, AlertCircle } from "@/components/icons";
import Button from "@/components/ui/Button";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
import modal from "@/components/ui/ModalTemplates.module.css";
import styles from "./AccessRequestModal.module.css";

/** 요청 대상 — 제목은 화면 표시용, id 는 요청 경로에 쓴다. */
export interface AccessRequestTarget {
  id: string;
  title: string;
}

/** 목록에 한 번에 보여줄 개수. 넘치면 "외 N개" 로 접는다. */
const SHOWN = 5;

type Phase = "idle" | "sending" | "done";

/**
 * 권한 없음 안내 + 소유자에게 권한 요청.
 *
 * "소유자에게 요청해 주세요" 로 끝내면 요청할 방법이 화면 밖에 있다. 여기서 바로 남길 수 있게 한다.
 * 요청은 소유자 알림으로 쌓이고, 실제 부여는 설정 › 저자에서 이뤄진다.
 *
 * 보낸 뒤에는 화면을 통째로 결과로 바꾼다. 안내문 아래에 한 줄을 덧붙이는 방식은 이미 읽은
 * 문단 사이에 묻혀서, 요청이 실제로 나갔는지 확신을 주지 못한다.
 */
export default function AccessRequestModal({
  targets, desc, endpoint = "posts",
}: {
  targets: AccessRequestTarget[];
  /** 안내 문구. 생략하면 글 기준 문구를 쓴다. */
  desc?: string;
  /** 요청을 받는 리소스 — /api/admin/{endpoint}/{id}/request-access */
  endpoint?: "posts" | "works";
}) {
  const { t, language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sentCount, setSentCount] = useState(0);

  const shown = targets.slice(0, SHOWN);
  const rest = targets.length - shown.length;

  const request = async () => {
    setPhase("sending");
    const results = await Promise.all(
      targets.map((tg) =>
        fetch(`/api/admin/${endpoint}/${tg.id}/request-access`, { method: "POST" })
          .then((r) => r.ok)
          .catch(() => false),
      ),
    );
    setSentCount(results.filter(Boolean).length);
    setPhase("done");
  };

  /* ── 보낸 뒤 ── */
  if (phase === "done") {
    const ok = sentCount > 0;
    const partial = ok && sentCount < targets.length;
    return (
      <div className={styles.result}>
        <span className={`${styles.resultIcon}${ok ? "" : ` ${styles.resultIconFail}`}`}>
          {ok ? <Check size={22} strokeWidth={2.4} aria-hidden /> : <AlertCircle size={22} strokeWidth={2} aria-hidden />}
        </span>
        <p className={styles.resultTitle}>
          {ok
            ? L("권한 요청을 보냈습니다", "Access request sent")
            : L("요청을 보내지 못했습니다", "Could not send the request")}
        </p>
        <p className={styles.resultDesc}>
          {ok
            ? partial
              ? L(`${targets.length}건 중 ${sentCount}건이 전달됐습니다. 나머지는 잠시 후 다시 시도해 주세요.`,
                  `${sentCount} of ${targets.length} were delivered. Please retry the rest shortly.`)
              : L("소유자에게 알림이 전달됐습니다. 승인되면 이 글을 바로 다룰 수 있습니다.",
                  "The owner has been notified. Once approved, you can work on this post right away.")
            : L("네트워크 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.",
                "This may be a network issue. Please try again shortly.")}
        </p>
        {ok && targets.length > 1 && (
          <ul className={styles.resultTargets}>
            {shown.map((tg) => <li key={tg.id}>{tg.title}</li>)}
            {rest > 0 && <li>{t("admin.posts.noPermissionMore").replace("{{count}}", String(rest))}</li>}
          </ul>
        )}
        {footerEl && createPortal(
          <>
            {!ok && (
              <Button variant="ghost" size="sm" onClick={() => setPhase("idle")}>
                {L("다시 시도", "Try again")}
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => closeModal()}>
              {t("admin.common.confirm")}
            </Button>
          </>,
          footerEl,
        )}
      </div>
    );
  }

  /* ── 보내기 전 ── */
  return (
    <div className={modal.body}>
      <p className={modal.desc}>{desc ?? t("admin.posts.noPermissionDesc")}</p>

      {targets.length > 1 && (
        <ul className={modal.itemList}>
          {shown.map((tg) => <li key={tg.id}>{tg.title}</li>)}
          {rest > 0 && (
            <li className={modal.itemListMore}>
              {t("admin.posts.noPermissionMore").replace("{{count}}", String(rest))}
            </li>
          )}
        </ul>
      )}

      {footerEl && createPortal(
        <>
          <Button variant="ghost" size="sm" onClick={() => closeModal()}>
            {L("닫기", "Close")}
          </Button>
          <Button variant="primary" size="sm" onClick={request} disabled={phase === "sending"} loading={phase === "sending"}>
            {L("권한 요청", "Request access")}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
