"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import type { Post, Series } from "@/types/post";
import type { InitialPostsData } from "@/lib/posts";
import PostCard from "./_components/PostCard";
import CategoryNav from "./_components/CategoryNav";
import SeriesCard from "./_components/SeriesCard";
import PostsBanner from "./_components/PostsBanner/PostsBanner";
import PopularPosts from "./_components/PopularPosts";
import RandomPosts from "./_components/RandomPosts";
import RecentComments from "./_components/RecentComments";
import TagCloud3D from "./_components/TagCloud3D";
import {
  SkeletonLine,
  SkeletonPill,
  SkeletonBlock,
} from "@/components/ui/Skeleton";
import SegmentedControl from "@/components/ui/SegmentedControl";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  BookOpen,
  LayoutGrid,
  ArrowUp,
  Shuffle,
} from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import Select from "@/components/ui/Select";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import styles from "./Posts.module.css";

function SidebarWrap({
  barHidden,
  children,
}: {
  barHidden: boolean;
  children: React.ReactNode;
}) {
  const { isMobile: isCollapsed } = useIsMobile(1024);
  const ref = useRef<HTMLElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [check]);

  return (
    <div
      className={`${styles.sidebarWrap} ${barHidden ? styles.sidebarUp : ""}`}
    >
      {canUp && (
        <div className={styles.sidebarFadeTop}>
          <ChevronUp size={14} />
        </div>
      )}
      <aside
        ref={ref}
        className={styles.sidebar}
        {...(!isCollapsed && { "data-lenis-prevent": true })}
      >
        {children}
      </aside>
      {canDown && (
        <div className={styles.sidebarFadeBottom}>
          <ChevronDown size={14} />
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

// Bento variants — 1-col (square/portrait/standard) + 2-col span (wide/banner).
// 그리드는 auto-fit 으로 col 수가 viewport 따라 변동 (각 col 약 220-300px 고정) → wide 도 절대 폭이 일정.
type CardType = "wide" | "banner" | "square" | "portrait" | "standard";

// 10 items / 12 cells — 1 wide(2) + 1 banner(2) + 8 singles. dense packing 으로 backfill.
const TEMPLATE_A: CardType[] = [
  "banner",
  "standard",
  "standard",
  "wide",
  "portrait",
  "square",
  "standard",
  "standard",
  "portrait",
  "standard",
];
const TEMPLATE_B: CardType[] = [
  "wide",
  "portrait",
  "standard",
  "standard",
  "square",
  "banner",
  "standard",
  "portrait",
  "standard",
  "standard",
];
const TEMPLATE_C: CardType[] = [
  "standard",
  "square",
  "portrait",
  "wide",
  "standard",
  "banner",
  "standard",
  "portrait",
  "standard",
  "standard",
];
const TEMPLATES = [TEMPLATE_A, TEMPLATE_B, TEMPLATE_C];

function getCardType(idx: number): CardType {
  const cycleLen = 10;
  const cycle = Math.floor(idx / cycleLen);
  const pos = idx % cycleLen;
  return TEMPLATES[cycle % TEMPLATES.length][pos];
}

interface PostsClientProps {
  initialData: InitialPostsData;
}

export default function PostsClient({ initialData }: PostsClientProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  const { t } = useLanguage();
  const siteConf = useSiteConfig();
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [pinnedPosts] = useState<Post[]>(initialData.pinnedPosts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "title" | "content">(
    "all",
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // URL query (?tag=foo 또는 ?tag=foo,bar CSV) 도착 시 초기값 sync — 다중 선택 지원
  const urlSearchParams = useSearchParams();
  const [activeTags, setActiveTags] = useState<Set<string>>(() => {
    const raw = urlSearchParams?.get("tag");
    return new Set(
      raw
        ? raw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    );
  });
  const activeTagsKey = useMemo(
    () => Array.from(activeTags).sort().join(","),
    [activeTags],
  );
  const toggleActiveTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);
  const clearActiveTags = useCallback(() => setActiveTags(new Set()), []);
  const [allTags] = useState(initialData.allTags);
  const [extraCategories] = useState(initialData.extraCategories);
  const [sortBy, setSortBy] = useState<"date" | "popular" | "title" | "random">(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // popular 그룹 안 세부 메트릭 — 종합 / 조회 / 댓글 / 좋아요
  const [popularSort, setPopularSort] = useState<
    "score" | "views" | "comments" | "likes"
  >("score");
  const [randomSeed, setRandomSeed] = useState(() =>
    Math.floor(Math.random() * 1e9),
  );
  // API 호환 — sortBy=popular 면 popularSort 메트릭 매핑 (score/views/likes/comments)
  const sort:
    | "newest"
    | "oldest"
    | "popular"
    | "title"
    | "random"
    | "views"
    | "likes"
    | "comments" =
    sortBy === "popular"
      ? popularSort === "score"
        ? "popular"
        : popularSort
      : sortBy === "title"
        ? "title"
        : sortBy === "random"
          ? "random"
          : sortDir === "desc"
            ? "newest"
            : "oldest";
  const [hoveredSort, setHoveredSort] = useState<string | null>(null);
  const [perPage, setPerPage] = useState(siteConf.posts.perPage ?? 10);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>(
    initialData.seriesList,
  );
  const [seriesPage, setSeriesPage] = useState(0);
  const [seriesTotal, setSeriesTotal] = useState(initialData.seriesTotal);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesSortBy, setSeriesSortBy] = useState<
    "default" | "newest" | "title"
  >("default");
  const [seriesSortDir, setSeriesSortDir] = useState<"asc" | "desc">("asc");
  const seriesPerPage = initialData.seriesPerPage;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [popularIds] = useState<Set<string>>(new Set(initialData.popularIds));
  const [showTags, setShowTags] = useState(false);
  // 태그 dropdown 검색 — name 또는 description 매칭. 무한 스크롤 X (현실에서 1000+ 안 됨).
  const [tagSearch, setTagSearch] = useState("");
  const tagRowRef = useRef<HTMLDivElement>(null);
  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter(({ tag, description }) => {
      if (tag.toLowerCase().includes(q)) return true;
      if (description && description.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [allTags, tagSearch]);
  const [catExpanded, setCatExpanded] = useState(false);
  const [isInitial, setIsInitial] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const seriesRowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollCooldown = useRef(false);

  // Sticky filter bar — 공통 hook. cooldownRef 로 expand 직후 layout shift scroll 흡수
  const { sentinelRef, filterBarRef, isStuck, barHidden } = useStickyFilterBar({
    cooldownRef: scrollCooldown,
  });

  // tags/categories close-on-scroll 은 별도 effect 에서 처리 (threshold 큼) — bar hide 와는 분리

  // Apply blur to content area when expanded in stuck state (same technique as ContactDrawer)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const shouldBlur = isStuck && (showTags || catExpanded);
    if (shouldBlur) {
      el.style.filter = "blur(6px)";
      el.style.transition = "filter 0.3s ease";
    } else {
      el.style.filter = "";
      // keep transition so the un-blur also animates
      setTimeout(() => {
        el.style.transition = "";
      }, 300);
    }
  }, [isStuck, showTags, catExpanded]);

  // 태그 dropdown 닫힐 때 검색어 + 스크롤 mask 초기화
  const [tagScrolled, setTagScrolled] = useState(false);
  const [tagAtBottom, setTagAtBottom] = useState(false);
  useEffect(() => {
    if (!showTags) {
      setTagSearch("");
      setTagScrolled(false);
      setTagAtBottom(false);
    }
  }, [showTags]);

  // 태그 dropdown scroll mask + wheel fallback (Lenis 우회)
  useEffect(() => {
    if (!showTags) return;
    const root = tagRowRef.current;
    if (!root) return;
    const updateState = () => {
      setTagScrolled(root.scrollTop > 4);
      setTagAtBottom(root.scrollTop + root.clientHeight >= root.scrollHeight - 4);
    };
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      root.scrollTop += e.deltaY;
      updateState();
    };
    root.addEventListener("scroll", updateState, { passive: true });
    root.addEventListener("wheel", onWheel, { passive: false });
    updateState();
    return () => {
      root.removeEventListener("scroll", updateState);
      root.removeEventListener("wheel", onWheel);
    };
  }, [showTags, filteredTags.length]);

  // Cooldown: skip scroll-collapse briefly after expanding tags/categories
  useEffect(() => {
    if (!showTags && !catExpanded) return;
    scrollCooldown.current = true;
    const id = setTimeout(() => {
      scrollCooldown.current = false;
    }, 400);
    return () => clearTimeout(id);
  }, [showTags, catExpanded]);

  // tags/categories close-on-scroll — 약간의 여유 후 닫힘. 너무 빨라도 너무 늦어도 안 됨.
  useEffect(() => {
    if (!showTags && !catExpanded) return;
    let startY = -1;
    const CLOSE_THRESHOLD = 80; // px — 짧은 스크롤은 유지, moderate 스크롤이면 닫힘
    const armTimer = setTimeout(() => {
      startY = window.scrollY;
    }, 300);
    const handleScroll = () => {
      if (startY < 0) return;
      if (Math.abs(window.scrollY - startY) > CLOSE_THRESHOLD) {
        setShowTags(false);
        setCatExpanded(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(armTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showTags, catExpanded]);

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [setInfinite, lenis, stop, start]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
    }
    if (activeCategory) params.set("category", activeCategory);
    if (activeTagsKey) params.set("tags", activeTagsKey);
    if (activeSeries) params.set("series_id", activeSeries);
    params.set("sort", sort);
    params.set("sortDir", sortDir);
    if (sort === "random") params.set("seed", String(randomSeed));
    params.set("page", String(page));
    params.set("limit", String(perPage));

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [
    search,
    searchType,
    activeCategory,
    activeTagsKey,
    activeSeries,
    sort,
    sortDir,
    randomSeed,
    page,
    perPage,
  ]);

  // 시리즈 fetch 공통 파라미터 빌더
  const buildSeriesParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (activeCategory) params.set("category", activeCategory);
      params.set("page", String(page));
      params.set("limit", String(seriesPerPage));
      if (seriesSortBy !== "default") {
        params.set("sortBy", seriesSortBy);
        params.set("sortDir", seriesSortDir);
      }
      return params;
    },
    [activeCategory, seriesPerPage, seriesSortBy, seriesSortDir],
  );

  // Fetch series when category/sort changes — initial mount 은 skip (SSR 의 auto_cover_url 보존)
  const isFirstSeriesFetch = useRef(true);
  useEffect(() => {
    if (isFirstSeriesFetch.current) {
      isFirstSeriesFetch.current = false;
      return;
    }
    fetch(`/api/series?${buildSeriesParams(0)}`)
      .then((res) => res.json())
      .then((data) => {
        setSeriesList(Array.isArray(data?.items) ? data.items : []);
        setSeriesTotal(typeof data?.total === "number" ? data.total : 0);
        setSeriesPage(0);
      });
  }, [buildSeriesParams]);

  // 시리즈 추가 페이지 로드 — 가로 스크롤이 끝에 다다르면 호출
  const loadMoreSeries = useCallback(async () => {
    if (seriesLoading) return;
    if (seriesList.length >= seriesTotal) return;
    setSeriesLoading(true);
    try {
      const nextPage = seriesPage + 1;
      const res = await fetch(`/api/series?${buildSeriesParams(nextPage)}`);
      const data = await res.json();
      const items: Series[] = Array.isArray(data?.items) ? data.items : [];
      setSeriesList((prev) => {
        // 중복 방지 (Strict Mode 대응)
        const seen = new Set(prev.map((s) => s.id));
        const merged = [...prev, ...items.filter((s) => !seen.has(s.id))];
        return merged;
      });
      if (typeof data?.total === "number") setSeriesTotal(data.total);
      setSeriesPage(nextPage);
    } finally {
      setSeriesLoading(false);
    }
  }, [
    seriesLoading,
    seriesList.length,
    seriesTotal,
    seriesPage,
    buildSeriesParams,
  ]);

  // 정렬 버튼 클릭 — 같은 기준 누르면 방향 토글, 다른 기준이면 기본 방향으로 전환
  const handleSeriesSortClick = useCallback(
    (by: typeof seriesSortBy) => {
      if (seriesSortBy === by) {
        setSeriesSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSeriesSortBy(by);
        // newest 의 직관적 기본은 desc (최신이 먼저), title/default 는 asc
        setSeriesSortDir(by === "newest" ? "desc" : "asc");
      }
    },
    [seriesSortBy],
  );

  // Fetch posts when filters change (skip initial — we have SSR data)
  // 필터 변경 즉시 loading=true 로 — debounce 동안 옛 데이터 보이는 깜빡임 방지
  useEffect(() => {
    if (isInitial) {
      setIsInitial(false);
      return;
    }
    setLoading(true);
    const debounce = setTimeout(fetchPosts, 300);
    return () => clearTimeout(debounce);
  }, [fetchPosts, isInitial]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    searchType,
    activeCategory,
    activeTagsKey,
    activeSeries,
    sort,
    sortDir,
  ]);

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

  /* ── Bento masonry row-span 계산 ──
     CSS grid-auto-rows: 1px 위에서 각 카드의 natural height 를 측정해
     grid-row: span N 을 inline style 로 부여 → 너비 변주(span 2) + 세로 packing 동시 지원 */
  const recomputeRowSpans = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (activeSeries) return; // 시리즈 timeline 모드는 flex 레이아웃이라 패스
    const cs = window.getComputedStyle(grid);
    const rowGap = parseFloat(cs.rowGap) || 0;
    const baseUnit = 1; // grid-auto-rows: 1px
    // gridRef 의 모든 자식 (real post + skeleton) 에 대해 span 적용 — 로딩 중에도 height 매칭
    Array.from(grid.children).forEach((node) => {
      const el = node as HTMLElement;
      const inner = el.firstElementChild as HTMLElement | null;
      const h = inner?.scrollHeight ?? el.scrollHeight;
      if (!h) return;
      const span = Math.ceil((h + rowGap) / (baseUnit + rowGap));
      el.style.gridRow = `span ${span}`;
    });
  }, [activeSeries]);

  useEffect(() => {
    if (activeSeries) return;
    recomputeRowSpans();
    const grid = gridRef.current;
    if (!grid) return;
    const imgs = grid.querySelectorAll("img");
    const onLoad = () => recomputeRowSpans();
    imgs.forEach((img) => img.addEventListener("load", onLoad));

    // 모든 자식 (real post + skeleton) 의 size 변화 감지
    const ro = new ResizeObserver(recomputeRowSpans);
    Array.from(grid.children).forEach((el) => ro.observe(el as Element));

    return () => {
      imgs.forEach((img) => img.removeEventListener("load", onLoad));
      ro.disconnect();
    };
  }, [posts, loading, activeSeries, recomputeRowSpans]);

  // window resize 시에도 재측정 (column 폭 변하면 카드 height 도 변함)
  useEffect(() => {
    if (activeSeries) return;
    const onResize = () => recomputeRowSpans();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeSeries, recomputeRowSpans]);

  const handleSeriesClick = useCallback((seriesId: string) => {
    setActiveSeries((prev) => (prev === seriesId ? null : seriesId));
  }, []);

  const activeSeriesTitle = useMemo(() => {
    if (!activeSeries) return null;
    return seriesList.find((s) => s.id === activeSeries)?.title ?? null;
  }, [activeSeries, seriesList]);

  /* 시리즈 row 는 모두 가로로 펼쳐서 native overflow-x 스크롤
     + Windows 마우스 휠을 가로로 변환 + 데스크톱 드래그 swipe (모바일 터치는 native 사용)
     + 끝 근처에 도달하면 다음 페이지 로드 (infinite horizontal scroll) */
  useEffect(() => {
    const el = seriesRowRef.current;
    if (!el) return;

    const NEAR_END_PX = 200; // 끝까지 200px 이내면 다음 페이지 prefetch
    const EDGE_TOL = 2; // scroll 좌/우 끝 판정 허용 오차
    const SCROLL_IDLE_MS = 150; // 마지막 스크롤 후 idle 판정 시간

    // 스크롤/드래그 중에는 deck hover 비활성 — data-scrolling 속성으로 CSS 가 :hover 효과 차단
    let scrollingTimer: ReturnType<typeof setTimeout> | null = null;
    const setScrolling = (on: boolean) => {
      if (on) el.setAttribute("data-scrolling", "true");
      else el.removeAttribute("data-scrolling");
    };
    const markScrolling = () => {
      setScrolling(true);
      if (scrollingTimer) clearTimeout(scrollingTimer);
      scrollingTimer = setTimeout(() => setScrolling(false), SCROLL_IDLE_MS);
    };

    // 좌/우 mask 표시 여부 — 스크롤 위치에 따라 클래스 토글
    const updateEdges = () => {
      const atStart = el.scrollLeft <= EDGE_TOL;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_TOL;
      el.classList.toggle(styles.atStart, atStart);
      el.classList.toggle(styles.atEnd, atEnd);
    };

    const maybeLoadMore = () => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - NEAR_END_PX) {
        loadMoreSeries();
      }
      updateEdges();
      markScrolling();
    };

    const handleWheel = (e: WheelEvent) => {
      // 시리즈 영역 hover 시 vertical wheel 은 페이지로 새지 않게 항상 차단
      e.preventDefault();
      // 가로 overflow 있으면 vertical+horizontal delta 모두 합쳐서 가로 스크롤로 변환
      if (el.scrollWidth > el.clientWidth) {
        el.scrollLeft += e.deltaY + e.deltaX;
      }
    };

    // pointer capture 를 쓰면 자식 button 의 click 이 부모로 가로채져서 시리즈 클릭이 안 먹힘.
    // 대신 document 레벨로 move/up 을 듣고, 4px 넘게 움직였을 때만 스크롤 + click 차단.
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return; // 좌클릭만
      const startX = e.clientX;
      const startScroll = el.scrollLeft;
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        if (!moved && Math.abs(dx) > 4) moved = true;
        if (moved) {
          el.scrollLeft = startScroll - dx;
          ev.preventDefault();
          markScrolling();
        }
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        if (moved) {
          // 드래그 직후 click 1회 차단 (children 의 onClick 막기)
          const blockClick = (cev: MouseEvent) => {
            cev.stopPropagation();
            cev.preventDefault();
            document.removeEventListener("click", blockClick, true);
          };
          document.addEventListener("click", blockClick, true);
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    };

    el.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("scroll", maybeLoadMore, { passive: true });

    // 마운트 직후 — 첫 페이지가 화면을 가득 채우지 못해 스크롤 자체가 불가능하면 즉시 다음 페이지
    maybeLoadMore();
    updateEdges();
    // seriesList 가 변하면 scrollWidth 도 변하므로 ResizeObserver 로 재계산
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", handleWheel, {
        capture: true,
      } as EventListenerOptions);
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("scroll", maybeLoadMore);
    };
  }, [seriesList.length, loadMoreSeries]);

  const showBanner = pinnedPosts.length >= 1 && page === 1;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 2)
      return [
        1,
        -1,
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }, [page, totalPages]);

  return (
    <div className={styles.page}>
      {loading && <div className={styles.topProgress} aria-hidden />}
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Posts.</h1>
        <p className={styles.subtitle}>
          <T k="postsPage.subtitle" />
        </p>
      </div>

      {/* ── Banner Slider ── */}
      {showBanner && (
        <div className={styles.bannerSlider}>
          <PostsBanner
            posts={pinnedPosts}
            imgErrors={imgErrors}
            onImgError={handleImgError}
          />
        </div>
      )}

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} style={{ height: 0 }} />

      {/* Backdrop — close tags/categories on outside click */}
      <AnimatePresence>
        {isStuck && (showTags || catExpanded) && (
          <motion.div
            className={styles.filterBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setShowTags(false);
              setCatExpanded(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Filter Bar (Category tabs + Search + Sort) ── */}
      {/* tags/categories 펼친 상태에선 filter bar 안 숨김 (사용자 인터랙션 중) */}
      <div
        ref={filterBarRef}
        className={`${styles.filterBar} ${barHidden && !showTags && !catExpanded ? styles.filterBarHidden : ""}`}
      >
        {/* 검색 capsule — 별도 윗줄에 우측 정렬 (공통 SearchCapsule 사용) */}
        <div className={styles.filterBarSearchRow}>
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder={t("postsPage.searchPlaceholder")}
            typeSelector={{
              value: searchType,
              options: [
                { value: "all", label: t("postsPage.searchAll") },
                { value: "title", label: t("postsPage.searchTitle") },
                { value: "content", label: t("postsPage.searchContent") },
              ],
              onChange: (v) => setSearchType(v as "all" | "title" | "content"),
            }}
          />
        </div>

        <div className={styles.filterBarTop}>
          <CategoryNav
            extraCategories={extraCategories}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => {
              setActiveCategory(cat);
              setCatExpanded(false);
            }}
            expanded={catExpanded}
            onExpandChange={(v) => {
              setCatExpanded(v);
              if (v) setShowTags(false);
            }}
          />

          <AnimatePresence>
            {!catExpanded && (
              <motion.div
                className={styles.filterBarRight}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto", overflow: "visible" }}
                exit={{ opacity: 0, width: 0, overflow: "hidden" }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ overflow: "hidden" }}
              >
                {allTags.length > 0 && (
                  <button
                    className={`${styles.tagToggleBtn} ${showTags ? styles.tagToggleBtnOpen : ""}`}
                    onClick={() => setShowTags((v) => !v)}
                    data-clickable="true"
                  >
                    <T
                      k="postsPage.tags"
                      tooltip={t("postsPage.tagsTooltip")}
                    />
                    <ChevronDown size={10} />
                  </button>
                )}

                <div
                  className={styles.sortGroup}
                  onMouseLeave={() => setHoveredSort(null)}
                >
                  {[
                    {
                      value: "date" as const,
                      k: "postsPage.sortDate",
                      tipK: "postsPage.sortDateTooltip",
                    },
                    {
                      value: "popular" as const,
                      k: "postsPage.sortPopular",
                      tipK: "postsPage.sortPopularTooltip",
                    },
                    {
                      value: "title" as const,
                      k: "postsPage.sortTitle",
                      tipK: "postsPage.sortTitleTooltip",
                    },
                  ].map((opt) => {
                    const indicatorTarget = hoveredSort ?? sortBy;
                    const showIndicator = opt.value === indicatorTarget;
                    const isActive = opt.value === sortBy;
                    return (
                      <button
                        key={opt.value}
                        className={`${styles.sortBtn} ${isActive && showIndicator ? styles.sortBtnActive : ""}`}
                        onClick={() => {
                          if (sortBy === opt.value) {
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc",
                            );
                          } else {
                            setSortBy(opt.value);
                            // 직관적 기본 방향: title 은 asc(가나다/A-Z), 나머지는 desc
                            setSortDir(opt.value === "title" ? "asc" : "desc");
                          }
                        }}
                        onMouseEnter={() => setHoveredSort(opt.value)}
                        data-clickable="true"
                      >
                        {showIndicator && (
                          <motion.span
                            className={`${styles.sortIndicator} ${isActive ? styles.sortIndicatorActive : ""}`}
                            layoutId="sortIndicator"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 32,
                            }}
                          />
                        )}
                        <span className={styles.sortBtnText}>
                          <T k={opt.k} tooltip={t(opt.tipK)} />
                          {isActive && (
                            <ArrowUp
                              size={10}
                              className={styles.sortDirIcon}
                              style={{
                                transform:
                                  sortDir === "desc"
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                              }}
                            />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* popular 활성 시 세부 메트릭 — 사이 화살표 + outline variant (transparent indicator) */}
                {sortBy === "popular" && (
                  <>
                    <ChevronRight
                      size={14}
                      aria-hidden
                      className={styles.popularSubArrow}
                    />
                    <SegmentedControl<"score" | "views" | "comments" | "likes">
                      items={[
                        {
                          value: "score",
                          label: <T k="postsPage.popularScore" />,
                        },
                        {
                          value: "views",
                          label: <T k="postsPage.popularViews" />,
                        },
                        {
                          value: "comments",
                          label: <T k="postsPage.popularComments" />,
                        },
                        {
                          value: "likes",
                          label: <T k="postsPage.popularLikes" />,
                        },
                      ]}
                      value={popularSort}
                      onChange={setPopularSort}
                      className={styles.popularSubSort}
                    />
                  </>
                )}

                {/* 랜덤 셔플 — sortBy 와 별도 토글 버튼. 누를 때마다 새 시드로 셔플 */}
                <Tooltip
                  content={
                    <>
                      <div>{t("postsPage.sortRandom")}</div>
                      <div>{t("postsPage.sortRandomTooltip")}</div>
                    </>
                  }
                >
                  <button
                    type="button"
                    className={`${styles.shuffleBtn} ${sortBy === "random" ? styles.shuffleBtnActive : ""}`}
                    onClick={() => {
                      if (sortBy === "random") {
                        setRandomSeed(Math.floor(Math.random() * 1e9));
                      } else {
                        setSortBy("random");
                        setRandomSeed(Math.floor(Math.random() * 1e9));
                      }
                    }}
                    data-clickable="true"
                    aria-label={t("postsPage.sortRandom")}
                  >
                    <Shuffle size={12} />
                  </button>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showTags && allTags.length > 0 && (
            <motion.div
              className={isStuck ? styles.tagDropdown : styles.tagInline}
              initial={
                isStuck ? { opacity: 0, y: -8 } : { height: 0, opacity: 0 }
              }
              animate={
                isStuck ? { opacity: 1, y: 0 } : { height: "auto", opacity: 1 }
              }
              exit={isStuck ? { opacity: 0, y: -8 } : { height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                y: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
              }}
            >
              {/* 상단 헤더 — 검색 (공통 SearchCapsule) + 전체 태그 링크 */}
              <div className={styles.tagSearchHeader}>
                <SearchCapsule
                  search={tagSearch}
                  onSearchChange={setTagSearch}
                  placeholder="태그 또는 설명으로 검색…"
                  align="left"
                  className={styles.tagSearchInput}
                />
                <Link
                  href="/posts/tags"
                  className={styles.tagAllLink}
                  data-clickable="true"
                >
                  <T k="postsPage.tagsAllLink" />
                  <ChevronRight size={12} aria-hidden />
                </Link>
              </div>
              <div
                ref={tagRowRef}
                className={`${styles.tagRow} ${tagScrolled ? styles.tagRowScrolled : ""} ${tagAtBottom ? styles.tagRowAtBottom : ""}`}
                data-lenis-prevent
              >
                <button
                  className={`${styles.tagBtn} ${activeTags.size === 0 ? styles.tagBtnActive : ""}`}
                  onClick={clearActiveTags}
                  data-clickable="true"
                >
                  <T k="postsPage.allTags" />
                </button>
                {filteredTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    className={`${styles.tagBtn} ${activeTags.has(tag) ? styles.tagBtnActive : ""}`}
                    onClick={() => toggleActiveTag(tag)}
                    data-clickable="true"
                  >
                    {tag}
                    <span className={styles.tagCount}>{count}</span>
                  </button>
                ))}
                {filteredTags.length === 0 && (
                  <p className={styles.tagAllLoaded}>
                    — &ldquo;{tagSearch}&rdquo; 와 일치하는 태그 없음 —
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Content Area (2-column) ── */}
      <div ref={contentRef} className={styles.contentArea}>
        <div className={styles.mainColumn}>
          {/* Series Row — posts loading 과 무관하게 항상 표시 */}
          <div className={styles.seriesSection}>
            <div className={styles.seriesLabel}>
              <span className={styles.seriesLabelLink}>
                <BookOpen size={14} />
                <T
                  k="postsPage.series"
                  tooltip={t("postsPage.seriesTooltip")}
                />
              </span>
              {activeCategory && (
                <span className={styles.seriesCategoryTag}>
                  {activeCategory}
                </span>
              )}
              <SegmentedControl
                className={styles.seriesSortAlignEnd}
                items={[
                  { value: "default", label: t("postsPage.seriesSortDefault") },
                  { value: "newest", label: t("postsPage.seriesSortNewest") },
                  { value: "title", label: t("postsPage.seriesSortTitle") },
                ]}
                value={seriesSortBy}
                onChange={(v) =>
                  handleSeriesSortClick(v as typeof seriesSortBy)
                }
                sortDir={seriesSortDir}
              />
            </div>
            {seriesList.length > 0 ? (
              <div
                ref={seriesRowRef}
                className={styles.seriesRow}
                data-lenis-prevent
              >
                {seriesList.map((series, idx) => (
                  <SeriesCard
                    key={series.id}
                    series={series}
                    onClick={handleSeriesClick}
                    active={activeSeries === series.id}
                    index={idx}
                    scrollContainerRef={seriesRowRef}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.seriesEmpty}>
                {activeCategory
                  ? `${t("postsPage.noSeriesYet")} — ${activeCategory}`
                  : t("postsPage.noSeriesYet")}
              </p>
            )}
          </div>

          {/* Posts */}
          {!loading && posts.length === 0 && !showBanner ? (
            <div className={styles.emptyState}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <p className={styles.emptyTitle}>
                {search
                  ? `${t("postsPage.noResultsFor")} "${search}"`
                  : activeTags.size > 0
                    ? `${t("postsPage.noPostsTagged")} "${Array.from(activeTags).join(", ")}"`
                    : activeSeries && activeSeriesTitle
                      ? `${t("postsPage.noPostsInSeries")} "${activeSeriesTitle}"`
                      : activeCategory
                        ? `${t("postsPage.noPostsInCategory")} ${activeCategory}`
                        : t("postsPage.noPostsYet")}
              </p>
              {(search ||
                activeTags.size > 0 ||
                activeSeries ||
                activeCategory) && (
                <button
                  className={styles.emptyResetBtn}
                  onClick={() => {
                    setSearch("");
                    setSearchType("all");
                    clearActiveTags();
                    setActiveSeries(null);
                    setActiveCategory(null);
                  }}
                  data-clickable="true"
                >
                  <T
                    k="postsPage.clearFilters"
                    tooltip={t("postsPage.clearFiltersTooltip")}
                  />
                </button>
              )}
            </div>
          ) : loading || posts.length > 0 ? (
            <>
              <div className={styles.postsLabel}>
                <LayoutGrid size={14} />
                <T k="postsPage.posts" tooltip={t("postsPage.postsTooltip")} />
                <Select
                  value={String(perPage)}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(v) => {
                    setPerPage(Number(v));
                    setPage(1);
                  }}
                  className={styles.pageSizeSelect}
                />
              </div>
              <div
                ref={gridRef}
                className={`${styles.grid} ${activeSeries ? styles.gridSeries : ""} ${loading ? styles.gridLoading : ""}`}
              >
                {posts.length === 0 ? (
                  <PostsSkeletonCards
                    count={perPage}
                    activeSeries={!!activeSeries}
                  />
                ) : (
                  (() => {
                    const variants: CardType[] = posts.map((p, i) =>
                      activeSeries ? "standard" : getCardType(i),
                    );
                    return posts.map((post, idx) => {
                      const type: CardType = variants[idx];
                      const cls =
                        !activeSeries && (type === "wide" || type === "banner")
                          ? styles.gridWide
                          : "";
                      // 시리즈 필터링 시 — 각 글의 series_order 를 step 번호로 (없으면 idx+1)
                      const stepNumber = activeSeries
                        ? String(post.series_order ?? idx + 1).padStart(2, "0")
                        : null;
                      return (
                        <div
                          key={post.id}
                          ref={(el) => {
                            if (el) itemRefs.current.set(post.id, el);
                            else itemRefs.current.delete(post.id);
                          }}
                          className={`${styles.gridItem} ${cls} ${activeSeries ? styles.seriesStep : ""}`}
                        >
                          {stepNumber && (
                            <div
                              className={styles.seriesStepNumber}
                              aria-hidden="true"
                            >
                              {stepNumber}
                            </div>
                          )}
                          <div
                            className={
                              activeSeries ? styles.seriesStepBody : ""
                            }
                          >
                            <PostCard
                              post={post}
                              variant="standard"
                              banner={!activeSeries && type === "banner"}
                              square={!activeSeries && type === "square"}
                              portrait={!activeSeries && type === "portrait"}
                              compact={!!activeSeries}
                              isHot={popularIds.has(post.id)}
                              onImgError={handleImgError}
                              imgError={imgErrors.has(post.id)}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className={styles.pageBtn}
                    data-clickable="true"
                  >
                    &larr;
                  </button>
                  {pageNumbers.map((p, i) =>
                    p === -1 ? (
                      <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                        &hellip;
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
                        data-clickable="true"
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className={styles.pageBtn}
                    data-clickable="true"
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* ── Sidebar ── */}
        <SidebarWrap barHidden={barHidden}>
          <TagCloud3D tags={allTags} activeTags={activeTags} />
          <PopularPosts />
          <RandomPosts />
          <RecentComments />
        </SidebarWrap>
      </div>
    </div>
  );
}

/* ── Skeleton ──
 * bento 카드와 동일한 variants (banner/wide/portrait/square/standard) 를 적용해
 * fetch 전후 레이아웃 height 가 같아지도록 한다. count = perPage.
 * ghost=true: visibility hidden 로 layout 공간만 차지 (마지막 페이지 underfill 패딩용). */
function PostsSkeletonCards({
  count,
  activeSeries,
  startIdx = 0,
  ghost = false,
}: {
  count: number;
  activeSeries: boolean;
  startIdx?: number;
  ghost?: boolean;
}) {
  const variants: CardType[] = Array.from({ length: count }, (_, i) =>
    activeSeries ? "standard" : getCardType(startIdx + i),
  );
  return (
    <>
      {variants.map((type, i) => {
        const cls =
          !activeSeries && (type === "wide" || type === "banner")
            ? styles.gridWide
            : "";
        const aspectClass =
          type === "banner"
            ? styles.skeletonAspectBanner
            : type === "square"
              ? styles.skeletonAspectSquare
              : type === "portrait"
                ? styles.skeletonAspectPortrait
                : styles.skeletonAspectDefault;
        return (
          <div
            key={i}
            className={`${styles.gridItem} ${cls} ${activeSeries ? styles.seriesStep : ""} ${ghost ? styles.gridItemGhost : ""}`}
            aria-hidden={ghost || undefined}
          >
            <div
              className={`${styles.skeletonCard} ${activeSeries ? styles.seriesStepBody : ""}`}
            >
              <SkeletonBlock
                className={`${styles.skeletonImage} ${aspectClass}`}
              />
              <div className={styles.skeletonCardBody}>
                {/* badge row */}
                <SkeletonPill width={60} height={20} />
                {/* title — 2 lines */}
                <SkeletonLine width="92%" height={26} />
                <SkeletonLine width="64%" height={26} />
                {/* excerpt — 2 lines */}
                <SkeletonLine width="100%" height={14} />
                <SkeletonLine width="84%" height={14} />
                {/* tags row */}
                <div className={styles.skeletonTagsRow}>
                  <SkeletonPill width={50} height={20} />
                  <SkeletonPill width={66} height={20} />
                  <SkeletonPill width={44} height={20} />
                </div>
                {/* meta row */}
                <SkeletonLine width="80%" height={14} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
