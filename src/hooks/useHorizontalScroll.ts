"use client";

import {
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
} from "react";
import gsap from "gsap";
import { useLenis } from "@/providers/LenisProvider";
import { checkMobileLayout, useMobileLayout } from "@/hooks/useMobileLayout";

const SCROLL_LERP = 0.08;
const MAX_WHEEL_DELTA = 150;
/** 전역 Lenis 가 이 요소 위의 휠을 건드리지 않게 하는 표시 — Lenis 가 읽는 이름 그대로여야 한다 */
const LENIS_PREVENT_WHEEL = "data-lenis-prevent-wheel";
/** 트랙 위치를 바꾼 직후 매 프레임 보내는 이벤트 — 긴 패널의 안쪽 고정이 같은 프레임에 따라온다 */
export const HSCROLL_FRAME_EVENT = "hscroll:frame";

export interface HorizontalScrollOptions {
  /** Infinite wrapping (default: false) */
  infinite?: boolean;
  /** Panels per set — infinite 모드 전용 (default: 11) */
  panelSetSize?: number;
  /** Nav sections per set — infinite 모드 전용 (default: panelSetSize - 1) */
  navSectionCount?: number;
  /** 모바일에서 .animateVisible 클래스 토글 (default: false) */
  mobileAnimateVisible?: boolean;
  /** 트랙의 패널이 다 그려졌는지 (default: true). 무한 모드에서 앞뒤 세트를 브라우저에서 늦게 붙이면
      그때까지 false 로 두어, 한 세트만 있을 때 초기 위치를 잡지 않게 한다 */
  ready?: boolean;
  /** 장면 전환 방식 (default: false). 켜면 화면 폭 이상인 패널은 옆으로 밀리지 않고 화면에 고정된 채
      다음 패널이 와이프·아이리스·디졸브로 덮으며 바뀐다. 진행도는 스크롤 위치 그대로다 */
  cinematic?: boolean;
}

/**
 * 가로 스크롤 공통 훅.
 *
 * - 데스크톱: wheel → targetScrollX → LERP 보간 → gsap.set(track, { x })
 * - 모바일: 세로 스크롤 + IntersectionObserver
 * - 패널 셀렉터: styles.panel, panelWide, breakPanel 자동 탐지
 */
export function useHorizontalScroll(
  styles: Record<string, string>,
  options?: HorizontalScrollOptions,
): {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  activeSection: number;
  goToSection: (navIndex: number) => void;
  scrollBy: (deltaX: number) => void;
} {
  const {
    infinite = false,
    panelSetSize = 11,
    navSectionCount = infinite ? panelSetSize - 1 : 0,
    mobileAnimateVisible = false,
    ready = true,
    cinematic = false,
  } = options ?? {};

  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef({ scrollX: 0, targetScrollX: 0 });
  const initializedRef = useRef(false);
  const rafIdRef = useRef(0);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const mobile = useMobileLayout();
  const { setInfinite, scrollTo: lenisScrollTo } = useLenis();

  // ── 패널 셀렉터 빌드 ──
  const panelSelector = [styles.panel, styles.panelWide, styles.breakPanel]
    .filter(Boolean)
    .map((c) => `.${c}`)
    .join(", ");

  // breakPanel 없으면 빈 문자열 — 안전하게 비교 가능
  const breakClass = styles.breakPanel ?? "";

  // 외부에서 스크롤 제어 (usePinnedScroll 연동용)
  const scrollBy = useCallback((deltaX: number) => {
    scrollStateRef.current.targetScrollX += deltaX;
  }, []);

  // ── 섹션 이동 ──
  const goToSection = useCallback(
    (navIndex: number) => {
      const track = trackRef.current;
      if (!track) return;

      const panels = track.querySelectorAll<HTMLElement>(panelSelector);

      if (checkMobileLayout()) {
        let count = 0;
        for (let i = 0; i < panels.length; i++) {
          if (breakClass && panels[i].classList.contains(breakClass)) continue;
          if (count === navIndex) {
            panels[i].scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
          count++;
        }
        return;
      }

      /* 데스크탑: 가장 가까운 해당 패널을 찾아서 targetScrollX 조정.
         위치는 레이아웃 값(트랙 x + offsetLeft)으로 잰다 — 장면 전환이 화면 가장자리에서 기다리는 패널을
         화면에 붙잡아 두므로 getBoundingClientRect 로 재면 0 으로 나와, 옆 패널로 가는 버튼이 움직이지 않았다 */
      const trackX = new DOMMatrix(getComputedStyle(track).transform).m41;
      const leftOf = (el: HTMLElement) => trackX + el.offsetLeft;
      let bestTarget: HTMLElement | undefined;
      let bestDist = Infinity;
      let navCount = 0;

      for (let i = 0; i < panels.length; i++) {
        if (breakClass && panels[i].classList.contains(breakClass)) continue;
        const idx = infinite ? navCount % navSectionCount : navCount;
        if (idx === navIndex) {
          const dist = Math.abs(leftOf(panels[i]));
          if (dist < bestDist) {
            bestDist = dist;
            bestTarget = panels[i];
          }
        }
        navCount++;
      }

      if (bestTarget) {
        const left = leftOf(bestTarget);
        const width = bestTarget.offsetWidth;
        const vw = window.innerWidth;
        const offset = width < vw ? left - (vw - width) / 2 : left;
        scrollStateRef.current.targetScrollX += offset;
      }
    },
    [panelSelector, breakClass, infinite, navSectionCount],
  );

  // ── Lenis 무한 스크롤 비활성화 ──
  // 무한 스크롤은 기본 OFF — opt-in 방식이라 cleanup 복원 불필요
  useLayoutEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  // 리사이즈 시 infinite=false 재적용 — LenisProvider의 resize 핸들러가
  // width > 768에서 infinite=true로 덮어쓰는 것을 방지
  useEffect(() => {
    const handleResize = () => setInfinite(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setInfinite]);

  // ── 데스크탑: wheel + RAF + lerp ──
  useLayoutEffect(() => {
    // 이전 실행분 정리 (strict mode 재실행 시)
    cancelAnimationFrame(rafIdRef.current);
    if (wheelHandlerRef.current) sectionRef.current?.removeEventListener("wheel", wheelHandlerRef.current);
    if (resizeHandlerRef.current) window.removeEventListener("resize", resizeHandlerRef.current);
    /* 가로가 손을 떼면 Lenis 를 막아 둔 표시도 같이 걷는다 — 모바일로 내려갈 때 남으면 세로 스크롤이 죽는다 */
    sectionRef.current?.removeAttribute(LENIS_PREVENT_WHEEL);

    const section = sectionRef.current;
    const track = trackRef.current;
    /* mobile 만 보면 안 된다. 하이드레이션 첫 패스에서 useMobileLayout 은 서버 값(false)을
       돌려주므로, 모바일에서도 여기가 한 번 데스크톱으로 돈다. 그러면 트랙에 transform 이,
       .animate 요소에 opacity 0 이 인라인으로 박힌 채 남는다(곧 mobile 이 true 로 바뀌어도
       정리 함수는 리스너만 뗀다). 예전에는 BreakpointGuard 가 방문 직후 페이지를 통째로 다시
       만들어 이 흔적을 지웠는데, 그 리마운트를 없애면서 드러났다. layout effect 는 브라우저에서
       돌므로 실제 창 너비를 직접 본다. */
    if (!section || !track || mobile || checkMobileLayout()) {
      if (mobile) {
        lenisScrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
      }
      return;
    }
    if (!ready) return;

    const state = scrollStateRef.current;

    let allPanels = gsap.utils.toArray<HTMLElement>(panelSelector, track);

    if (infinite && allPanels.length < panelSetSize) return;
    if (!infinite && allPanels.length === 0) return;

    // 한 세트 너비 (infinite 모드)
    let oneSetWidth = 0;
    if (infinite) {
      for (let i = 0; i < panelSetSize && i < allPanels.length; i++) {
        oneSetWidth += allPanels[i].offsetWidth;
      }
    }

    // 전체 트랙 너비
    let totalWidth = 0;
    for (let i = 0; i < allPanels.length; i++) {
      totalWidth += allPanels[i].offsetWidth;
    }

    // dynamic import가 DOM 요소를 교체했을 때 allPanels를 재쿼리하는 헬퍼
    const refreshPanelsIfStale = () => {
      if (!allPanels.some((el) => !document.contains(el))) return;
      allPanels = gsap.utils.toArray<HTMLElement>(panelSelector, track);
      if (infinite) {
        oneSetWidth = 0;
        for (let i = 0; i < panelSetSize && i < allPanels.length; i++) {
          oneSetWidth += allPanels[i].offsetWidth;
        }
      } else {
        totalWidth = 0;
        for (const p of allPanels) totalWidth += p.offsetWidth;
      }
    };

    // 초기 위치: infinite → 중간 세트, finite → 0
    const middleSetFirst = infinite ? allPanels[panelSetSize] : null;
    const initialX = middleSetFirst ? -middleSetFirst.offsetLeft : 0;

    // 스크롤 상태 초기화
    state.scrollX = 0;
    state.targetScrollX = 0;
    gsap.set(track, { x: initialX });

    /* .animate 요소 초기화 — 1회만. 장면 전환(cinematic)에서는 내용이 흐름 값(--flow-in/out)을 따라 CSS 로
       움직이므로(AboutPanel.module.css) 쓰지 않는다 — 인라인 opacity·transform 을 박으면 그 규칙을 덮는다 */
    if (!initializedRef.current && !cinematic) {
      initializedRef.current = true;
      allPanels.forEach((panel, i) => {
        const isHero = infinite ? i % panelSetSize === 0 : i === 0;
        if (isHero) return;
        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length > 0) gsap.set(items, { opacity: 0, y: 40 });
      });
    }

    /* 가로 스크롤이 끝에 닿으면 세로 스크롤로 넘긴다.
       예전에는 wheel 을 무조건 preventDefault 해서, 이 섹션 위에서는 페이지가 아예 움직이지
       않았다. 섹션이 100vh 라 화면을 가득 채우므로 아래에 있는 다른 섹션(프로필의 GitHub
       레포지토리 등)에 닿을 방법이 없고, 어쩌다 페이지가 조금 내려간 상태가 되면
       (새로고침 시 브라우저 스크롤 복원 · 키보드 스크롤 · 해시 이동) 패널이 잘린 채로
       빠져나오지도 못했다. */
    const atHorizontalEdge = (deltaY: number) => {
      if (infinite) return false;                  // 무한 모드는 끝이 없다
      const maxScroll = Math.max(0, totalWidth - window.innerWidth);
      if (deltaY > 0) return state.targetScrollX >= maxScroll - 1;
      if (deltaY < 0) return state.targetScrollX <= 1;
      return false;
    };

    /* 섹션이 뷰포트에 딱 맞아 있을 때만 가로로 가로챈다.
       어긋나 있으면(=페이지가 조금 내려가 패널이 잘린 상태) 세로 스크롤을 그대로 흘려보내
       제자리로 되돌릴 수 있게 한다. 여기서 가로챘다가는 잘린 채로 좌우로만 움직인다. */
    const ALIGN_TOLERANCE_PX = 4;

    // wheel 이벤트 핸들러
    const handleWheel = (e: WheelEvent) => {
      const aligned = Math.abs(section.getBoundingClientRect().top) <= ALIGN_TOLERANCE_PX;
      /* 끝에 닿았고 그 방향으로 더 굴리면 막지 않는다 — 브라우저(=Lenis)가 세로로 이어받는다. */
      const take = aligned && !atHorizontalEdge(e.deltaY);

      /* 이 휠을 가로가 가져갈 때는 전역 Lenis 도 같이 물러나게 한다(#1045).
         Lenis 는 defaultPrevented 를 보지 않는다. window 에 붙인 자기 휠 리스너에서 델타를 받아
         scrollTo 로 페이지를 직접 굴리므로, 아래 preventDefault 는 브라우저의 기본 스크롤만 막고
         Lenis 는 그대로 세로로 밀어버린다. 재 보니 휠 한 번에 트랙이 가로로 51px 가는 동안
         페이지도 98px 세로로 밀렸다. 물러나게 하는 수단은 이 표시뿐이다 — Lenis 가 이벤트의
         composedPath 를 훑어 확인하고, 우리 리스너가 window 보다 먼저 돌므로 같은 이벤트에 먹는다.
         넘기기로 한 휠에는 표시를 떼서, 끝에서의 세로 이어받기와 어긋난 상태에서 제자리로
         돌아오는 길을 그대로 남긴다. */
      section.toggleAttribute(LENIS_PREVENT_WHEEL, take);
      if (!take) return;
      e.preventDefault();
      const clamped = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, e.deltaY));
      state.targetScrollX += clamped;

      /* 목표 위치가 지금 위치보다 너무 앞서 가지 않게 늘 같은 폭으로 묶는다(여러 패널 건너뜀 방지).
         예전에는 긴 패널 안에서만 이 제한을 풀었는데, 그러면 긴 패널을 빠르게 넘기는 동안 목표가 멀리
         앞서 갔다가 패널을 벗어나는 순간 제한에 걸려 뒤로 끌려왔다 — 다음 패널로 넘어갈 때의 당김 */
      const cap = window.innerWidth * 1.2;
      state.targetScrollX = gsap.utils.clamp(
        state.scrollX - cap,
        state.scrollX + cap,
        state.targetScrollX,
      );
    };
    /* 장면 전환 도중에 휠을 멈추면 전환을 끝까지 마친다 — 굴리던 방향으로 조금이라도(화면 폭의 4%, 휠 한 칸보다 작다) 진행했으면 그
       방향으로, 아니면 원래 장면으로. 멈춘 자리에 반쯤 걷힌 와이프나 덜 닫힌 원이 남으면 화면이 어정쩡했다.
       한 칸씩 끊어 굴려도 앞으로 나아가도록 방향을 기준으로 한다 */
    let snapTimer = 0;
    let lastDir = 1;
    const COMMIT = 0.04;
    /* 마무리는 따로 트윈으로 몬다 — 따라잡기(lerp)로 마치면 끝이 한없이 느려져 컷이 흐지부지 끝났다.
       지금 속도에서 출발해 도착점에서 멈추는 3차 곡선(Hermite)이라 이어받는 순간 튀지 않는다.
       출발 속도가 3·거리/시간을 넘으면 지나쳤다 돌아오므로 그 안으로 묶는다 */
    let snapTween: gsap.core.Tween | null = null;
    let snapDest = 0;
    const killSnap = () => {
      snapTween?.kill();
      snapTween = null;
    };
    const startSnap = (dest: number) => {
      const vw = window.innerWidth;
      const from = state.scrollX;
      const dist = dest - from;
      // 지금 속도(px/s) — 따라잡기 한 프레임(60fps 기준) 이동량
      let v = (state.targetScrollX - from) * SCROLL_LERP * 60;
      state.targetScrollX = dest;
      killSnap();
      if (Math.abs(dist) < 1) return;
      const duration = gsap.utils.clamp(0.45, 1, 0.4 + (Math.abs(dist) / vw) * 0.5);
      if (Math.sign(v) !== Math.sign(dist)) v = 0;
      v = Math.sign(dist) * Math.min(Math.abs(v) * duration, Math.abs(dist) * 3); // 거리 단위로
      const k = { u: 0 };
      snapDest = dest;
      snapTween = gsap.to(k, {
        u: 1,
        duration,
        ease: "none",
        onUpdate: () => {
          const u = k.u;
          const u2 = u * u;
          const u3 = u2 * u;
          state.scrollX = from + (u3 - 2 * u2 + u) * v + (-2 * u3 + 3 * u2) * dist;
        },
        onComplete: () => { snapTween = null; },
      });
    };
    const snapCut = () => {
      const vw = window.innerWidth;
      const baseX = initialX - state.targetScrollX;
      for (const panel of allPanels) {
        if (panel.offsetWidth < vw * 0.98) continue;
        const left = baseX + panel.offsetLeft;
        if (left > 1 && left < vw - 1) {
          const commitForward = left < vw * (1 - COMMIT);
          const commitBackward = left > vw * COMMIT;
          const desired = lastDir > 0 ? (commitForward ? 0 : vw) : (commitBackward ? vw : 0);
          startSnap(initialX + panel.offsetLeft - desired);
          return;
        }
      }
    };
    const scheduleSnap = (e: WheelEvent) => {
      if (!cinematic) return;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (d !== 0) lastDir = d > 0 ? 1 : -1;
      killSnap();
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snapCut, 180);
    };
    section.addEventListener("wheel", scheduleSnap, { passive: true });
    section.addEventListener("wheel", handleWheel, { passive: false });

    /* 장면 전환 — 화면 폭 이상인 패널은, 들어오는 동안(왼쪽 끝이 화면 안)과 나가는 동안(오른쪽 끝이 화면 안)
       화면에 붙잡아 둔다. 들어오는 패널이 위에서 와이프·아이리스·아래에서 걷히기로 드러나고, 나가는 패널은 아래에서 살짝 작아진다.
       위치는 레이아웃 값(offsetLeft)으로 계산한다 — 여기서 건 transform 이 다시 측정값에 섞이지 않게 */
    const CUT_KINDS = ["wipe", "iris", "rise"] as const;
    // 전환 곡선 — 거리에 정비례하면 기계적이다. 처음과 끝을 눌러 컷이 스르르 열리고 닫히게(sine in-out)
    const easeCut = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;
    const applyCuts = (trackX: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      allPanels.forEach((panel, i) => {
        const w = panel.offsetWidth;
        const left = trackX + panel.offsetLeft;
        const right = left + w;
        const s = panel.style;
        const reset = () => {
          if (!s.transform && !s.clipPath && !s.filter) return;
          s.transform = "";
          s.clipPath = "";
          s.filter = "";
          s.opacity = "";
          s.zIndex = "";
          s.transformOrigin = "";
        };
        if (w < vw * 0.98 || right < -2 || left > vw + 2) {
          reset();
          return;
        }
        if (left > 0 && left < vw) {
          // 들어오는 중 — 0 에 붙잡고, 남은 거리만큼 전환을 덜 진행한 상태
          const t = 1 - easeCut(1 - left / vw);
          /* 패널이 컷을 고를 수 있다(data-cut-kind) — 없으면 차례대로 돌린다 */
          const kind = panel.dataset.cutKind ?? CUT_KINDS[i % CUT_KINDS.length];
          s.zIndex = "3";
          s.filter = "";
          if (kind === "wipe") {
            s.transform = `translateX(${-left}px)`;
            s.clipPath = `inset(0 0 0 ${(t * vw).toFixed(1)}px)`;
            s.opacity = "";
          } else if (kind === "iris") {
            const r = (1 - t) * Math.hypot(vw, vh) * 0.55;
            s.transform = `translateX(${-left}px)`;
            s.clipPath = `circle(${r.toFixed(1)}px at ${vw / 2}px 50%)`;
            s.opacity = "";
          } else if (kind === "slide") {
            // 패널째 아래에서 올라와 덮는다 — 잘라 드러내지 않고 통째로 민다
            s.transform = `translateX(${-left}px) translateY(${(t * vh).toFixed(1)}px)`;
            s.clipPath = "";
            s.opacity = "";
          } else {
            // 아래에서 위로 걷힌다
            s.transform = `translateX(${-left}px)`;
            s.clipPath = `inset(${(t * 100).toFixed(2)}% 0 0 0)`;
            s.opacity = "";
          }
        } else if (right > 0 && right < vw) {
          // 나가는 중 — 오른쪽 끝을 화면 오른쪽에 붙잡고 작아지며 어두워진다
          const shift = vw - right;
          const t = easeCut(shift / vw);
          s.zIndex = "2";
          s.clipPath = "";
          s.opacity = "";
          s.transformOrigin = `${w - vw / 2}px 50%`;
          /* 화면보다 넓은 패널은 작아지지 않는다 — 크기가 바뀌면 안쪽 고정(usePinnedScroll)이 재는 폭이 틀어져
             내용이 밀린다. 위치만 붙잡는다 */
          const scale = w > vw * 1.05 ? 1 : 1 - t * 0.08;
          s.transform = `translateX(${shift}px) scale(${scale.toFixed(4)})`;
          s.filter = `brightness(${(1 - t * 0.15).toFixed(3)})`;
        } else {
          reset();
        }
      });
    };

    // 패널마다 마지막으로 쓴 흐름 값 — 같으면 다시 쓰지 않는다
    const flowCache = new WeakMap<HTMLElement, string>();

    // RAF 애니메이션 루프
    const animate = () => {
      // dynamic import로 교체된 DOM 요소가 있으면 allPanels 재쿼리
      refreshPanelsIfStale();

      // 마무리 트윈 중에는 트윈이 위치를 몬다. 그 사이 목표가 바뀌면(내비 이동 등) 트윈을 버리고 따라잡기로 돌아간다
      if (snapTween && state.targetScrollX !== snapDest) killSnap();
      if (!snapTween) {
        state.scrollX += (state.targetScrollX - state.scrollX) * SCROLL_LERP;
        /* 따라잡기는 끝없이 가까워지기만 해서 0.0004px 같은 틈이 남는다 — 그러면 도착한 패널이 '나가는 중'으로
           잡혀 전환 스타일이 걸린 채 멈춘다. 반 픽셀 안이면 딱 맞춘다 */
        if (Math.abs(state.targetScrollX - state.scrollX) < 0.5) state.scrollX = state.targetScrollX;
      }

      // infinite 래핑 또는 clamp
      if (infinite && oneSetWidth > 0) {
        while (state.scrollX > oneSetWidth * 1.5) {
          state.scrollX -= oneSetWidth;
          state.targetScrollX -= oneSetWidth;
        }
        while (state.scrollX < -oneSetWidth * 0.5) {
          state.scrollX += oneSetWidth;
          state.targetScrollX += oneSetWidth;
        }
      } else {
        const maxScroll = totalWidth - window.innerWidth;
        state.targetScrollX = gsap.utils.clamp(
          0,
          maxScroll,
          state.targetScrollX,
        );
        state.scrollX = gsap.utils.clamp(0, maxScroll, state.scrollX);
      }

      // 트랙 위치 업데이트
      gsap.set(track, { x: initialX - state.scrollX });
      if (cinematic) applyCuts(initialX - state.scrollX);
      /* 트랙을 옮긴 바로 그 프레임에 긴 패널의 안쪽 고정도 맞춘다(usePinnedScroll). 따로 돌면 한 프레임 전
         위치로 맞춰 스크롤이 빠를수록 안쪽 내용이 밀렸다가 따라붙었다(튕김) */
      window.dispatchEvent(new Event(HSCROLL_FRAME_EVENT));

      // 패널 애니메이션 (뷰포트 기반) — off-screen 패널 스킵
      const vw = window.innerWidth;
      /* 흐름 값 — 패널이 오른쪽에서 들어오는 정도(--flow-in, 1 → 0)와 왼쪽으로 나가는 정도(--flow-out, 0 → 1).
         CSS 가 이 값에 제목·큰 요소의 위치와 크기를 묶어, 스크롤을 따라 영상처럼 이어서 움직인다.
         화면보다 넓은 패널은 가운데를 지나는 동안 둘 다 0 이다 */
      /* 장면 전환은 들어오고 나가는 패널을 화면에 붙잡아 두므로 화면상 위치(getBoundingClientRect)로 재면 늘 0 이었다 —
         흐름 규칙이 전환 중에 전혀 움직이지 않았다. 레이아웃 위치(트랙 + offsetLeft)로 잰다 */
      const flowX = initialX - state.scrollX;
      allPanels.forEach((panel) => {
        const rect = cinematic
          ? { left: flowX + panel.offsetLeft, right: flowX + panel.offsetLeft + panel.offsetWidth }
          : panel.getBoundingClientRect();
        if (rect.right < -vw || rect.left > vw * 2) return;
        const flowIn = gsap.utils.clamp(0, 1, rect.left / vw);
        const flowOut = gsap.utils.clamp(0, 1, (vw - rect.right) / vw);
        const key = `${flowIn.toFixed(3)} ${flowOut.toFixed(3)}`;
        if (flowCache.get(panel) === key) return;
        flowCache.set(panel, key);
        panel.style.setProperty("--flow-in", flowIn.toFixed(3));
        panel.style.setProperty("--flow-out", flowOut.toFixed(3));
      });
      if (!cinematic) allPanels.forEach((panel) => {
        const items = panel.querySelectorAll<HTMLElement>(
          `.${styles.animate}`,
        );
        if (items.length === 0) return;

        const rect = panel.getBoundingClientRect();
        // 뷰포트 밖이면 건너뛰기 (여유 마진 vw * 0.3)
        if (rect.right < -vw * 0.3 || rect.left > vw * 1.3) return;
        const entryProgress = gsap.utils.clamp(
          0,
          1,
          (0.8 - rect.left / vw) / 0.3,
        );
        const exitProgress = gsap.utils.clamp(
          0,
          1,
          (0.5 - rect.right / vw) / 0.3,
        );

        const count = items.length;
        const maxStagger = Math.min(0.15, 0.8 / Math.max(count, 1));

        items.forEach((item, idx) => {
          // 진입: 첫 번째 아이템부터 순차 등장
          const eS =
            count > 1 ? (idx / (count - 1)) * maxStagger : 0;
          const itemEntry = gsap.utils.clamp(
            0,
            1,
            (entryProgress - eS) / (1 - maxStagger),
          );
          // 퇴장: 마지막 아이템부터 순차 퇴장
          const xS =
            count > 1
              ? ((count - 1 - idx) / (count - 1)) * maxStagger
              : 0;
          const itemExit = gsap.utils.clamp(
            0,
            1,
            (exitProgress - xS) / (1 - maxStagger),
          );

          const opacity = Math.min(itemEntry, 1 - itemExit);
          const y =
            itemExit > 0
              ? -30 * itemExit
              : 40 * (1 - itemEntry);
          const rotateX =
            itemExit > 0
              ? 8 * itemExit
              : -8 * (1 - itemEntry);

          gsap.set(item, {
            opacity: Math.max(0, opacity),
            y,
            rotateX,
            transformPerspective: 800,
          });
        });
      });

      // 활성 섹션 탐지 — 뷰포트 중앙을 포함하는 패널 우선,
      // 없으면 중앙에 가장 가까운 패널 (extraWide 패널 조기 전환 방지)
      const viewportCenter = vw / 2;
      let closestNavIdx = 0;
      let closestDist = Infinity;
      let navIdx = 0;
      let found = false;

      /* 장면 전환(cinematic)이 붙잡아 둔 패널은 화면상 위치가 레이아웃과 다르다 — 들어오기 직전 패널이
         화면 전체를 덮은 것으로 잡혀 내비가 한 칸 앞을 가리켰다. 트랙 위치와 offsetLeft 로 계산한다 */
      const layoutX = initialX - state.scrollX;
      for (let i = 0; i < allPanels.length; i++) {
        if (breakClass && allPanels[i].classList.contains(breakClass)) continue;
        const left = layoutX + allPanels[i].offsetLeft;
        const rect = { left, right: left + allPanels[i].offsetWidth, width: allPanels[i].offsetWidth };
        const idx = infinite && navSectionCount
          ? navIdx % navSectionCount
          : navIdx;

        // 뷰포트 중앙이 패널 범위 안에 있으면 확정
        if (rect.left <= viewportCenter && rect.right >= viewportCenter) {
          closestNavIdx = idx;
          found = true;
        }

        // 폴백: 중앙에 가장 가까운 패널
        if (!found) {
          const dist = Math.abs(rect.left + rect.width / 2 - viewportCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closestNavIdx = idx;
          }
        }
        navIdx++;
      }

      setActiveSection(closestNavIdx);
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);
    wheelHandlerRef.current = handleWheel;

    // 리사이즈 핸들러
    const handleResize = () => {
      if (infinite) {
        let sw = 0;
        for (let i = 0; i < panelSetSize && i < allPanels.length; i++) {
          sw += allPanels[i].offsetWidth;
        }
        oneSetWidth = sw;
      } else {
        totalWidth = 0;
        for (let i = 0; i < allPanels.length; i++) {
          totalWidth += allPanels[i].offsetWidth;
        }
      }
    };
    resizeHandlerRef.current = handleResize;
    window.addEventListener("resize", handleResize);

    // cleanup: 실제 unmount 시에만 실행. strict mode 재실행 시에는 effect 상단에서 정리.
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      section.removeEventListener("wheel", handleWheel);
      section.removeEventListener("wheel", scheduleSnap);
      window.clearTimeout(snapTimer);
      killSnap();
      section.removeAttribute(LENIS_PREVENT_WHEEL);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    styles,
    panelSelector,
    breakClass,
    mobile,
    infinite,
    panelSetSize,
    navSectionCount,
    lenisScrollTo,
    ready,
    cinematic,
  ]);

  // ── 모바일: IntersectionObserver로 활성 섹션 추적 ──
  useEffect(() => {
    if (!mobile) return;
    const track = trackRef.current;
    if (!track) return;

    // breakPanel 제외하고 네비게이션 인덱스 매핑
    const allPanels = track.querySelectorAll<HTMLElement>(panelSelector);
    const mapped: { el: HTMLElement; navIdx: number }[] = [];
    allPanels.forEach((panel) => {
      if (breakClass && panel.classList.contains(breakClass)) return;
      mapped.push({ el: panel, navIdx: mapped.length });
    });

    // rootMargin "-45% 0px -45% 0px" → 뷰포트 중앙 10% 영역만 감지
    // 패널이 화면 중앙에 왔을 때 섹션 전환
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const match = mapped.find((m) => m.el === entry.target);
            if (match) setActiveSection(match.navIdx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    mapped.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [mobile, panelSelector, breakClass]);

  // ── 모바일: .animate → .animateVisible 클래스 토글 ──
  useEffect(() => {
    if (!mobile || !mobileAnimateVisible) return;
    const track = trackRef.current;
    if (!track) return;

    const animateClass = styles.animate;
    const visibleClass = styles.animateVisible;
    if (!animateClass || !visibleClass) return;

    const targets = track.querySelectorAll<HTMLElement>(`.${animateClass}`);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(visibleClass);
          } else {
            entry.target.classList.remove(visibleClass);
          }
        });
      },
      { threshold: 0.15 },
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      targets.forEach((el) => el.classList.remove(visibleClass));
    };
  }, [mobile, mobileAnimateVisible, styles]);

  return { sectionRef, trackRef, activeSection, goToSection, scrollBy };
}
