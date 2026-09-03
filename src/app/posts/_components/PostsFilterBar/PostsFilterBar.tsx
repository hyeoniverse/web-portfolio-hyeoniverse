"use client";

import { useEffect, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Pressable from "@/components/ui/Pressable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { ChevronDown } from "@/components/icons";
import CategoryNav from "../CategoryNav";
import TagFilterPanel from "./TagFilterPanel";
import styles from "./PostsFilterBar.module.css";

/* /posts 필터바 — 검색 capsule 줄 + [전체태그 토글 | CategoryNav] 줄 + 태그 패널.
   sticky 판정(useStickyFilterBar)·백드롭·본문 blur 는 부모가 가진다: barHidden 은 사이드바도 쓰고 blur 는 본문 영역에 건다.
   그래서 ref(sticky 훅의 filterBarRef)와 isStuck · barHidden 을 받고, showTags · catExpanded 는 부모가 제어한다(백드롭이 닫는다).
   검색·카테고리·태그 값과 setter 는 글 목록 fetch 축의 것 — 그 축이 훅으로 묶이면 props 도 그 반환값으로 줄어든다. */
export default function PostsFilterBar({
  ref,
  isStuck,
  barHidden,
  showTags,
  onShowTagsChange,
  catExpanded,
  onCatExpandedChange,
  search,
  onSearchChange,
  searchType,
  onSearchTypeChange,
  onSyntaxModeChange,
  hasResults,
  extraCategories,
  activeCategories,
  onCategoriesChange,
  allTags,
  activeTags,
  onToggleTag,
  onClearTags,
}: {
  ref: RefObject<HTMLDivElement | null>;
  isStuck: boolean;
  barHidden: boolean;
  showTags: boolean;
  onShowTagsChange: (v: boolean) => void;
  catExpanded: boolean;
  onCatExpandedChange: (v: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  searchType: "all" | "title" | "content";
  onSearchTypeChange: (v: "all" | "title" | "content") => void;
  onSyntaxModeChange: (v: "prefix" | "regex") => void;
  hasResults: boolean;
  extraCategories: string[];
  activeCategories: string[];
  onCategoriesChange: (next: string[]) => void;
  allTags: { tag: string; count: number }[];
  activeTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}) {
  const { t } = useLanguage();

  // (close-on-scroll 제거) 명시적으로 펼친 태그/카테고리를 스크롤만으로 닫지 않음 —
  // 바깥 클릭(아래) / 토글 버튼 재클릭으로만 닫힘. 펼친 상태에선 filter bar 도 스크롤에 안 숨음.

  // catExpanded / showTags 일 때 filter bar 바깥 클릭 시 닫기 — non-stuck 상태에서도 동작.
  // (sticky backdrop 은 isStuck 일 때만 렌더되므로 그 외 케이스 보완)
  useEffect(() => {
    if (!showTags && !catExpanded) return;
    const handle = (e: MouseEvent) => {
      const fb = ref.current;
      if (!fb) return;
      if (!fb.contains(e.target as Node)) {
        onShowTagsChange(false);
        onCatExpandedChange(false);
      }
    };
    // open 트리거 click 자체가 잡히지 않도록 다음 tick 에 등록
    const t = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handle);
    };
  }, [showTags, catExpanded, ref, onShowTagsChange, onCatExpandedChange]);

  return (
    <div
      ref={ref}
      className={`${styles.filterBar} ${barHidden && !showTags && !catExpanded ? styles.filterBarHidden : ""}`}
    >
      {/* 검색 capsule — 별도 윗줄에 우측 정렬 (공통 SearchCapsule 사용) + 검색 문법 help 버튼 */}
      <div className={styles.filterBarSearchRow}>
        <SearchCapsule
          search={search}
          onSearchChange={onSearchChange}
          placeholder={t("postsPage.searchPlaceholder")}
          routeParam="q"
          className={styles.postsSearchCapsule}
          hasResults={hasResults}
          size="sm"
          onSearchOptionsChange={(opts) => onSyntaxModeChange(opts.syntaxMode)}
          typeSelector={{
            value: searchType,
            options: [
              { value: "all", label: t("postsPage.searchAll") },
              { value: "title", label: t("postsPage.searchTitle") },
              { value: "content", label: t("postsPage.searchContent") },
            ],
            onChange: (v) => onSearchTypeChange(v as "all" | "title" | "content"),
          }}
          syntaxHelp
        />
      </div>

      <div className={styles.filterBarTop}>
        {/* 전체태그 버튼 — start 위치 */}
        <AnimatePresence>
          {!catExpanded && (
            <motion.div
              className={styles.filterBarLeft}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto", overflow: "visible" }}
              exit={{ opacity: 0, width: 0, overflow: "hidden" }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ overflow: "hidden" }}
            >
              {allTags.length > 0 && (
                <Pressable
                  className={`${styles.tagToggleBtn} ${showTags ? styles.tagToggleBtnOpen : ""}`}
                  onClick={() => onShowTagsChange(!showTags)}
                  data-clickable="true"
                >
                  <T
                    k="postsPage.tags"
                    tooltip={t("postsPage.tagsTooltip")}
                  />
                  <ChevronDown size={10} />
                </Pressable>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        <CategoryNav
          extraCategories={extraCategories}
          activeCategories={activeCategories}
          // 카테고리 선택 시 자동으로 닫지 않음 — close 버튼 / filter bar 바깥 클릭 / 스크롤로만 닫힘
          onCategoriesChange={onCategoriesChange}
          expanded={catExpanded}
          onExpandChange={(v) => {
            onCatExpandedChange(v);
            if (v) onShowTagsChange(false);
          }}
        />
      </div>

      <TagFilterPanel
        open={showTags}
        isStuck={isStuck}
        allTags={allTags}
        activeTags={activeTags}
        onToggleTag={onToggleTag}
        onClearTags={onClearTags}
      />
    </div>
  );
}
