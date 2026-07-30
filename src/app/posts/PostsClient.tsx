"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Fragment, type ReactNode } from "react";
import { type CardType, getCardType } from "@/data/postsBentoTemplates";
import { BREAKPOINT, SEARCH_DEBOUNCE_MS, QUERY_PARAM } from "@/constants";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import type { Post, Series } from "@/types/post";
import type { InitialPostsData } from "@/lib/posts";
import PostCard from "./_components/PostCard";
import PostsSubnav from "./_components/PostsSubnav";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import CategoryNav from "./_components/CategoryNav";
import SeriesCard from "./_components/SeriesCard";
import PostsBanner from "./_components/PostsBanner/PostsBanner";
import TagCloud3D from "./_components/TagCloud3D";
import PopularPosts from "./_components/PopularPosts";
import RandomPosts from "./_components/RandomPosts";
import RecentComments from "./_components/RecentComments";
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
  ChevronLeft,
  BookOpen,
  LayoutGrid,
  Shuffle,
  Sparkles,
  Settings,
  List,
  History as HistoryIcon,
} from "@/components/icons";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import Select from "@/components/ui/Select";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import LetterFilter, { KOREAN_LETTERS, ENGLISH_LETTERS, LETTER_ETC, getLetterInitial } from "@/components/ui/LetterFilter";
import styles from "./Posts.module.css";

function SidebarWrap({
  barHidden,
  children,
}: {
  barHidden: boolean;
  children: React.ReactNode;
}) {
  const { isMobile: isCollapsed } = useIsMobile(BREAKPOINT.tablet);
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
  { value: "10", label: "10개씩" },
  { value: "20", label: "20개씩" },
  { value: "50", label: "50개씩" },
];

// Bento variants — 1-col (square/portrait/standard) + 2-col span (wide/banner).
// 그리드는 auto-fit 으로 col 수가 viewport 따라 변동 (각 col 약 220-300px 고정) → wide 도 절대 폭이 일정.

/* 태그 dropdown letter filter — 공통 LetterFilter 컴포넌트 사용 (constants/util import). */
const TAG_LETTERS = [...KOREAN_LETTERS, ...ENGLISH_LETTERS, LETTER_ETC];

/* 타임라인 카드 — framer useScroll 로 스크롤 진행에 비례한 리빌(페이드 + 자기 쪽 슬라이드 + 살짝 scale).
   카드가 뷰 하단→60% 로 올라오는 동안 값이 매핑되고, 지나면 유지. 모바일 단일컬럼선 x 이동 없음. */
function TimelineMotionItem({
  side,
  disableX,
  className,
  assignRef,
  children,
}: {
  side: "left" | "right";
  disableX: boolean;
  className: string;
  assignRef: (el: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 60%"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [44, 0]);
  const xFrom = disableX ? 0 : side === "left" ? -44 : 44;
  const x = useTransform(scrollYProgress, [0, 1], [xFrom, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.965, 1]);
  return (
    <motion.div
      ref={(el) => {
        ref.current = el;
        assignRef(el);
      }}
      className={className}
      style={{ opacity, y, x, scale }}
    >
      {children}
    </motion.div>
  );
}

interface PostsClientProps {
  initialData: InitialPostsData;
  /** history 모드 — /posts/history 전용. timeline 레이아웃 강제 + 필터/배너/시리즈/사이드바 숨김. */
  history?: boolean;
  /** 전체 아카이브 유효일 문자열(최신순) — 왼쪽 월 인덱스에 로드 여부와 무관하게 모든 월 표시 (history 전용). */
  archiveMonths?: string[];
}

export default function PostsClient({ initialData, history = false, archiveMonths }: PostsClientProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  // 타임라인 지그재그 단일컬럼 전환(640px) — 리빌 x 이동 on/off 판단용
  const { isMobile: tlSingleCol } = useIsMobile(640);
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  // 목록 카드 레이아웃 (설정) — magazine(기본)/grid/list/compact/masonry/featured. timeline 은 /posts/history 전용.
  const configLayout = (["magazine", "grid", "list", "compact", "masonry", "featured"].includes(siteConf.posts.layout)
    ? siteConf.posts.layout
    : "magazine");
  const postsLayout = (history ? "timeline" : configLayout) as "magazine" | "grid" | "list" | "compact" | "masonry" | "timeline" | "featured";
  // magazine 만 grid-auto-rows:1px 위 JS row-span(사이즈 변주 packing) 사용, 나머지는 미사용
  const usesRowSpan = postsLayout === "magazine";
  const layoutClass =
    postsLayout === "grid" ? styles.gridUniform
      : postsLayout === "list" ? styles.gridList
        : postsLayout === "compact" ? styles.gridCompact
          : postsLayout === "masonry" ? styles.gridMasonry
            : postsLayout === "timeline" ? styles.gridTimeline
              : postsLayout === "featured" ? styles.gridFeatured
                : ""; // magazine = base .grid
  // timeline 레이아웃 — 발행(예약)/생성 월 기준으로 그룹 마커 삽입.
  // 월 key/label 은 브라우저 로컬 타임존 기준 (marker id 와 index 가 반드시 일치해야 하므로 서버 버킷팅 금지)
  const dateOf = (p: Post) => p.scheduled_at ?? p.created_at ?? null;
  const monthKeyFromDate = (d: string | null) => {
    if (!d) return "";
    const t = new Date(d);
    return `${t.getFullYear()}-${t.getMonth()}`;
  };
  const monthLabelFromDate = (d: string | null) => {
    if (!d) return "";
    const t = new Date(d);
    return `${t.getFullYear()}. ${String(t.getMonth() + 1).padStart(2, "0")}`;
  };
  const monthKey = (p: Post) => monthKeyFromDate(dateOf(p));
  const monthLabel = (p: Post) => monthLabelFromDate(dateOf(p));
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [pinnedPosts] = useState<Post[]>(initialData.pinnedPosts);
  // 타임라인 왼쪽 인덱스 — history 는 전체 아카이브 월(로드 여부 무관), 그 외엔 로드된 posts 기준. 최신순.
  const timelineMonths = useMemo(() => {
    if (postsLayout !== "timeline") return [] as { key: string; label: string; year: string; mm: string }[];
    const source: string[] =
      history && archiveMonths && archiveMonths.length
        ? archiveMonths
        : posts.map((p) => dateOf(p)).filter((d): d is string => !!d);
    const seen = new Map<string, { key: string; label: string; ord: number }>();
    for (const d of source) {
      const k = monthKeyFromDate(d);
      if (!k || seen.has(k)) continue;
      const t = new Date(d);
      seen.set(k, { key: k, label: monthLabelFromDate(d), ord: t.getFullYear() * 12 + t.getMonth() });
    }
    return Array.from(seen.values())
      .sort((a, b) => b.ord - a.ord)
      .map(({ key, label }) => {
        const [year, mm] = label.split(". ");
        return { key, label, year, mm };
      });
  }, [posts, postsLayout, history, archiveMonths]);

  // 인덱스용 — 연도별 그룹 (헤더 + 월). timelineMonths 가 최신순이라 같은 연도끼리 연속.
  const timelineIndexGroups = useMemo(() => {
    const groups: { year: string; months: { key: string; mm: string }[] }[] = [];
    for (const m of timelineMonths) {
      let g = groups[groups.length - 1];
      if (!g || g.year !== m.year) { g = { year: m.year, months: [] }; groups.push(g); }
      g.months.push({ key: m.key, mm: m.mm });
    }
    return groups;
  }, [timelineMonths]);

  // 아직 로드 안 된(무한스크롤) 과거 월 클릭 시 — 그 지점까지 순차 로드 후 스크롤 (아래 effect 가 구동)
  const [pendingMonthJump, setPendingMonthJump] = useState<string | null>(null);
  // 현재 뷰포트 상단에 걸린 월(scroll-spy) — 인덱스에서 강조
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);
  const doScrollToMonth = useCallback((key: string) => {
    const el = document.getElementById(`tl-m-${key}`);
    if (!el) return false;
    if (lenis) lenis.scrollTo(el, { offset: -96 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }, [lenis]);
  const scrollToMonth = useCallback((key: string) => {
    if (!doScrollToMonth(key)) setPendingMonthJump(key);
  }, [doScrollToMonth]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "title" | "content">(
    "all",
  );
  const [syntaxMode, setSyntaxMode] = useState<"prefix" | "regex">("prefix");
  // URL query (?tag=foo,bar / ?category=a,b CSV) 도착 시 초기값 sync — 다중 선택(OR)
  const urlSearchParams = useSearchParams();
  const [activeCategories, setActiveCategories] = useState<string[]>(() => {
    const raw = urlSearchParams?.get(QUERY_PARAM.category);
    return raw ? raw.split(",").map((c) => c.trim()).filter(Boolean) : [];
  });
  const activeCategoryKey = useMemo(
    () => [...activeCategories].sort().join(","),
    [activeCategories],
  );
  const [activeTags, setActiveTags] = useState<Set<string>>(() => {
    const raw = urlSearchParams?.get(QUERY_PARAM.tag);
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
      // 모든 태그가 선택되면 = 필터 없음 → 클리어(전체)
      const all = initialData.allTags;
      if (all.length > 0 && all.every((t) => next.has(t.tag))) return new Set();
      return next;
    });
  }, [initialData.allTags]);
  const clearActiveTags = useCallback(() => setActiveTags(new Set()), []);
  const [allTags] = useState(initialData.allTags);
  // faceted 태그 — 현재 필터(카테고리·태그·시리즈·검색)에 매칭되는 글들의 태그+개수.
  // /api/posts 응답의 facets 로 갱신 (무필터 초기값은 전체 allTags).
  const [facetTags, setFacetTags] = useState<{ tag: string; count: number }[]>(
    () => initialData.allTags.map((t) => ({ tag: t.tag, count: t.count })),
  );
  const [extraCategories] = useState(initialData.extraCategories);
  const [sortBy, setSortBy] = useState<"date" | "popular" | "title" | "random" | "author">(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // 작성자 — 2명 이상일 때만 필터/정렬 노출(1명이면 옵션이 무의미). 카드 표시는 무조건.
  const authors = siteConf.authors ?? [];
  const multiAuthor = authors.length >= 2;
  const [activeAuthor, setActiveAuthor] = useState<string | null>(() => urlSearchParams?.get("author") ?? null);
  // 타임라인 레이아웃은 월 그룹 마커라 시간순만 유효 — 다른 정렬이면 date 로 강제(마커 깨짐 방지).
  useEffect(() => {
    if (postsLayout === "timeline" && sortBy !== "date") setSortBy("date");
  }, [postsLayout, sortBy]);
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
    | "author"
    | "views"
    | "likes"
    | "comments" =
    sortBy === "popular"
      ? popularSort === "score"
        ? "popular"
        : popularSort
      : sortBy === "title"
        ? "title"
        : sortBy === "author"
          ? "author"
          : sortBy === "random"
            ? "random"
            : sortDir === "desc"
              ? "newest"
              : "oldest";
  const [perPage, setPerPage] = useState(siteConf.posts.perPage ?? 10);
  // /posts?series=<id> 로 진입 시(시리즈 카드 클릭) 해당 시리즈로 초기 필터
  const [activeSeries, setActiveSeries] = useState<string | null>(() => urlSearchParams?.get(QUERY_PARAM.series) ?? null);
  const [seriesList, setSeriesList] = useState<Series[]>(
    initialData.seriesList,
  );
  const [seriesPage, setSeriesPage] = useState(0);
  const [seriesTotal, setSeriesTotal] = useState(initialData.seriesTotal);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesScope, setSeriesScope] = useState<"all" | "title" | "desc">("all");
  // 로그인 사용자 = admin (단일 운영자 가정) — 시리즈 관리 바로가기 노출용
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import("@/lib/supabase/client").then((m) => {
      m.createClient().auth.getUser().then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data.user);
      });
    });
    return () => { cancelled = true; };
  }, []);
  // 시리즈 좌/우 화살표 long-press 스크롤 — 누르고 있을수록 가속
  const seriesScrollRafRef = useRef<number | null>(null);
  const seriesScrollStartRef = useRef<number>(0);
  const startSeriesScroll = (direction: 1 | -1) => {
    seriesScrollStartRef.current = performance.now();
    const tick = () => {
      const el = seriesRowRef.current;
      if (!el) return;
      const elapsed = performance.now() - seriesScrollStartRef.current;
      // base 4px / frame, 누른 시간만큼 가속 (max 30px / frame, ≈1.8s 후 도달)
      const speed = Math.min(4 + elapsed / 50, 30);
      el.scrollLeft += speed * direction;
      seriesScrollRafRef.current = requestAnimationFrame(tick);
    };
    seriesScrollRafRef.current = requestAnimationFrame(tick);
  };
  const stopSeriesScroll = () => {
    if (seriesScrollRafRef.current != null) {
      cancelAnimationFrame(seriesScrollRafRef.current);
      seriesScrollRafRef.current = null;
    }
  };
  const [seriesSortBy, setSeriesSortBy] = useState<
    "default" | "newest" | "title" | "random"
  >("default");
  const [seriesSortDir, setSeriesSortDir] = useState<"asc" | "desc">("asc");
  const [seriesRandomSeed, setSeriesRandomSeed] = useState(0);
  const seriesPerPage = initialData.seriesPerPage;
  // 초기 page 값 URL 의 ?page= 에서 읽음 — 새로고침해도 같은 페이지 유지
  const [page, setPage] = useState(() => {
    const p = Number(urlSearchParams?.get(QUERY_PARAM.page));
    return Number.isFinite(p) && p >= 1 ? p : 1;
  });
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  // page 변경 시 URL 동기화 — replace 로 history 누적 방지. page=1 일 땐 param 제거(깔끔)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (page > 1) url.searchParams.set(QUERY_PARAM.page, String(page));
    else url.searchParams.delete(QUERY_PARAM.page);
    window.history.replaceState(null, "", url.toString());
  }, [page]);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [popularIds] = useState<Set<string>>(new Set(initialData.popularIds));
  const [showTags, setShowTags] = useState(false);
  /* 태그 dropdown — 검색창 대신 철자 (ㄱ~ㅎ + A~Z + #) 필터. 상단 main 검색과 중복 회피.
     activeTagLetters 비어있으면 전체 표시. multiple selection (toggle). */
  const [activeTagLetters, setActiveTagLetters] = useState<Set<string>>(new Set());
  const tagRowRef = useRef<HTMLDivElement>(null);
  // 필터바 태그 목록 — 선택과 무관하게 항상 전체(개수 고정). 무관한 태그끼리도 OR 선택 가능해야 하므로
  // facet(관련 태그만 남김)으로 좁히지 않음. (facet 은 사이드바 등에서만 사용)
  const filteredTags = useMemo(() => {
    const base = allTags.map((t) => ({ tag: t.tag, count: t.count }));
    if (activeTagLetters.size === 0) return base;
    return base.filter(({ tag }) => activeTagLetters.has(getLetterInitial(tag)));
  }, [allTags, activeTagLetters]);
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
      el.style.filter = "blur(12px)";
      el.style.transition = "filter 0.3s ease";
    } else {
      el.style.filter = "";
      // keep transition so the un-blur also animates
      setTimeout(() => {
        el.style.transition = "";
      }, 300);
    }
  }, [isStuck, showTags, catExpanded]);

  // 태그 dropdown 닫힐 때 letter 필터 + 스크롤 mask 초기화
  const [tagScrolled, setTagScrolled] = useState(false);
  const [tagAtBottom, setTagAtBottom] = useState(false);
  useEffect(() => {
    if (!showTags) {
      setActiveTagLetters(new Set());
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

  // (close-on-scroll 제거) 명시적으로 펼친 태그/카테고리를 스크롤만으로 닫지 않음 —
  // 바깥 클릭(아래) / 토글 버튼 재클릭으로만 닫힘. 펼친 상태에선 filter bar 도 스크롤에 안 숨음.

  // catExpanded / showTags 일 때 filter bar 바깥 클릭 시 닫기 — non-stuck 상태에서도 동작.
  // (sticky backdrop 은 isStuck 일 때만 렌더되므로 그 외 케이스 보완)
  useEffect(() => {
    if (!showTags && !catExpanded) return;
    const handle = (e: MouseEvent) => {
      const fb = filterBarRef.current;
      if (!fb) return;
      if (!fb.contains(e.target as Node)) {
        setShowTags(false);
        setCatExpanded(false);
      }
    };
    // open 트리거 click 자체가 잡히지 않도록 다음 tick 에 등록
    const t = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handle);
    };
  }, [showTags, catExpanded, filterBarRef]);

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

  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
      params.set("syntaxMode", syntaxMode);
    }
    if (activeCategoryKey) params.set(QUERY_PARAM.category, activeCategoryKey);
    if (activeTagsKey) params.set("tags", activeTagsKey);
    if (activeSeries) params.set("series_id", activeSeries);
    if (activeAuthor) params.set("author", activeAuthor);
    params.set(QUERY_PARAM.sort, sort);
    params.set("sortDir", sortDir);
    if (sort === "random") params.set("seed", String(randomSeed));
    params.set(QUERY_PARAM.page, String(page));
    params.set(QUERY_PARAM.limit, String(perPage));

    // 이전 pending 요청 cancel — 빠른 sort/필터 변경 시 race condition + 중복 카드 방지
    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    try {
      const res = await fetch(`/api/posts?${params}`, { signal: ac.signal });
      const data = await res.json();
      // 응답 도착 시점에 이미 새 요청이 시작됐다면 무시 (stale write 방지)
      if (fetchAbortRef.current !== ac) return;
      const incoming = (data.posts ?? []) as Post[];
      // 타임라인(히스토리)은 무한 스크롤 — page>1 이면 이어붙임(중복 id 제거). 그 외엔 교체(페이지네이션).
      setPosts((prev) => {
        if (!(postsLayout === "timeline" && page > 1)) return incoming;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setTotalPages(data.totalPages ?? 1);
      if (Array.isArray(data.facets)) setFacetTags(data.facets);
      setLoading(false);
      fetchAbortRef.current = null;
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLoading(false);
    }
  }, [
    search,
    searchType,
    syntaxMode,
    activeCategoryKey,
    activeTagsKey,
    activeSeries,
    activeAuthor,
    sort,
    sortDir,
    randomSeed,
    page,
    perPage,
    postsLayout,
  ]);

  // 타임라인(히스토리) 무한 스크롤 — sentinel 이 뷰에 들어오면 다음 page 로드(append). 그 외 레이아웃은 페이지네이션.
  const timelineSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (postsLayout !== "timeline") return;
    const el = timelineSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && page < totalPages) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [postsLayout, loading, page, totalPages]);

  // scroll-spy — 현재 뷰포트 상단(sticky nav 아래)에 걸린 월 마커를 활성으로. 인덱스 강조용.
  useEffect(() => {
    if (postsLayout !== "timeline") return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const markers = document.querySelectorAll<HTMLElement>('[id^="tl-m-"]');
        let current: string | null = null;
        for (const m of markers) {
          if (m.getBoundingClientRect().top <= 140) current = m.id.slice("tl-m-".length);
          else break;
        }
        setActiveMonthKey(current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [postsLayout, posts]);

  // 월 인덱스 점프 — 대상 월이 아직 로드 안 됐으면 마커가 나타날 때까지 다음 page 순차 로드 후 스크롤.
  // posts.length 로 게이팅(로드 완료 = posts 증가). loading 플래그만 쓰면 effect 실행 순서상 lag 때문에
  // page 를 2씩 건너뛰어(짝수 page 미로드) 영구 gap 이 생기던 버그 방지.
  const jumpReqLenRef = useRef(-1);
  useEffect(() => {
    if (!pendingMonthJump) return;
    if (doScrollToMonth(pendingMonthJump)) { setPendingMonthJump(null); jumpReqLenRef.current = -1; return; }
    if (loading) return;
    if (jumpReqLenRef.current === posts.length) return; // 이 길이에서 이미 로드 요청함 — posts 늘 때까지 대기
    if (page < totalPages) {
      jumpReqLenRef.current = posts.length;
      setPage((p) => p + 1);
    } else {
      setPendingMonthJump(null); // 끝까지 갔는데 못 찾음 → 포기
      jumpReqLenRef.current = -1;
    }
  }, [pendingMonthJump, posts, page, totalPages, loading, doScrollToMonth]);

  // 시리즈 fetch 공통 파라미터 빌더
  const buildSeriesParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (activeCategoryKey) params.set(QUERY_PARAM.category, activeCategoryKey);
      if (activeTagsKey) params.set("tags", activeTagsKey);
      params.set(QUERY_PARAM.page, String(page));
      params.set(QUERY_PARAM.limit, String(seriesPerPage));
      // random 은 client-side 셔플이라 API 에 안 보냄 — default 와 같이 처리
      if (seriesSortBy !== "default" && seriesSortBy !== "random") {
        params.set("sortBy", seriesSortBy);
        params.set("sortDir", seriesSortDir);
      }
      return params;
    },
    [activeCategoryKey, activeTagsKey, seriesPerPage, seriesSortBy, seriesSortDir],
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

  // Fetch posts when filters change (skip initial if page=1 — SSR 데이터가 page 1).
  // URL ?page=N (N>1) 으로 진입 시 SSR 데이터 없으므로 초기 mount 에도 fetch 필요.
  useEffect(() => {
    if (isInitial) {
      setIsInitial(false);
      // SSR initialData 는 필터 미적용 목록 — URL 로 필터(시리즈/태그)가 걸린 채 진입하면
      // page 1 이어도 다시 fetch 해야 필터가 반영됨.
      const hasUrlFilter = !!activeSeries || activeTags.size > 0 || activeCategories.length > 0;
      if (page === 1 && !hasUrlFilter) return; // SSR 와 동일(무필터 page 1) → 재요청 불필요
    }
    setLoading(true);
    const debounce = setTimeout(fetchPosts, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPosts, isInitial]);

  // 필터 변경 시 page 리셋 — 단, 첫 mount 는 skip (URL ?page= 으로 초기화된 값 보존)
  const filterChangeRef = useRef(false);
  useEffect(() => {
    if (!filterChangeRef.current) { filterChangeRef.current = true; return; }
    setPage(1);
  }, [
    search,
    searchType,
    activeCategoryKey,
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
    if (activeSeries || !usesRowSpan) return; // 시리즈 timeline 모드는 flex 레이아웃이라 패스
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
  }, [activeSeries, usesRowSpan]);

  useEffect(() => {
    if (activeSeries || !usesRowSpan) return;
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
  }, [posts, loading, activeSeries, usesRowSpan, recomputeRowSpans]);

  // window resize 시에도 재측정 (column 폭 변하면 카드 height 도 변함)
  useEffect(() => {
    if (activeSeries || !usesRowSpan) return;
    const onResize = () => recomputeRowSpans();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeSeries, usesRowSpan, recomputeRowSpans]);

  const handleSeriesClick = useCallback((seriesId: string) => {
    setActiveSeries((prev) => (prev === seriesId ? null : seriesId));
  }, []);

  const activeSeriesObj = useMemo(() => {
    if (!activeSeries) return null;
    return seriesList.find((s) => s.id === activeSeries) ?? null;
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

    // 좌/우 mask + 스크롤 화살표 표시 여부 — 스크롤 위치에 따라 클래스 토글
    const updateEdges = () => {
      const atStart = el.scrollLeft <= EDGE_TOL;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_TOL;
      const noScroll = el.scrollWidth <= el.clientWidth + EDGE_TOL; // 넘치지 않으면 화살표 둘 다 숨김
      el.classList.toggle(styles.atStart, atStart);
      el.classList.toggle(styles.atEnd, atEnd);
      // 화살표 버튼은 wrap 기준으로 숨김 (왼쪽 버튼은 seriesRow 앞 형제라 CSS ~ 로 못 잡음)
      const wrap = el.parentElement;
      if (wrap) {
        wrap.classList.toggle(styles.atStart, atStart);
        wrap.classList.toggle(styles.atEnd, atEnd);
        wrap.classList.toggle(styles.noScroll, noScroll);
      }
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

  const hasActiveFilter = !!search || activeTags.size > 0 || !!activeSeries || activeCategories.length > 0;
  // banner 는 pinned 글 있으면 항상 표시 (필터/검색/페이지네이션 무관)
  const showBanner = pinnedPosts.length >= 1;

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
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <div className={`${styles.page} ${history ? styles.historyMode : ""}`}>
      {loading && <div className={styles.topProgress} aria-hidden />}
      {/* history: 위/아래 스크롤 버튼 (긴 아카이브 이동) */}
      {history && <ScrollButtons />}
      {/* ── Posts 계열 브라우즈 서브네비 (All/Series/Tags/History) ── */}
      <PostsSubnav />
      {/* ── Header ── */}
      <div className={styles.header}>
        {history ? (
          <>
            <PageTitle icon={<HistoryIcon size={40} strokeWidth={1.6} aria-hidden />}>
              History.
            </PageTitle>
            <p className={styles.subtitle}>시간순으로 쌓인 모든 기록.</p>
          </>
        ) : (
          <>
            <PageTitle icon={<LayoutGrid size={40} strokeWidth={1.6} aria-hidden />}>
              Posts.
            </PageTitle>
            <p className={styles.subtitle}>
              <T k="postsPage.subtitle" />
            </p>
          </>
        )}
      </div>

      {/* ── Banner Slider ── (history 모드 제외) */}
      {!history && showBanner && (
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

      {/* ── Filter Bar (Category tabs + Search + Sort) — history 모드에선 숨김 ── */}
      {!history && (
      <div
        ref={filterBarRef}
        className={`${styles.filterBar} ${barHidden && !showTags && !catExpanded ? styles.filterBarHidden : ""}`}
      >
        {/* 검색 capsule — 별도 윗줄에 우측 정렬 (공통 SearchCapsule 사용) + 검색 문법 help 버튼 */}
        <div className={styles.filterBarSearchRow}>
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder={t("postsPage.searchPlaceholder")}
            routeParam="q"
            className={styles.postsSearchCapsule}
            hasResults={posts.length > 0}
            size="sm"
            onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
            typeSelector={{
              value: searchType,
              options: [
                { value: "all", label: t("postsPage.searchAll") },
                { value: "title", label: t("postsPage.searchTitle") },
                { value: "content", label: t("postsPage.searchContent") },
              ],
              onChange: (v) => setSearchType(v as "all" | "title" | "content"),
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

              </motion.div>
            )}
          </AnimatePresence>

          <CategoryNav
            extraCategories={extraCategories}
            activeCategories={activeCategories}
            onCategoriesChange={(next) => {
              setActiveCategories(next);
              // 카테고리 선택 시 자동으로 닫지 않음 — close 버튼 / filter bar 바깥 클릭 / 스크롤로만 닫힘
            }}
            expanded={catExpanded}
            onExpandChange={(v) => {
              setCatExpanded(v);
              if (v) setShowTags(false);
            }}
          />
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
              {/* 상단 헤더 — 철자 필터 (공통 LetterFilter) + 전체 태그 링크.
                  상단 main 검색과 중복 회피 + 다른 letter filter 위치 (TagsIndex / admin) 와 스타일 통일. */}
              <div className={styles.tagSearchHeader}>
                <LetterFilter
                  letters={TAG_LETTERS}
                  active={activeTagLetters}
                  onToggle={(l) => setActiveTagLetters((prev) => {
                    const next = new Set(prev);
                    if (next.has(l)) next.delete(l); else next.add(l);
                    return next;
                  })}
                  onClear={() => setActiveTagLetters(new Set())}
                  hasLetter={(l) => allTags.some(({ tag }) => getLetterInitial(tag) === l)}
                  className={styles.tagLetterRow}
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
                    — 선택한 철자에 해당하는 태그 없음 —
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* ── Content Area (2-column) ── */}
      <div ref={contentRef} className={styles.contentArea}>
        <div className={styles.mainColumn}>
          {/* Series Row — posts loading 과 무관하게 항상 표시 */}
          <div className={styles.seriesSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderMain}>
                <Link href="/posts/series" className={`${styles.sectionHeaderTitle} ${styles.sectionHeaderTitleLink}`}>
                  <BookOpen size={14} />
                  <span className={styles.sectionHeaderText}>
                    <T
                      k="postsPage.series"
                      tooltip={t("postsPage.seriesTooltip")}
                    />
                  </span>
                  <ChevronRight size={12} className={styles.sectionHeaderChevron} aria-hidden />
                </Link>
                {isAdmin && (
                  <Button
                    href="/admin/settings?tab=content&sub=posts"
                    external
                    size="sm"
                    variant="outline"
                    className={styles.seriesManageBtn}
                    icon={<Settings size={12} strokeWidth={1.8} aria-hidden />}
                    title={t("postsPage.seriesManage")}
                  >
                    {t("postsPage.seriesManage")}
                  </Button>
                )}
              </div>
              <div className={styles.sortWrap}>
                <SegmentedControl
                  size="sm"
                  className={styles.seriesSegmented}
                  items={[
                    { value: "default", label: t("postsPage.seriesSortDefault") },
                    { value: "newest", label: t("postsPage.seriesSortNewest") },
                    { value: "title", label: t("postsPage.seriesSortTitle") },
                  ]}
                  value={seriesSortBy === "random" ? "default" : seriesSortBy}
                  onChange={(v) =>
                    handleSeriesSortClick(v as "default" | "newest" | "title")
                  }
                  sortDir={seriesSortDir}
                />
                <Tooltip
                  content={
                    <>
                      <div>{t("postsPage.sortRandom")}</div>
                      <div>{t("postsPage.sortRandomTooltip")}</div>
                    </>
                  }
                >
                  <Button
                    variant={seriesSortBy === "random" ? "primary" : "outline"}
                    shape="circle"
                    size="sm"
                    icon={<Shuffle size={12} />}
                    onClick={() => {
                      if (seriesSortBy === "random") {
                        setSeriesRandomSeed(Math.floor(Math.random() * 1e9));
                      } else {
                        setSeriesSortBy("random");
                        setSeriesRandomSeed(Math.floor(Math.random() * 1e9));
                      }
                    }}
                    aria-label={t("postsPage.sortRandom")}
                    className={styles.shuffleBtn}
                  />
                </Tooltip>
              </div>
              {/* 검색창 — 공통 SearchCapsule collapsible(morph) + 스코프 typeSelector */}
              <SearchCapsule
                search={seriesSearch}
                onSearchChange={setSeriesSearch}
                placeholder="시리즈 제목·설명 검색"
                size="sm"
                align="left"
                collapsible
                historyKey={null}
                showHelp={false}
                className={styles.seriesSearchCapsule}
                typeSelector={{
                  value: seriesScope,
                  options: [
                    { value: "all", label: t("postsPage.seriesSearchAll") },
                    { value: "title", label: t("postsPage.seriesSearchTitle") },
                    { value: "desc", label: t("postsPage.seriesSearchDesc") },
                  ],
                  onChange: (v) => setSeriesScope(v as "all" | "title" | "desc"),
                }}
              />
            </div>
            {(() => {
              const q = seriesSearch.trim().toLowerCase();
              const scopeFields = (s: Series) =>
                seriesScope === "title"
                  ? [s.title, s.title_en]
                  : seriesScope === "desc"
                    ? [s.description, s.description_en]
                    : [s.title, s.title_en, s.description, s.description_en];
              const baseFiltered = q
                ? seriesList.filter((s) =>
                    scopeFields(s)
                      .filter(Boolean)
                      .some((v) => (v as string).toLowerCase().includes(q)),
                  )
                : seriesList;
              // seriesSortBy="random" 이면 seed 기반 client-side 셔플
              const filtered =
                seriesSortBy === "random"
                  ? baseFiltered
                      .map((s, i) => ({ s, k: ((seriesRandomSeed + i * 9301) * 49297) % 233280 }))
                      .sort((a, b) => a.k - b.k)
                      .map(({ s }) => s)
                  : baseFiltered;
              return (
                <div className={styles.seriesRowWrap}>
                  <button
                    type="button"
                    className={`${styles.seriesScrollBtn} ${styles.seriesScrollBtnLeft}`}
                    onMouseDown={(e) => { e.preventDefault(); startSeriesScroll(-1); }}
                    onMouseUp={stopSeriesScroll}
                    onMouseLeave={stopSeriesScroll}
                    onTouchStart={(e) => { e.preventDefault(); startSeriesScroll(-1); }}
                    onTouchEnd={stopSeriesScroll}
                    aria-label="이전"
                    data-clickable="true"
                    data-cursor="prev"
                  >
                    <span className={styles.seriesScrollBadge}>
                      <ChevronLeft size={16} />
                    </span>
                  </button>
                <div
                  ref={seriesRowRef}
                  className={styles.seriesRow}
                  data-lenis-prevent
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filtered.map((series, idx) => (
                      <motion.div
                        key={series.id}
                        layout
                        initial={{ opacity: 0, x: 40, scale: 0.92 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -80, scale: 0.9 }}
                        transition={{
                          layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                          opacity: { duration: 0.28 },
                          x: { duration: 0.35, ease: [0.4, 0, 0.6, 1] },
                          scale: { duration: 0.28 },
                        }}
                        style={{ display: "flex" }}
                      >
                        <SeriesCard
                          series={series}
                          onClick={handleSeriesClick}
                          active={activeSeries === series.id}
                          index={idx}
                          scrollContainerRef={seriesRowRef}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {/* Empty state — seriesRow 밖에 두어 mask-image / overflow 영향 없이 가운데 표시 */}
                <AnimatePresence>
                  {filtered.length === 0 && (
                    <motion.p
                      key="empty"
                      className={styles.seriesEmpty}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.35, duration: 0.25 }}
                    >
                      {t("postsPage.noSeriesYet")}
                    </motion.p>
                  )}
                </AnimatePresence>
                  <button
                    type="button"
                    className={`${styles.seriesScrollBtn} ${styles.seriesScrollBtnRight}`}
                    onMouseDown={(e) => { e.preventDefault(); startSeriesScroll(1); }}
                    onMouseUp={stopSeriesScroll}
                    onMouseLeave={stopSeriesScroll}
                    onTouchStart={(e) => { e.preventDefault(); startSeriesScroll(1); }}
                    onTouchEnd={stopSeriesScroll}
                    aria-label="다음"
                    data-clickable="true"
                    data-cursor="next"
                  >
                    <span className={styles.seriesScrollBadge}>
                      <ChevronRight size={16} />
                    </span>
                  </button>
                </div>
              );
            })()}
            <AnimatePresence>
              {activeSeriesObj && (
                <motion.div
                  className={styles.activeSeriesMeta}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className={styles.activeSeriesMetaTop}>
                    <h3 className={styles.activeSeriesMetaTitle}>
                      {language === "en" ? (activeSeriesObj.title_en || activeSeriesObj.title) : activeSeriesObj.title}
                    </h3>
                    <div className={styles.activeSeriesMetaInfo}>
                      {activeSeriesObj.category && (
                        <span className={styles.activeSeriesMetaCategory}>{activeSeriesObj.category}</span>
                      )}
                      <span className={styles.activeSeriesMetaCount}>
                        {activeSeriesObj.post_count ?? 0} {t("postsPage.postsCount")}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const d = language === "en"
                      ? (activeSeriesObj.description_en || activeSeriesObj.description)
                      : activeSeriesObj.description;
                    return d ? <p className={styles.activeSeriesMetaDesc}>{d}</p> : null;
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Posts — sectionHeader 는 빈 상태에서도 항상 노출 (sort / perPage 등 컨트롤 접근 유지) */}
          <>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderMain}>
                <span className={styles.sectionHeaderTitle}>
                  <LayoutGrid size={14} />
                  <span className={styles.sectionHeaderText}>
                    <T k="postsPage.posts" tooltip={t("postsPage.postsTooltip")} />
                  </span>
                </span>
              </div>
                <div className={styles.sortWrap}>
                  {/* 작성자 필터 — 저자 2명 이상일 때만. 레이아웃 무관하게 필터로 동작. */}
                  {multiAuthor && (
                    <Select
                      value={activeAuthor ?? ""}
                      options={[{ value: "", label: language === "ko" ? "작성자 전체" : "All authors" }, ...authors.map((a) => ({ value: a.id, label: a.name }))]}
                      size="sm"
                      onChange={(v) => { setActiveAuthor(v || null); setPage(1); }}
                    />
                  )}
                  {/* sort + shuffle 한 묶음 — shuffle 은 sort 의 random 변형 (오른쪽 인접). */}
                  <SegmentedControl<"date" | "popular" | "title" | "author", "score" | "views" | "comments" | "likes">
                    size="sm"
                    className={styles.seriesSegmented}
                    items={
                      /* 타임라인은 월 그룹이라 날짜순만 유효 → date(newest/oldest 토글)만 노출 */
                      postsLayout === "timeline"
                        ? [{ value: "date", label: <T k="postsPage.sortDate" tooltip={t("postsPage.sortDateTooltip")} /> }]
                        : [
                            { value: "date", label: <T k="postsPage.sortDate" tooltip={t("postsPage.sortDateTooltip")} /> },
                            {
                              value: "popular",
                              label: <T k="postsPage.sortPopular" tooltip={t("postsPage.sortPopularTooltip")} />,
                              subItems: [
                                { value: "score", label: <T k="postsPage.popularScore" /> },
                                { value: "views", label: <T k="postsPage.popularViews" /> },
                                { value: "comments", label: <T k="postsPage.popularComments" /> },
                                { value: "likes", label: <T k="postsPage.popularLikes" /> },
                              ],
                            },
                            { value: "title", label: <T k="postsPage.sortTitle" tooltip={t("postsPage.sortTitleTooltip")} /> },
                            // 저자 정렬 — 2명 이상일 때만
                            ...(multiAuthor ? [{ value: "author" as const, label: language === "ko" ? "저자" : "Author" }] : []),
                          ]
                    }
                    value={(postsLayout === "timeline" || sortBy === "random" ? "date" : sortBy) as "date" | "popular" | "title" | "author"}
                    onChange={(v) => {
                      if (sortBy === v) {
                        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setSortBy(v);
                        setSortDir(v === "title" || v === "author" ? "asc" : "desc");
                      }
                    }}
                    sortDir={sortBy !== "popular" && sortBy !== "random" ? sortDir : undefined}
                    subValue={popularSort}
                    onSubChange={setPopularSort}
                    subVariant="nested"
                    onBack={() => {
                      setSortBy("date");
                      setSortDir("desc");
                    }}
                  />
                  {/* 타임라인에선 랜덤 정렬도 무의미 → shuffle 숨김 */}
                  {postsLayout !== "timeline" && (
                    <Tooltip
                      content={
                        <>
                          <div>{t("postsPage.sortRandom")}</div>
                          <div>{t("postsPage.sortRandomTooltip")}</div>
                        </>
                      }
                    >
                      <Button
                        variant={sortBy === "random" ? "primary" : "outline"}
                        shape="circle"
                        size="sm"
                        icon={<Shuffle size={12} />}
                        onClick={() => {
                          if (sortBy === "random") {
                            setRandomSeed(Math.floor(Math.random() * 1e9));
                          } else {
                            setSortBy("random");
                            setRandomSeed(Math.floor(Math.random() * 1e9));
                          }
                        }}
                        aria-label={t("postsPage.sortRandom")}
                        className={styles.shuffleBtn}
                      />
                    </Tooltip>
                  )}
                </div>
                {/* 페이지당 개수 select — 가장 오른쪽 (margin-left: auto). shuffle/sort 와 분리.
                   history(timeline)는 무한스크롤이라 페이지 개념이 없어 숨김. */}
                {postsLayout !== "timeline" && (
                  <div className={styles.pageSizeGroup}>
                    <List size={14} strokeWidth={1.8} className={styles.pageSizeIcon} aria-hidden />
                    <Select
                      value={String(perPage)}
                      options={PAGE_SIZE_OPTIONS}
                      size="sm"
                      onChange={(v) => {
                        setPerPage(Number(v));
                        setPage(1);
                      }}
                      className={styles.pageSizeSelect}
                    />
                  </div>
                )}
              </div>
              {!loading && posts.length === 0 ? (
                activeSeries ? (
                  /* 시리즈 선택 + posts 0개 — "Coming Soon" 톤. 시리즈가 존재하지만 콘텐츠 준비중인 케이스. */
                  <div className={`${styles.emptyState} ${styles.emptyStateComingSoon}`}>
                    <span className={styles.comingSoonIconWrap} aria-hidden>
                      <Sparkles size={28} className={styles.comingSoonIconA} />
                      <Sparkles size={16} className={styles.comingSoonIconB} />
                      <Sparkles size={12} className={styles.comingSoonIconC} />
                    </span>
                    <p className={styles.comingSoonTitle}>{t("postsPage.comingSoon")}</p>
                    <p className={styles.comingSoonSub}>
                      {t("postsPage.noPostsInSeriesYet")} {t("postsPage.comingSoonSub")}
                    </p>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setActiveSeries(null)}
                    >
                      <T k="postsPage.clearSeries" />
                    </Button>
                  </div>
                ) : (
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
                    <p className={styles.emptyTitle}>{t("postsPage.noPostsYet")}</p>
                    {(search ||
                      activeTags.size > 0 ||
                      activeCategories.length > 0) && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setSearch("");
                          setSearchType("all");
                          clearActiveTags();
                          setActiveCategories([]);
                        }}
                      >
                        <T
                          k="postsPage.clearFilters"
                          tooltip={t("postsPage.clearFiltersTooltip")}
                        />
                      </Button>
                    )}
                  </div>
                )
              ) : (
                <>
              <div className={`${styles.gridWrap} ${postsLayout === "timeline" ? styles.gridWrapTimeline : ""}`}>
              {postsLayout === "timeline" && timelineIndexGroups.length > 0 && (
                <motion.nav
                  className={styles.timelineIndex}
                  aria-label="월별 이동"
                  data-lenis-prevent
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}
                >
                  {timelineIndexGroups.map((group) => {
                    const yearActive = group.months.some((m) => m.key === activeMonthKey);
                    return (
                      <motion.div
                        key={group.year}
                        className={styles.timelineIndexGroup}
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
                      >
                        <motion.div
                          className={`${styles.timelineIndexYear} ${yearActive ? styles.timelineIndexYearActive : ""}`}
                          variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                        >
                          {group.year}<span className={styles.timelineIndexHanja}>年</span>
                        </motion.div>
                        <motion.div
                          className={styles.timelineIndexMonths}
                          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
                        >
                          {group.months.map((m) => {
                            const isActive = activeMonthKey === m.key;
                            return (
                              <motion.button
                                key={m.key}
                                type="button"
                                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                                whileHover={{ x: 3 }}
                                transition={{ type: "spring", stiffness: 480, damping: 30 }}
                                className={`${styles.timelineIndexItem} ${isActive ? styles.timelineIndexItemActive : ""}`}
                                onClick={() => scrollToMonth(m.key)}
                                data-clickable="true"
                              >
                                <span className={styles.timelineIndexTick} aria-hidden="true">
                                  {isActive && (
                                    <motion.span
                                      layoutId="tlIndexActiveDot"
                                      className={styles.timelineIndexDot}
                                      transition={{ type: "spring", stiffness: 520, damping: 34 }}
                                    />
                                  )}
                                </span>
                                <span className={styles.timelineIndexMm}>{m.mm}<span className={styles.timelineIndexHanja}>月</span></span>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.nav>
              )}
              <div
                ref={gridRef}
                className={`${styles.grid} ${activeSeries ? styles.gridSeries : layoutClass} ${loading ? styles.gridLoading : ""}`}
              >
                {posts.length === 0 ? (
                  <PostsSkeletonCards
                    count={perPage}
                    activeSeries={!!activeSeries}
                    bento={postsLayout === "magazine"}
                    compactLayout={postsLayout === "compact"}
                  />
                ) : (
                  (() => {
                    // magazine 만 사이즈 변주(wide/banner/square/portrait). grid·list·compact 는 균일 카드.
                    const variants: CardType[] = posts.map((_, i) =>
                      activeSeries || postsLayout !== "magazine" ? "standard" : getCardType(i),
                    );
                    return posts.map((post, idx) => {
                      const type: CardType = variants[idx];
                      // featured — 첫 카드만 대형 hero. masonry/timeline 은 균일 표준 카드.
                      const isFeaturedHero =
                        !activeSeries && postsLayout === "featured" && idx === 0;
                      const cls =
                        !activeSeries && (type === "wide" || type === "banner")
                          ? styles.gridWide
                          : "";
                      // timeline — 월(연-월) 이 이전 카드와 다르면 앞에 날짜 마커 삽입
                      const timelineMarker =
                        !activeSeries &&
                        postsLayout === "timeline" &&
                        monthKey(post) !== (idx > 0 ? monthKey(posts[idx - 1]) : "")
                          ? monthLabel(post)
                          : null;
                      // 시리즈 필터링 시 — DB 의 series_order 값이 비연속/중복일 수 있어 sort 후 idx+1 로 1-based 일관 표시
                      const stepNumber = activeSeries
                        ? String(idx + 1).padStart(2, "0")
                        : null;
                      const isTimeline = !activeSeries && postsLayout === "timeline";
                      // 지그재그 — 인덱스로 좌/우 교차 (마커가 껴도 idx 기준이라 일관)
                      const tlSide: "left" | "right" = idx % 2 === 0 ? "left" : "right";
                      const tlSideClass = isTimeline
                        ? tlSide === "left"
                          ? styles.gridItemTlLeft
                          : styles.gridItemTlRight
                        : "";
                      const setItemRef = (el: HTMLDivElement | null) => {
                        if (el) itemRefs.current.set(post.id, el);
                        else itemRefs.current.delete(post.id);
                      };
                      const itemClassName = `${styles.gridItem} ${cls} ${isFeaturedHero ? styles.gridFeaturedHero : ""} ${activeSeries ? styles.seriesStep : ""} ${tlSideClass}`;
                      const cardInner = (
                        <>
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
                              variant={isFeaturedHero ? "featured" : "standard"}
                              layout={activeSeries ? undefined : postsLayout}
                              banner={!activeSeries && type === "banner"}
                              square={!activeSeries && type === "square"}
                              portrait={!activeSeries && type === "portrait"}
                              compact={!!activeSeries}
                              isHot={popularIds.has(post.id)}
                              onImgError={handleImgError}
                              imgError={imgErrors.has(post.id)}
                            />
                          </div>
                        </>
                      );
                      // 타임라인 리빌은 framer useScroll 로 스크롤 진행에 비례(TimelineMotionItem). 그 외는 plain div.
                      const cardEl = isTimeline ? (
                        <TimelineMotionItem
                          key={post.id}
                          side={tlSide}
                          disableX={tlSingleCol}
                          className={itemClassName}
                          assignRef={setItemRef}
                        >
                          {cardInner}
                        </TimelineMotionItem>
                      ) : (
                        <div key={post.id} ref={setItemRef} className={itemClassName}>
                          {cardInner}
                        </div>
                      );
                      return timelineMarker ? (
                        <Fragment key={post.id}>
                          <motion.div
                            id={`tl-m-${monthKey(post)}`}
                            className={styles.timelineMarker}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "0px 0px -6% 0px" }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <span className={styles.timelineMarkerLabel}>{timelineMarker}</span>
                          </motion.div>
                          {cardEl}
                        </Fragment>
                      ) : (
                        cardEl
                      );
                    });
                  })()
                )}
              </div>
              </div>{/* /gridWrap */}

              {/* 타임라인 무한 스크롤 sentinel — 다음 page 자동 로드 */}
              {postsLayout === "timeline" && page < totalPages && (
                <div ref={timelineSentinelRef} className={styles.timelineSentinel} aria-hidden="true" />
              )}

              {/* Pagination — 타임라인(무한스크롤) 제외 */}
              {postsLayout !== "timeline" && totalPages > 1 && (
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
              )}
          </>
        </div>

        {/* ── Sidebar ── */}
        <SidebarWrap barHidden={barHidden}>
          {/* 태그 — label 헤더는 그대로, 필터링 중일 땐 sphere 대신 chip(개수 명시)로.
              tags 는 필터 중이면 facet(결과 반영)로 전달. 클릭 시 태그 토글(OR) 필터. */}
          <TagCloud3D
            tags={hasActiveFilter ? facetTags : allTags}
            activeTags={activeTags}
            // 평소 sphere 는 태그 페이지로 이동(기존), 필터 중 chip 은 토글(OR)로 필터 조정
            onTagClick={hasActiveFilter ? toggleActiveTag : undefined}
            asChips={hasActiveFilter}
          />
          <PopularPosts />
          <RandomPosts />
          <RecentComments />
        </SidebarWrap>
      </div>
    </div>
    </SearchHighlightProvider>
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
  bento = true,
  compactLayout = false,
}: {
  count: number;
  activeSeries: boolean;
  startIdx?: number;
  ghost?: boolean;
  bento?: boolean;
  compactLayout?: boolean;
}) {
  // compact 레이아웃 — 이미지 없이 텍스트 행 skeleton
  if (compactLayout) {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`${styles.gridItem} ${ghost ? styles.gridItemGhost : ""}`}
            aria-hidden={ghost || undefined}
          >
            <div className={styles.skeletonCompactRow}>
              <SkeletonLine width="42%" height={18} />
              <SkeletonPill width={110} height={14} />
            </div>
          </div>
        ))}
      </>
    );
  }
  const variants: CardType[] = Array.from({ length: count }, (_, i) =>
    activeSeries || !bento ? "standard" : getCardType(startIdx + i),
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
