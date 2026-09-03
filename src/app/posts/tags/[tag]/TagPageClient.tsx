"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PER_PAGE_OPTIONS } from "@/constants";
import { useSearchControls } from "@/hooks/useSearchControls";
import { useSortToggle } from "@/hooks/useSortToggle";
import { usePageControls } from "@/hooks/usePageControls";
import { QUERY_PARAM } from "@/constants";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, ArrowLeft, List, ChevronRight, ArrowUpRight } from "@/components/icons";
import type { Post } from "@/types/post";
import type { TagPageData, AllTagsData } from "@/lib/posts";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import PostCard from "../../_components/PostCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Tooltip from "@/components/ui/Tooltip";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { parseSearchQuery, matchesQuery } from "@/lib/searchQuery";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import styles from "./TagPage.module.css";
import Pressable from "@/components/ui/Pressable";

type Sort = "newest" | "popular" | "title";

interface Props {
  tag: string;
  initialData: TagPageData;
  allTags: AllTagsData["tags"];
}

export default function TagPageClient({ tag, initialData, allTags }: Props) {
  const router = useRouter();
  const { language } = useLanguage();
  const { setInfinite } = useLenis();
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const { sortBy: sort, sortDir, handleSortChange: toggleSort } = useSortToggle<Sort>("newest", "desc");
  const [loading, setLoading] = useState(false);
  const { search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode } =
    useSearchControls<"all" | "title" | "content">("all");
  // 추가 태그 필터 — selectMode 켤 때 관련 태그 클릭으로 토글. client-side 교집합 필터.
  const [extraTags, setExtraTags] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  // 관련 태그 헤더 트리거로 펼치는 "그 외 전체 태그" 패널
  const [showAllTags, setShowAllTags] = useState(false);
  // 관련 태그 + 현재 태그를 제외한 나머지 전체 태그 (count desc — getAllTagsData 정렬 유지)
  const otherTags = useMemo(() => {
    const exclude = new Set<string>([tag, ...initialData.relatedTags.map((r) => r.tag)]);
    return allTags.filter((t) => !exclude.has(t.tag));
  }, [allTags, initialData.relatedTags, tag]);
  const toggleExtraTag = (t: string) => {
    setExtraTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  const toggleSelectMode = () => {
    setSelectMode((m) => {
      if (m) setExtraTags(new Set()); // 끄면 선택 클리어
      return !m;
    });
  };

  // extraTags 정렬+CSV — Set 자체는 deps 비교 안 됨, key 로 변환
  const extraTagsKey = useMemo(
    () => Array.from(extraTags).sort().join(","),
    [extraTags],
  );

  // page · perPage — extraTags 가 바뀌면 1페이지로(totalPages 재계산). 정렬·perPage 클릭은 같은 이벤트에서 setPage(1)
  const { page, setPage, perPage, setPerPage } = usePageControls({ defaultPerPage: initialData.perPage, resetOn: [extraTagsKey] });

  // Sticky filter bar — 공통 hook
  const { sentinelRef, filterBarRef, isStuck, barHidden } = useStickyFilterBar();

  // Lenis infinite scroll 끄기 — 이 페이지에선 자연스러운 끝(페이지네이션) 도달 필요
  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  // 같은 sort 다시 클릭 → dir toggle, 다른 sort → default desc. page 리셋은 같은 이벤트에서(효과로 늦추면 fetch 두 번)
  const handleSortChange = (v: Sort) => {
    toggleSort(v);
    setPage(1);
  };

  // sort/page/perPage/extraTags 변경 시 fetch. 다중 태그면 tags= CSV 사용 (교집합)
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort,
        sortDir,
        page: String(page),
        limit: String(perPage),
      });
      if (extraTagsKey) {
        params.set("tags", `${tag},${extraTagsKey}`);
      } else {
        params.set(QUERY_PARAM.tag, tag);
      }
      const res = await fetch(`/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      // noop
    }
    setLoading(false);
  }, [tag, sort, sortDir, page, perPage, extraTagsKey]);

  // initial data 외 변경 시만 fetch (extraTags 도 0 일 때만 initial)
  const isInitial =
    page === 1 && sort === "newest" && sortDir === "desc" && perPage === initialData.perPage && extraTagsKey === "";
  useEffect(() => {
    if (isInitial) {
      // 초기 파라미터로 복귀(전체 클릭 / 태그 해제 / 다중선택 off) 시 SSR 초기 데이터 복원 —
      // 안 하면 이전 교집합 결과가 그대로 남음. 마운트 시엔 이미 같은 값이라 no-op.
      setPosts(initialData.posts);
      setTotalPages(initialData.totalPages);
      return;
    }
    fetchPosts();
  }, [fetchPosts, isInitial, initialData]);

  // 검색 client-side filter (다중 태그 교집합은 서버가 처리)
  const filteredPosts = useMemo(() => {
    const q = search.trim();
    if (!q) return posts;
    const parsed = parseSearchQuery(q, syntaxMode);
    const titleHaystack = (p: Post) => [p.title, p.title_en].filter(Boolean).join("\n");
    const contentHaystack = (p: Post) => [p.content, p.content_en, p.excerpt, p.excerpt_en].filter(Boolean).join("\n");
    return posts.filter((p) => {
      if (searchType === "title") return matchesQuery(titleHaystack(p), parsed);
      if (searchType === "content") return matchesQuery(contentHaystack(p), parsed);
      return matchesQuery(`${titleHaystack(p)}\n${contentHaystack(p)}`, parsed);
    });
  }, [posts, search, searchType, syntaxMode]);

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <div className={styles.container}>
      {/* Sticky 감지용 sentinel — heroTopRow 바로 위에 0-height 로 두고
         viewport top 라인을 넘는 순간 stuck = true */}
      <div ref={sentinelRef} style={{ height: 0 }} />

      {/* heroTopRow — TAG badge · 검색 · sort · perPage. position: sticky.
         scroll-down 시 hide, scroll-up 시 show */}
      <div
        ref={filterBarRef}
        className={`${styles.heroTopRow} ${isStuck ? styles.heroTopRowStuck : ""} ${barHidden ? styles.heroTopRowHidden : ""}`}
      >
        <Button
          variant="ghost"
          size="sm"
          className={styles.backBtn}
          icon={<ArrowLeft size={16} strokeWidth={1.8} />}
          onClick={() => router.push("/posts/tags")}
          title="태그 목록으로"
        >
          태그 목록
        </Button>
        <Link href="/posts/tags" className={styles.heroBadge} title="전체 태그 보기">
          <Hash size={18} strokeWidth={1.8} />
          <span>TAG</span>
        </Link>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <SegmentedControl<Sort>
              className={styles.sortControl}
              items={[
                { value: "newest", label: "최신순" },
                { value: "popular", label: "인기순" },
                { value: "title", label: "제목순" },
              ]}
              value={sort}
              onChange={handleSortChange}
              sortDir={sortDir}
              size="sm"
            />
          </div>
          <div className={styles.searchPerPageGroup}>
            <div className={styles.perPageGroup}>
              <List size={14} strokeWidth={1.8} className={styles.perPageIcon} aria-hidden />
              <Select
                className={styles.perPageSelect}
                size="sm"
                value={String(perPage)}
                options={PER_PAGE_OPTIONS}
                onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
              />
            </div>
            <SearchCapsule
              search={search}
              onSearchChange={setSearch}
              align="right"
              size="sm"
              placeholder="이 태그 안에서 검색…"
              className={styles.heroSearch}
              routeParam="q"
              hasResults={filteredPosts.length > 0}
              onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
              typeSelector={{
                value: searchType,
                options: [
                  { value: "all", label: "제목+내용" },
                  { value: "title", label: "제목" },
                  { value: "content", label: "내용" },
                ],
                onChange: (v) => setSearchType(v as "all" | "title" | "content"),
              }}
              syntaxHelp
            />
          </div>
        </div>
      </div>

      {/* Hero — title + count + related tags */}
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{tag}</h1>
        {initialData.description && (
          <p className={styles.heroDescription}>{initialData.description}</p>
        )}
        <p className={styles.heroMeta}>
          <strong>{initialData.totalCount.toLocaleString()}</strong>개의 게시물
        </p>
        {initialData.relatedTags.length > 0 && (
          <div className={styles.relatedRow}>
            <div className={styles.relatedHeader}>
              <Tooltip
                placement="top"
                delay={200}
                content={
                  <div className={styles.relatedLabelTooltip}>
                    <div className={styles.relatedLabelTooltipMain}>Related Tags</div>
                    <div className={styles.relatedLabelTooltipDesc}>
                      이 태그와 같은 게시물에 함께 쓰인 태그를 등장 빈도가 높은 순으로 보여줍니다.
                      &lsquo;관련 태그&rsquo;를 클릭하면 그 외 전체 태그가 펼쳐집니다.
                      &lsquo;다중 선택&rsquo;을 켜면 여러 태그를 클릭해 추가로 필터링할 수 있습니다.
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
                  title={showAllTags ? "전체 태그 접기" : "그 외 전체 태그 펼치기"}
                >
                  관련 태그
                </Button>
              </Tooltip>
              <Button
                variant="outline"
                size="2xs"
                active={selectMode}
                className={styles.selectModeBtn}
                onClick={toggleSelectMode}
                title={selectMode ? "다중 선택 끄기" : "다중 선택 켜기 — 여러 태그로 추가 필터"}
              >
                다중 선택
              </Button>
            </div>
            <div className={styles.relatedTags}>
              {selectMode && (
                <Pressable
                  className={`${styles.relatedPill} ${styles.relatedPillSelectable} ${extraTags.size === 0 ? styles.relatedPillActive : ""}`}
                  onClick={() => setExtraTags(new Set())}
                  title="추가 필터 해제 — 이 태그 전체 보기"
                >
                  <span>전체</span>
                </Pressable>
              )}
              {initialData.relatedTags.map(({ tag: rt, count }) => {
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
                      onClick={() => toggleExtraTag(rt)}
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
                      <span className={styles.allTagsEmpty}>그 외 태그가 없습니다.</span>
                    ) : (
                      otherTags.map((t) => (
                        <Link
                          key={t.tag}
                          href={`/posts/tags/${encodeURIComponent(t.tag)}`}
                          className={styles.relatedPill}
                        >
                          <span>#{t.tag}</span>
                          <span className={styles.relatedPillCount}>{t.count}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </header>

      {/* Grid */}
      <div className={`${styles.grid} ${loading ? styles.gridLoading : ""}`}>
        {filteredPosts.map((p) => (
          <PostCard key={p.id} post={p} variant="standard" />
        ))}
      </div>

      {/* Pagination — 항상 표시 (1페이지여도) */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        className={styles.pagination}
      />

      {/* 통합 태그 — 같은 기술(tech)을 쓴 작업물. tags↔tech 공유 어휘. */}
      {initialData.works.length > 0 && (
        <section className={styles.worksSection}>
          <h2 className={styles.worksHeading}>
            이 태그를 쓴 프로젝트
            <span className={styles.worksCount}>{initialData.works.length}</span>
          </h2>
          <div className={styles.worksTable}>
            {initialData.works.map((w) => (
              <Link
                key={w.id}
                href={`/works/${w.slug}`}
                className={styles.workRow}
                data-clickable="true"
              >
                {w.image && (
                  <div className={styles.workRowBg} aria-hidden="true">
                    <div
                      className={styles.workRowBgImg}
                      style={{ backgroundImage: `url(${w.image})` }}
                    />
                  </div>
                )}
                <span className={styles.workRowTitle}>{(language === "ko" ? w.title : w.title_en) || (language === "ko" ? w.title_en : w.title)}</span>
                <span className={styles.workRowSubtitle}>
                  {(language === "ko" ? w.subtitle_ko : w.subtitle_en) || (language === "ko" ? w.subtitle_en : w.subtitle_ko)}
                </span>
                {w.year && <span className={styles.workRowYear}>{w.year}</span>}
                <ArrowUpRight className={styles.workRowArrow} size={20} strokeWidth={2} aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
    </SearchHighlightProvider>
  );
}
