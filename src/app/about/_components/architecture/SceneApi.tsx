"use client";

/* API — 프레지처럼. 프레임 전체가 하나의 큰 별 지도(캔버스)이고, 카메라가 그 위를 날아다닌다.
   · 가운데 /api 태양에서 묶음마다 빛줄기가 뻗고, 엔드포인트 하나가 별 하나
   · 바깥 궤도에 요청이 지나가는 정거장 8개(브라우저 → 프록시 → 로그인 → 검사 → AI → DB → 알림 · 캐시 → 응답)
   단계(휠 · 키 한 번): 0 = 전체 보기, 1… = 대표 요청 하나씩. 요청 단계에 들어오면 먼저 그 요청이 속한 빛줄기로 확대하고,
   요청 빛이 궤도를 따라 돌며 카메라가 정거장을 하나씩 따라간다(저절로, 점을 누르면 그 정거장으로).
   설명은 카드 없이 화면 왼쪽 아래 글자로만(하는 일 · 막힐 때의 응답 · 파일). 클릭: 빛줄기 → 그 묶음의 엔드포인트,
   정거장 → 그 단계, 칩 → 그 요청, 전체 보기 · 확대/축소 · 재생/멈춤. 단계 · 실패 코드는 코드에서 확인했다(_data/architecture)
   묶음 · 엔드포인트 · 접근 등급 · 테이블 · 외부 서비스는 라우트 파일에서 구운 지도(data/generated/apiMap, npm run gen-api-map)가
   원본이다. 관리자 설정(DB)의 backend 는 읽지 않는다 — 패널이 코드와 어긋나지 않게. 손으로 쓴 설명(data/about/backend)은
   이름이 맞는 묶음에만 붙인다 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import Pressable from "@/components/ui/Pressable";
import { Pause, Play, ZoomIn, ZoomOut } from "@/components/icons";
import { backendItems } from "@/data/about/backend";
import { apiMap } from "@/data/generated/apiMap";
import { ACCESS_LEVELS, type ApiAccess, type ApiGroup } from "@/lib/about/apiMap";
import { apiScene, journeyLayers, journeyScene, type Journey } from "../../_data/architecture";
import { groupJourneys } from "../../_data/groupJourneys";
import { k as l10n } from "../prezi/types";
import type { L10n } from "../../_data/showcase";
import { STAR_PATH, useL } from "../features/shared";
import { useFrame, useFrameSteps } from "../prezi/context";
import fx from "../features/Features.module.css";
import styles from "./Architecture.module.css";

/** 좌표는 소수 둘째 자리까지 — 서버와 브라우저의 삼각함수가 마지막 자리에서 달라 하이드레이션이 어긋난다 */

/** 조작 안내 — 확대 · 축소 단추 없이 Ctrl + 휠 · 두 손가락 */
const HINT = l10n("끌어서 이동 · 돋보기 단추나 ⌘(Ctrl) + 휠로 확대 · 축소합니다.", "Drag to pan · zoom with the magnifier buttons or ⌘ (Ctrl) + wheel.");
const r2 = (v: number) => Math.round(v * 100) / 100;
const methodKind = (m: string) => (m === "GET" ? "read" : m === "DELETE" ? "delete" : "write");

/* ── 캔버스 좌표(가운데 /api 가 원점) ── */
const R0 = 90;
const ORBIT = 800;
/** 별 사이 — 가장 긴 빛줄기도 궤도 안쪽(정거장 이름표 앞)에서 끝나게 줄인다 */
const GAP = Math.min(19, (ORBIT - R0 - 160) / Math.max(1, ...apiMap.groups.map((g) => g.endpoints.length)));
/** 엔드포인트 별 크기 — 지그재그라 이웃 별과 겹치지 않는 선(간격의 1.4배)까지 키운다 */
const DOT = Math.min(24, GAP * 1.4);

/** 묶음 이름 → 손으로 쓴 설명이 있는 backend.ts 의 이름. 여기 없는 묶음은 설명 없이 구조만 */
const DESCRIBED: Record<string, string> = {
  posts: "Posts API",
  works: "Works API",
  comments: "Comments API",
  "work-comments": "Work Comments API",
  series: "Series API",
  calendars: "Calendars API",
  revisions: "Revisions API",
  cover: "Cover Image API",
};
type Group = ApiGroup & { count: number; description?: L10n };
const GROUPS: Group[] = apiMap.groups.map((g) => {
  const b = DESCRIBED[g.key] && backendItems.find((x) => x.name === DESCRIBED[g.key]);
  return { ...g, count: g.endpoints.length, ...(b ? { description: b.description } : {}) };
});
/** 화면에 쓰는 경로 — 앞의 /api 는 가운데 별이 이미 말한다 */
const shortPath = (p: string) => p.replace(/^\/api(?=\/)/, "");
/** 정거장은 궤도 오른쪽 절반에 위에서 아래로 */
const stationAngle = (i: number) => (-62 + (i * 124) / (journeyLayers.length - 1)) * (Math.PI / 180);
const stationXY = (i: number) => ({ x: r2(Math.cos(stationAngle(i)) * ORBIT), y: r2(Math.sin(stationAngle(i)) * ORBIT) });
const layerIndex = (k: string) => journeyLayers.findIndex((l) => l.key === k);

/** 정거장 하나에 머무는 시간(ms) — 요청 단계 안에서 저절로 다음 정거장으로 */
const STATION_MS = 3800;
/** 확대 휠 · 핀치가 끝난 뒤 이 시간 동안 오는 휠(관성)은 프레지에 넘기지 않는다(ms) */
const ZOOM_TAIL_MS = 600;
/** 마지막 정거장에 닿은 직후 이 시간 동안의 걸음은 삼킨다(ms) */
const FAST_GRACE_MS = 700;
/** 조작 안내 — 휠은 프레지 넘기기라 확대는 Ctrl + 휠 · 두 손가락 · 단추로 */

type Box = { x: number; y: number; w: number; h: number };

export default function SceneApi() {
  const L = useL();
  const groups = GROUPS;
  const n = groups.length;
  const total = apiMap.total;
  const groupName = (g: Group) => (g.key === "etc" ? L(apiScene.etcGroup) : g.key === "admin" && g.folded ? L(apiScene.adminEtcGroup) : g.key);
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const rayEnd = (i: number) => R0 + (groups[i]?.count ?? 0) * GAP;
  /** 빛줄기 i 의 j 번째 엔드포인트 별 자리 — 지도에 그리는 자리와 같다(양옆 지그재그) */
  const epXY = (i: number, j: number) => {
    const a = angle(i), cos = Math.cos(a), sin = Math.sin(a);
    const r = R0 + (j + 1) * GAP, side = (j % 2 ? 1 : -1) * GAP * 0.55;
    return { x: r2(cos * r - sin * side), y: r2(sin * r + cos * side) };
  };

  /* 프레임 단계 — 0 전체 보기, 1…n 묶음 하나씩. 묶음 단계는 먼저 엔드포인트 목록을 보여 주고, 넘기면 그 묶음의
     대표 요청(groupJourneys)이 바깥 궤도의 정거장을 차례로 지난다. 끝(응답)에 닿은 뒤 넘기면 다음 묶음 */
  const G = n;
  const { step, setStep, current: live } = useFrameSteps(1 + G);
  const groupStep = step >= 1 && step <= G ? step - 1 : null;
  /* 지금 묶음의 대표 요청 — 전체 보기 단계에서는 첫 묶음의 것(정거장을 누르면 그 묶음으로 들어간다) */
  const journeyGroup = groupStep ?? 0;
  const journey: Journey | undefined = groupJourneys[groups[journeyGroup].key];
  /* 아래 상태는 모두 "어느 단계에서 생긴 것인지"(at)를 함께 쥔다 — 단계가 바뀌면 저절로 처음 모습으로 돌아간다 */
  /* 요청 안의 정거장 — -1 이면 아직 빛줄기(요청이 속한 묶음)를 보는 중 */
  const [walk, setWalk] = useState({ at: -1, si: -1 });
  const si = walk.at === step ? walk.si : -1;
  /* 둘러보기 — 빛줄기를 누른 묶음. 전체 보기 단계에서는 늘 전체(-1) */
  const [picked, setPicked] = useState<{ at: number; ray: number } | null>(null);
  const explore: number | null = picked?.at === step ? picked.ray : step === 0 ? -1 : si < 0 ? groupStep : null;
  /* 직접 조작한 카메라 — 있으면 이야기 흐름 대신 이 자리. 재생 · 빛줄기 · 정거장 · 전체 보기를 누르면 비운다 */
  const [freeCam, setFreeCam] = useState<{ at: number; x: number; y: number; k: number } | null>(null);
  const free = freeCam?.at === step ? freeCam : null;
  const setFree = (v: { x: number; y: number; k: number } | null) => setFreeCam(v && { at: step, ...v });
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  /* 둘러보는 묶음의 목록에서 마우스가 올라간 줄 — 지도의 그 별에 고리 */
  const [hotEp, setHotEp] = useState<string | null>(null);
  /* 정거장 걸음 — 요청 단계에 머무는 동안 STATION_MS 마다 다음 정거장, 끝(응답)에 닿으면 멈춘다.
     끝에 닿기 전의 휠 · 키 · 스와이프 한 번은 다음 요청으로 넘기지 않고 다음 정거장으로 바로 한 칸 간다(기다리지 않을 뿐, 한 칸씩 읽힌다) */
  /* 정거장에 들어선 뒤(si ≥ 0)부터 저절로 걷는다 — 목록 단계에서는 머문다 */
  const walking = live && si >= 0 && !paused && explore === null && !free;
  const last = (journey?.steps.length ?? 0) - 1;
  useEffect(() => {
    if (!walking || si >= last) return;
    const t = window.setTimeout(() => setWalk({ at: step, si: si + 1 }), STATION_MS);
    return () => window.clearTimeout(t);
  }, [walking, si, step, last]);
  const { setIntercept } = useFrame();
  const walkRef = useRef({ step, si, last, doneAt: 0 });
  useEffect(() => {
    const w = walkRef.current;
    if (si >= last && (w.si !== si || w.step !== step)) w.doneAt = performance.now();
    w.step = step;
    w.si = si;
    w.last = last;
  }, [step, si, last]);
  useEffect(() => {
    if (!live) return;
    setIntercept((dir) => {
      const w = walkRef.current;
      if (dir < 0 || w.step < 1 || w.last < 0) return false;
      /* 끝에 닿은 직후의 걸음은 삼킨다 — 넘겨 온 휠의 관성 꼬리가 다음 요청까지 넘기지 않게 */
      if (w.si >= w.last) return performance.now() - w.doneAt < FAST_GRACE_MS;
      setWalk({ at: w.step, si: w.si + 1 });
      setPaused(false);
      setPicked(null);
      setFreeCam(null);
      return true;
    });
    return () => setIntercept(null);
  }, [live, setIntercept, G]);
  const stepNow = journey && si >= 0 ? journey.steps[si] : null;
  /* 요청이 속한 빛줄기 — 지금 묶음 */
  const journeyRay = journeyGroup;
  const journeyEp = journey ? groups[journeyRay].endpoints.findIndex((e) => e.path === journey.path && e.method === journey.method) : -1;
  const focusRay = explore !== null ? explore : journeyRay;
  const here = stepNow ? layerIndex(stepNow.layer) : -1;

  /* 화면 크기 — 카메라 계산용(처음엔 데스크톱 크기로 그려 서버와 같게) */
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1440, h: 860 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = size.w < 768;

  /* 카메라가 볼 상자 */
  const rayBox = (i: number): Box => {
    const a = angle(i);
    const end = rayEnd(i) + 60;
    const xs = [Math.cos(a) * 40, Math.cos(a) * end];
    const ys = [Math.sin(a) * 40, Math.sin(a) * end];
    const x0 = Math.min(...xs) - 200, x1 = Math.max(...xs) + 200;
    const y0 = Math.min(...ys) - 140, y1 = Math.max(...ys) + 140;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const stationBox = (i: number): Box => {
    const p = stationXY(i);
    return { x: p.x - 330, y: p.y - 230, w: 560, h: 460 };
  };
  const ALL: Box = { x: -820, y: -900, w: 1900, h: 1800 };
  const box: Box =
    explore === -1 ? ALL : explore !== null ? rayBox(explore) : stepNow ? stationBox(here) : rayBox(journeyRay);
  /* 글이 화면 왼쪽 아래에 있으니 초점은 오른쪽 위로 비켜 둔다(좁은 화면은 위쪽) */
  /* 전체 보기 — 글(왼쪽 아래)을 비켜 오른쪽에. 묶음 — 오른쪽 아래에 엔드포인트 목록이 서니 그 위 오른쪽 띠에 */
  const view = explore === -1 ? "all" : explore !== null ? "group" : "story";
  const fxRatio = narrow ? 0.5 : view === "all" ? 0.66 : view === "group" ? 0.72 : 0.62;
  const fyRatio = narrow ? (view === "all" ? 0.42 : 0.36) : view === "all" ? 0.56 : view === "group" ? 0.3 : 0.46;
  const availW = narrow ? size.w : view === "all" ? size.w * 0.6 : view === "group" ? size.w * 0.42 : size.w * 0.7;
  const availH = narrow ? size.h * (view === "all" ? 0.5 : 0.6) : view === "all" ? size.h * 0.86 : view === "group" ? size.h * 0.34 : size.h * 0.86;
  /* 빛줄기는 너무 가까이 가지 않는다 — 짧은 묶음은 상자가 작아 이름표가 화면을 덮었다 */
  const rayView = explore !== -1 && (explore !== null || !stepNow);
  const k = Math.min(availW / box.w, availH / box.h, rayView ? 0.8 : Infinity);
  const tx = size.w * fxRatio - k * (box.x + box.w / 2);
  const ty = size.h * fyRatio - k * (box.y + box.h / 2);
  const cam = free ?? { x: tx, y: ty, k };
  const toCss = (v: { x: number; y: number; k: number }) =>
    `translate(${r2(v.x)}px, ${r2(v.y)}px) scale(${r2(v.k * 1000) / 1000})`;

  /* ── 카메라 비행 — 목표가 바뀌면 지금 자리에서 날아간다. 먼 곳이면 잠깐 줌아웃했다가 다시 줌인(프레지처럼).
     끌기 · 휠로 바뀐 목표는 손을 바로 따라간다(instantRef). 렌더 없이 그룹의 transform 만 매 프레임 고친다 ── */
  const camGRef = useRef<SVGGElement>(null);
  const viewRef = useRef(cam);
  const instantRef = useRef(false);
  /* 첫 그림 — 칠하기 전에 자리를 잡아 둔다(안 그러면 한 프레임 원점에 그려진다) */
  useLayoutEffect(() => {
    if (camGRef.current) camGRef.current.style.transform = toCss(viewRef.current);
  }, []);
  useEffect(() => {
    const g = camGRef.current;
    if (!g) return;
    const apply = (v: { x: number; y: number; k: number }) => {
      viewRef.current = v;
      g.style.transform = toCss(v);
    };
    const to = cam;
    if (instantRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      instantRef.current = false;
      apply(to);
      return;
    }
    const from = viewRef.current;
    const W = size.w, H = size.h;
    /* 화면 가운데에 놓인 캔버스 점으로 옮겨 다닌다 */
    const c0 = { x: (W / 2 - from.x) / from.k, y: (H / 2 - from.y) / from.k };
    const c1 = { x: (W / 2 - to.x) / to.k, y: (H / 2 - to.y) / to.k };
    const travel = (Math.hypot(c1.x - c0.x, c1.y - c0.y) * Math.min(from.k, to.k)) / W; // 화면 폭 몇 개만큼
    if (travel < 0.002 && Math.abs(to.k - from.k) < 0.001) { apply(to); return; }
    const dip = Math.min(0.55, travel * 0.45); // 멀수록 더 멀리 물러났다가
    const dur = 1200 + Math.min(900, travel * 650);
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const lk0 = Math.log(from.k), lk1 = Math.log(to.k);
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = ease(t);
      const kk = Math.exp(lk0 + (lk1 - lk0) * e) * (1 - dip * Math.sin(Math.PI * t));
      const cx = c0.x + (c1.x - c0.x) * e, cy = c0.y + (c1.y - c0.y) * e;
      apply({ x: W / 2 - cx * kk, y: H / 2 - cy * kk, k: kk });
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 목표 값이 바뀔 때만 난다
  }, [cam.x, cam.y, cam.k, size.w, size.h]);

  /* ── 직접 조작: 휠(조작 모드 또는 Ctrl/핀치) · 끌기 · 두 손가락 ── */
  const dragRef = useRef<{ x: number; y: number; moved: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<number | null>(null);
  const zoomAt = (mx: number, my: number, factor: number, instant = true) => {
    const c = viewRef.current;
    const nk = Math.min(4, Math.max(0.18, c.k * factor));
    const f = nk / c.k;
    const next = { x: mx - (mx - c.x) * f, y: my - (my - c.y) * f, k: nk };
    instantRef.current = instant;
    /* 바로 따라가는 확대(휠 · 핀치)는 이벤트가 한 프레임에 여럿 온다 — 화면에 반영되기 전이라도 다음 이벤트가 이 값에서
       이어 계산하게 기준을 바로 옮긴다(아니면 앞선 확대가 덮어써져 핀치가 거의 먹지 않았다) */
    if (instant) viewRef.current = next;
    setFree(next);
  };
  /* 휠은 프레지 넘기기 — 확대는 수식키 + 휠만 지도가 가져간다. Ctrl 은 트랙패드 핀치도 함께 오지만, macOS 는 기본 설정에서
     Ctrl + 휠을 화면 확대(손쉬운 사용)로 먼저 가져가 페이지까지 오지 않는다 — ⌘ · Alt + 휠도 받는다.
     한 번에 바뀌는 배율은 묶어 둔다(마우스 휠 한 칸이 deltaY 100 남짓이라 그대로 쓰면 한 번에 끝까지 튀었다) */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    /* 확대 직후의 휠은 삼킨다 — 트랙패드 · 매직마우스는 손을 뗀 뒤에도 관성으로 휠이 계속 오는데, 그때는 수식키가 풀려 있어
       프레지가 다음 단계로 넘겨 버렸다. 마지막 확대 휠에서 ZOOM_TAIL_MS 안의 휠은 프레지에 넘기지 않는다 */
    let zoomUntil = 0;
    const onWheel = (e: WheelEvent) => {
      const zoom = e.ctrlKey || e.metaKey || e.altKey;
      if (!zoom && performance.now() > zoomUntil) return;
      e.preventDefault();
      e.stopPropagation();
      zoomUntil = performance.now() + ZOOM_TAIL_MS;
      if (!zoom) return;
      const r = el.getBoundingClientRect();
      const d = Math.max(-60, Math.min(60, e.deltaY));
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-d * 0.006));
    };
    /* Safari 의 트랙패드 핀치는 휠(ctrlKey)이 아니라 제스처 이벤트(scale)로 온다. 문서에서 받아 기본 동작(페이지 확대)을
       먼저 막고, 손가락이 이 지도 위에서 시작했을 때만 지도를 확대한다. scale 은 시작부터 누적이라 직전 값과의 비로 */
    type GestureLike = Event & { scale: number; clientX: number; clientY: number };
    let g0 = 1;
    let pinching = false;
    const onGestureStart = (e: Event) => {
      if (!el.contains(e.target as Node)) return;
      e.preventDefault();
      pinching = true;
      g0 = 1;
      zoomUntil = performance.now() + ZOOM_TAIL_MS;
    };
    const onGestureChange = (e: Event) => {
      if (!pinching) return;
      e.preventDefault();
      zoomUntil = performance.now() + ZOOM_TAIL_MS;
      const ge = e as GestureLike;
      const r = el.getBoundingClientRect();
      const x = Number.isFinite(ge.clientX) ? ge.clientX - r.left : r.width / 2;
      const y = Number.isFinite(ge.clientY) ? ge.clientY - r.top : r.height / 2;
      zoomAt(x, y, ge.scale / g0);
      g0 = ge.scale;
    };
    const onGestureEnd = (e: Event) => {
      if (!pinching) return;
      e.preventDefault();
      pinching = false;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("gesturestart", onGestureStart, { passive: false });
    document.addEventListener("gesturechange", onGestureChange, { passive: false });
    document.addEventListener("gestureend", onGestureEnd, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      document.removeEventListener("gesturestart", onGestureStart);
      document.removeEventListener("gesturechange", onGestureChange);
      document.removeEventListener("gestureend", onGestureEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zoomAt 은 ref 만 읽는다
  }, []);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button, a")) return;
    /* 끄는 동안 글자가 선택되지 않게 — 누르는 순간의 기본 동작(선택 시작)을 막는다. 포인터는 실제로 끌기 시작할 때만
       붙잡는다 — 누를 때 붙잡으면 클릭이 빛줄기 · 정거장 대신 이 상자로 간다 */
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragRef.current = { x: e.clientX, y: e.clientY, moved: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const r = e.currentTarget.getBoundingClientRect();
    if (pts.length === 2) {
      /* 두 손가락 — 거리 비율만큼 확대, 가운데를 기준으로 */
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchRef.current) zoomAt((pts[0].x + pts[1].x) / 2 - r.left, (pts[0].y + pts[1].y) / 2 - r.top, d / pinchRef.current);
      pinchRef.current = d;
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved < 5) return;
    if (!dragging) { setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); }
    const c = viewRef.current;
    instantRef.current = true;
    setFree({ x: c.x + dx, y: c.y + dy, k: c.k });
  };
  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) {
      /* 끌었다 놓은 거면 그 아래 빛줄기 · 정거장 클릭은 무시 */
      if (dragRef.current && dragRef.current.moved >= 5) suppressClick.current = true;
      dragRef.current = null;
      setDragging(false);
    }
  };
  const suppressClick = useRef(false);
  const guard = (fn: () => void) => () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    fn();
  };
  /** 이야기 흐름으로 돌아가기 — 직접 조작한 카메라를 비운다 */
  const back = () => setFree(null);
  /* 단추는 부드럽게 */

  /* 요청 빛 — 궤도를 따라 지금 정거장 각도로 돈다 */
  /* 이 요청이 들르는 정거장 — 브라우저부터 막는 곳까지, 그리고 응답 */
  const stops = journey ? journey.steps.map((s) => layerIndex(s.layer)) : [];
  const used = new Set(stops);

  const setExplore = (ray: number | null) => setPicked(ray === null ? null : { at: step, ray });
  /** 지금 묶음의 대표 요청을 정거장 처음부터(전체 보기 단계면 첫 묶음으로 들어가며) */
  const playJourney = () => { setFree(null); setPicked(null); setPaused(false); const target = Math.max(1, step); if (target !== step) setStep(target); setWalk({ at: target, si: 0 }); };
  /* 정거장 — 지금 묶음의 대표 요청에서 그 단계로 */
  const playStation = (li: number) => {
    const at = journey ? journey.steps.findIndex((s) => layerIndex(s.layer) === li) : -1;
    if (at < 0) return;
    setPicked(null);
    const target = Math.max(1, step);
    if (target !== step) setStep(target);
    setWalk({ at: target, si: at });
  };

  return (
    <section className={styles.api}>
      <div
        ref={stageRef}
        className={styles.prezi}
        data-explore={explore !== null || undefined}
        data-view={view}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(e) => { if (!dragging) endPointer(e); }}
      >
        <svg className={styles.world} width="100%" height="100%" aria-label={`${total} ${L(apiScene.title)}`} role="img">
          <g ref={camGRef} className={styles.camera}>
            {/* 궤도 */}
            <circle className={styles.orbit} cx={0} cy={0} r={ORBIT} />
            {/* 빛줄기 — 누르면 그 묶음으로 */}
            {groups.map((b, i) => {
              const a = angle(i);
              const cos = r2(Math.cos(a)), sin = r2(Math.sin(a));
              const end = rayEnd(i);
              const on = i === focusRay;
              /* 위아래로 선 빛줄기는 이름표가 옆 빛줄기 이름표와 겹친다 — 하나 걸러 조금 더 바깥에 */
              const lab = end + 30 + (Math.abs(cos) < 0.5 && i % 2 ? 90 : 0);
                                          return (
                <g key={b.key} className={styles.ray} data-on={on || undefined} onClick={guard(() => { back(); setExplore(i); setHotEp(null); })}>
                  <line className={styles.rayHit} x1={cos * R0} y1={sin * R0} x2={r2(cos * end)} y2={r2(sin * end)} />
                  <line className={styles.rayLine} x1={cos * R0} y1={sin * R0} x2={r2(cos * end)} y2={r2(sin * end)} />
                  {b.endpoints.map((e, j) => {
                    /* 빛줄기 양옆으로 번갈아 조금 비켜 놓는다(지그재그) — 한 줄로 늘어놓으면 간격(GAP)보다 크게 그릴 수 없어 별이 점처럼 작았다 */
                    const { x, y } = epXY(i, j);
                    /* 고리 — 둘러보기에서 목록에 올린 줄, 요청 단계에서는 그 요청의 별 */
                    const isHot = on && (explore !== null ? hotEp === e.path : !stepNow && j === journeyEp);
                    const sz = isHot ? 34 : on ? DOT * 1.25 : DOT;
                    return (
                      <g key={j} transform={`translate(${x} ${y})`}>
                        {isHot && <circle className={styles.dotRing} r={24} />}
                        {/* 짚은 별은 고리만 — 경로는 아래 목록에서 그 줄이 강조된다(지도 위 이름표는 묶음 이름 · 별과 겹쳐 지저분했다) */}
                        <g className={styles.dot} data-access={e.access} style={{ "--tw": (i * 7 + j * 3) % 11 } as React.CSSProperties}>
                          <path d={STAR_PATH} transform={`translate(${-sz / 2} ${-sz / 2}) scale(${sz / 100})`} />
                        </g>
                      </g>
                    );
                  })}
                  <text
                    className={styles.rayLabel}
                    x={r2(cos * lab)}
                    y={r2(sin * lab)}
                    textAnchor={cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle"}
                    dominantBaseline="middle"
                  >
                    {groupName(b)} · {b.count}
                  </text>
                </g>
              );
            })}
            {/* 가운데 /api */}
            <g className={styles.core}>
              <path d={STAR_PATH} transform="translate(-60 -60) scale(1.2)" />
            </g>
            <text className={styles.coreLabel} x={0} y={100} textAnchor="middle">/api</text>
            {/* 정거장에 아직 안 갔을 때(전체 보기 · 빛줄기) 길잡이 별은 가운데 /api 에 앉는다 — 자리가 없으면 다른 프레임의 자리로 끌려간다 */}
            {live && (here < 0 || explore !== null) && <circle r={40} fill="transparent" data-guide="" data-guide-priority="1" data-guide-fill="var(--text-white)" />}

            {/* 요청을 따라가는 동안 — 지나온 정거장 사이의 호가 켜진다 */}
            {explore === null && stepNow && (() => {
              const seen = stops.slice(0, si + 1);
              const lit = seen.slice(1).map((b, k) => {
                const p0 = stationXY(seen[k]), p1 = stationXY(b);
                return seen[k] === b ? null : <path key={k} d={`M ${p0.x} ${p0.y} A ${ORBIT} ${ORBIT} 0 0 1 ${p1.x} ${p1.y}`} />;
              });
              return (
                <g className={styles.journeyLink} aria-hidden>
                  {lit}
                </g>
              );
            })()}
            {/* 정거장을 잇는 길 — 첫 정거장에서 끝 정거장까지 점선 호 */}
            {(() => {
              const a = stationXY(0), z = stationXY(journeyLayers.length - 1);
              return (
                <g className={styles.stationPath} aria-hidden>
                  <path d={`M ${a.x} ${a.y} A ${ORBIT} ${ORBIT} 0 0 1 ${z.x} ${z.y}`} />
                </g>
              );
            })()}
            {/* 궤도의 정거장 — 누르면 그 단계로 */}
            {journeyLayers.map((l, i) => {
              const p = stationXY(i);
              const big = i === here && explore === null;
              const sz = big ? 64 : 40;
              return (
                <g
                  key={l.key}
                  className={styles.station}
                  data-used={used.has(i) || undefined}
                  data-skip={(explore === null && !!stepNow && !used.has(i)) || undefined}
                  data-here={big || undefined}
                  transform={`translate(${p.x} ${p.y})`}
                  onClick={guard(() => { back(); playStation(i); })}
                >
                  <circle className={styles.stationHit} r={60} />
                  <path className={styles.stationStar} d={STAR_PATH} transform={`translate(${-sz / 2} ${-sz / 2}) scale(${sz / 100})`} />
                  {/* 지금 단계의 정거장 — 길잡이 별이 요청과 함께 정거장을 옮겨 다닌다(카메라가 늘 이 자리를 비춘다) */}
                  {live && big && <circle r={sz * 0.55} fill="transparent" data-guide="" data-guide-priority="1" data-guide-fill="var(--text-white)" />}
                  <text x={60} y={10}>
                    <tspan className={styles.stationNum}>{String(i + 1).padStart(2, "0")}</tspan> {L(l.label)}
                  </text>

                </g>
              );
            })}
          </g>
        </svg>

        {/* ── 화면 위 글 — 카드 없이 ── */}
        <div className={styles.pzTop}>
          <span className={fx.sceneLabel}>{L(apiScene.label)}</span>
          <p className={styles.apiTotal}>
            <span className={styles.apiNumber}>{total}</span>
            <span className={styles.apiUnit}>
              {L(apiScene.title)} · {n} {L(apiScene.groupsUnit)}
            </span>
          </p>
          {/* 조작은 이 한 줄에 — 맨 앞 전체 보기, 요청 다섯, 맨 끝 재생 · 멈춤. 확대 · 축소는 Ctrl+휠 · 두 손가락 */}
          <div className={styles.jTabs}>
            <Pressable className={fx.chip} data-on={(explore === -1 && !free) || undefined} onClick={() => { back(); setPicked(null); setStep(0); }}>
              {L(journeyScene.overviewButton)}
            </Pressable>
            <Pressable
              className={styles.jPlay}
              onClick={() => {
                if (si < 0) playJourney();
                else if (explore !== null || free) { back(); setPicked(null); setPaused(false); }
                else setPaused((v) => !v);
              }}
              aria-label={explore !== null || paused || free ? L(journeyScene.play) : L(journeyScene.pause)}
              title={explore !== null || paused || free ? L(journeyScene.play) : L(journeyScene.pause)}
            >
              {explore !== null || paused || free ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </Pressable>
            {/* 확대 · 축소 — 수식키 + 휠 · 핀치가 안 되는 환경에서도 되게. 화면 가운데를 기준으로 */}
            <Pressable className={styles.jPlay} onClick={() => zoomAt(size.w / 2, size.h / 2, 1.4, false)} aria-label={L(journeyScene.zoomIn)} title={L(journeyScene.zoomIn)}>
              <ZoomIn aria-hidden="true" />
            </Pressable>
            <Pressable className={styles.jPlay} onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.4, false)} aria-label={L(journeyScene.zoomOut)} title={L(journeyScene.zoomOut)}>
              <ZoomOut aria-hidden="true" />
            </Pressable>
          </div>
          {/* 조작 안내 — 확대 · 축소 단추가 없으니 방법을 적어 둔다 */}
          <p className={styles.pzHint}>{L(HINT)}</p>
        </div>

        <div className={styles.pzText} data-view={view}>
          {explore === -1 ? (
            /* 전체 보기 — 숫자는 모두 생성 지도에서: 접근 등급 분포(별 색의 범례를 겸한다) · 테이블 · 외부 서비스 */
            <div key="x-all" className={styles.pzBody}>
              <span className={fx.num}>
                {L(journeyScene.overview)} · {apiMap.routeFiles} {L(apiScene.routeFiles)}
              </span>
              <p className={styles.pzText2}>{L(apiScene.overviewLead)}</p>
              <AccessBar counts={apiMap.access} total={total} L={L} />
              <dl className={styles.apiFacts}>
                <div>
                  <dt>{L(apiScene.tablesLabel)}</dt>
                  <dd>
                    <b>{apiMap.tables.length}</b> · {L(apiScene.rpcLabel)} <b>{apiMap.rpcs.length}</b>
                  </dd>
                </div>
                <div>
                  <dt>{L(apiScene.servicesLabel)}</dt>
                  <dd className={styles.apiTags}>
                    {apiMap.services.map((sv) => (
                      <span key={sv}>{L(apiScene.services[sv])}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          ) : explore !== null ? (
            <GroupDetail
              key={`x-${explore}`}
              g={groups[explore]}
              name={groupName(groups[explore])}
              journey={explore === groupStep ? journey : undefined}
              onPlay={playJourney}
              hotEp={hotEp}
              setHotEp={setHotEp}
              narrow={narrow}
              L={L}
            />
          ) : stepNow && journey ? (
            /* 요청의 목적을 크게(바뀔 때만 다시 떠오른다), 그 아래 지금 단계(단계마다 바뀐다) */
            <div key={journey.key} className={styles.pzBody}>
              <h4 className={styles.jPurpose}>{L(journey.label)}</h4>
              {/* 지금 따라가는 엔드포인트 — 지도에서 이 별이 지금 정거장과 선으로 이어져 있다 */}
              <p className={styles.jRequest} data-small="">
                <span className={styles.jMethod} data-kind={methodKind(journey.method)}>{journey.method}</span>
                <code className={styles.jPath}>{journey.path}</code>
              </p>
              <div key={si} className={styles.jStep}>
                <span className={fx.num}>
                  {String(si + 1).padStart(2, "0")} / {String(journey.steps.length).padStart(2, "0")} · {L(journeyLayers[here].label)}
                </span>
                <h5 className={styles.jStepTitle}>{L(stepNow.title)}</h5>
                <p className={styles.pzText2}>{L(stepNow.body)}</p>
                {/* 막히는 응답이 없는 단계도 그 줄 자리는 잡아 둔다 — 단계마다 글 높이가 달라 아래에 붙은 글 묶음이 오르내리지 않게 */}
                <p className={styles.jFail} data-empty={!stepNow.fail || undefined} aria-hidden={!stepNow.fail || undefined}>
                  <span>{L(journeyScene.failLabel)}</span>
                  <code title={stepNow.fail}>{stepNow.fail ?? "–"}</code>
                </p>
                <code className={styles.jFile}>{stepNow.file}</code>
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </section>
  );
}

type LFn = (v: L10n) => string;

/** 접근 등급 띠 — 등급마다 칸 너비 = 엔드포인트 수, 아래에 색 · 이름 · 수(지도 별 색의 범례) */
function AccessBar({ counts, total, L, compact }: { counts: Record<ApiAccess, number>; total: number; L: LFn; compact?: boolean }) {
  const levels = ACCESS_LEVELS.filter((a) => counts[a] > 0);
  return (
    <div className={styles.accessBar} data-compact={compact || undefined} aria-label={L(apiScene.accessLabel)}>
      <div className={styles.accessTrack} aria-hidden="true">
        {levels.map((a) => (
          <span key={a} data-access={a} style={{ flexGrow: counts[a] } as React.CSSProperties} />
        ))}
      </div>
      <ul className={styles.accessKey}>
        {levels.map((a) => (
          <li key={a} data-access={a} title={L(apiScene.access[a])}>
            <i aria-hidden="true" />
            <span>{L(apiScene.access[a])}</span> <b>{counts[a]}</b>
            {!compact && <span className={styles.accessPct}>{Math.round((counts[a] / total) * 100)}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 빛줄기 하나(묶음)의 자세히 — 왼쪽: 이름 · 설명 · 등급 띠 · 테이블 · 외부 서비스, 오른쪽: 엔드포인트(경로 한 줄에 메서드 표).
    메서드 표의 색이 접근 등급이다(바로 위 등급 띠가 범례). 넓은 화면은 두 칸, 좁은 화면은 위아래 */
function GroupDetail({ g, name, journey, onPlay, hotEp, setHotEp, narrow, L }: {
  g: Group;
  name: string;
  /** 이 묶음의 대표 요청 — 넘기면 정거장을 따라간다 */
  journey?: Journey;
  onPlay: () => void;
  hotEp: string | null;
  setHotEp: (v: string | null) => void;
  narrow: boolean;
  L: LFn;
}) {
  /* 같은 경로의 메서드는 한 줄로 — 줄 수가 경로 수가 된다 */
  const routes: { path: string; eps: Group["endpoints"] }[] = [];
  for (const e of g.endpoints) {
    const last = routes[routes.length - 1];
    if (last?.path === e.path) last.eps.push(e);
    else routes.push({ path: e.path, eps: [e] });
  }
  /* 단 수 — 스크롤 없이 다 보이게 줄 수로 정한다. 넓은 화면은 높이가 모자라(1280×720) 일찍 두 단,
     좁은 화면은 폭이 모자라(두 단이면 경로가 잘린다) 늦게 두 단 */
  const cols = routes.length > (narrow ? 18 : 9) ? 2 : 1;
  const rows = Math.ceil(routes.length / cols);
  return (
    <>
      <div className={styles.pzBody}>
        <span className={fx.num}>
          {g.count} endpoints · {g.files} {L(apiScene.routeFiles)}
        </span>
        <h4 className={styles.pzTitle}>{name}</h4>
        {g.description ? (
          <p className={styles.pzText2} data-clamp="">{L(g.description)}</p>
        ) : g.folded ? (
          <p className={styles.apiFolded}>
            {L(apiScene.foldedLabel)} {g.folded.length} · {g.folded.map((f) => f.replace(/^admin\//, "")).join(", ")}
          </p>
        ) : null}
        <AccessBar counts={g.access} total={g.count} L={L} compact />
        {/* 다음 걸음 예고 — 이 리소스의 대표 요청이 처리 단계를 지난다. 글줄처럼 조용히(눌러도 간다) */}
        {journey && (
          <Pressable className={styles.jNext} onClick={onPlay}>
            <span className={styles.jNextLabel}>{L(journeyScene.nextLabel)}</span>
            <span className={styles.jNextReq}>
              <span className={styles.jNextMethod} data-kind={methodKind(journey.method)}>{journey.method}</span> {shortPath(journey.path)}
            </span>
            <span className={styles.jNextHint}>↓</span>
          </Pressable>
        )}
        <dl className={styles.apiFacts} data-compact="">
          <div>
            <dt>{L(apiScene.tablesLabel)} {g.tables.length}</dt>
            <dd className={styles.apiCodes}>
              {/* 이름 사이에 빈칸 — 좁은 화면에서 줄을 자를 때 이름 가운데가 아니라 사이에서 끊기게 */}
              {g.tables.length ? g.tables.map((t) => <Fragment key={t}><code>{t}</code> </Fragment>) : L(apiScene.none)}
              {g.rpcs.map((r) => <Fragment key={r}><code data-rpc="">{r}()</code> </Fragment>)}
            </dd>
          </div>
          <div>
            <dt>{L(apiScene.servicesLabel)}</dt>
            <dd className={styles.apiTags}>
              {g.services.length ? g.services.map((sv) => <span key={sv}>{L(apiScene.services[sv])}</span>) : L(apiScene.none)}
            </dd>
          </div>
        </dl>
      </div>
      {/* 그 묶음의 엔드포인트 — 줄에 올리면 지도의 그 별(들)에 고리 */}
      <ul
        className={styles.pzList}
        style={{ "--cols": cols, "--rows": rows } as React.CSSProperties}
        onPointerLeave={() => setHotEp(null)}
      >
        {routes.map((r) => (
          <li key={r.path} data-hot={hotEp === r.path || undefined} onPointerEnter={() => setHotEp(r.path)}>
            <code className={styles.pzPath} title={r.path}>{shortPath(r.path)}</code>
            <span className={styles.pzMethods}>
              {r.eps.map((e) => (
                <span
                  key={e.method}
                  className={styles.pzMethod}
                  data-access={e.access}
                  title={`${e.method} · ${L(apiScene.access[e.access])}`}
                >
                  {e.method}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
