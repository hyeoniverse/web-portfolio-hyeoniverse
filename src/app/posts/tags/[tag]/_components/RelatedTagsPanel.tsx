"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { TagPageData, AllTagsData } from "@/lib/posts";
import { ChevronRight } from "@/components/icons";
import Tooltip from "@/components/ui/Tooltip";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import styles from "./RelatedTagsPanel.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

/* 관련 태그 줄 — 헤더(툴팁 붙은 "관련 태그" 토글 · 다중 선택) + pills + "그 외 전체 태그" 펼침 패널.
   다중 선택(selectMode)과 추가 필터(extraTags)는 fetch 에 걸리는 값이라 부모 것, 펼침(showAllTags)은 여기 로컬. 관련 태그가 없으면 렌더하지 않는다. */
export default function RelatedTagsPanel({
  tag,
  relatedTags,
  allTags,
  selectMode,
  onToggleSelectMode,
  extraTags,
  onToggleExtraTag,
  onClearExtraTags,
}: {
  tag: string;
  relatedTags: TagPageData["relatedTags"];
  allTags: AllTagsData["tags"];
  selectMode: boolean;
  onToggleSelectMode: () => void;
  extraTags: Set<string>;
  onToggleExtraTag: (tag: string) => void;
  onClearExtraTags: () => void;
}) {
  const { t } = useLanguage();
  // 관련 태그 헤더 트리거로 펼치는 "그 외 전체 태그" 패널
  const [showAllTags, setShowAllTags] = useState(false);
  // 관련 태그 + 현재 태그를 제외한 나머지 전체 태그 (count desc — getAllTagsData 정렬 유지)
  const otherTags = useMemo(() => {
    const exclude = new Set<string>([tag, ...relatedTags.map((r) => r.tag)]);
    return allTags.filter((t) => !exclude.has(t.tag));
  }, [allTags, relatedTags, tag]);
  if (relatedTags.length === 0) return null;
  return (
    <div className={styles.relatedRow}>
      <div className={styles.relatedHeader}>
        <Tooltip
          placement="top"
          delay={200}
          content={
            <div className={styles.relatedLabelTooltip}>
              <div className={styles.relatedLabelTooltipMain}>{t("postsPage.relatedTags")}</div>
              <div className={styles.relatedLabelTooltipDesc}>
                {t("postsPage.relatedTagsHint")}
              </div>
            </div>
          }
        >
          <Button
            variant="ghost"
            size="2xs"
            className={styles.relatedToggle}
            active={showAllTags}
            onClick={() => setShowAllTags((v) => !v)}
            icon={
              <ChevronRight
                size={13}
                strokeWidth={2.2}
                className={`${styles.relatedToggleChevron} ${showAllTags ? styles.relatedToggleChevronOpen : ""}`}
                aria-hidden
              />
            }
            title={showAllTags ? t("postsPage.collapseAllTags") : t("postsPage.expandAllTags")}
          >
            {t("postsPage.relatedTags")}
          </Button>
        </Tooltip>
        <Button
          variant="outline"
          size="2xs"
          active={selectMode}
          className={styles.selectModeBtn}
          onClick={onToggleSelectMode}
          title={selectMode ? t("postsPage.multiSelectOff") : t("postsPage.multiSelectOn")}
        >
          {t("postsPage.multiSelect")}
        </Button>
      </div>
      <div className={styles.relatedTags}>
        {selectMode && (
          <Pressable
            className={`${styles.relatedPill} ${styles.relatedPillSelectable} ${extraTags.size === 0 ? styles.relatedPillActive : ""}`}
            onClick={onClearExtraTags}
            title={t("postsPage.clearExtraTags")}
          >
            <span>{t("common.all")}</span>
          </Pressable>
        )}
        {relatedTags.map(({ tag: rt, count }) => {
          const active = extraTags.has(rt);
          const inner = (
            <>
              <span>#{rt}</span>
              <span className={styles.relatedPillCount}>{count}</span>
            </>
          );
          if (selectMode) {
            return (
              <Pressable
                key={rt}
                className={`${styles.relatedPill} ${styles.relatedPillSelectable} ${active ? styles.relatedPillActive : ""}`}
                onClick={() => onToggleExtraTag(rt)}
              >
                {inner}
              </Pressable>
            );
          }
          return (
            <Link
              key={rt}
              href={`/posts/tags/${encodeURIComponent(rt)}`}
              className={styles.relatedPill}
            >
              {inner}
            </Link>
          );
        })}
      </div>
      <AnimatePresence initial={false}>
        {showAllTags && (
          <motion.div
            className={styles.allTagsPanel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
            }}
          >
            <div className={styles.allTagsInner}>
              {otherTags.length === 0 ? (
                <span className={styles.allTagsEmpty}>{t("postsPage.noOtherTags")}</span>
              ) : (
                otherTags.map((other) => (
                  <Link
                    key={other.tag}
                    href={`/posts/tags/${encodeURIComponent(other.tag)}`}
                    className={styles.relatedPill}
                  >
                    <span>#{other.tag}</span>
                    <span className={styles.relatedPillCount}>{other.count}</span>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
