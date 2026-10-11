"use client";

/* 사이트 안 이동 중 뼈대 — 메뉴 페이지(홈 · 작업물 · 글 · 프로필 · About)로 가는 링크를 누르면, 새 페이지가 서버에서 올 때까지
   내비 아래에 그 페이지 첫 화면 모양의 뼈대를 띄운다. 새 주소가 그려지면 걷는다.
   loading.tsx 를 쓰지 않는 이유 — 그러면 페이지가 Suspense 경계에 들어가 처음 접속할 때도 본문 공개가 늦어지고(스트리밍 공개 지연),
   경계 안 언어 글자가 하이드레이션에서 어긋날 수 있다. 처음 접속은 로딩 덮개가 맡고, 이 뼈대는 사이트 안 이동에서만 뜬다.
   빨리 끝나는 이동(SHOW_AFTER_MS 안)은 아무것도 띄우지 않는다 */
import { useEffect, useState } from "react";
import { Skeleton, SkeletonCircle, SkeletonLine, SkeletonPill } from "@/components/ui/Skeleton";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import styles from "./NavSkeleton.module.css";

type Page = "/" | "/works" | "/posts" | "/profile" | "/about";
const PAGES: Page[] = ["/", "/works", "/posts", "/profile", "/about"];
/** 이보다 빨리 끝나는 이동은 뼈대 없이 바로 바뀐다 — 번쩍임 방지 */
const SHOW_AFTER_MS = 150;
/** 새 주소가 끝내 오지 않을 때(오류 · 취소) 걷는 상한 */
const GIVE_UP_MS = 10000;

/** 같은 출처의 메뉴 페이지로 가는 일반 클릭이면 그 페이지 */
function targetOf(e: MouseEvent): Page | null {
  /* defaultPrevented 는 보지 않는다 — Next 의 Link 가 늘 기본 동작을 막고 스스로 옮긴다 */
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return null;
  const path = (url.pathname.replace(/\/+$/, "") || "/") as Page;
  return PAGES.includes(path) && path !== (location.pathname.replace(/\/+$/, "") || "/") ? path : null;
}

export default function NavSkeleton() {
  const pathname = useRoutePathname();
  const [pending, setPending] = useState<{ to: Page; from: string } | null>(null);
  const [shown, setShown] = useState(false);

  /* 링크 누름을 문서에서 듣는다 */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const to = targetOf(e);
      if (to) setPending({ to, from: location.pathname });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /* 잠깐 기다렸다가 띄우고, 상한이 지나면 걷는다 */
  useEffect(() => {
    if (!pending) return;
    const show = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    const giveUp = setTimeout(() => {
      setPending(null);
      setShown(false);
    }, GIVE_UP_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
    };
  }, [pending]);

  /* 주소가 바뀌면(새 페이지가 그려지면) 걷는다 — 다음 프레임에, 새 페이지가 한 번 칠해진 뒤 */
  useEffect(() => {
    if (!pending || pathname === pending.from) return;
    const raf = requestAnimationFrame(() => {
      setPending(null);
      setShown(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, pending]);

  if (!pending || !shown) return null;
  return (
    <div className={styles.layer} data-page={pending.to} aria-busy="true" aria-live="polite">
      {pending.to === "/" && <HomeBones />}
      {pending.to === "/works" && <WorksBones />}
      {pending.to === "/posts" && <PostsBones />}
      {pending.to === "/profile" && <ProfileBones />}
      {pending.to === "/about" && <AboutBones />}
    </div>
  );
}

/* ── 페이지마다 첫 화면 모양 ── */

/** 홈 — 위 가운데 3D 고리, 왼쪽 큰 제목 세 줄, 아래 소개 줄 */
function HomeBones() {
  return (
    <div className={styles.home}>
      <SkeletonCircle size="var(--size-96)" className={styles.homeRing} />
      <div className={styles.titleStack}>
        <SkeletonLine width="38%" height="var(--_title)" />
        <SkeletonLine width="30%" height="var(--_title)" />
        <SkeletonLine width="46%" height="var(--_title)" />
      </div>
      <div className={styles.metaRow}>
        <SkeletonLine width="var(--size-96)" />
        <SkeletonLine width="var(--size-128)" />
      </div>
    </div>
  );
}

/** 작업물 — 가운데 작은 머리말 · 큰 제목 · 부제 */
function WorksBones() {
  return (
    <div className={styles.works}>
      <SkeletonLine width="var(--size-128)" />
      <SkeletonLine width="min(28rem, 70%)" height="var(--_title)" />
      <SkeletonLine width="var(--size-128)" />
    </div>
  );
}

/** 글 — 탭 · 큰 제목 · 소개 · 검색 · 분류 탭 · 목록 */
function PostsBones() {
  return (
    <div className={styles.posts}>
      <div className={styles.row}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonPill key={i} width="var(--size-56)" />
        ))}
      </div>
      <div className={styles.row}>
        <Skeleton width="var(--size-40)" height="var(--size-40)" borderRadius="var(--radius-mark)" />
        <SkeletonLine width="var(--size-128)" height="var(--_title)" />
      </div>
      <SkeletonLine width="min(24rem, 80%)" />
      <div className={styles.searchRow}>
        <SkeletonPill width="min(18rem, 100%)" />
      </div>
      <div className={styles.row}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonLine key={i} width="var(--size-40)" />
        ))}
      </div>
      <div className={styles.list}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.listItem}>
            <Skeleton width="var(--size-96)" height="var(--size-72)" borderRadius="var(--radius-surface)" />
            <div className={styles.listText}>
              <SkeletonLine width="70%" height="var(--skeleton-height-line-lg)" />
              <SkeletonLine width="45%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 프로필 — 왼쪽 이름표 · 큰 제목 두 줄 · 소개 */
function ProfileBones() {
  return (
    <div className={styles.profile}>
      <SkeletonPill width="var(--size-128)" height="var(--control-height-md)" />
      <div className={styles.titleStack}>
        <SkeletonLine width="min(32rem, 80%)" height="var(--_title)" />
        <SkeletonLine width="min(24rem, 60%)" height="var(--_title)" />
      </div>
      <SkeletonLine width="min(36rem, 90%)" height="var(--skeleton-height-line-lg)" />
    </div>
  );
}

/** About — 왼쪽 위 소개 글과 단추, 오른쪽 별자리 지도의 별들 */
function AboutBones() {
  return (
    <div className={styles.about}>
      <div className={styles.aboutLead}>
        <SkeletonLine width="var(--size-128)" />
        <SkeletonLine width="80%" height="var(--skeleton-height-line-lg)" />
        <SkeletonLine width="70%" />
        <SkeletonLine width="60%" />
        <div className={styles.row}>
          <SkeletonPill width="var(--size-96)" height="var(--control-height-md)" />
          <SkeletonPill width="var(--size-72)" height="var(--control-height-md)" />
        </div>
      </div>
      <div className={styles.aboutMap}>
        {MAP_STARS.map(([x, y], i) => (
          <span key={i} className={styles.mapSpot} style={{ left: `${x}%`, top: `${y}%` }}>
            <SkeletonCircle size="var(--spacing-16)" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** About 별자리 지도의 별 자리(%) — 첫 화면 지도의 대략적인 배치 */
const MAP_STARS: [number, number][] = [
  [10, 70],
  [22, 30],
  [30, 55],
  [42, 18],
  [50, 48],
  [60, 22],
  [66, 62],
  [78, 36],
  [84, 74],
  [52, 86],
];
