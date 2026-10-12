"use client";

import { fillTemplate } from "@/utils/format";
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
  const { t } = useLanguage();
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
            ? t("admin.inline.accessRequestModal.accessRequestSent")
            : t("admin.inline.accessRequestModal.sendFailed")}
        </p>
        <p className={styles.resultDesc}>
          {ok
            ? partial
              ? fillTemplate(t("admin.inline.accessRequestModal.partialSent"), { targets: targets.length, sentCount })
              : t("admin.inline.accessRequestModal.theOwnerHasBeen")
            : t("admin.inline.accessRequestModal.networkRetryHint")}
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
              <Button variant="ghost" onClick={() => setPhase("idle")}>
                {t("admin.inline.accessRequestModal.tryAgain")}
              </Button>
            )}
            <Button variant="primary" onClick={() => closeModal()}>
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
          <Button variant="ghost" onClick={() => closeModal()}>
            {t("admin.inline.accessRequestModal.close")}
          </Button>
          <Button variant="primary" onClick={request} disabled={phase === "sending"} loading={phase === "sending"}>
            {t("admin.inline.accessRequestModal.requestAccess")}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
