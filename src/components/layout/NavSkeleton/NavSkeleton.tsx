"use client";

/* 사이트 안 이동 중 뼈대 — 메뉴 페이지(홈 · 작업물 · 글 · 프로필 · About)로 가는 링크를 누르면, 새 페이지가 서버에서 올 때까지
   내비 아래에 그 페이지 첫 화면 모양의 뼈대를 띄운다. 새 주소가 그려지면 걷는다.
   loading.tsx 를 쓰지 않는 이유 — 그러면 페이지가 Suspense 경계에 들어가 처음 접속할 때도 본문 공개가 늦어지고(스트리밍 공개 지연),
   경계 안 언어 글자가 하이드레이션에서 어긋날 수 있다. 처음 접속은 로딩 덮개가 맡고, 이 뼈대는 사이트 안 이동에서만 뜬다.
   빨리 끝나는 이동(SHOW_AFTER_MS 안)은 아무것도 띄우지 않는다 */
import { useEffect, useState, type CSSProperties } from "react";
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
  const wide = window.matchMedia("(width > 1024px)").matches;
  const bones = BONES[pending.to][wide ? "wide" : "narrow"];
  const onDark = pending.to === "/works" || pending.to === "/about";
  return (
    <div className={styles.layer} data-page={pending.to} data-sky={pending.to === "/about" ? skyPhase() : undefined} aria-busy="true" aria-live="polite">
      {bones.map(([kind, x, y, w, h], i) => (
        <span
          key={i}
          className={styles.bone}
          data-kind={kind}
          data-dark={onDark || undefined}
          style={{ "--x": x, "--y": y, "--w": w, "--h": h } as CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── 페이지마다 첫 화면의 실제 자리 — 1440×900(wide)과 390×844(narrow)에서 잰 요소의 상자.
   [모양, x(화면 폭 %), y(화면 높이 %), 폭(화면 폭 %), 높이(px)] — 가로는 화면 폭, 세로는 화면 높이에 비례해 늘고 준다 ── */

type Kind = "line" | "pill" | "circle" | "block";
type Bone = [Kind, number, number, number, number];
const W = (px: number) => (px / 1440) * 100;
const H = (px: number) => (px / 900) * 100;
const w = (px: number) => (px / 390) * 100;
const h = (px: number) => (px / 844) * 100;

const BONES: Record<Page, { wide: Bone[]; narrow: Bone[] }> = {
  /* 홈 — 위 가운데 3D 고리, 왼쪽 큰 제목 세 줄(Creative / Developer / & Problem Solver), 소개 두 개, 아래 가운데 "Scroll down" */
  "/": {
    wide: [
      ["circle", W(620), H(20), W(200), 200],
      ["line", W(115), H(292), W(250), 76],
      ["line", W(115), H(392), W(300), 76],
      ["line", W(115), H(492), W(535), 76],
      ["line", W(115), H(648), W(121), 16],
      ["line", W(361), H(645), W(145), 22],
      ["line", W(667), H(805), W(105), 15],
    ],
    narrow: [
      ["circle", w(145), h(70), w(100), 100],
      ["line", w(16), h(281), w(130), 30],
      ["line", w(16), h(318), w(150), 30],
      ["line", w(16), h(355), w(182), 30],
      ["line", w(134), h(424), w(121), 16],
      ["line", w(107), h(459), w(145), 22],
      ["line", w(142), h(789), w(105), 15],
    ],
  },
  /* 작업물 — 검은 우주 가운데 머리말 · 큰 제목 · 부제 · "scroll to explore" */
  "/works": {
    wide: [
      ["line", W(566), H(319), W(308), 15],
      ["line", W(571), H(362), W(298), 90],
      ["line", W(638), H(496), W(165), 26],
      ["line", W(648), H(566), W(144), 17],
    ],
    narrow: [
      ["line", w(60), h(306), w(270), 16],
      ["line", w(102), h(366), w(187), 56],
      ["line", w(113), h(462), w(165), 24],
      ["line", w(123), h(520), w(144), 17],
    ],
  },
  /* 프로필 — 왼쪽 "About Me" 이름표, 큰 제목 두 줄(Crafting Digital / Experiences), 소개 한 줄 */
  "/profile": {
    wide: [
      ["block", W(115), H(284), W(152), 44],
      ["line", W(115), H(358), W(560), 70],
      ["line", W(115), H(445), W(440), 70],
      ["line", W(115), H(565), W(873), 30],
    ],
    narrow: [
      ["block", w(8), h(271), w(152), 44],
      ["line", w(8), h(330), w(330), 34],
      ["line", w(8), h(370), w(250), 34],
      ["line", w(8), h(432), w(370), 24],
      ["line", w(8), h(466), w(300), 24],
    ],
  },
  /* 글 — 탭 넷, 아이콘 + "Posts.", 소개, 오른쪽 검색, 분류 탭, 시리즈 줄, 빈 목록 자리, 글 목록 줄 */
  "/posts": {
    wide: [
      ["pill", W(115), H(96), W(40), 30],
      ["pill", W(159), H(96), W(64), 30],
      ["pill", W(227), H(96), W(55), 30],
      ["pill", W(285), H(96), W(70), 30],
      ["block", W(115), H(162), W(58), 58],
      ["line", W(185), H(165), W(145), 52],
      ["line", W(115), H(242), W(282), 20],
      ["pill", W(968), H(298), W(357), 28],
      ["pill", W(131), H(337), W(48), 28],
      ["line", W(195), H(341), W(330), 20],
      ["line", W(115), H(413), W(330), 21],
      ["block", W(115), H(470), W(882), 192],
      ["line", W(115), H(729), W(300), 21],
    ],
    narrow: [
      ["pill", w(16), h(96), w(40), 30],
      ["pill", w(59), h(96), w(64), 30],
      ["pill", w(127), h(96), w(55), 30],
      ["pill", w(186), h(96), w(70), 30],
      ["block", w(16), h(157), w(35), 35],
      ["line", w(60), h(157), w(90), 36],
      ["line", w(16), h(210), w(282), 20],
      ["pill", w(16), h(265), w(330), 28],
      ["line", w(28), h(310), w(250), 24],
      ["line", w(28), h(354), w(170), 22],
      ["line", w(16), h(386), w(200), 21],
      ["block", w(16), h(475), w(359), 192],
      ["line", w(16), h(731), w(320), 21],
    ],
  },
  /* About — 하늘 위 왼쪽 위 소개(날씨 줄 · 제목 · 소개 두 단 · 단추 둘), 별자리 지도의 별 열 개 */
  "/about": {
    wide: [
      ["line", W(115), H(112), W(367), 16],
      ["line", W(115), H(153), W(367), 30],
      ["line", W(115), H(192), W(367), 20],
      ["line", W(115), H(221), W(324), 20],
      ["line", W(115), H(250), W(260), 20],
      ["pill", W(115), H(294), W(110), 32],
      ["pill", W(237), H(294), W(90), 32],
      ...([[395, 594, 72], [543, 426, 113], [671, 515, 92], [779, 396, 102], [882, 515, 82], [980, 411, 77], [1079, 505, 72], [1113, 637, 77], [986, 716, 56], [847, 696, 51]] as const).map(
        ([cx, cy, d]): Bone => ["circle", W(cx - d * 0.18), H(cy - d * 0.18), W(d * 0.36), d * 0.36],
      ),
    ],
    narrow: [
      ["line", w(16), h(120), w(312), 16],
      ["line", w(16), h(161), w(312), 28],
      ["line", w(16), h(200), w(330), 20],
      ["line", w(16), h(228), w(300), 20],
      ["line", w(16), h(256), w(260), 20],
      ["pill", w(16), h(320), w(110), 32],
      ["pill", w(138), h(320), w(90), 32],
      ...([[36, 397, 44], [64, 467, 64], [40, 535, 51], [66, 603, 57], [42, 673, 48], [225, 693, 44], [210, 617, 41], [229, 549, 48], [213, 480, 35], [226, 411, 32]] as const).map(
        ([cx, cy, d]): Bone => ["circle", w(cx - d * 0.18), h(cy - d * 0.18), w(d * 0.36), d * 0.36],
      ),
    ],
  },
};

/** About 하늘 — 방문자 시계로 대략의 시간대(실제 하늘은 해 뜨고 지는 시각까지 보지만, 뼈대는 시간만으로) */
function skyPhase() {
  const hr = new Date().getHours();
  return hr < 5 ? "night" : hr < 6 ? "dawn" : hr < 7 ? "sunrise" : hr < 10 ? "morning" : hr < 17 ? "day" : hr < 19 ? "dusk" : hr < 21 ? "evening" : "night";
}
