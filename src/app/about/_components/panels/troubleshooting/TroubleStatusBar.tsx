"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
import { COPY_FEEDBACK_MS } from "@/constants";
import { showToast } from "@/stores/toastStore";
import { itemToMarkdown, itemFileName, CANONICAL_HEADINGS } from "@/lib/about/decisionsMarkdown";
import type { TroubleShootingItem } from "@/data/about/types";
import type { Language } from "@/providers/LanguageProvider";
import shared from "../../AboutSection.module.css";
import local from "../TroubleshootingPanel.module.css";
const styles = { ...shared, ...local };

/* IDE 상태 바 — 현재 항목을 markdown 으로 내보내기 + 본문 글자 크기 조절.
   내보내기 형식과 복사 상태, 폰트 툴팁은 여기서만 쓰므로 함께 들고 있다.
   글자 크기 자체는 에디터도 읽어야 해서 부모가 소유하고 값만 받는다. */
export default function TroubleStatusBar({
  items,
  displayIndex,
  language,
  isMobile,
  contentRef,
  fontScale,
  onFontScaleChange,
}: {
  items: TroubleShootingItem[];
  displayIndex: number;
  language: Language;
  isMobile: boolean;
  /** 폰트 툴팁을 패널 진입 시점에 띄우기 위한 관찰 대상 */
  contentRef: React.RefObject<HTMLDivElement | null>;
  fontScale: number;
  onFontScaleChange: (next: number) => void;
}) {
  // 폰트 조절 툴팁 — 패널에 진입할 때마다 표시, 사용자 클릭/키 입력 시 dismiss.
  // 스크롤은 트리거 아님 (패널에 진입하는 행위 자체가 스크롤이라 즉시 사라지는 걸 막음).
  const [showFontTooltip, setShowFontTooltip] = useState(false);
  const wasVisibleRef = useRef(false);
  useEffect(() => {
    if (!isMobile) return;
    const el = contentRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nowVisible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
        if (nowVisible && !wasVisibleRef.current) {
          // not-visible → visible 전환 (패널 진입) — 툴팁 표시
          setShowFontTooltip(true);
        }
        wasVisibleRef.current = nowVisible;
      },
      { threshold: [0, 0.4, 0.8] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, contentRef]);

  useEffect(() => {
    if (!showFontTooltip) return;
    const dismiss = () => setShowFontTooltip(false);
    window.addEventListener("click", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [showFontTooltip]);

  const buildMarkdown = useCallback(() => {
    const item = items[displayIndex];
    if (!item) return null;
    /* 소제목은 화면 번역이 아니라 파서가 찾는 고정 라벨(CANONICAL_HEADINGS)을 쓴다.
       이 파일이 content/about/decisions/ 로 들어가 되읽히므로 형식이 흔들리면 안 된다. */
    const md = itemToMarkdown(item, language, CANONICAL_HEADINGS);
    return { md, filename: itemFileName(item, displayIndex, language) };
  }, [items, displayIndex, language]);

  const [copiedMd, setCopiedMd] = useState(false);
  const handleCopyMarkdown = useCallback(async () => {
    const built = buildMarkdown();
    if (!built) return;
    try {
      await navigator.clipboard.writeText(built.md);
      setCopiedMd(true);
      showToast(language === "ko" ? "markdown 을 복사했습니다." : "Copied as markdown.", "success");
      setTimeout(() => setCopiedMd(false), COPY_FEEDBACK_MS);
    } catch {
      showToast(
        language === "ko" ? "클립보드를 쓸 수 없습니다." : "Clipboard is unavailable.",
        "error",
      );
    }
  }, [buildMarkdown, language]);

  const handleDownloadMarkdown = useCallback(() => {
    const built = buildMarkdown();
    if (!built) return;
    const url = URL.createObjectURL(new Blob([built.md], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = built.filename;
    a.click();
    /* revoke 를 같은 tick 에 하면 다운로드가 시작되기 전에 blob 이 사라진다. */
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [buildMarkdown]);

  return (
          <div className={styles.ideStatusBar}>
            <span className={`${styles.ideStatusGroup} ${styles.ideStatusGroupOptional}`}>
              <span className={styles.ideStatusDot} aria-hidden />
              {items[displayIndex]?.section?.[language] ?? "-"}
            </span>
            <span className={styles.ideStatusGroup}>
              {String(displayIndex + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")}
            </span>
            <span className={`${styles.ideStatusGroup} ${styles.ideStatusGroupOptional}`}>MARKDOWN</span>
            <span className={styles.ideStatusActions}>
              {/* 이 항목을 .md 로 — 복사 / 파일 저장 */}
              <Tooltip
                content={language === "ko" ? "markdown 으로 복사" : "Copy as markdown"}
                placement="top"
                delay={150}
              >
                <Pressable noTapScale
                  data-clickable="true"
                  className={styles.ideStatusActionBtn}
                  onClick={handleCopyMarkdown}
                  aria-label={language === "ko" ? "markdown 으로 복사" : "Copy as markdown"}
                >
                  {copiedMd ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.8} />}
                </Pressable>
              </Tooltip>
              <Tooltip
                content={language === "ko" ? ".md 파일로 내보내기" : "Export as .md"}
                placement="top"
                delay={150}
              >
                <Pressable noTapScale
                  data-clickable="true"
                  className={styles.ideStatusActionBtn}
                  onClick={handleDownloadMarkdown}
                  aria-label={language === "ko" ? ".md 파일로 내보내기" : "Export as .md"}
                >
                  <Download size={15} strokeWidth={1.8} />
                </Pressable>
              </Tooltip>
            </span>
            <span className={styles.ideStatusFontControls} style={{ position: "relative" }}>
              <AnimatePresence>
                {showFontTooltip && (
                  <motion.span
                    key="font-tooltip"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className={styles.ideFontTooltip}
                  >
                    글자 크기 조절
                  </motion.span>
                )}
              </AnimatePresence>
              <Pressable noTapScale
                data-clickable="true"
                className={styles.ideStatusFontBtn}
                onClick={() => {
                  onFontScaleChange(Math.max(0.8, +(fontScale - 0.1).toFixed(2)));
                  setShowFontTooltip(false);
                }}
                disabled={fontScale <= 0.8}
                aria-label="Decrease font size"
              >
                A−
              </Pressable>
              <span className={styles.ideStatusFontValue}>
                {Math.round(fontScale * 100)}%
              </span>
              <Pressable noTapScale
                data-clickable="true"
                className={styles.ideStatusFontBtn}
                onClick={() => {
                  onFontScaleChange(Math.min(1.4, +(fontScale + 0.1).toFixed(2)));
                  setShowFontTooltip(false);
                }}
                disabled={fontScale >= 1.4}
                aria-label="Increase font size"
              >
                A+
              </Pressable>
            </span>
          </div>
  );
}
