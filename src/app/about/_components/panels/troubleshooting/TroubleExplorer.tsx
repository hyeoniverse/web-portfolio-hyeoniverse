"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star, ChevronDown, Folder, FileText, Filter, Check } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
import type { LocalizedText } from "@/types/common";
import type { TroubleShootingItem } from "@/data/about/types";
import type { Language } from "@/providers/LanguageProvider";
import { DIFFICULTY_META, DifficultyBadge } from "./difficulty";
import { displayTitle } from "./itemHelpers";
import local from "../TroubleshootingPanel.module.css";
import own from "./TroubleExplorer.module.css";
const styles = { ...local, ...own };

/** 난이도 단계(1~3) 또는 추천만 보기. 사이드바 밖에서는 쓰지 않는다. */
export type FilterMode = "all" | "recommended" | 1 | 2 | 3;

const FILTER_OPTIONS: { key: FilterMode; label: LocalizedText }[] = [
  { key: "all", label: { ko: "전체", en: "All" } },
  { key: "recommended", label: { ko: "추천만", en: "Recommended" } },
  { key: 1, label: { ko: "쉬움", en: "Easy" } },
  { key: 2, label: { ko: "보통", en: "Medium" } },
  { key: 3, label: { ko: "어려움", en: "Hard" } },
];

/* IDE 탐색기 스타일 사이드바 — PC 만 노출(모바일은 탭 바가 대신한다).
   필터와 폴더 접기는 사이드바 안에서만 쓰는 상태라 여기서 들고 있고,
   필터가 걸리면 보이는 목록이 달라지므로 그 결과만 부모에게 올려 준다. */
export default function TroubleExplorer({
  items,
  language,
  activeIndex,
  onItemClick,
  listRef,
  onVisibleItemsChange,
}: {
  items: TroubleShootingItem[];
  language: Language;
  /** 현재 열려 있는 항목의 원본 index */
  activeIndex: number;
  onItemClick: (index: number) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  /** 필터 결과를 부모에게 — 탭 바와 스크롤 전환이 같은 목록을 봐야 한다 */
  onVisibleItemsChange: (visible: { item: TroubleShootingItem; idx: number }[]) => void;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 메뉴 밖 클릭으로 닫기
  useEffect(() => {
    if (!filterMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!filterWrapRef.current?.contains(e.target as Node)) setFilterMenuOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [filterMenuOpen]);

  // 필터 통과한 항목 + 원래 index 보존 (부모의 index 비교와 맞춰야 한다)
  const visibleItems = useMemo(
    () =>
      items
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          if (filterMode === "all") return true;
          if (filterMode === "recommended") return !!item.recommended;
          return item.difficulty === filterMode;
        }),
    [items, filterMode],
  );

  useEffect(() => { onVisibleItemsChange(visibleItems); }, [visibleItems, onVisibleItemsChange]);

  const displayIndex = activeIndex;

  return (
          <div className={styles.troubleList}>
            <div className={styles.ideExplorerHeader}>
              <span>{language === "ko" ? "탐색기" : "Explorer"}</span>
              <div ref={filterWrapRef} className={styles.ideExplorerFilterWrap}>
                <Pressable noTapScale
                  data-clickable="true"
                  className={`${styles.ideExplorerFilterBtn} ${filterMode !== "all" ? styles.ideExplorerFilterBtnActive : ""}`}
                  onClick={() => setFilterMenuOpen((o) => !o)}
                  aria-label={language === "ko" ? "필터" : "Filter"}
                >
                  <Filter size={14} strokeWidth={2} />
                </Pressable>
                {filterMenuOpen && (
                  <div className={styles.ideExplorerFilterMenu} role="menu">
                    {FILTER_OPTIONS.map((opt) => (
                      <Pressable noTapScale
                        key={String(opt.key)}
                        data-clickable="true"
                        className={`${styles.ideExplorerFilterMenuItem} ${filterMode === opt.key ? styles.ideExplorerFilterMenuItemActive : ""}`}
                        onClick={() => {
                          setFilterMode(opt.key);
                          setFilterMenuOpen(false);
                        }}
                      >
                        <span className={styles.ideExplorerFilterCheck}>
                          {filterMode === opt.key && <Check size={13} strokeWidth={2.5} />}
                        </span>
                        <span>{opt.label[language]}</span>
                      </Pressable>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div ref={listRef} className={styles.troubleListScroll}>
              {visibleItems.map(({ item, idx: index }, visIdx) => {
                // 같은 section 의 첫 번째 항목일 때만 라벨 렌더 (그룹 헤더 역할) — filter 후 prev 기준
                const prev = visIdx > 0 ? visibleItems[visIdx - 1].item : null;
                const isSectionStart = !!item.section && item.section.ko !== prev?.section?.ko;
                // 그룹 내 visible 위치 — count badge 용 (filter 적용된 카운트)
                const sectionItems = visibleItems.filter((v) => v.item.section?.ko === item.section?.ko);
                const sectionKey = item.section?.ko ?? "__none__";
                const isCollapsed = collapsedSections.has(sectionKey);
                return (
                  <React.Fragment key={index}>
                    {isSectionStart && item.section && (
                      <div
                        data-clickable="true"
                        className={styles.troubleSectionLabel}
                        onClick={() => toggleSection(sectionKey)}
                      >
                        <span className={styles.troubleSectionFolder}>
                          <ChevronDown
                            size={14}
                            strokeWidth={2}
                            className={`${styles.ideExplorerChevron} ${isCollapsed ? styles.ideExplorerChevronCollapsed : ""}`}
                            aria-hidden
                          />
                          <Folder size={14} strokeWidth={2} className={styles.ideExplorerFolderIcon} aria-hidden />
                          {item.section[language]}
                        </span>
                        <span className={styles.troubleSectionCount}>{sectionItems.length}</span>
                      </div>
                    )}
                    {!isCollapsed && (
                    <Tooltip
                      placement="right"
                      delay={250}
                      wrapperStyle={{ display: "block", width: "100%", minWidth: 0 }}
                      content={
                        <div className={styles.ideExplorerFileTooltip}>
                          <div className={styles.ideExplorerFileTooltipMain}>{displayTitle(item)[language]}</div>
                          {displayTitle(item)[language === "ko" ? "en" : "ko"] !== displayTitle(item)[language] && (
                            <div className={styles.ideExplorerFileTooltipSub}>
                              {displayTitle(item)[language === "ko" ? "en" : "ko"]}
                            </div>
                          )}
                          {item.difficulty && (
                            <div className={styles.ideExplorerFileTooltipDifficulty}>
                              <span className={`${styles.difficultyBadge} ${styles[`difficultyTone_${DIFFICULTY_META[item.difficulty].tone}`]}`}>
                                {DIFFICULTY_META[item.difficulty].label[language]}
                              </span>
                              <span className={styles.ideExplorerFileTooltipDifficultyDesc}>
                                {DIFFICULTY_META[item.difficulty].desc[language]}
                              </span>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div
                        data-clickable="true"
                        className={`${styles.troubleListItem} ${styles.troubleListItemGrouped} ${
                          index === displayIndex ? styles.troubleListItemActive : ""
                        }`}
                        onClick={() => onItemClick(index)}
                      >
                        <FileText size={14} strokeWidth={1.75} className={styles.ideExplorerFileIcon} aria-hidden />
                        <span className={styles.troubleNumber}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={styles.troubleListTitle}>
                          {displayTitle(item)[language]}
                        </span>
                        <span className={styles.troubleListBadges}>
                          {item.difficulty && <DifficultyBadge level={item.difficulty} language={language} />}
                          {/* 별표 영역은 항상 자리 차지 (item 마다 같은 레이아웃 유지) */}
                          <span className={styles.troubleRecommendedBadge} title={item.recommended ? "추천" : undefined} aria-hidden={!item.recommended}>
                            {item.recommended && <Star size={13} fill="currentColor" strokeWidth={1.5} />}
                          </span>
                        </span>
                      </div>
                    </Tooltip>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>  );
}
