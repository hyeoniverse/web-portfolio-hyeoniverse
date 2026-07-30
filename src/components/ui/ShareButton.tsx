"use client";

import { useState, useCallback } from "react";
import { COPY_FEEDBACK_MS } from "@/constants";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import DetailActionButton from "./DetailActionButton";
import ShareIcon from "./ShareIcon/ShareIcon";
import styles from "./ShareButton.module.css";

/* 공유 버튼 — 두 자리에 놓이고 자리마다 이웃이 달라서 규격이 갈린다.

   compact(기본) — 상세 헤더 메타 줄. 옆의 LanguageToggle 과 같은 28px 캡슐.
   action        — 게시물 하단, 좋아요 옆. 껍데기를 DetailActionButton 으로 좋아요와 공유(47px).

   아이콘은 어느 쪽이든 좋아요의 HeartIcon 처럼 **교체하지 않고 계속 살려둔 채** 애니메이션한다.
   (예전엔 복사 시 Check 로 갈아끼웠는데, 그러면 아이콘 자신의 모션이 보일 새가 없다) */

interface ShareButtonProps {
  className?: string;
  /** action — 하단 좋아요 옆(공유 껍데기). 기본 compact 는 헤더 메타 줄용 */
  variant?: "compact" | "action";
}

export default function ShareButton({ className, variant = "compact" }: ShareButtonProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const isAction = variant === "action";

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ url }); } catch { /* user cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast(t("editor.linkCopied"), "success");
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard not available */
    }
  }, [t]);

  const content = (
    <>
      <ShareIcon size={isAction ? 18 : 12} copied={copied} />
      {/* 라벨만 교체 — 아이콘은 위에서 계속 살아있다 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "copied" : "share"}
          className={styles.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {copied ? "Copied" : "Share"}
        </motion.span>
      </AnimatePresence>
    </>
  );

  if (isAction) {
    return (
      <DetailActionButton active={copied} onClick={handleShare} className={className} title={t("common.share")}>
        {content}
      </DetailActionButton>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.compact}${copied ? ` ${styles.compactCopied}` : ""}${className ? ` ${className}` : ""}`}
      onClick={handleShare}
      title={t("common.share")}
      data-clickable="true"
    >
      {content}
    </button>
  );
}
