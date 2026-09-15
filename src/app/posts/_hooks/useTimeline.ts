"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLenis } from "@/providers/LenisProvider";
import { siteDateParts } from "@/utils/siteDate";
import type { Post } from "@/types/post";

// timeline 레이아웃 — 발행(예약)/생성 월 기준으로 그룹 마커 삽입.
// 월 key/label 은 한국 시간 기준이다(siteDate). 서버가 미리 그린 마커와 브라우저가 같은 월을 그려야 하이드레이션이 어긋나지 않고,
// marker id 와 index 가 같은 함수를 써야 점프가 맞는다
const dateOf = (p: Post) => p.scheduled_at ?? p.created_at ?? null;
const monthKeyFromDate = (d: string | null) => {
  const t = d ? siteDateParts(d) : null;
  return t ? `${t.year}-${t.month}` : "";
};
const monthLabelFromDate = (d: string | null) => {
  const t = d ? siteDateParts(d) : null;
  return t ? `${t.year}. ${String(t.month + 1).padStart(2, "0")}` : "";
};
const monthKey = (p: Post) => monthKeyFromDate(dateOf(p));
const monthLabel = (p: Post) => monthLabelFromDate(dateOf(p));

export type TimelineIndexGroup = { year: string; months: { key: string; mm: string }[] };

/* /posts/history 타임라인 — 월 인덱스 데이터 · 월 점프(미로드 월은 순차 로드 뒤 스크롤) · 무한 스크롤 sentinel · scroll-spy.
   enabled=false(timeline 레이아웃 아님)면 인덱스는 비고 효과는 전부 쉰다.
   posts/page/totalPages/loading/setPage 는 글 목록 fetch 의 것 — 이 훅은 page 를 올리기만 한다.
   monthKey/monthLabel 은 그리드가 월 마커(id `tl-m-<key>`)를 그릴 때 쓴다 — 인덱스와 같은 함수여야 점프가 맞는다. */
export function useTimeline({
  enabled,
  history,
  archiveMonths,
  posts,
  page,
  totalPages,
  loading,
  setPage,
}: {
  enabled: boolean;
  /** history 모드 — 인덱스에 전체 아카이브 월(archiveMonths)을 쓴다 (로드 여부 무관) */
  history: boolean;
  archiveMonths?: string[];
  posts: Post[];
  page: number;
  totalPages: number;
  loading: boolean;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  const { lenis } = useLenis();

  // 타임라인 왼쪽 인덱스 — history 는 전체 아카이브 월(로드 여부 무관), 그 외엔 로드된 posts 기준. 최신순.
  const timelineMonths = useMemo(() => {
    if (!enabled) return [] as { key: string; label: string; year: string; mm: string }[];
    const source: string[] =
      history && archiveMonths && archiveMonths.length
        ? archiveMonths
        : posts.map((p) => dateOf(p)).filter((d): d is string => !!d);
    const seen = new Map<string, { key: string; label: string; ord: number }>();
    for (const d of source) {
      const t = siteDateParts(d);
      const k = monthKeyFromDate(d);
      if (!t || seen.has(k)) continue;
      seen.set(k, { key: k, label: monthLabelFromDate(d), ord: t.year * 12 + t.month });
    }
    return Array.from(seen.values())
      .sort((a, b) => b.ord - a.ord)
      .map(({ key, label }) => {
        const [year, mm] = label.split(". ");
        return { key, label, year, mm };
      });
  }, [posts, enabled, history, archiveMonths]);

  // 인덱스용 — 연도별 그룹 (헤더 + 월). timelineMonths 가 최신순이라 같은 연도끼리 연속.
  const indexGroups = useMemo(() => {
    const groups: TimelineIndexGroup[] = [];
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

  // 무한 스크롤 — sentinel 이 뷰에 들어오면 다음 page 로드(append 는 fetchPosts 가). 그 외 레이아웃은 페이지네이션.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
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
  }, [enabled, loading, page, totalPages, setPage]);

  // scroll-spy — 현재 뷰포트 상단(sticky nav 아래)에 걸린 월 마커를 활성으로. 인덱스 강조용.
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, posts]);

  // 스크롤로 화면이 움직이는 동안에만 타임라인 카드 hover 프리뷰(썸네일·발췌)를 억제한다 —
  // 커서 밑으로 카드가 지나가며 프리뷰가 깜빡이는 것 방지. html 에 data-tl-scrolling 을 걸면
  // CSS 가 프리뷰를 숨긴다. 멈추면 곧바로 해제 → 커서가 머문 카드의 프리뷰는 정상 표시된다.
  //
  // 판단은 scroll 이벤트 유무가 아니라 Lenis 속도(velocity)로 한다. Lenis 부드러운 스크롤은
  // 한 번 굴려도 관성으로 약 1.2초를 미끄러지며 그동안 scroll 이벤트가 계속 나온다. 이벤트로
  // 판단하면 화면이 사실상 멈춘 뒤에도 1초 넘게 프리뷰가 안 떠 hover 가 죽은 것처럼 느껴졌다.
  // 속도가 낮아져 시각적으로 멈추면 바로 되살린다.
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    let tid: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { if (tid) { clearTimeout(tid); tid = undefined; } };
    const clear = () => { root.removeAttribute("data-tl-scrolling"); tid = undefined; };

    if (lenis) {
      const MOVING = 0.5; // 이 속도 이상이면 '움직이는 중'(그 아래는 관성 정착 꼬리 — 사실상 멈춤)
      // velocity 는 런타임엔 있으나 설치된 Lenis 타입엔 노출 안 됨 → 좁혀서 읽는다.
      const velocityOf = () => (lenis as unknown as { velocity: number }).velocity;
      const onScroll = () => {
        if (Math.abs(velocityOf()) > MOVING) {
          root.setAttribute("data-tl-scrolling", "");
          stop();
        } else if (root.hasAttribute("data-tl-scrolling") && !tid) {
          tid = setTimeout(clear, 80);
        }
      };
      lenis.on("scroll", onScroll);
      return () => { lenis.off("scroll", onScroll); stop(); root.removeAttribute("data-tl-scrolling"); };
    }

    // Lenis 없을 때(폴백) — 네이티브 스크롤은 관성이 없어 이벤트 debounce 로 충분
    const onScroll = () => {
      root.setAttribute("data-tl-scrolling", "");
      stop();
      tid = setTimeout(clear, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); stop(); root.removeAttribute("data-tl-scrolling"); };
  }, [enabled, lenis]);

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
  }, [pendingMonthJump, posts, page, totalPages, loading, doScrollToMonth, setPage]);

  return { indexGroups, activeMonthKey, scrollToMonth, sentinelRef, monthKey, monthLabel };
}
