"use client";

// ── 달력 검색/필터/정렬 툴바 (에디터·리더 공용) ──
import React from "react";
import { SlidersHorizontal, ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import Popover from "@/components/ui/Popover";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { type EventLabel, type SearchScope, type SortField, type SortDir, EVENT_PRIORITIES, colorVar } from "./model";
import styles from "./Calendar.module.css";

export default function CalendarToolbar({
  labels, tags, language,
  query, onQuery, scope, onScope,
  activeLabels, onToggleLabel, activeTags, onToggleTag,
  activePriorities, onTogglePriority,
  sortField, onSortField, sortDir, onSortDir,
}: {
  labels: EventLabel[];
  tags: string[];
  language: string;
  query: string;
  onQuery: (q: string) => void;
  scope: SearchScope;
  onScope: (s: SearchScope) => void;
  activeLabels: Set<string>;
  onToggleLabel: (id: string) => void;
  activeTags: Set<string>;
  onToggleTag: (tag: string) => void;
  activePriorities: Set<string>;
  onTogglePriority: (key: string) => void;
  sortField: SortField;
  onSortField: (s: SortField) => void;
  sortDir: SortDir;
  onSortDir: (d: SortDir) => void;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const scopeLabels: Record<SearchScope, string> = { all: t("제목+내용", "Title+Details"), title: t("제목", "Title"), desc: t("내용", "Details") };
  const sortOptions: { value: SortField; label: string }[] = [
    { value: "default", label: t("기본", "Default") },
    { value: "title", label: t("제목", "Title") },
    { value: "priority", label: t("중요도", "Priority") },
    { value: "status", label: t("상태", "Status") },
  ];
  const filterCount = activeLabels.size + activeTags.size + activePriorities.size;

  return (
    <div className={styles.calToolbar} contentEditable={false}>
      {/* 검색 + 범위 (공통 SearchCapsule) */}
      <SearchCapsule
        search={query}
        onSearchChange={onQuery}
        placeholder={t("이벤트 검색", "Search")}
        size="sm"
        align="left"
        collapsible
        className={styles.ctrlBorderLight}
        historyKey={null}
        showHelp={false}
        typeSelector={{
          value: scope,
          options: (["all", "title", "desc"] as SearchScope[]).map((s) => ({ value: s, label: scopeLabels[s] })),
          onChange: (v) => onScope(v as SearchScope),
        }}
      />

      {/* 필터 (라벨/태그) */}
      <Popover placement="bottom-start" offset={6} maxHeight={false} responsive={false} contentClassName={styles.filterMenu}
        trigger={
          <button type="button" className={`${styles.tbBtn}${filterCount ? ` ${styles.tbBtnOn}` : ""}`}>
            <SlidersHorizontal size={13} />{t("필터", "Filter")}{filterCount > 0 && <span className={styles.tbBadge}>{filterCount}</span>}
          </button>
        }>
        {labels.length > 0 && <>
          <div className={styles.filterGroupLabel}>{t("라벨", "Label")}</div>
          <div className={styles.filterChips}>
            {labels.map((l) => (
              <button key={l.id} type="button" className={`${styles.filterChip}${activeLabels.has(l.id) ? ` ${styles.filterChipOn}` : ""}`} style={{ ["--_lc" as string]: colorVar(l.color) }} onClick={() => onToggleLabel(l.id)}>
                <span className={styles.filterDot} />{l.name}
              </button>
            ))}
          </div>
        </>}
        {tags.length > 0 && <>
          <div className={styles.filterGroupLabel}>{t("태그", "Tags")}</div>
          <div className={styles.filterChips}>
            {tags.map((tg) => (
              <button key={tg} type="button" className={`${styles.filterTag}${activeTags.has(tg) ? ` ${styles.filterTagOn}` : ""}`} onClick={() => onToggleTag(tg)}>#{tg}</button>
            ))}
          </div>
        </>}
        <div className={styles.filterGroupLabel}>{t("중요도", "Priority")}</div>
        <div className={styles.filterChips}>
          {EVENT_PRIORITIES.map((p) => (
            <button key={p.key} type="button" className={`${styles.filterChip}${activePriorities.has(p.key) ? ` ${styles.filterChipOn}` : ""}`} style={{ ["--_lc" as string]: p.color }} onClick={() => onTogglePriority(p.key)}>
              <span className={styles.filterDot} />{language === "ko" ? p.name[0] : p.name[1]}
            </button>
          ))}
        </div>
      </Popover>

      {/* 정렬 — 필드 select + 역순 토글을 하나의 pill 로 결합 */}
      <div className={styles.sortGroup}>
        <Select
          value={sortField}
          onChange={(v) => onSortField(v as SortField)}
          options={sortOptions}
          size="sm"
          dropdownClassName={styles.selectAboveModal}
        />
        <Tooltip content={sortDir === "asc" ? t("오름차순", "Ascending") : t("내림차순", "Descending")}>
          <Button
            variant="ghost"
            size="sm"
            soundDisabled
            className={styles.sortDir}
            icon={sortDir === "asc" ? <ArrowDownNarrowWide size={14} /> : <ArrowUpNarrowWide size={14} />}
            onClick={() => onSortDir(sortDir === "asc" ? "desc" : "asc")}
            aria-label={t("역순", "Reverse")}
          />
        </Tooltip>
      </div>
    </div>
  );
}
