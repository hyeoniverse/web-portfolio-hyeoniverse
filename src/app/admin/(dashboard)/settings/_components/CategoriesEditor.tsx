"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { SortDirection } from "@/types";
import { Plus, Check, X, Trash2, Filter, ChevronDown } from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BilingualCategory, LocalizedText } from "@/types/common";
import type { AdminPostUsageInfo, PostMetaInfo } from "../_types";
import { formatAdminShortDate } from "@/utils/format";
import CategoryReassignModal from "@/components/admin/CategoryReassignModal";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { List, ListItem } from "@/app/admin/(dashboard)/components";
import { showToast } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import { findDuplicate } from "@/lib/dedupe";
import { getInitial, KO_INITIALS, EN_INITIALS } from "@/lib/initial";
import { matchesSearch } from "@/lib/koSearch";
import LetterFilter from "@/components/ui/LetterFilter";
import styles from "../Settings.module.css";

/** legacy `description: string` → bilingual `{ko, en}` 자동 정규화. */
interface PostCategoryExt extends Omit<BilingualCategory, "description"> {
  description?: LocalizedText | string;
}

interface CategoriesEditorProps {
  categories: PostCategoryExt[];
  onChange: (cats: PostCategoryExt[]) => void;
}

function normalizeDesc(d: PostCategoryExt["description"]): LocalizedText {
  if (!d) return { ko: "", en: "" };
  if (typeof d === "string") return { ko: d, en: "" };
  return { ko: d.ko ?? "", en: d.en ?? "" };
}

/* ── 2단계 트리 ↔ flat 작업목록 변환 ──
   에디터 내부 로직은 전부 flat(대분류/소분류 한 줄) 기준으로 돌리고, parentEn 으로 소속만 기억.
   저장 시 rebuildTree 로 다시 트리(대분류 children)로 조립한다. */
type FlatNode = PostCategoryExt & { parentEn: string | null };

/** 트리 → flat (대분류 먼저, 이어서 그 소분류) */
function flattenTree(tree: PostCategoryExt[]): FlatNode[] {
  const out: FlatNode[] = [];
  for (const p of tree) {
    out.push({ ko: p.ko, en: p.en, description: p.description, parentEn: null });
    const children = (p as { children?: PostCategoryExt[] }).children ?? [];
    for (const ch of children) {
      out.push({ ko: ch.ko, en: ch.en, description: ch.description, parentEn: p.en });
    }
  }
  return out;
}

/** flat → 트리. parentEn 으로 소분류를 대분류 아래 재조립. 부모 사라진 소분류는 최상위로 승격. */
function rebuildTree(flat: FlatNode[]): PostCategoryExt[] {
  const topLevel = flat.filter((n) => n.parentEn === null);
  const topEns = new Set(topLevel.map((n) => n.en));
  const kidsByParent = new Map<string, FlatNode[]>();
  const orphans: FlatNode[] = [];
  for (const n of flat) {
    if (n.parentEn === null) continue;
    if (topEns.has(n.parentEn)) {
      const arr = kidsByParent.get(n.parentEn) ?? [];
      arr.push(n);
      kidsByParent.set(n.parentEn, arr);
    } else {
      orphans.push(n);
    }
  }
  const strip = (n: FlatNode): PostCategoryExt => ({ ko: n.ko, en: n.en, description: n.description });
  const result: PostCategoryExt[] = topLevel.map((p) => {
    const kids = kidsByParent.get(p.en);
    return kids && kids.length ? { ...strip(p), children: kids.map(strip) } : strip(p);
  });
  for (const o of orphans) result.push(strip(o));
  return result;
}

/** 게시물 row 의 메타 (발행상태 + 날짜 + 조회수) */
function PostMeta({ p }: { p: PostMetaInfo }) {
  const dateStr = formatAdminShortDate(p.published_at || p.created_at);
  return (
    <span className={styles.tagRelatedMeta}>
      {!p.published && <span className={styles.tagRelatedMetaDraft}>draft</span>}
      {dateStr && <span>{dateStr}</span>}
      {typeof p.view_count === "number" && p.view_count > 0 && <span>· {p.view_count} views</span>}
    </span>
  );
}

/* 페이지당 항목 수 — filtered 중 설명 있는 항목 비율 >= 50% 면 dense (6),
   아니면 compact (20). 행이 길어질 때 자동으로 좁게 표시 → 스크롤 부담 완화. */
const CATS_PER_PAGE_COMPACT = 20;
const CATS_PER_PAGE_DENSE = 8;

export default function CategoriesEditor({ categories: categoriesTree, onChange: onChangeTree }: CategoriesEditorProps) {
  const { t, language } = useLanguage();
  const openModal = useModalStore((s) => s.openModal);
  const closeModal = useModalStore((s) => s.closeModal);

  // 트리 → flat 작업목록(parentEn 보유). 아래 모든 로직은 flat 기준으로 동작.
  const categories = useMemo<FlatNode[]>(() => flattenTree(categoriesTree), [categoriesTree]);
  // 변경 저장 — flat 을 다시 트리로 조립해 상위(config)에 전달
  const onChange = useCallback(
    (flat: FlatNode[]) => onChangeTree(rebuildTree(flat)),
    [onChangeTree],
  );
  const nodeByEn = useMemo(() => {
    const m = new Map<string, FlatNode>();
    for (const c of categories) m.set(c.en, c);
    return m;
  }, [categories]);

  /* 카테고리별 사용 카운트 + 카테고리별 post 목록 fetch */
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});
  const [catPosts, setCatPosts] = useState<AdminPostUsageInfo[]>([]);
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.ok ? r.json() : { categories: [], counts: {}, posts: [] })
      .then((d) => {
        setCatCounts(d.counts ?? {});
        setCatPosts(d.posts ?? []);
      })
      .catch(() => { setCatCounts({}); setCatPosts([]); });
  }, []);

  const koByEn = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.en] = c.ko;
    return map;
  }, [categories]);

  /* 검색 / 정렬 / 필터 / 페이지네이션 */
  const [search, setSearch] = useState("");
  /* 태그와 동일 패턴 — sortBy + sortDir + usageFilter + descFilter + searchType + filterExpanded.
     카테고리는 사용자 정의순(custom) 추가 — categories prop 의 순서 그대로. */
  type SortBy = "custom" | "freq" | "name";
  type NameLang = "ko" | "en";
  type UsageFilter = "all" | "in-use" | "unused";
  type DescFilter = "all" | "with" | "without";
  const [searchType, setSearchType] = useState<"all" | "name" | "desc">("all");
  const [sortBy, setSortBy] = useState<SortBy>("custom");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [nameLang, setNameLang] = useState<NameLang>("ko");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [descFilter, setDescFilter] = useState<DescFilter>("all");
  const [letterFilters, setLetterFilters] = useState<Set<string>>(new Set());
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, searchType, sortBy, sortDir, nameLang, usageFilter, descFilter, letterFilters]);
  useEffect(() => { setLetterFilters(new Set()); }, [nameLang]);
  useEffect(() => { if (sortBy !== "name") setLetterFilters(new Set()); }, [sortBy]);
  const toggleLetter = (l: string) => setLetterFilters((prev) => {
    const next = new Set(prev);
    if (next.has(l)) next.delete(l); else next.add(l);
    return next;
  });
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const c of categories) {
      const name = (nameLang === "ko" ? c.ko : c.en) || c.en;
      set.add(getInitial(name, nameLang));
    }
    return set;
  }, [categories, nameLang]);

  const activeFilterCount = (usageFilter !== "all" ? 1 : 0) + (descFilter !== "all" ? 1 : 0);

  const handleSortByChange = (next: SortBy) => {
    if (next === sortBy) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(next);
      setSortDir(next === "freq" ? "desc" : "asc");
    }
  };

  const sortItems = [
    { value: "custom" as const, label: "사용자 정의순" },
    { value: "freq" as const, label: "빈도순" },
    {
      value: "name" as const,
      label: "이름순",
      subItems: [
        { value: "ko" as const, label: "한글" },
        { value: "en" as const, label: "영어" },
      ] as const,
    },
  ];

  /* custom 순서 — categories prop 의 인덱스 기준 */
  const customOrderIndex = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c, i) => { map[c.en] = i; });
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    let list = categories.map((c) => c.en);
    if (usageFilter === "in-use") list = list.filter((en) => (catCounts[en] ?? 0) > 0);
    else if (usageFilter === "unused") list = list.filter((en) => (catCounts[en] ?? 0) === 0);
    if (descFilter !== "all") {
      list = list.filter((en) => {
        const c = categories.find((x) => x.en === en);
        if (!c) return descFilter === "without";
        const d = normalizeDesc(c.description);
        const has = !!(d.ko.trim() || d.en.trim());
        return descFilter === "with" ? has : !has;
      });
    }
    if (sortBy === "name" && letterFilters.size > 0) {
      list = list.filter((en) => {
        const c = categories.find((x) => x.en === en);
        const name = (nameLang === "ko" ? c?.ko : c?.en) || en;
        return letterFilters.has(getInitial(name, nameLang));
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((en) => {
        const c = categories.find((x) => x.en === en);
        const ko = c?.ko ?? "";
        const d = c ? normalizeDesc(c.description) : { ko: "", en: "" };
        const inName = matchesSearch(q, en, ko);
        const inDesc = matchesSearch(q, d.ko, d.en);
        if (searchType === "name") return inName;
        if (searchType === "desc") return inDesc;
        return inName || inDesc;
      });
    }
    const sorted = [...list];
    const dirSign = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortBy === "custom") {
        const ai = customOrderIndex[a] ?? Number.MAX_SAFE_INTEGER;
        const bi = customOrderIndex[b] ?? Number.MAX_SAFE_INTEGER;
        return (ai - bi) * dirSign;
      }
      if (sortBy === "freq") {
        const ac = catCounts[a] ?? 0;
        const bc = catCounts[b] ?? 0;
        if (ac !== bc) return (ac - bc) * dirSign;
        return a.localeCompare(b, "ko");
      }
      // name — nameLang 기준
      const ca = categories.find((c) => c.en === a);
      const cb = categories.find((c) => c.en === b);
      const aName = (nameLang === "ko" ? ca?.ko : ca?.en) || a;
      const bName = (nameLang === "ko" ? cb?.ko : cb?.en) || b;
      return aName.localeCompare(bName, nameLang === "ko" ? "ko" : "en") * dirSign;
    });
    return sorted;
  }, [categories, search, searchType, sortBy, sortDir, nameLang, usageFilter, descFilter, letterFilters, catCounts, customOrderIndex]);

  const perPage = useMemo(() => {
    if (filtered.length === 0) return CATS_PER_PAGE_COMPACT;
    const withDesc = filtered.filter((en) => {
      const c = categories.find((x) => x.en === en);
      if (!c) return false;
      const d = normalizeDesc(c.description);
      return !!(d.ko.trim() || d.en.trim());
    }).length;
    return withDesc >= filtered.length / 2 ? CATS_PER_PAGE_DENSE : CATS_PER_PAGE_COMPACT;
  }, [filtered, categories]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageStart = (page - 1) * perPage;
  const pageItems = filtered.slice(pageStart, pageStart + perPage);

  const notes = useMemo(() => {
    const map: Record<string, LocalizedText> = {};
    for (const c of categories) {
      const d = normalizeDesc(c.description);
      /* 빈 description 은 제외 — entry 없음 으로 인식돼야 chip 옆 + 설명추가 / drawer 미생성 */
      if (d.ko.trim() || d.en.trim()) map[c.en] = d;
    }
    return map;
  }, [categories]);

  /* 필터/검색/정렬 미적용 + 1페이지 일 때만 drag-reorder 의미 있음.
     custom 순서 = 원본 그대로라 drag-reorder OK. */
  const isDefaultView =
    !search.trim() && usageFilter === "all" && descFilter === "all" &&
    sortBy === "custom" && sortDir === "asc" &&
    page === 1 && filtered.length === categories.length;

  /* reassign 대상 — useState 대신 변수로 닫힘 안에 보관 (modal callback 용) */
  const [reassignTarget, setReassignTarget] = useState<BilingualCategory | null>(null);

  /* openModal 로 CategoryReassignModal 열기 — X close / 일관된 radius 가 공통 Modal 책임 */
  const openReassignModal = useCallback((target: BilingualCategory) => {
    const id = "category-reassign";
    setReassignTarget(target);
    openModal(
      <CategoryReassignModal
        category={target}
        availableCategories={categories
          .filter((c) => c.ko !== target.ko || c.en !== target.en)
          .map<BilingualCategory>((c) => ({
            ko: c.ko,
            en: c.en,
            description: typeof c.description === "string" ? c.description : c.description?.ko,
          }))}
        onConfirm={async (assignments, newCategories) => {
          await handleReassignConfirmRef.current(assignments, newCategories);
          closeModal(id);
        }}
        onCancel={() => { closeModal(id); setReassignTarget(null); }}
      />,
      {
        id,
        header: { title: t("admin.settings.reassignModal.title") },
        closeButton: true,
        width: "min(540px, 90vw)",
      },
    );
  }, [openModal, closeModal, categories, t]);

  const handleItemsChange = (nextItems: string[]) => {
    const nextSet = new Set(nextItems);
    const removed = pageItems.find((en) => !nextSet.has(en));
    if (removed) {
      if (categories.length <= 1) {
        alert(t("admin.settings.categoryLastWarning"));
        return;
      }
      const cat = categories.find((c) => c.en === removed);
      if (cat) openReassignModal({ ko: cat.ko, en: cat.en });
      return;
    }
    /* reorder — default view 일 때만 적용 (필터/정렬 중엔 의미 불명확).
       parentEn 보존한 채 순서만 바꾸고 rebuildTree 로 재그룹. */
    if (!isDefaultView) return;
    const byEn: Record<string, FlatNode> = {};
    for (const c of categories) byEn[c.en] = c;
    onChange(nextItems.map((en) => byEn[en]).filter(Boolean));
  };

  /* TagNotesEditor 의 onNotesChange 는 무시 — 설명 편집은 하단 box 에서만 (drawer 는 onEditClick 으로 외부 위임). */
  const handleNotesChange = () => {};

  // ── 하단 통합 add/edit box ──
  const [editingEn, setEditingEn] = useState<string | null>(null);
  const [pair, setPair] = useState<LocalizedText>({ ko: "", en: "" });
  const [desc, setDesc] = useState<LocalizedText>({ ko: "", en: "" });
  /* 소속 대분류(parent) EN. null = 최상위(대분류). */
  const [parentEn, setParentEn] = useState<string | null>(null);
  /* 순서 (1-based). add = categories.length + 1 (맨 뒤 default). edit = 현재 위치. */
  const [_position, setPosition] = useState<number>(categories.length + 1);
  const [isShaking, setIsShaking] = useState(false);
  const triggerShake = () => { setIsShaking(true); setTimeout(() => setIsShaking(false), 450); };

  const isEdit = editingEn !== null;
  /* 편집 중 카테고리가 소분류를 가진 대분류면 최상위 고정(2단계 제한) → 부모 Select 비활성 */
  const editingHasChildren = isEdit && categories.some((c) => c.parentEn === editingEn);
  /* 부모(대분류) 선택지 — 최상위 노드들. 자기 자신 제외. */
  const parentSelectOptions = useMemo(
    () => [
      { value: "", label: "최상위 (대분류)" },
      ...categories
        .filter((c) => c.parentEn === null && c.en !== editingEn)
        .map((c) => ({ value: c.en, label: language === "ko" ? c.ko : c.en })),
    ],
    [categories, editingEn, language],
  );

  useEffect(() => {
    if (editingEn === null) {
      setPair({ ko: "", en: "" });
      setDesc({ ko: "", en: "" });
      setParentEn(null);
      setPosition(categories.length + 1);
      return;
    }
    const cat = categories.find((c) => c.en === editingEn);
    if (!cat) { setEditingEn(null); return; }
    setPair({ ko: cat.ko, en: cat.en });
    setDesc(normalizeDesc(cat.description));
    setParentEn(cat.parentEn);
    /* 편집 시 현재 array 안 idx + 1 */
    const idx = categories.findIndex((c) => c.en === editingEn);
    if (idx >= 0) setPosition(idx + 1);
  }, [editingEn, categories]);

  const cancelEdit = () => setEditingEn(null);

  /* 편집 중인 카테고리 삭제 — reassign 모달로 위임 (X close 일관됨) */
  const deleteEditingCategory = () => {
    if (!editingEn) return;
    if (categories.length <= 1) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    const cat = categories.find((c) => c.en === editingEn);
    if (cat) openReassignModal({ ko: cat.ko, en: cat.en });
  };

  /* 중복 발견 시 — 해당 chip 페이지로 이동 + 편집 모드 + scroll */
  const focusDuplicate = (dupEn: string) => {
    const idx = filtered.indexOf(dupEn);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / perPage) + 1;
      if (targetPage !== page) setPage(targetPage);
    }
    setEditingEn(dupEn);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-tag-item="${CSS.escape(dupEn)}"]`) as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const submit = () => {
    const rawKo = pair.ko.trim();
    const rawEn = pair.en.trim();
    if (!rawKo && !rawEn) return;
    /* 한쪽만 입력되면 반대쪽으로 fallback — 양쪽이 동일 값을 갖도록 정규화 */
    const ko = rawKo || rawEn;
    const en = rawEn || rawKo;
    const descKo = desc.ko.trim();
    const descEn = desc.en.trim();
    const description = descKo || descEn ? { ko: descKo, en: descEn } : undefined;

    if (isEdit) {
      const conflict = findDuplicate(categories, [ko, en], (c) => [c.ko, c.en], (c) => c.en === editingEn);
      if (conflict) {
        showToast(`"${conflict.ko}/${conflict.en}" 와 중복되는 카테고리가 있습니다`, "warning");
        triggerShake();
        focusDuplicate(conflict.en);
        return;
      }
      // 자식 있는 대분류는 최상위 유지(2단계 초과 방지). en 변경 시 자식 parentEn 재연결.
      const nextParent = editingHasChildren ? null : parentEn;
      onChange(categories.map((c) => {
        if (c.en === editingEn) return { ko, en, description, parentEn: nextParent };
        if (c.parentEn === editingEn) return { ...c, parentEn: en };
        return c;
      }));
      setEditingEn(null);
    } else {
      const dup = findDuplicate(categories, [ko, en], (c) => [c.ko, c.en]);
      if (dup) {
        showToast(`"${dup.ko}/${dup.en}" 카테고리가 이미 있습니다`, "warning");
        triggerShake();
        focusDuplicate(dup.en);
        return;
      }
      onChange([...categories, { ko, en, description, parentEn }]);
      setPair({ ko: "", en: "" });
      setDesc({ ko: "", en: "" });
      setParentEn(null);
    }
  };

  /* 한쪽만 입력돼도 활성 */
  const submitEnabled = !!pair.ko.trim() || !!pair.en.trim();

  /* openModal 안 callback 이 stale closure 안 보게 ref 로 latest 유지 */
  const handleReassignConfirmRef = useRef<(
    assignments: { id: string; category: string }[],
    newCategories: BilingualCategory[],
  ) => Promise<void>>(async () => {});
  handleReassignConfirmRef.current = async (assignments, newCategories) => {
    if (assignments.length > 0) {
      await fetch("/api/posts/reassign-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
    }
    const remaining = categories.filter(
      (c) => c.ko !== reassignTarget?.ko || c.en !== reassignTarget?.en,
    );
    const merged: FlatNode[] = [
      ...remaining,
      ...newCategories
        .filter((nc) => !remaining.some((r) => r.ko === nc.ko))
        .map<FlatNode>((nc) => ({ ko: nc.ko, en: nc.en, description: undefined, parentEn: null })),
    ];
    onChange(merged);
    setReassignTarget(null);
    if (editingEn === reassignTarget?.en) setEditingEn(null);
  };

  /* 편집 중인 카테고리의 관련 게시물 — post.category 가 EN 또는 KO 저장됐을 수 있으니 둘 다 매칭. */
  const editingPosts = useMemo<AdminPostUsageInfo[]>(() => {
    if (!editingEn) return [];
    const editingKo = (koByEn[editingEn] || "").trim();
    return catPosts.filter((p) => {
      const cat = (p.category || "").trim();
      return cat === editingEn || (!!editingKo && cat === editingKo);
    });
  }, [editingEn, catPosts, koByEn]);

  return (
    <div className={styles.worksCatEditor}>
      {/* Toolbar 묶음 — filterRow + filterDrawer 한 컨테이너 */}
      <div className={styles.tagDescToolbarWrap}>
        {/* Filter 토글 + 정렬 + 검색 (한 줄) */}
        <div className={styles.tagDescFilterRow}>
          <Button
            variant={filterExpanded || activeFilterCount > 0 ? "primary" : "outline"}
            size="sm"
            icon={<Filter size={12} />}
            onClick={() => setFilterExpanded((e) => !e)}
          >
            필터
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
            onBack={() => setSortBy("custom")}
            size="sm"
          />
          <span className={styles.tagDescCount}>{filtered.length} / {categories.length}</span>
          <div className={styles.tagDescSearchEnd}>
            <SearchCapsule
              typeSelector={{
                value: searchType,
                options: [
                  { value: "all", label: "이름+설명" },
                  { value: "name", label: "이름" },
                  { value: "desc", label: "설명" },
                ],
                onChange: (v) => setSearchType(v as "all" | "name" | "desc"),
              }}
              search={search}
              onSearchChange={setSearch}
              placeholder="카테고리 이름·설명 검색"
              align="left"
              size="sm"
            />
          </div>
        </div>
        {/* 펼친 상태에서만 필터 chip group 노출 */}
        <AnimatePresence initial={false}>
          {filterExpanded && (
            <motion.div
              key="cat-filter-drawer"
              className={styles.tagDescFilterDrawerWrap}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className={styles.tagDescFilterDrawer}>
                <div className={styles.tagDescFilterGroup}>
                  <span className={styles.tagDescFilterGroupLabel}>사용</span>
                  <SegmentedControl
                    items={[
                      { value: "all", label: "전체" },
                      { value: "in-use", label: "사용중" },
                      { value: "unused", label: "미사용" },
                    ]}
                    value={usageFilter}
                    onChange={(v) => setUsageFilter(v as UsageFilter)}
                    size="sm"
                  />
                </div>
                <div className={styles.tagDescFilterGroup}>
                  <span className={styles.tagDescFilterGroupLabel}>설명</span>
                  <SegmentedControl
                    items={[
                      { value: "all", label: "전체" },
                      { value: "with", label: "있음" },
                      { value: "without", label: "없음" },
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
        <AnimatePresence initial={false}>
          {sortBy === "name" && (
            <motion.div
              key="cat-letter-drawer"
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

      {/* chip 영역 + count 묶음 */}
      <div className={styles.tagDescChipsBlock}>
        {pageItems.length === 0 ? (
          <div className={styles.tagDescEmpty}>
            {search ? "검색 결과 없음" : "카테고리 없음"}
          </div>
        ) : (
          <TagNotesEditor
            items={pageItems}
            notes={notes}
            onItemsChange={handleItemsChange}
            onNotesChange={handleNotesChange}
            prefix=""
            notePlaceholder={t("admin.settings.categoryDescPlaceholder")}
            addLabel={t("admin.settings.edit")}
            cancelLabel={t("admin.settings.cancel")}
            editLabel={t("admin.settings.edit")}
            removeTitle={t("admin.settings.removeCategory")}
            renderItemLabel={(en) => {
              const node = nodeByEn.get(en);
              const koRaw = (koByEn[en] || "").trim();
              const enRaw = en.trim();
              const showBoth = !!koRaw && !!enRaw && koRaw !== enRaw;
              const single = koRaw || enRaw;
              /* EN + KO 저장분 합산. 대분류면 소분류 카운트까지 롤업. */
              let count = (catCounts[en] ?? 0) + (koRaw && koRaw !== en ? (catCounts[koRaw] ?? 0) : 0);
              const kids = node && node.parentEn === null ? categories.filter((c) => c.parentEn === en) : [];
              for (const ch of kids) {
                count += (catCounts[ch.en] ?? 0) + (ch.ko && ch.ko !== ch.en ? (catCounts[ch.ko] ?? 0) : 0);
              }
              const parentName = node?.parentEn
                ? (nodeByEn.get(node.parentEn)?.[nameLang === "ko" ? "ko" : "en"] ?? node.parentEn)
                : null;
              return (
                <span className={styles.worksCatChipLabel}>
                  {parentName && (
                    <span style={{ color: "var(--text-tertiary)", marginRight: 2 }}>{parentName} ›</span>
                  )}
                  <span>{showBoth ? koRaw : single}</span>
                  {showBoth && <span className={styles.worksCatChipSep}>·</span>}
                  {showBoth && <span>{enRaw}</span>}
                  <span className={styles.tagCountBadge}>({count})</span>
                </span>
              );
            }}
            onItemClick={(en) => setEditingEn(en === editingEn ? null : en)}
            onEditClick={(en) => setEditingEn(en === editingEn ? null : en)}
            activeItem={editingEn}
            showIndex
            startIndex={pageStart}
            /* 숫자 label 은 정렬·필터·페이지에 무관하게 카테고리 정의 순서 (customOrderIndex+1) 고정 */
            getDisplayIndex={(en) => (customOrderIndex[en] ?? 0) + 1}
            indexMinChars={3}
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

      <div className={`${styles.worksCatAddBox} ${isEdit ? styles.worksCatAddBoxEdit : ""} ${isShaking ? styles.shakeAlert : ""}`}>
        <div className={styles.worksCatAddLabel}>
          {isEdit ? <T k="admin.settings.edit" /> : <T k="admin.settings.addCategory" />}
          <div className={styles.worksCatAddActions}>
            {isEdit && (
              <>
                <Button
                  variant="outline"
                  size="xs"
                  tone="danger"
                  onClick={deleteEditingCategory}
                  icon={<Trash2 size={12} strokeWidth={2} />}
                >
                  삭제
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={cancelEdit}
                  icon={<X size={12} strokeWidth={2.5} />}
                >
                  <T k="admin.settings.cancel" />
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={submit}
              disabled={!submitEnabled}
              icon={isEdit ? <Check size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2} />}
            >
              {isEdit ? <T k="admin.settings.saveEdit" /> : <T k="admin.settings.addCategory" />}
            </Button>
          </div>
        </div>
        <div className={styles.worksCatAddRow}>
          <span className={styles.worksCatAddRowLabel}>
            <T k="admin.settings.name" />
          </span>
          <BilingualInputPair value={pair} onChange={setPair} onEnter={submit} />
        </div>
        <div className={styles.worksCatAddRow}>
          <span className={styles.worksCatAddRowLabel}>대분류</span>
          <Select
            value={parentEn ?? ""}
            options={parentSelectOptions}
            onChange={(v) => setParentEn(v || null)}
            disabled={editingHasChildren}
          />
          {editingHasChildren && (
            <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-space-grotesk)" }}>
              소분류를 가진 대분류는 최상위 고정
            </span>
          )}
        </div>
        <div className={styles.worksCatAddRow}>
          <span className={styles.worksCatAddRowLabel}>
            <T k="admin.settings.categoryDescPlaceholder" />
          </span>
          <BilingualInputPair value={desc} onChange={setDesc} onEnter={submit} />
        </div>
        {/* 편집 모드 — 관련 게시물 (ul/li 리스트) */}
        {isEdit && (
          <div className={styles.worksCatAddRow}>
            <span className={styles.worksCatAddRowLabel}>게시물 ({editingPosts.length})</span>
            <List className={styles.tagRelatedPosts} data-lenis-prevent>
              {editingPosts.length === 0 ? (
                <ListItem className={styles.tagRelatedEmpty}>이 카테고리를 사용하는 게시물 없음</ListItem>
              ) : (
                editingPosts.map((p) => (
                  <ListItem key={p.id} layout="column">
                    <a
                      href={`/admin/posts/${p.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.tagRelatedItem}
                    >
                      <span className={styles.tagRelatedTitle}>
                        {p.title || p.title_en || "(no title)"}
                      </span>
                      <PostMeta p={p} />
                    </a>
                  </ListItem>
                ))
              )}
            </List>
          </div>
        )}
      </div>

      {/* CategoryReassignModal 은 openModal() 로 띄움 — X close / 일관 radius 는 공통 Modal 책임 */}
    </div>
  );
}
