"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Check, X, Trash2, Filter, ChevronDown } from "@/components/icons";
import type { SortDirection } from "@/types";
import type { LocalizedText } from "@/types/common";
import { normalizeTagMeta, type TagMeta, type StoredTagMeta } from "@/lib/tagMeta";
import { getInitial, KO_INITIALS, EN_INITIALS } from "@/lib/initial";
import { findDuplicate } from "@/lib/dedupe";
import { matchesSearch } from "@/lib/koSearch";
import { siteConfig } from "@/config/site.config";
import { showToast } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import SegmentedControl from "@/components/ui/SegmentedControl";
import LetterFilter from "@/components/ui/LetterFilter";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import Popover from "@/components/ui/Popover";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import { List, ListItem } from "@/app/admin/(dashboard)/components";
import type { AdminPostUsageInfo, PostMetaInfo } from "../_types";
import { fillTemplate, formatAdminShortDate } from "@/utils/format";
import { useLanguage } from "@/providers/LanguageProvider";
import BoldMarks from "@/components/ui/BoldMarks";
import shared from "../Settings.module.css";
import own from "./TagDescriptionsEditor.module.css";
import Pressable from "@/components/ui/Pressable";

const styles = { ...shared, ...own };

/* ── Tag editor — bilingual 이름 + bilingual 설명, search/sort/pagination ──
   저장 키 = canonical (post.tags 와 매칭). value 는 lib/tagMeta 의 StoredTagMeta 형식.
   write 시 항상 새 포맷 ({ ko, en, description }) 로 저장. */
type TagSortBy = "freq" | "name";
type NameLang = "ko" | "en";
type UsageFilter = "all" | "in-use" | "unused";
type DescFilter = "all" | "with" | "without";
/* 페이지당 항목 수 — 설명 있는 항목이 절반 이상이면 6 (각 행이 길어짐 → 스크롤 부담),
   아니면 20 (compact 행). filtered 기준으로 동적 산정. */
const TAGS_PER_PAGE_COMPACT = 20;
const TAGS_PER_PAGE_DENSE = 8;

/** TagMeta → 저장용 객체. 빈 필드 정리. 모두 비어있으면 null 반환 (entry 자체 삭제).
 *  CRITICAL: description 키는 항상 포함 — read 시 legacy {ko,en} 형식 (= 설명만 있던 시절)
 *  과 구분하는 disambiguation marker. 빈 description 이라도 객체 형태 유지. */
function metaToStored(m: TagMeta): { ko?: string; en?: string; description: LocalizedText } | null {
  const ko = m.ko.trim();
  const en = m.en.trim();
  const dko = m.description.ko.trim();
  const den = m.description.en.trim();
  if (!ko && !en && !dko && !den) return null;
  const out: { ko?: string; en?: string; description: LocalizedText } = {
    description: { ko: dko, en: den },
  };
  if (ko) out.ko = ko;
  if (en) out.en = en;
  return out;
}

type TagDescValue = Record<string, StoredTagMeta>;
type SavedTagMeta = NonNullable<ReturnType<typeof metaToStored>>;
type SavedTagValue = Record<string, SavedTagMeta>;

/* WorksCategoriesEditor 와 동일 패턴 — TagNotesEditor (chip + drag) + 하단 add/edit box.
   tag canonical key 는 post.tags 와 매칭되는 string. 편집은 표시이름(ko/en) + 설명(ko/en) 만. */
/** 게시물 리스트 row 의 메타 데이터 (발행상태 / 날짜 / 조회수) */
function PostMeta({ p }: { p: PostMetaInfo }) {
  const { t } = useLanguage();
  const dateStr = formatAdminShortDate(p.published_at || p.created_at);
  return (
    <span className={styles.tagRelatedMeta}>
      {!p.published && <span className={styles.tagRelatedMetaDraft}>{t("admin.posts.draft")}</span>}
      {dateStr && <span>{dateStr}</span>}
      {typeof p.view_count === "number" && p.view_count > 0 && <span>{fillTemplate(t("admin.settings.taxonomy.views"), { n: p.view_count })}</span>}
    </span>
  );
}

/** 태그가 쓰인 게시물 목록 — 편집 링크 + 메타. emptyLabel 없으면 빈 목록은 비워둔다. */
function RelatedPostList({ posts, emptyLabel }: { posts: AdminPostUsageInfo[]; emptyLabel?: string }) {
  const { t } = useLanguage();
  return (
    <List className={styles.tagRelatedPosts} data-lenis-prevent>
      {posts.length === 0 && emptyLabel ? (
        <ListItem className={styles.tagRelatedEmpty}>{emptyLabel}</ListItem>
      ) : (
        posts.map((p) => (
          <ListItem key={p.id} layout="column">
            <a href={`/admin/posts/${p.id}/edit`} target="_blank" rel="noopener noreferrer" className={styles.tagRelatedItem}>
              <span className={styles.tagRelatedTitle}>{p.title || p.title_en || `(${t("admin.posts.untitled")})`}</span>
              <PostMeta p={p} />
            </a>
          </ListItem>
        ))
      )}
    </List>
  );
}

/* 태그 "기본값으로 초기화" 확인 모달 본문 — chip 클릭 시 해당 태그 사용 게시물 목록 노출. */
function TagResetConfirmBody({ inUse, tagCounts, tagPosts, affectedCount, onConfirm }: {
  inUse: string[];
  tagCounts: Record<string, number>;
  tagPosts: AdminPostUsageInfo[];
  affectedCount: number;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const selectedPosts = selectedTag ? tagPosts.filter((p) => p.tags.includes(selectedTag)) : [];
  return (
    <div className={styles.tagDeleteConfirmBody}>
      <p className={styles.tagDeleteConfirmDesc}>
        <BoldMarks text={fillTemplate(t("admin.settings.tagEditor.resetConfirm"), { n: inUse.length, m: affectedCount })} />
        <br />
        <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>
          {t("admin.settings.tagEditor.resetNote")}
        </span>
      </p>
      <div className={styles.tagResetChipRow}>
        {inUse.map((tag) => (
          <Pressable
            key={tag}
            className={`${styles.tagResetChip} ${selectedTag === tag ? styles.tagResetChipActive : ""}`}
            onClick={() => setSelectedTag((cur) => (cur === tag ? null : tag))}
          >
            #{tag}
            <span className={styles.tagResetChipCount}>{tagCounts[tag] ?? 0}</span>
          </Pressable>
        ))}
      </div>
      {selectedTag && (
        <RelatedPostList posts={selectedPosts} emptyLabel={t("admin.settings.tagEditor.noPostsLong")} />
      )}
      <div className={styles.tagDeleteConfirmActions}>
        <Button variant="primary" size="md" tone="danger" onClick={onConfirm}>
          {t("admin.settings.tagEditor.reset")}
        </Button>
      </div>
    </div>
  );
}

export default function TagDescriptionsEditor({ value, onChange, pendingDeletes, onPendingDeletesChange, onResetInfoChange }: {
  value: TagDescValue;
  onChange: (v: SavedTagValue) => void;
  pendingDeletes: Set<string>;
  onPendingDeletesChange: (next: Set<string>) => void;
  /** 기본값(reset) 버튼용 정보 리포트 — hasNonDefault(기본 세트에 없는 태그 존재 여부) + resetToDefault 실행 함수 */
  onResetInfoChange?: (info: { hasNonDefault: boolean; resetToDefault: () => void }) => void;
}) {
  const { t } = useLanguage();
  const [postTags, setPostTags] = useState<string[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [tagPosts, setTagPosts] = useState<AdminPostUsageInfo[]>([]);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "ok" | "error">("loading");
  const [fetchError, setFetchError] = useState<string>("");

  useEffect(() => {
    setFetchStatus("loading");
    fetch("/api/admin/tags")
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          console.error("[/api/admin/tags] HTTP", r.status, txt);
          setFetchStatus("error");
          setFetchError(`HTTP ${r.status} ${txt.slice(0, 200)}`);
          return { tags: [], counts: {}, posts: [] };
        }
        setFetchStatus("ok");
        return r.json();
      })
      .then((d) => {
        console.log("[/api/admin/tags] response:", d);
        setPostTags(d.tags ?? []);
        setTagCounts(d.counts ?? {});
        setTagPosts(d.posts ?? []);
      })
      .catch((e) => {
        console.error("[/api/admin/tags] fetch error:", e);
        setFetchStatus("error");
        setFetchError(String(e?.message ?? e));
        setPostTags([]); setTagCounts({}); setTagPosts([]);
      });
  }, []);

  const postTagSet = useMemo(() => new Set(postTags), [postTags]);

  const allTags = useMemo(() => {
    const set = new Set<string>([...postTags, ...Object.keys(value)]);
    // pending 삭제 태그는 UI 에서 즉시 숨김 (실제 DB 삭제는 섹션 저장 시)
    return Array.from(set).filter((tag) => !pendingDeletes.has(tag));
  }, [postTags, value, pendingDeletes]);

  /* 검색 / 정렬 / 필터 / 페이지네이션 */
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "name" | "desc">("all");
  const [sortBy, setSortBy] = useState<TagSortBy>("freq");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [nameLang, setNameLang] = useState<NameLang>("ko");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [descFilter, setDescFilter] = useState<DescFilter>("all");
  const [letterFilters, setLetterFilters] = useState<Set<string>>(new Set());
  const [filterExpanded, setFilterExpanded] = useState(false);
  /* nameLang 바뀌면 letter 매칭 초기화 */
  const nameLangChanged = useDepsChanged([nameLang]);
  if (nameLangChanged) setLetterFilters(new Set());
  /* sortBy 가 name 이 아니면 letter 자동 해제 */
  const sortByChanged = useDepsChanged([sortBy]);
  if (sortByChanged && sortBy !== "name") setLetterFilters(new Set());
  const toggleLetter = (l: string) => setLetterFilters((prev) => {
    const next = new Set(prev);
    if (next.has(l)) next.delete(l); else next.add(l);
    return next;
  });
  /* 항목이 존재하는 letter 만 enable — 없는 chip 은 disabled */
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const tag of allTags) {
      const m = normalizeTagMeta(value[tag]);
      const name = ((nameLang === "ko" ? m.ko : m.en).trim() || tag);
      set.add(getInitial(name, nameLang));
    }
    return set;
  }, [allTags, value, nameLang]);
  const [page, setPage] = useState(1);
  const filtersChanged = useDepsChanged([search, searchType, sortBy, sortDir, nameLang, usageFilter, descFilter, letterFilters]);
  if (filtersChanged) setPage(1);

  /* 활성 필터 개수 — 토글 버튼에 표시 */
  const activeFilterCount = (usageFilter !== "all" ? 1 : 0) + (descFilter !== "all" ? 1 : 0);

  /* segmented onChange — 같은 item 다시 클릭하면 dir 토글, 다른 item 이면 dimension 의 default dir */
  const handleSortByChange = (next: TagSortBy) => {
    if (next === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(next);
      // 빈도 = desc 가 자연스러움 (많은 것 먼저), 이름 = asc 가 자연스러움 (A→Z)
      setSortDir(next === "name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let list = allTags;
    if (usageFilter === "in-use") list = list.filter((tag) => postTagSet.has(tag));
    else if (usageFilter === "unused") list = list.filter((tag) => !postTagSet.has(tag));
    if (descFilter !== "all") {
      list = list.filter((tag) => {
        const m = normalizeTagMeta(value[tag]);
        const hasDesc = !!(m.description.ko.trim() || m.description.en.trim());
        return descFilter === "with" ? hasDesc : !hasDesc;
      });
    }
    /* letterFilters — sortBy=name 일 때만. 다중 선택 — Set 안에 있는 자음/이니셜 중 하나 매칭. */
    if (sortBy === "name" && letterFilters.size > 0) {
      list = list.filter((tag) => {
        const m = normalizeTagMeta(value[tag]);
        const name = ((nameLang === "ko" ? m.ko : m.en).trim() || tag);
        return letterFilters.has(getInitial(name, nameLang));
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((tag) => {
        const m = normalizeTagMeta(value[tag]);
        const inName = matchesSearch(q, tag, m.ko, m.en);
        const inDesc = matchesSearch(q, m.description.ko, m.description.en);
        if (searchType === "name") return inName;
        if (searchType === "desc") return inDesc;
        return inName || inDesc;
      });
    }
    const sorted = [...list];
    const dirSign = sortDir === "asc" ? 1 : -1;
    if (sortBy === "name") {
      // name — nameLang(ko/en) 기준. 이름 키를 1회 decorate 해 비교마다 normalizeTagMeta 재호출을 피한다.
      const nameKey = new Map(sorted.map((tag) => {
        const m = normalizeTagMeta(value[tag]);
        return [tag, (nameLang === "ko" ? m.ko : m.en).trim() || tag] as const;
      }));
      const loc = nameLang === "ko" ? "ko" : "en";
      sorted.sort((a, b) => nameKey.get(a)!.localeCompare(nameKey.get(b)!, loc) * dirSign);
    } else {
      sorted.sort((a, b) => {
        const ac = tagCounts[a] ?? 0;
        const bc = tagCounts[b] ?? 0;
        if (ac !== bc) return (ac - bc) * dirSign;
        return a.localeCompare(b, "ko"); // tiebreak 가나다
      });
    }
    return sorted;
  }, [allTags, search, searchType, sortBy, sortDir, nameLang, usageFilter, descFilter, letterFilters, value, postTagSet, tagCounts]);

  const perPage = useMemo(() => {
    if (filtered.length === 0) return TAGS_PER_PAGE_COMPACT;
    const withDesc = filtered.filter((tag) => {
      const m = normalizeTagMeta(value[tag]);
      return !!(m.description.ko.trim() || m.description.en.trim());
    }).length;
    return withDesc >= filtered.length / 2 ? TAGS_PER_PAGE_DENSE : TAGS_PER_PAGE_COMPACT;
  }, [filtered, value]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageStart = (page - 1) * perPage;
  const pageTags = filtered.slice(pageStart, pageStart + perPage);

  /* 기존 entries 전체 normalize → write 시 항상 new format. */
  const buildBase = useCallback((): SavedTagValue => {
    const out: SavedTagValue = {};
    for (const k of Object.keys(value)) {
      const stored = metaToStored(normalizeTagMeta(value[k]));
      if (stored) out[k] = stored;
    }
    return out;
  }, [value]);

  /* TagNotesEditor items = canonical key 배열. notes = {[key]: bilingual description}.
     description 만 TagNotesEditor 의 onNotesChange 로 직접 편집 가능 (drawer).
     이름 ko/en 은 별도 하단 박스에서 편집. */
  const notesForEditor = useMemo<Record<string, LocalizedText>>(() => {
    const map: Record<string, LocalizedText> = {};
    for (const tag of allTags) {
      const m = normalizeTagMeta(value[tag]);
      /* 빈 description 은 제외 — entry 없음 으로 인식돼야 + 설명추가 / drawer 미생성 */
      if (m.description.ko.trim() || m.description.en.trim()) map[tag] = m.description;
    }
    return map;
  }, [allTags, value]);

  /* TagNotesEditor 가 items 재정렬 / 제거 시 호출. 페이지 안 items 만 들어옴 → 전체 allTags 와 비교해서
     post-derived 제거 방지 (canonical 이 post.tags 에서 오므로 강제로 다시 등장).
     순서 변경은 admin 저장 의미 없음 (정렬은 sort 옵션이 결정) — 무시. */
  const openModal = useModalStore((s) => s.openModal);

  /* deferred 삭제 — pendingDeletes 에만 추가, 실제 API 호출은 섹션 저장 시.
     description 도 같이 제거 (저장 시 commit). 새로고침/되돌리기로 복구 가능. */
  const performDeleteTag = (tag: string) => {
    const next = new Set(pendingDeletes);
    next.add(tag);
    onPendingDeletesChange(next);
    // description 이 있었다면 같이 제거 (저장 시 함께 반영)
    if (value[tag]) {
      const base = buildBase();
      delete base[tag];
      onChange(base);
    }
    if (editingTag === tag) setEditingTag(null);
    showToast(fillTemplate(t("admin.settings.tagEditor.queuedToast"), { tag }), "info");
  };

  /* 삭제 confirm 모달 — 사용 중 게시물 chip 목록 + 삭제 버튼 */
  const confirmDeleteTag = (tag: string) => {
    const inUse = tagPosts.filter((p) => p.tags.includes(tag));
    if (inUse.length === 0) {
      performDeleteTag(tag);
      return;
    }
    const id = `tag-delete-confirm-${tag}`;
    openModal(
      <div className={styles.tagDeleteConfirmBody}>
        <p className={styles.tagDeleteConfirmDesc}>
          <BoldMarks text={fillTemplate(t("admin.settings.tagEditor.deleteConfirm"), { n: inUse.length })} />
          <br />
          <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>
            {t("admin.settings.tagEditor.deleteNote")}
          </span>
        </p>
        <RelatedPostList posts={inUse} />
        <div className={styles.tagDeleteConfirmActions}>
          <Button
            variant="primary"
            size="md"
            tone="danger"
            onClick={() => {
              performDeleteTag(tag);
              useModalStore.getState().closeModal(id);
            }}
          >
            {t("admin.common.delete")}
          </Button>
        </div>
      </div>,
      {
        id,
        header: { title: fillTemplate(t("admin.settings.tagEditor.deleteTitle"), { tag }) },
        closeButton: true,
        width: "min(520px, 90vw)",
      },
    );
  };

  const handleItemsChange = (next: string[]) => {
    const nextSet = new Set(next);
    const removed = pageTags.filter((tag) => !nextSet.has(tag));
    if (removed.length === 0) return; // 순서 변경 — ignore
    /* TagNotesEditor 의 × 는 항목 단위 — 첫 번째 (보통 유일한) 제거 대상에 대해 confirm 모달 */
    confirmDeleteTag(removed[0]);
  };

  /* ── 기본값으로 초기화 (SectionHeader 의 "기본값" 버튼) ──
     config 설명을 기본 세트로 되돌리고, 기본 세트에 없는 태그는 (게시물에서 사용 중이면 확인 후)
     삭제 대기열에 추가 → 섹션 저장 시 게시물 tags 에서 제거(휴지통 복구 가능). */
  const buildDefaults = useCallback((): SavedTagValue => {
    const out: SavedTagValue = {};
    const defaults = siteConfig.tagDescriptions as unknown as TagDescValue;
    for (const k of Object.keys(defaults)) {
      const stored = metaToStored(normalizeTagMeta(defaults[k]));
      if (stored) out[k] = stored;
    }
    return out;
  }, []);
  const defaultKeySet = useMemo(() => new Set(Object.keys(siteConfig.tagDescriptions)), []);
  const nonDefaultTags = useMemo(() => allTags.filter((tag) => !defaultKeySet.has(tag)), [allTags, defaultKeySet]);

  const resetToDefault = useCallback(() => {
    const defaults = buildDefaults();
    // 기본 세트에 없는 태그 중 게시물이 실제 사용하는 것 → 확인 후 삭제 대기. (커스텀 설명만 있고 미사용인 건 config 초기화로 자동 제거)
    const inUse = nonDefaultTags.filter((tag) => postTagSet.has(tag));
    if (inUse.length === 0) {
      onChange(defaults);
      showToast(t("admin.settings.tagEditor.resetDone"), "success");
      return;
    }
    const affected = new Set<string>();
    for (const p of tagPosts) if (p.tags.some((tag) => inUse.includes(tag))) affected.add(p.id);
    const id = "tag-reset-confirm";
    openModal(
      <TagResetConfirmBody
        inUse={inUse}
        tagCounts={tagCounts}
        tagPosts={tagPosts}
        affectedCount={affected.size}
        onConfirm={() => {
          onChange(defaults);
          const next = new Set(pendingDeletes);
          for (const tag of inUse) next.add(tag);
          onPendingDeletesChange(next);
          useModalStore.getState().closeModal(id);
          showToast(fillTemplate(t("admin.settings.tagEditor.resetQueuedToast"), { n: inUse.length }), "info");
        }}
      />,
      { id, header: { title: t("admin.settings.tagEditor.reset") }, closeButton: true, width: "min(520px, 90vw)" },
    );
  }, [buildDefaults, nonDefaultTags, postTagSet, onChange, pendingDeletes, onPendingDeletesChange, tagPosts, tagCounts, openModal, t]);

  useEffect(() => {
    onResetInfoChange?.({ hasNonDefault: nonDefaultTags.length > 0, resetToDefault });
  }, [nonDefaultTags, resetToDefault, onResetInfoChange]);

  /* TagNotesEditor 의 내부 drawer 는 onEditClick prop 으로 모두 외부 위임됐고,
     description 편집도 하단 box 에서 처리. 따라서 onNotesChange 는 noop —
     remove× 클릭 시 TagNotesEditor 가 setEntry(null) → onNotesChange 까지 부르는데,
     allTags iterate 하다 직전 onItemsChange 가 삭제한 entry 가 다시 부활하는 race 방지. */
  const handleNotesChange = () => {};

  /* ── 하단 통합 add/edit box ──
     canonical key (post.tags 매칭용) 는 신규 추가 시 EN (없으면 KO) 에서 자동 도출 — 별도 입력 X. */
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pairNames, setPairNames] = useState<LocalizedText>({ ko: "", en: "" });
  const [pairDesc, setPairDesc] = useState<LocalizedText>({ ko: "", en: "" });
  const [isShaking, setIsShaking] = useState(false);
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const isEdit = editingTag !== null;

  /* 편집 대상이나 값이 바뀌면 입력 칸을 그 값으로 채운다(추가면 비운다). */
  const editTargetChanged = useDepsChanged([editingTag, value]);
  if (editTargetChanged) {
    if (editingTag !== null) {
      const m = normalizeTagMeta(value[editingTag]);
      /* override 비어있으면 canonical 을 그대로 input 텍스트로 채움 — 언어 감지로 ko/en 슬롯 분기.
         user 가 그대로 두고 저장하면 submit 단계에서 canonical 과 같은 값은 override 처리 안 함 */
      const hasKorean = /[가-힯ᄀ-ᇿ㄰-㆏]/.test(editingTag);
      const koSeed = m.ko || (hasKorean ? editingTag : "");
      const enSeed = m.en || (!hasKorean ? editingTag : "");
      setPairNames({ ko: koSeed, en: enSeed });
      setPairDesc(m.description);
    } else {
      setPairNames({ ko: "", en: "" });
      setPairDesc({ ko: "", en: "" });
    }
  }

  const cancelEdit = () => setEditingTag(null);

  /* 중복 발견 시 — 해당 chip 페이지로 이동 + 편집 모드 + 화면에 scroll */
  const focusDuplicate = (dup: string) => {
    const idx = filtered.indexOf(dup);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / perPage) + 1;
      if (targetPage !== page) setPage(targetPage);
    }
    setEditingTag(dup);
    // 페이지 / 편집 state 적용된 다음 frame 에서 scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-tag-item="${window.CSS.escape(dup)}"]`) as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  /* 편집 중인 tag 삭제 — 동일한 confirm 흐름 사용 (chip × 와 통일) */
  const deleteEditingTag = () => {
    if (!editingTag) return;
    confirmDeleteTag(editingTag);
  };

  /* add 모드 — canonical = EN 우선, 없으면 KO */
  const newCanonical = (pairNames.en.trim() || pairNames.ko.trim());

  const submit = () => {
    if (isEdit) {
      const tag = editingTag!;
      const base = buildBase();
      const stored = metaToStored({ ...normalizeTagMeta(value[tag]), ko: pairNames.ko, en: pairNames.en, description: pairDesc });
      if (stored) base[tag] = stored;
      else delete base[tag];
      onChange(base);
      setEditingTag(null);
    } else {
      if (!newCanonical) return;
      /* 중복 비교 — 대소문자 + 공백 무시 (lib/dedupe) */
      const dup = findDuplicate(allTags, [newCanonical], (tag) => [tag]);
      if (dup) {
        showToast(fillTemplate(t("admin.settings.tagEditor.duplicate"), { name: dup }), "warning");
        setAdding(false); // add 팝오버 닫고 중복 항목 편집 팝오버로 이동
        triggerShake();
        focusDuplicate(dup);
        return;
      }
      const base = buildBase();
      const stored = metaToStored({ ko: pairNames.ko, en: pairNames.en, description: pairDesc });
      /* metaToStored 가 null 인 경우 = 입력 다 비어있음 — 빈 entry 도 description 키 포함 */
      base[newCanonical] = stored ?? { description: { ko: "", en: "" } };
      onChange(base);
      setPairNames({ ko: "", en: "" });
      setPairDesc({ ko: "", en: "" });
      setAdding(false);
    }
  };

  /* 중복은 disabled 대신 submit 시 toast + shake 로 알림 — 버튼은 비어있을 때만 disabled */
  const submitEnabled = isEdit || !!newCanonical;

  /* add popover · edit box 공용 필드 (이름 + 설명) */
  const renderFields = () => (
    <>
      <div className={styles.worksCatAddRow}>
        <span className={styles.worksCatAddRowLabel}>{t("admin.settings.name")}</span>
        <BilingualInputPair
          value={pairNames}
          onChange={setPairNames}
          onEnter={submit}
          placeholder={isEdit ? "" : t("admin.settings.tagEditor.namePlaceholder")}
        />
      </div>
      <div className={styles.worksCatAddRow}>
        <span className={styles.worksCatAddRowLabel}>{t("admin.settings.description")}</span>
        <BilingualInputPair value={pairDesc} onChange={setPairDesc} onEnter={submit} placeholder={t("admin.settings.description")} />
      </div>
    </>
  );

  const sortItems = [
    { value: "freq" as const, label: t("admin.settings.taxonomy.sortFreq") },
    {
      value: "name" as const,
      label: t("admin.settings.taxonomy.sortName"),
      subItems: [
        { value: "ko" as const, label: t("admin.settings.taxonomy.langKo") },
        { value: "en" as const, label: t("admin.settings.taxonomy.langEn") },
      ] as const,
    },
  ];

  /* chip 라벨 — ko · en + 사용 카운트 (n). 0 도 항상 표시. */
  const renderItemLabel = (tag: string) => {
    const m = normalizeTagMeta(value[tag]);
    const ko = m.ko.trim() || tag;
    const en = m.en.trim() || tag;
    const count = tagCounts[tag] ?? 0;
    return (
      <span className={styles.worksCatChipLabel}>
        <span>{ko}</span>
        {ko !== en && <span className={styles.worksCatChipSep}>·</span>}
        {ko !== en && <span>{en}</span>}
        <span className={styles.tagCountBadge}>({count})</span>
      </span>
    );
  };

  /* 편집 중인 태그의 관련 게시물 */
  const editingPosts = useMemo<AdminPostUsageInfo[]>(() => {
    if (!editingTag) return [];
    return tagPosts.filter((p) => p.tags.includes(editingTag));
  }, [editingTag, tagPosts]);

  /* chip 옆 편집 팝오버 내용 — 헤더(삭제/취소/저장) + 필드 + 관련 게시물.
     취소/저장/삭제는 editingTag 을 지워 팝오버를 자동으로 닫으므로 close() 는 부르지 않는다. */
  const renderEditPanel = () => (
    <div className={`${styles.addPopoverForm} ${isShaking ? styles.shakeAlert : ""}`}>
      <div className={styles.worksCatAddLabel}>
        {fillTemplate(t("admin.settings.tagEditor.editTitle"), { tag: editingTag ?? "" })}
        <div className={styles.worksCatAddActions}>
          <Button variant="outline" size="xs" tone="danger" onClick={deleteEditingTag} icon={<Trash2 size={12} strokeWidth={2} />}>
            {t("admin.common.delete")}
          </Button>
          <Button variant="outline" size="xs" onClick={cancelEdit} icon={<X size={12} strokeWidth={2.5} />}>
            {t("admin.settings.cancel")}
          </Button>
          <Button variant="outline" size="xs" onClick={submit} disabled={!submitEnabled} icon={<Check size={12} strokeWidth={2.5} />}>
            {t("admin.common.save")}
          </Button>
        </div>
      </div>
      {renderFields()}
      <div className={styles.worksCatAddRow}>
        <span className={styles.worksCatAddRowLabel}>{fillTemplate(t("admin.settings.taxonomy.posts"), { n: editingPosts.length })}</span>
        <RelatedPostList posts={editingPosts} emptyLabel={t("admin.settings.tagEditor.noPosts")} />
      </div>
    </div>
  );

  return (
    <div className={styles.worksCatEditor}>
      {/* Toolbar 묶음 — filterRow + filterDrawer 한 컨테이너 안 stack */}
      <div className={styles.tagDescToolbarWrap}>
      {/* Toolbar — 필터 토글 + 정렬 + 검색 (한 줄). 필터 chip 들은 펼침 영역에. */}
      <div className={styles.tagDescFilterRow}>
        <Button
          variant={filterExpanded || activeFilterCount > 0 ? "primary" : "outline"}
          size="sm"
          icon={<Filter size={12} />}
          onClick={() => setFilterExpanded((e) => !e)}
        >
          {t("admin.settings.taxonomy.filter")}
          {activeFilterCount > 0 && (
            <span className={styles.filterBtnCount}>{activeFilterCount}</span>
          )}
          <ChevronDown
            size={12}
            className={`${styles.filterBtnChevron} ${filterExpanded ? styles.filterBtnChevronOpen : ""}`}
          />
        </Button>
        <SegmentedControl
          items={sortItems}
          value={sortBy}
          onChange={handleSortByChange}
          sortDir={sortDir}
          subValue={nameLang}
          onSubChange={(v) => setNameLang(v as NameLang)}
          subVariant="nested"
          onBack={() => setSortBy("freq")}
          size="sm"
        />
        <span className={styles.tagDescCount}>{filtered.length} / {allTags.length}</span>
        <Popover
          open={adding}
          onOpenChange={(o) => {
            setAdding(o);
            if (o) { setEditingTag(null); setPairNames({ ko: "", en: "" }); setPairDesc({ ko: "", en: "" }); }
          }}
          placement="bottom-end"
          sheetTitle={t("admin.settings.tagEditor.addTitle")}
          className={styles.addPopoverTrigger}
          trigger={
            <Button variant="outline" size="sm" icon={<Plus size={12} strokeWidth={2} />}>
              {t("admin.settings.add")}
            </Button>
          }
        >
          <div className={styles.addPopoverForm}>
            {renderFields()}
            <Button variant="primary" size="sm" onClick={submit} disabled={!submitEnabled} icon={<Plus size={12} strokeWidth={2} />}>
              {t("admin.settings.add")}
            </Button>
          </div>
        </Popover>
        <div className={styles.tagDescSearchEnd}>
          <SearchCapsule
            typeSelector={{
              value: searchType,
              options: [
                { value: "all", label: t("admin.settings.taxonomy.searchAll") },
                { value: "name", label: t("admin.settings.name") },
                { value: "desc", label: t("admin.settings.description") },
              ],
              onChange: (v) => setSearchType(v as "all" | "name" | "desc"),
            }}
            search={search}
            onSearchChange={setSearch}
            placeholder={t("admin.settings.tagEditor.searchPlaceholder")}
            align="left"
            size="sm"
          />
        </div>
      </div>

      {/* 펼친 상태에서만 필터 chip group 노출 — height + opacity 애니메이션 */}
      <AnimatePresence initial={false}>
        {filterExpanded && (
          <motion.div
            key="filter-drawer"
            className={styles.tagDescFilterDrawerWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className={styles.tagDescFilterDrawer}>
              <div className={styles.tagDescFilterGroup}>
                <span className={styles.tagDescFilterGroupLabel}>{t("admin.settings.taxonomy.usage")}</span>
                <SegmentedControl
                  items={[
                    { value: "all", label: t("admin.settings.taxonomy.all") },
                    { value: "in-use", label: t("admin.settings.taxonomy.inUse") },
                    { value: "unused", label: t("admin.settings.taxonomy.unused") },
                  ]}
                  value={usageFilter}
                  onChange={(v) => setUsageFilter(v as UsageFilter)}
                  size="sm"
                />
              </div>
              <div className={styles.tagDescFilterGroup}>
                <span className={styles.tagDescFilterGroupLabel}>{t("admin.settings.description")}</span>
                <SegmentedControl
                  items={[
                    { value: "all", label: t("admin.settings.taxonomy.all") },
                    { value: "with", label: t("admin.settings.taxonomy.descWith") },
                    { value: "without", label: t("admin.settings.taxonomy.descWithout") },
                  ]}
                  value={descFilter}
                  onChange={(v) => setDescFilter(v as DescFilter)}
                  size="sm"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* letter drawer — sortBy === "name" 일 때만. nameLang 따라 한글 자음 / 영어 알파벳 chip */}
      <AnimatePresence initial={false}>
        {sortBy === "name" && (
          <motion.div
            key="letter-drawer"
            className={styles.tagDescFilterDrawerWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <LetterFilter
              letters={nameLang === "ko" ? [...KO_INITIALS] : [...EN_INITIALS]}
              active={letterFilters}
              onToggle={toggleLetter}
              onClear={() => setLetterFilters(new Set())}
              hasLetter={(l) => availableLetters.has(l)}
              className={styles.tagDescLetterDrawer}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* chip 영역 + count 묶음 — count 는 chip block 끝에 시각적으로 붙음 */}
      <div className={styles.tagDescChipsBlock}>
        {pageTags.length === 0 ? (
          <div className={styles.tagDescEmpty}>
            {search
              ? t("admin.settings.taxonomy.noResults")
              : fetchStatus === "loading"
              ? t("admin.settings.tagEditor.loading")
              : fetchStatus === "error"
              ? fillTemplate(t("admin.settings.tagEditor.loadFailed"), { error: fetchError })
              : t("admin.settings.tagEditor.empty")}
          </div>
        ) : (
          <TagNotesEditor
            items={pageTags}
            notes={notesForEditor}
            onItemsChange={handleItemsChange}
            onNotesChange={handleNotesChange}
            prefix=""
            notePlaceholder={t("admin.settings.description")}
            addLabel={t("admin.settings.edit")}
            cancelLabel={t("admin.settings.cancel")}
            editLabel={t("admin.settings.edit")}
            removeTitle={t("admin.settings.tagEditor.remove")}
            renderItemLabel={renderItemLabel}
            onItemClick={(tag) => setEditingTag(tag === editingTag ? null : tag)}
            onEditClick={(tag) => setEditingTag(tag === editingTag ? null : tag)}
            activeItem={editingTag}
            renderEditPopover={() => renderEditPanel()}
            disableReorder
            showIndex
            startIndex={pageStart}
            /* 태그는 사용자 정의 순서가 없음 — filtered 내 위치(1-based) 표시.
               sortDir === "desc" 면 역순 번호 (n, n-1, ..., 1) 로 표시해 정렬 방향과 일치시킴. */
            getDisplayIndex={(_, idx) => {
              const pos = pageStart + idx;
              return sortDir === "desc" ? filtered.length - pos : pos + 1;
            }}
          />
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        size="sm"
        className={styles.tagDescPagination}
      />

      {/* 편집은 chip 옆 팝오버(renderEditPanel)로 처리 — 하단 고정 박스 제거. 추가는 툴바 popover. */}
    </div>
  );
}



