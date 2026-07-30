"use client";

import { useState, useMemo, useEffect } from "react";
import type { SortDirection } from "@/types";
import type { LocalizedText } from "@/types/common";
import type { PostMetaInfo } from "../_types";
import { Plus, Check, X, Trash2, Filter, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Pagination from "@/components/ui/Pagination";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { List, ListItem } from "@/app/admin/(dashboard)/components";
import { showToast } from "@/stores/toastStore";
import { findDuplicate } from "@/lib/dedupe";
import { getInitial, KO_INITIALS, EN_INITIALS } from "@/lib/initial";
import { matchesSearch } from "@/lib/koSearch";
import LetterFilter from "@/components/ui/LetterFilter";
import styles from "../Settings.module.css";

/** legacy `description: string` → bilingual `{ko, en}` 자동 정규화. */
interface WorksCategory {
  ko: string;
  en: string;
  description?: LocalizedText | string;
}

interface WorksCategoriesEditorProps {
  categories: WorksCategory[];
  onChange: (cats: WorksCategory[]) => void;
}

function normalizeDesc(d: WorksCategory["description"]): LocalizedText {
  if (!d) return { ko: "", en: "" };
  if (typeof d === "string") return { ko: "", en: d };
  return { ko: d.ko ?? "", en: d.en ?? "" };
}

interface WorksInfo {
  id: string;
  title: string;
  categories: string[];
  slug: string;
  published: boolean;
  published_at: string | null;
  created_at: string | null;
}

/** Work row 의 메타 (발행상태 + 날짜) */
function WorkMeta({ w }: { w: PostMetaInfo }) {
  const date = w.published_at || w.created_at;
  const dateStr = date ? new Date(date).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).replace(/\.\s/g, ".").replace(/\.$/, "") : "";
  return (
    <span className={styles.tagRelatedMeta}>
      {!w.published && <span className={styles.tagRelatedMetaDraft}>draft</span>}
      {dateStr && <span>{dateStr}</span>}
    </span>
  );
}

/* 페이지당 항목 수 — filtered 중 설명 있는 항목 비율 >= 50% 면 dense (6),
   아니면 compact (20). 행이 길어질 때 자동으로 좁게 표시 → 스크롤 부담 완화. */
const CATS_PER_PAGE_COMPACT = 20;
const CATS_PER_PAGE_DENSE = 8;

export default function WorksCategoriesEditor({ categories, onChange }: WorksCategoriesEditorProps) {
  const { t } = useLanguage();

  /* fetch counts + works */
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});
  const [catWorks, setCatWorks] = useState<WorksInfo[]>([]);
  useEffect(() => {
    fetch("/api/admin/works-categories")
      .then((r) => r.ok ? r.json() : { categories: [], counts: {}, works: [] })
      .then((d) => {
        setCatCounts(d.counts ?? {});
        setCatWorks(d.works ?? []);
      })
      .catch(() => { setCatCounts({}); setCatWorks([]); });
  }, []);

  const koByEn = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.en] = c.ko;
    return map;
  }, [categories]);

  /* 검색 / 정렬 / 필터 / 페이지네이션 — posts CategoriesEditor 와 동일 패턴 */
  const [search, setSearch] = useState("");
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
      if (d.ko.trim() || d.en.trim()) map[c.en] = d;
    }
    return map;
  }, [categories]);

  /* 필터/검색/정렬 미적용 + 1페이지 일 때만 drag-reorder 의미 있음. custom 정렬 = 원본 그대로 */
  const isDefaultView =
    !search.trim() && usageFilter === "all" && descFilter === "all" &&
    sortBy === "custom" && sortDir === "asc" &&
    page === 1 && filtered.length === categories.length;

  const handleItemsChange = (nextItems: string[]) => {
    const nextSet = new Set(nextItems);
    const removed = pageItems.find((en) => !nextSet.has(en));
    if (removed) {
      if (categories.length <= 1) {
        alert(t("admin.settings.categoryLastWarning"));
        return;
      }
      onChange(categories.filter((c) => c.en !== removed));
      return;
    }
    if (!isDefaultView) return;
    const byEn: Record<string, WorksCategory> = {};
    for (const c of categories) byEn[c.en] = c;
    onChange(nextItems.map((en) => byEn[en]).filter(Boolean));
  };

  const handleNotesChange = () => {};

  // ── 하단 통합 add/edit box ──
  const [editingEn, setEditingEn] = useState<string | null>(null);
  const [pair, setPair] = useState<LocalizedText>({ ko: "", en: "" });
  const [desc, setDesc] = useState<LocalizedText>({ ko: "", en: "" });
  const [isShaking, setIsShaking] = useState(false);
  const triggerShake = () => { setIsShaking(true); setTimeout(() => setIsShaking(false), 450); };

  const isEdit = editingEn !== null;

  useEffect(() => {
    if (editingEn === null) {
      setPair({ ko: "", en: "" });
      setDesc({ ko: "", en: "" });
      return;
    }
    const cat = categories.find((c) => c.en === editingEn);
    if (!cat) { setEditingEn(null); return; }
    setPair({ ko: cat.ko, en: cat.en });
    setDesc(normalizeDesc(cat.description));
  }, [editingEn, categories]);

  const cancelEdit = () => setEditingEn(null);

  /* 편집 중인 카테고리 삭제 — works 는 reassign 모달 없이 직접 제거 (multi-cat 이라 work 가 다른 cat 으로 살아남음) */
  const deleteEditingCategory = () => {
    if (!editingEn) return;
    if (categories.length <= 1) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    onChange(categories.filter((c) => c.en !== editingEn));
    setEditingEn(null);
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
      onChange(categories.map((c) => (c.en === editingEn ? { ko, en, description } : c)));
      setEditingEn(null);
    } else {
      const dup = findDuplicate(categories, [ko, en], (c) => [c.ko, c.en]);
      if (dup) {
        showToast(`"${dup.ko}/${dup.en}" 카테고리가 이미 있습니다`, "warning");
        triggerShake();
        focusDuplicate(dup.en);
        return;
      }
      onChange([...categories, { ko, en, description }]);
      setPair({ ko: "", en: "" });
      setDesc({ ko: "", en: "" });
    }
  };

  const submitEnabled = !!pair.ko.trim() || !!pair.en.trim();

  /* 편집 중인 카테고리의 관련 work 들 — multi-cat 이라 categories 배열에 editingEn 포함 여부로 필터 */
  const editingWorks = useMemo<WorksInfo[]>(() => {
    if (!editingEn) return [];
    return catWorks.filter((w) => w.categories.includes(editingEn));
  }, [editingEn, catWorks]);

  return (
    <div className={styles.worksCatEditor}>
      {/* Toolbar 묶음 — filterRow + filterDrawer 한 컨테이너 (posts CategoriesEditor 와 동일 패턴) */}
      <div className={styles.tagDescToolbarWrap}>
        {/* Filter 토글 + 정렬 + 검색 (한 줄) */}
        <div className={styles.tagDescFilterRow}>
          <Button
            variant={filterExpanded || activeFilterCount > 0 ? "primary" : "outline"}
            size="sm"
            icon={<Filter size={12} />}
            onClick={() => setFilterExpanded((e) => !e)}
          >
            필터{activeFilterCount > 0 && ` (${activeFilterCount})`}
            <ChevronDown
              size={12}
              style={{
                marginLeft: 2,
                transform: filterExpanded ? "rotate(180deg)" : undefined,
                transition: "transform 0.2s",
              }}
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
              key="works-cat-filter-drawer"
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
                  <Button
                    variant={usageFilter === "in-use" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setUsageFilter((u) => u === "in-use" ? "all" : "in-use")}
                  >사용중</Button>
                  <Button
                    variant={usageFilter === "unused" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setUsageFilter((u) => u === "unused" ? "all" : "unused")}
                  >미사용</Button>
                </div>
                <div className={styles.tagDescFilterGroup}>
                  <span className={styles.tagDescFilterGroupLabel}>설명</span>
                  <Button
                    variant={descFilter === "with" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setDescFilter((d) => d === "with" ? "all" : "with")}
                  >설명 있음</Button>
                  <Button
                    variant={descFilter === "without" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setDescFilter((d) => d === "without" ? "all" : "without")}
                  >설명 없음</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {sortBy === "name" && (
            <motion.div
              key="works-cat-letter-drawer"
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
            const koRaw = (koByEn[en] || "").trim();
            const enRaw = en.trim();
            const showBoth = !!koRaw && !!enRaw && koRaw !== enRaw;
            const single = koRaw || enRaw;
            const count = catCounts[en] ?? 0;
            return (
              <span className={styles.worksCatChipLabel}>
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
        />
      )}

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
          <span className={styles.worksCatAddRowLabel}>
            <T k="admin.settings.categoryDescPlaceholder" />
          </span>
          <BilingualInputPair value={desc} onChange={setDesc} onEnter={submit} />
        </div>
        {/* 편집 모드 — 관련 프로젝트 (ul/li 리스트) */}
        {isEdit && (
          <div className={styles.worksCatAddRow}>
            <span className={styles.worksCatAddRowLabel}>프로젝트 ({editingWorks.length})</span>
            <List className={styles.tagRelatedPosts} data-lenis-prevent>
              {editingWorks.length === 0 ? (
                <ListItem className={styles.tagRelatedEmpty}>이 카테고리를 사용하는 프로젝트 없음</ListItem>
              ) : (
                editingWorks.map((w) => (
                  <ListItem key={w.id} layout="column">
                    <a
                      href={`/admin/works/${w.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.tagRelatedItem}
                    >
                      <span className={styles.tagRelatedTitle}>
                        {w.title || "(no title)"}
                      </span>
                      <WorkMeta w={w} />
                    </a>
                  </ListItem>
                ))
              )}
            </List>
          </div>
        )}
      </div>
    </div>
  );
}
