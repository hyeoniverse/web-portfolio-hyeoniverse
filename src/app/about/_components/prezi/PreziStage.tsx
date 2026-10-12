"use client";

/* 프레지 무대 — 페이지 전체가 하나의 세계이고, 카메라가 프레임에서 프레임으로 날아다닌다.
   - 휠 · ↓ ↑ ← → · 스페이스 · 스와이프 한 번 = 다음 · 이전 프레임. 프레임 안 내용이 화면보다 길면 먼저 그 안에서 스크롤하고,
     끝에 닿은 뒤 한 번 더 굴리면 넘어간다
   - 장이 바뀌어도 지도로 돌아가지 않고 다음 장으로 바로 날아간다. 지금 장이 아닌 무리는 감춘다(지도에선 별만 보인다)
   - 아래 "별자리 지도" 단추로 지도에 돌아가고, 지도의 별을 눌러 아무 장으로나 날아간다. 페이지 안 #앵커 링크도 그 프레임으로
   - 지금 장의 프레임은 실제 내용을 띄운다(카메라가 물러나도 진짜 패널이 보이게). 무거운 장면(heavy — 3D · 샌드박스 · iframe ·
     실시간 데모)만 지금 프레임 · 앞뒤일 때 띄우고, 그 밖엔 이름만 적은 대역을 둔다. 다른 장은 감춰져 있어 그리지 않는다
   - 프레임 안 스크롤은 창 스크롤처럼 알린다(scroll 이벤트) — 장면들의 스크롤 연출이 그대로 움직인다
   페이지 스크롤(Lenis)은 멈춰 두고, 푸터는 감춘다(마지막 프레임이 끝이다)
   카메라는 세계 상자 하나를 크게 확대하지 않고 프레임마다 자기 자리를 계산해 준다 — 별 자리의 무리는 아주 작아서(배율 0.02 남짓)
   세계를 40배 키우면 변환 값이 수만 px 이 되어 그릴 때 몇 px 씩 밀린다. 프레임별로 계산하면 지금 프레임은 정확히 제자리(배율 1)다 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { inAboutPreview, isAboutPreviewMessage } from "@/lib/about/previewMessages";
import Pressable from "@/components/ui/Pressable";
import { useLenis } from "@/providers/LenisProvider";
import { STAR_PATH, useL } from "../features/shared";
import type { LiveInfo } from "../AboutNext";
import { CLUSTERS } from "./frames";
import Hub from "./Hub";
import { cameraFor, layoutWorld, type Camera } from "./layout";
import { FrameContext, PreziContext, PREZI_PROGRESS_EVENT, preziState, type PreziApi } from "./context";
import styles from "./Prezi.module.css";

/** 휠을 이만큼 모아야 넘어간다(트랙패드 작은 떨림은 무시) */
const WHEEL_STEP = 40;
/** 넘어간 직후 이 시간 동안은 휠을 다시 세지 않는다(관성 스크롤의 꼬리) */
const WHEEL_COOLDOWN = 650;
const SWIPE = 50;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 이 요소에서 위로 올라가며 그 방향으로 더 스크롤할 수 있는 상자가 있는지 */
function canScroll(from: Element | null, stop: Element, dy: number): boolean {
  let el: Element | null = from;
  while (el && el !== stop.parentElement) {
    if (el instanceof HTMLElement) {
      const st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        if (dy < 0 && el.scrollTop > 0) return true;
      }
    }
    if (el === stop) break;
    el = el.parentElement;
  }
  return false;
}

export default function PreziStage({ live }: { live: LiveInfo }) {
  const L = useL();
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const frameEls = useRef<(HTMLDivElement | null)[]>([]);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const camRef = useRef<Camera>({ cx: 0, cy: 0, s: 1 });
  const animRef = useRef(0);
  const flyingRef = useRef(false);
  const { lenis } = useLenis();

  /* 화면 크기 */
  useLayoutEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  /* 허브 소개 글의 아래 끝(px) — 좁은 세로 화면은 지도를 그 아래에 놓는다 */
  const [introBottom, setIntroBottom] = useState(0);
  const layout = useMemo(() => layoutWorld(CLUSTERS, vp.w, vp.h, introBottom), [vp, introBottom]);
  const frames = layout.frames;
  const order = layout.order;
  const scenes = useMemo(() => CLUSTERS.flatMap((c) => c.scenes.map((s) => ({ ...s, cluster: c.id }))), []);

  /* 페이지 스크롤을 멈추고 문서 높이를 화면 하나로 */
  useEffect(() => {
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      lenis?.start();
      html.style.overflow = prev;
      preziState.p = null;
    };
  }, [lenis]);

  const apply = useCallback(
    (c: Camera) => {
      camRef.current = c;
      for (const f of frames) {
        const el = frameEls.current[f.i];
        if (!el) continue;
        const x = vp.w / 2 + (f.x - c.cx) * c.s;
        const y = vp.h / 2 + (f.y - c.cy) * c.s;
        el.style.transform = `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px) scale(${(f.s * c.s).toFixed(6)})`;
      }
    },
    [frames, vp],
  );

  const progress = useCallback(
    (p: number) => {
      preziState.p = p;
      window.dispatchEvent(new CustomEvent(PREZI_PROGRESS_EVENT, { detail: p }));
    },
    [],
  );

  /* 카메라 날기 — 거리가 멀면 중간에 물러났다 들어간다(로그 배율을 2차 곡선으로) */
  const fly = useCallback(
    (to: Camera, fromP: number, toP: number) => {
      cancelAnimationFrame(animRef.current);
      const from = { ...camRef.current };
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        apply(to);
        progress(toP);
        window.dispatchEvent(new Event("scroll"));
        return;
      }
      const dist = Math.hypot(to.cx - from.cx, to.cy - from.cy);
      const z0 = Math.log(from.s), z1 = Math.log(to.s);
      const span = dist * Math.min(from.s, to.s) / vp.w;
      const dip = span > 0.6 ? Math.log(1 + span * 0.55) : 0;
      const zc = 2 * (Math.min(z0, z1) - dip) - (z0 + z1) / 2;
      /* 확대 · 축소가 클수록 조금 더 천천히 */
      const dur = 700 + Math.min(700, Math.abs(z1 - z0) * 150) + Math.min(900, dip * 520);
      /* 크게 확대 · 축소할 때는 위치를 보이는 넓이(1/배율) 기준으로 옮긴다 — 아니면 목표가 화면 밖으로 미끄러졌다 돌아온다 */
      const u0 = 1 / from.s, u1 = 1 / to.s;
      const byZoom = dip === 0 && Math.abs(z1 - z0) > 0.5 && Math.abs(u1 - u0) > 1e-9;
      const t0 = performance.now();
      flyingRef.current = true;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = easeInOut(t);
        const z = (1 - e) * (1 - e) * z0 + 2 * (1 - e) * e * zc + e * e * z1;
        const sNow = Math.exp(z);
        const w = byZoom ? (1 / sNow - u0) / (u1 - u0) : e;
        apply({ cx: from.cx + (to.cx - from.cx) * w, cy: from.cy + (to.cy - from.cy) * w, s: sNow });
        progress(fromP + (toP - fromP) * e);
        if (t < 1) animRef.current = requestAnimationFrame(step);
        else {
          flyingRef.current = false;
          window.dispatchEvent(new Event("scroll"));
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [apply, progress, vp.w],
  );

  /* index = 차례(order) 안의 자리 */
  const pOf = useCallback((i: number) => (order.length > 1 ? i / (order.length - 1) : 0), [order.length]);

  /* 프레임 안 단계 */
  const [step, setStepState] = useState(0);
  const stepRef = useRef(0);
  const stepsRef = useRef(1);
  const setStep = useCallback((i: number) => {
    const n = Math.max(0, Math.min(stepsRef.current - 1, i));
    stepRef.current = n;
    setStepState(n);
  }, []);
  const setSteps = useCallback((n: number) => {
    stepsRef.current = Math.max(1, n);
  }, []);

  /* 장면이 먼저 받는 걸음(엔딩 크레딧이 휠로 빨리 감기 등) */
  const interceptRef = useRef<((dir: 1 | -1) => boolean) | null>(null);
  const setIntercept = useCallback((fn: ((dir: 1 | -1) => boolean) | null) => {
    interceptRef.current = fn;
  }, []);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(order.length - 1, i));
      if (n === indexRef.current) return;
      interceptRef.current = null;
      const prevP = pOf(indexRef.current);
      /* 새 프레임은 늘 단계 0 부터 — 거꾸로 돌아와도 그 프레임의 첫 항목에서 다시 시작한다(한 번 더 거꾸로 가면 앞 프레임으로) */
      stepsRef.current = 1;
      stepRef.current = 0;
      setStepState(0);
      indexRef.current = n;
      setIndex(n);
      fly(cameraFor(frames[order[n]], vp.w, vp.h), prevP, pOf(n));
    },
    [fly, frames, order, pOf, vp],
  );

  /** 프레임으로 — 차례에서 그 프레임의 첫 자리 */
  const goFrame = useCallback((fi: number) => go(order.indexOf(fi)), [go, order]);

  /* 처음 · 크기가 바뀌면 지금 프레임에 바로 맞춘다 */
  useLayoutEffect(() => {
    const f = frames[order[indexRef.current]];
    if (f) apply(cameraFor(f, vp.w, vp.h));
    progress(pOf(indexRef.current));
  }, [apply, frames, order, pOf, progress, vp]);

  const goTo = useCallback(
    (target: string) => {
      const cluster = CLUSTERS.find((c) => c.anchor === target);
      const id = cluster ? (cluster.head ? `${cluster.id}-head` : cluster.scenes[0].id) : target.replace(/^#/, "");
      const f = frames.find((x) => x.id === id);
      if (f) goFrame(f.i);
    },
    [frames, goFrame],
  );

  /** 한 걸음 — 장면이 받으면 장면, 프레임 안 단계가 남았으면 단계, 아니면 프레임. 마지막 프레임 끝에서 한 번 더면 처음 지도로 */
  const advance = useCallback(
    (dir: 1 | -1) => {
      if (interceptRef.current?.(dir)) return;
      const s = Math.max(0, stepRef.current);
      if (dir > 0 && s < stepsRef.current - 1) return setStep(s + 1);
      if (dir < 0 && s > 0) return setStep(s - 1);
      if (dir > 0 && indexRef.current === order.length - 1) return go(0);
      go(indexRef.current + dir);
    },
    [go, order.length, setStep],
  );

  /* 편집기 미리보기 — 고치는 장으로 카메라를 옮긴다 */
  useEffect(() => {
    if (!inAboutPreview()) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || !isAboutPreviewMessage(e)) return;
      if (e.data.type === "about-preview:goto") goTo(e.data.anchor);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [goTo]);

  const api = useMemo<PreziApi>(() => ({ goTo, next: () => advance(1), prev: () => advance(-1) }), [advance, goTo]);

  /* 지금 프레임의 스크롤 상자 */
  const scrollBox = useCallback(
    () => stageRef.current?.querySelector<HTMLElement>(`[data-frame="${order[indexRef.current]}"] [data-frame-scroll]`) ?? null,
    [order],
  );

  /* 휠 · 키 · 스와이프 */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let acc = 0;
    let lastStep = 0;
    const wheel = (e: WheelEvent) => {
      /* 확대(핀치 · 수식키 + 휠)는 장면이 쓴다 — 장면이 이미 가져간 휠(defaultPrevented)도 넘기지 않는다 */
      if (e.ctrlKey || e.defaultPrevented) return;
      const box = scrollBox();
      const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (box && canScroll(e.target as Element, box, dy)) {
        acc = 0;
        return; // 안에서 스크롤
      }
      e.preventDefault();
      if (flyingRef.current) return;
      const now = performance.now();
      if (now - lastStep < WHEEL_COOLDOWN) return;
      acc += dy;
      if (Math.abs(acc) >= WHEEL_STEP) {
        advance(acc > 0 ? 1 : -1);
        acc = 0;
        lastStep = now;
      }
    };
    let ty = 0, tx = 0, edgeDown = false, edgeUp = false;
    const touchStart = (e: TouchEvent) => {
      ty = e.touches[0].clientY;
      tx = e.touches[0].clientX;
      const box = scrollBox();
      edgeDown = !box || !canScroll(e.target as Element, box, 1);
      edgeUp = !box || !canScroll(e.target as Element, box, -1);
    };
    const touchEnd = (e: TouchEvent) => {
      const dy = ty - e.changedTouches[0].clientY;
      const dx = tx - e.changedTouches[0].clientX;
      if (flyingRef.current || Math.abs(dy) < SWIPE || Math.abs(dx) > Math.abs(dy)) return;
      if (dy > 0 && edgeDown) advance(1);
      if (dy < 0 && edgeUp) advance(-1);
    };
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable='true'], [role='slider']")) return;
      const box = scrollBox();
      const down = ["ArrowDown", "PageDown", " ", "ArrowRight"].includes(e.key);
      const up = ["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key);
      if (!down && !up) return;
      /* 세로 키는 프레임 안을 먼저 스크롤 */
      if ((e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") && box && canScroll(box, box, 1)) return;
      if ((e.key === "ArrowUp" || e.key === "PageUp") && box && canScroll(box, box, -1)) return;
      if (t.closest("[role='tablist']") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      e.preventDefault();
      if (!flyingRef.current) advance(down ? 1 : -1);
    };
    /* 페이지 안 #앵커 링크 → 그 프레임으로 */
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href^='#']");
      if (!a) return;
      e.preventDefault();
      goTo(a.getAttribute("href")!);
    };
    stage.addEventListener("wheel", wheel, { passive: false });
    stage.addEventListener("touchstart", touchStart, { passive: true });
    stage.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("keydown", key);
    stage.addEventListener("click", click);
    return () => {
      stage.removeEventListener("wheel", wheel);
      stage.removeEventListener("touchstart", touchStart);
      stage.removeEventListener("touchend", touchEnd);
      window.removeEventListener("keydown", key);
      stage.removeEventListener("click", click);
    };
  }, [advance, goTo, scrollBox]);

  /* 지금 프레임으로 들어오면 그 안 스크롤은 맨 위부터 */
  useEffect(() => {
    const box = scrollBox();
    if (box) box.scrollTop = 0;
  }, [index, scrollBox]);

  const frameApi = useMemo(() => ({ current: true, step: Math.max(0, step), setSteps, setStep, setIntercept }), [step, setSteps, setStep, setIntercept]);
  const idleFrame = useMemo(() => ({ current: false, step: 0, setSteps: () => {}, setStep: () => {}, setIntercept: () => {} }), []);
  const current = frames[order[index]];
  /* 지금 장이 아닌 무리 — 감춘다. 지도(허브)에선 모든 무리가 숨어 별만 보인다 */
  const away = (f: { cluster: string }) => f.cluster !== current?.cluster || undefined;
  /* 실제 내용을 띄우는 프레임 — 지금 · 차례의 앞뒤 하나 */
  const near = new Set([order[index - 1], order[index], order[index + 1]]);

  return (
    <PreziContext.Provider value={api}>
      <div ref={stageRef} className={styles.stage} data-prezi>
        <div ref={worldRef} className={styles.world}>
          {frames.map((f) => {
            const live_ = near.has(f.i);
            const isCurrent = f.i === order[index];
            if (f.kind === "hub") {
              return (
                <div
                  key={f.id}
                  ref={(el) => { frameEls.current[f.i] = el; }}
                  className={styles.hubFrame}
                  data-frame={f.i}
                  data-current={isCurrent || undefined}
                  style={{ width: vp.w, height: vp.h }}
                  onClickCapture={(e) => {
                    if (!isCurrent && !(e.target as Element).closest("a")) {
                      e.preventDefault();
                      e.stopPropagation();
                      goFrame(0);
                    }
                  }}
                >
                  <Hub live={live} map={layout.map} onIntro={setIntroBottom} />
                </div>
              );
            }
            if (f.kind === "head") {
              const c = CLUSTERS.find((x) => x.id === f.cluster)!;
              return (
                <div
                  key={f.id}
                  ref={(el) => { frameEls.current[f.i] = el; }}
                  className={styles.head}
                  data-frame={f.i}
                  data-current={isCurrent || undefined}
                  data-away={away(f)}
                  style={{ width: vp.w, height: vp.h }}
                  onClick={() => !isCurrent && goFrame(f.i)}
                >
                  <div className={styles.headBand} style={{ height: `${(f.headBand ?? 0.3) * 100}%` }}>
                    {c.head!.render()}
                  </div>
                </div>
              );
            }
            const sc = scenes.find((s) => s.id === f.id)!;
            return (
              <div
                key={f.id}
                ref={(el) => { frameEls.current[f.i] = el; }}
                className={styles.frame}
                data-frame={f.i}
                data-current={isCurrent || undefined}
                data-away={away(f)}
                style={{ width: vp.w, height: vp.h }}
                onClickCapture={(e) => {
                  if (!isCurrent) {
                    e.preventDefault();
                    e.stopPropagation();
                    goFrame(f.i);
                  }
                }}
              >
                <FrameContext.Provider value={isCurrent ? frameApi : idleFrame}>
                  <div
                    className={styles.frameScroll}
                    data-frame-scroll
                    data-pad={!sc.ownPad || undefined}
                    data-lenis-prevent
                    onScroll={() => window.dispatchEvent(new Event("scroll"))}
                  >
                    {live_ || (f.cluster === current?.cluster && !sc.heavy) ? (
                      sc.render()
                    ) : f.cluster === current?.cluster ? (
                      /* 무거운 장면의 대역 — 멀리서 보일 때 이름만 */
                      <div className={styles.poster} aria-hidden>
                        <span className={styles.posterStar}>✦</span>
                        {L(sc.label)}
                      </div>
                    ) : null}
                  </div>
                </FrameContext.Provider>
              </div>
            );
          })}
        </div>

        {/* 아래 — 이전 패널 · 별자리 지도 · 다음 패널. 패널 단추는 단계를 건너뛰고 프레임째 옮긴다(마지막 다음은 지도). 지도에 있을 땐 감춘다 */}
        <nav className={styles.dock} data-hidden={order[index] === 0 || undefined} aria-label={L({ ko: "패널 이동", en: "Panels" })}>
          <Pressable
            className={styles.dockArrow}
            tabIndex={order[index] === 0 ? -1 : undefined}
            onClick={() => go(index - 1)}
            aria-label={L({ ko: "이전 패널", en: "Previous panel" })}
            title={L({ ko: "이전 패널", en: "Previous panel" })}
          >
            <svg className={styles.dockStar} viewBox="0 0 100 100" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
            <span className={styles.dockTrail} aria-hidden="true" />
          </Pressable>
          <Pressable className={styles.dockBtn} tabIndex={order[index] === 0 ? -1 : undefined} onClick={() => goFrame(0)}>
            <span aria-hidden>✦</span> {L({ ko: "별자리 지도", en: "Star map" })}
          </Pressable>
          <Pressable
            className={styles.dockArrow}
            tabIndex={order[index] === 0 ? -1 : undefined}
            onClick={() => (index === order.length - 1 ? go(0) : go(index + 1))}
            aria-label={L({ ko: "다음 패널", en: "Next panel" })}
            title={L({ ko: "다음 패널", en: "Next panel" })}
          >
            <span className={styles.dockTrail} aria-hidden="true" />
            <svg className={styles.dockStar} viewBox="0 0 100 100" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          </Pressable>
        </nav>
      </div>
    </PreziContext.Provider>
  );
}
