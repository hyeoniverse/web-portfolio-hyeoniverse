"use client";

import { useEffect, useSyncExternalStore } from "react";

interface LoadingScreenResult {
  isLoading: boolean;
  isTransitioning: boolean;
  /** 0~1 — 끝난 준비 일의 비율(글꼴 · 문서 · 첫 사진 · 로고 연출 · 페이지가 알린 자리). 줄어들지 않는다 */
  progress: number;
}

/* 로딩 화면을 최소한 이만큼은 보여 준다.
   예전에는 1,200ms 였다. 자원이 빨리 준비돼도 그만큼 내용을 가리고 있었고,
   화면이 눈에 차오르는 속도(Speed Index)가 1.2초 늦어졌다. 연출은 남기되 대기만 줄인다.
   글자 로고(워드마크)는 아래 등장 대기가 별도로 더 붙는다. */
const MIN_DISPLAY_MS = 300;
const TRANSITION_MS = 400;
/* 이 시간이 지나면 준비가 덜 됐어도 걷는다 — 3D 모델이 느린 망에서 끝없이 덮어 두지 않게.
   페이지가 기다릴 자리(ReadyWait)를 두지 않았으면 그 전에 걷힌다 */
const MAX_WAIT_MS = 6000;
/* 워드마크 등장이 끝난 뒤 완성된 상태로 잠깐 머무는 시간(전환 시작 전 한 박자). */
const LOGO_HOLD_MS = 250;
/* 이미지 풀 로고(워드마크)의 등장 길이 — Navigation 의 로딩 연출 프리셋 중 가장 긴 것
   (wipe: 딜레이 0.15 + 0.8초)과 맞춘 값. framer 는 JS 구동이라 getAnimations 로 잴 수 없어
   상수로 기다린다. */
const IMAGE_WORDMARK_INTRO_MS = 800;

/* 로딩 로고(워드마크) 등장 애니메이션이 끝날 때까지 기다린다 — 빠른 로드에서 로고가
   반쯤 그려진 채 shrink+crossfade 로 넘어가 버리지 않게.
   - 글자 로고: 마지막 글자의 rise/sharpen 애니메이션이 끝난 뒤 LOGO_HOLD_MS 만큼 머문다.
   - 이미지 풀 로고([data-loading-wordmark]): img 로드 후 페이드 길이 + LOGO_HOLD_MS 만큼 머문다.
     예전엔 즉시 resolve 라 인트로가 최소 대기(300ms)만에 끝나 워드마크가 보이지도 않았다.
   - 숏만 있는 이미지·배지 로고: 즉시 resolve → 예전 속도 유지.
   애니메이션이 등록되기 전에 재지 않도록 두 프레임 뒤 수집한다. */
function waitForLogoIntro(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve();
    const hold = () => setTimeout(resolve, LOGO_HOLD_MS);
    let tries = 0;
    const collect = () => {
      const letters = document.querySelectorAll("[data-loading-letter]");
      if (letters.length) {
        const anims = Array.from(letters).flatMap((el) => el.getAnimations());
        if (!anims.length) return hold();
        return void Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(hold);
      }
      const wordmark = document.querySelector<HTMLElement>("[data-loading-wordmark]");
      if (!wordmark) {
        /* 모바일 폭은 BreakpointGuard 첫 리마운트로 로고 DOM 이 한두 프레임 비어 있다.
           그 틈에 재면 로고 없는 사이트로 판정돼 인트로가 최소 대기만에 끝난다(워드마크
           안 보임) — 몇 프레임 더 보고 판단한다. 진짜 로고 없는 구성은 이 재시도(~0.3초)가
           MIN_DISPLAY_MS 안이라 체감 지연이 없다. */
        if (tries++ < 20) return void requestAnimationFrame(collect);
        return resolve();
      }
      const img = wordmark.querySelector("img");
      const ready = img && !img.complete
        ? new Promise<void>((r) => {
            img.addEventListener("load", () => r(), { once: true });
            img.addEventListener("error", () => r(), { once: true });
          })
        : Promise.resolve();
      ready.then(() => setTimeout(resolve, IMAGE_WORDMARK_INTRO_MS + LOGO_HOLD_MS));
    };
    requestAnimationFrame(() => requestAnimationFrame(collect));
  });
}

let hasCompletedInitialLoad = false;

export function isInitialLoadComplete(): boolean {
  return hasCompletedInitialLoad;
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

/* ── 덮개 상태 — 페이지에 하나. 여러 곳(덮개 · 내비 · 홈)이 같은 값을 본다 ── */

let snap: LoadingScreenResult = { isLoading: true, isTransitioning: false, progress: 0 };
const SERVER_SNAP: LoadingScreenResult = { isLoading: true, isTransitioning: false, progress: 0 };
const listeners = new Set<() => void>();
const set = (next: Partial<LoadingScreenResult>) => {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/* 진행률 — 일을 셀 때마다 전체가 늘고, 끝날 때마다 끝난 수가 는다. 나중에 자리가 더 나타나 전체가 늘어도 막대가 뒤로 가지 않게 큰 쪽을 남긴다 */
let total = 0;
let done = 0;
/** 아직 안 끝난 기다릴 자리들의 중간 단계 합(0~1 씩) — 3D 는 코드를 받아 부품이 붙으면 반쯤 찬다 */
let partial = 0;
const tick = () => set({ progress: Math.max(snap.progress, total ? Math.min(1, (done + partial) / total) : 0) });
function task<T>(p: Promise<T>): Promise<T> {
  total++;
  tick();
  return p.finally(() => {
    done++;
    tick();
  });
}

/** 페이지가 둔 기다릴 자리([data-ready-wait])가 모두 준비될 때까지. 자리마다 일 하나로 센다. 자리가 준비되지 않은 채 사라지면(부품이 빠졌으면) 끝난 것으로 본다 */
function waitReadyMarks(): Promise<void> {
  return new Promise((resolve) => {
    const seen = new Map<string, boolean>();
    const step = new Map<string, number>();
    const scan = () => {
      const present = new Set<string>();
      for (const el of document.querySelectorAll<HTMLElement>("[data-ready-wait]")) {
        const id = el.dataset.readyWait ?? "";
        present.add(id);
        if (!seen.has(id)) {
          seen.set(id, false);
          total++;
        }
        if (el.hasAttribute("data-ready") && !seen.get(id)) {
          seen.set(id, true);
          done++;
        }
        step.set(id, Math.max(step.get(id) ?? 0, Number(el.dataset.readyStep) || 0));
      }
      partial = 0;
      for (const [id, ready] of seen) if (!ready) partial += step.get(id) ?? 0;
      for (const [id, ready] of seen) {
        if (!ready && !present.has(id)) {
          seen.set(id, true);
          done++;
        }
      }
      tick();
      if ([...seen.values()].every(Boolean)) {
        mo.disconnect();
        resolve();
      }
    };
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-ready", "data-ready-step"] });
    scan();
  });
}

let started = false;
function start() {
  if (started || hasCompletedInitialLoad) return;
  started = true;
  const begin = Date.now();
  let finished = false;
  const complete = () => {
    if (finished) return;
    finished = true;
    hasCompletedInitialLoad = true;
    set({ progress: 1, isTransitioning: true });
    setTimeout(() => set({ isLoading: false, isTransitioning: false }), TRANSITION_MS);
  };

  /* 받는 중인 글꼴 하나하나를 일로 센다 — 하이드레이션 뒤에 남은, 실제로 기다리는 것만(자바스크립트 · 스타일시트는 이 시점이면 이미 다 받았다) */
  const fonts = Array.from(document.fonts ?? [])
    .filter((f) => f.status === "loading")
    .map((f) => task(f.loaded.then(() => {}, () => {})));

  const checks = Promise.all([
    ...fonts,
    task(document.fonts?.ready ?? Promise.resolve()),
    /* 예전에는 window.load(=마지막 자원 하나까지 다 내려옴)를 기다렸다. 화면 아래쪽 사진이나
       3D 자료까지 포함이라, 정작 보여 줄 준비가 끝난 뒤에도 한참을 더 가리고 있었다.
       화면에 그릴 준비가 됐는지를 보는 DOMContentLoaded 로 바꾼다. 첫 화면의 무거운 부분은 페이지가 직접 알린다(waitReadyMarks) */
    task(
      new Promise<void>((resolve) => {
        if (document.readyState !== "loading") return resolve();
        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
      }),
    ),
    ...Array.from(document.querySelectorAll<HTMLImageElement>("img[loading='eager'], img[fetchpriority='high']"))
      .filter((img) => !img.complete)
      .slice(0, 3)
      .map((img) => task(preloadImage(img.src))),
    // 로고 워드마크 등장이 끝날 때까지 (글자 로고에서만 대기, 그 외엔 즉시)
    task(waitForLogoIntro()),
    waitReadyMarks(),
  ]);

  checks.then(() => setTimeout(complete, Math.max(0, MIN_DISPLAY_MS - (Date.now() - begin))));
  // 안전장치: 상한 시간이 지나면 강제 완료
  setTimeout(complete, MAX_WAIT_MS);
}

export function useLoadingScreen(): LoadingScreenResult {
  const state = useSyncExternalStore(subscribe, () => snap, () => SERVER_SNAP);
  useEffect(start, []);
  return state;
}
