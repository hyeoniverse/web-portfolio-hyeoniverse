"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { useStateFromProp } from "@/hooks/useStateFromProp";
import { createPortal } from "react-dom";
import { COPY_FEEDBACK_MS } from "@/constants";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLenis } from "@/providers/LenisProvider";
import {
  clamp,
  formatOklch,
  hexToHsl,
  hexToHsv,
  hexToOklch,
  hexToRgb,
  hslToHex,
  hsvToHex,
  maxSafeChroma,
  normalizeHexAlpha,
  parseAlpha,
  withAlpha,
  oklchToHex,
  OKLCH_C_MAX,
  parseAnyToOklch,
  parseAnyColorToOklch,
  rgbToHex,
  type HSL,
  type HSV,
  type OKLCH,
  type RGB,
} from "./colorMath";
import { fillLcPad } from "./lcPadPixels";
import { placePopover } from "./popoverPlacement";
import Select from "../Select";
import Input from "../Input";
import Tooltip from "../Tooltip";
import { Info, Copy, ClipboardPaste, Check } from "@/components/icons";
import { showToast } from "@/stores/toastStore";
import styles from "./ColorPicker.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";

type InputFormat = "hex" | "rgb" | "hsl" | "hsv" | "oklch";
const FORMAT_OPTIONS = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "hsv", label: "HSV / HSB" },
  { value: "oklch", label: "OKLCH" },
];

/** onChange 가 emit 하는 통합 결과 — consumer 가 .hex / .oklch 등 원하는 format 골라 사용 */
export interface ColorResult {
  /** `#rrggbb` (sRGB clip, alpha 무시) — 기존 소비자 호환용 */
  hex: string;
  /** alpha<1 이면 `#rrggbbaa`, 불투명이면 `#rrggbb` — 투명도 저장하려면 이 값을 사용 */
  hexa: string;
  /** 투명도 0(투명)~1(불투명) */
  alpha: number;
  /** `oklch(L% C H)` CSS 문자열 (wide-gamut 보존) */
  oklch: string;
  /** 0-255 */
  rgb: RGB;
  /** h 0-360, s/l 0-100 */
  hsl: HSL;
  /** h 0-360, s/v 0-100 */
  hsv: HSV;
}

interface ColorPickerProps {
  /** 입력 value — hex / `oklch(...)` 둘 다 자동 parse */
  value: string;
  /** 모든 format 을 한번에 emit. consumer: `c => setX(c.hex)` 또는 `c.oklch` 등 */
  onChange: (color: ColorResult) => void;
  /** drag/input commit 시 1회 호출 — 최근 색상 기록 같은 무거운 작업용 */
  onChangeComplete?: (color: ColorResult) => void;
  /** 초기 input format. 사용자가 picker 내부에서 다른 format 으로 전환 가능 */
  defaultFormat?: InputFormat;
  /** trigger 노드 — 클릭 시 popover 열림. 미제공이면 작은 swatch button 자동 생성 */
  children?: (ctx: { open: boolean; toggle: () => void }) => ReactNode;
  /** trigger 가 없을 때 기본 swatch 버튼의 className/style override */
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  /** 인라인 모드 — portal 대신 trigger 바로 아래에서 clip-path 로 펼쳐짐 (부모 popover 안에 임베드용) */
  inline?: boolean;
}

/** OKLCH 색과 투명도로 내보낼 결과(모든 형식)를 만든다. */
function colorResult(next: OKLCH, a: number): ColorResult {
  const h = oklchToHex(next);
  return {
    hex: h,
    hexa: withAlpha(h, a),
    alpha: a,
    oklch: formatOklch(next),
    rgb: hexToRgb(h),
    hsl: hexToHsl(h),
    hsv: hexToHsv(h),
  };
}

/**
 * 왜 이 파일이 한 덩어리로 남아 있는가
 *
 * 화면 없이 확인할 수 있는 계산은 이미 밖으로 뺐다. 색 문자열 해석은 colorMath,
 * 판을 놓을 자리 계산은 popoverPlacement, 밝기×채도 판의 픽셀은 lcPadPixels 가 맡는다.
 *
 * 남은 것은 더 나누지 않는다. 여기 있는 상태 열 개와 참조값 열두 개가 끌기 처리와
 * 결과 내보내기를 통해 서로 엮여 있기 때문이다. 예를 들어 색을 끌어 고르는 처리는
 * 지금 형식(padType), 낼 수 있는 최대 채도(maxC), 투명도의 즉시값(alphaRef),
 * 결과를 내보내는 함수(update)를 한꺼번에 본다. 판·고리·밝기·채도·색상·투명도까지
 * 여덟 개의 끌기 처리가 같은 값들을 공유한다.
 *
 * 이것을 파일로 나누면 그 값들을 인자로 길게 넘겨 다니게 된다. 줄 수는 흩어지지만
 * 무엇이 무엇에 영향을 주는지는 오히려 알아보기 어려워진다.
 *
 * 통합 color picker — OKLCH 를 source of truth 로 하고
 * HEX / RGB / HSL / HSV / OKLCH / CMYK 6가지 input format 을 UI Select 로 전환해 입력.
 *
 * - Pad: 2D Chroma×Lightness (OKLCH) + Hue slider — OKLCH gamut 의 자연스러운 컨트롤.
 * - onChange 는 `ColorResult` 객체 (모든 format 동시 emit) — consumer 가 `.hex` / `.oklch` 등 선택.
 * - 외부 value 가 hex 든 oklch() 든 자동 parse.
 */
export default function ColorPicker({
  value,
  onChange,
  onChangeComplete,
  defaultFormat = "oklch",
  children,
  triggerClassName,
  triggerStyle,
  inline = false,
}: ColorPickerProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  /* 모바일 (화면 너비 ≤ 768px) 일 땐 dropdown 대신 bottom sheet 으로 렌더. (inline 모드 제외) */
  const { isMobile } = useIsMobile();
  const useSheet = isMobile && !inline;

  // source of truth — OKLCH
  const [oklch, setOklch] = useState<OKLCH>(() => parseAnyToOklch(value));
  const [format, setFormat] = useState<InputFormat>(defaultFormat);
  /* 투명도 0~1 — 색(OKLCH)과 독립. alphaRef 로 즉시값 보관(emit/drag 클로저에서 최신값 참조). */
  const [alpha, setAlpha] = useState<number>(() => parseAlpha(value) ?? 1);
  const alphaRef = useRef(alpha);
  useEffect(() => { alphaRef.current = alpha; }, [alpha]);

  // 외부 value sync — 동일 색이면 내부 state 유지 (c=0 이어도 hue 보존)
  const valueChanged = useDepsChanged([value]);
  if (valueChanged) {
    setOklch((prev) => {
      const incoming = parseAnyToOklch(value);
      if (
        Math.abs(incoming.l - prev.l) < 0.1
        && Math.abs(incoming.c - prev.c) < 0.001
        && incoming.h === prev.h
      ) return prev;
      return incoming;
    });
    // alpha 토큰이 명시된 value 만 반영 — 불투명(#rrggbb 등) 소비자가 alpha 를 1로 리셋하지 않도록 null 무시
    const a = parseAlpha(value);
    if (a != null) setAlpha(a);
  }

  const hex = oklchToHex(oklch);
  const hexDisplay = withAlpha(hex, alpha); // 텍스트 입력·복사용 (alpha<1 이면 8자리)
  const rgb = hexToRgb(hex);
  const hsl = hexToHsl(hex);
  const hsv = hexToHsv(hex);
  const hueColor = oklchToHex({ l: 70, c: OKLCH_C_MAX, h: oklch.h });

  // trigger rect 측정
  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return null;
    const child = el.firstElementChild as HTMLElement | null;
    const childRect = child?.getBoundingClientRect();
    return childRect && (childRect.width > 0 || childRect.height > 0)
      ? childRect
      : el.getBoundingClientRect();
  }, []);

  /** 누른 것의 자리 → 화면 안에 들어오는 판 위치. 실제 계산은 popoverPlacement 가 한다. */
  const computePos = useCallback((rect: DOMRect) => placePopover(
    rect,
    popRef.current?.offsetWidth ?? 260,
    popRef.current?.offsetHeight ?? 320,
    window.innerWidth,
    window.innerHeight,
  ), []);

  /* 위치 동기화 — 초기 1회만 React state 로 portal mount 트리거.
   * 이후 scroll/resize 에는 rAF + DOM 직접 mutate 로 처리해 rerender 없이 매끄럽게 따라감
   * (Lenis smooth scroll 환경에서 setState 기반은 한 프레임씩 튐). */
  useLayoutEffect(() => {
    if (!open || useSheet || inline) return;
    const r = measure();
    if (r) setPos(computePos(r));

    let raf: number | null = null;
    const syncDom = () => {
      raf = null;
      const rect = measure();
      const pop = popRef.current;
      if (!rect || !pop) return;
      const p = computePos(rect);
      pop.style.top = `${p.top}px`;
      pop.style.left = `${p.left}px`;
    };
    const onMove = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(syncDom);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, useSheet, measure, computePos, inline]);

  // 외부 클릭 / Escape 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* 모바일 sheet 열릴 때 body scroll lock + Lenis 정지 — backdrop 외부 스크롤 방지.
     Lenis smooth scroll 사용 중이라 단순 body overflow:hidden 만으로 부족 → useLenis().stop() 함께 호출. */
  const { stop: lenisStop, start: lenisStart } = useLenis();
  useEffect(() => {
    if (!open || !useSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenisStop();
    return () => {
      document.body.style.overflow = prev;
      lenisStart();
    };
  }, [open, useSheet, lenisStop, lenisStart]);

  const toResult = useCallback((next: OKLCH, a: number = alphaRef.current): ColorResult => colorResult(next, a), []);

  /** 모든 update 에서 oklch.c 를 current L/H 의 sRGB-safe max 까지 자동 clamp.
   *  LC pad/slider thumb 가 dome 밖 (out-of-gamut) 으로 나가지 못하게 함. */
  const update = useCallback((next: OKLCH) => {
    const safeC = maxSafeChroma(next.l, next.h);
    const safe: OKLCH = { ...next, c: Math.min(next.c, safeC) };
    setOklch(safe);
    onChange(toResult(safe));
  }, [onChange, toResult]);

  /** current L/H 에서 sRGB safe max chroma — C slider 의 scale 기준 */
  const maxC = useMemo(() => maxSafeChroma(oklch.l, oklch.h), [oklch.l, oklch.h]);

  // 가장 최근 emit 된 result — pointerup 시 onChangeComplete 인자
  const latestRef = useRef<ColorResult>(colorResult(oklch, alpha));
  useEffect(() => { latestRef.current = toResult(oklch); }, [oklch, toResult]);

  /* ── format 별 pad 종류 매핑 ──
   * - "lc" (OKLCH): x=Chroma, y=Lightness — wide-gamut 보존, canvas 기반 dome
   * - "sl" (HSL):   x=Saturation, y=Lightness — HSL 의 직관 모델
   * - "wheel" (HSV/HSB): 원형 Hue ring + 안쪽 SV pad — Material 패턴, HSV 의 angular hue 시각화
   * - "sv" (HEX/RGB/CMYK): x=Saturation, y=Value — 가장 전통적, sRGB 표현 */
  type PadType = "sv" | "sl" | "lc" | "wheel";
  const padType: PadType =
    format === "oklch" ? "lc"
    : format === "hsl" ? "sl"
    : format === "hsv" ? "wheel"
    : "sv";

  // pad 의 thumb 좌표 (%) — wheel/sv 모드의 안쪽 SV pad thumb 도 동일 매핑 (hsv.s, hsv.v)
  const padThumb = padType === "lc"
    ? { x: oklch.l, y: 100 - (oklch.c / OKLCH_C_MAX) * 100 }
    : padType === "sl"
      ? { x: hsl.s, y: 100 - hsl.l }
      : { x: hsv.s, y: 100 - hsv.v };

  /* wheel 모드 — 외곽 ring 의 hue thumb 위치 (12시=0°, 시계방향).
   * ring center radius % 계산:
   *   ring inset 4% → outer radius 46%, mask 65% → inner radius 46%*0.65 ≈ 30%
   *   ring center = (46 + 30) / 2 = 38% — 이게 thumb 이 색띠 중앙 위에 위치하는 거리
   *
   * !! HSV hue 사용 필수 !! conic-gradient 와 ring drag 모두 HSV hue 좌표계.
   * oklch.h 는 perceptual hue 라 HSV hue 와 round-trip 정확히 일치 안 함.
   * 클릭한 위치 (HSV hue) 와 thumb 표시 좌표가 같은 색공간이어야 일관. */
  const WHEEL_THUMB_R = 38;
  const wheelHueRad = ((hsv.h - 90) * Math.PI) / 180;
  const wheelHueX = 50 + WHEEL_THUMB_R * Math.cos(wheelHueRad);
  const wheelHueY = 50 + WHEEL_THUMB_R * Math.sin(wheelHueRad);

  /* 밝기×채도 판 그리기. 어떤 픽셀이 무슨 색인지는 lcPadPixels 가 계산한다.
   * 여기서는 그릴 자리(canvas)가 준비됐는지 확인하고 한 번 칠하는 일만 한다.
   * 판이 뜨자마자 그려야 첫 화면이 비지 않으므로 paint 직전에 실행되는 효과를 쓴다. */
  const lcCanvasRef = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!open || padType !== "lc") return;
    let raf = 0;
    const draw = () => {
      const canvas = lcCanvasRef.current;
      // portal + conditional render 로 첫 mount 시 ref 가 effect 실행 시점에 아직 null 일 수 있음
      // → 다음 frame 에 retry 해서 mount 보장
      if (!canvas) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = ctx.createImageData(canvas.width, canvas.height);
      fillLcPad(img.data, canvas.width, canvas.height, oklch.h);
      ctx.putImageData(img, 0, 0);
    };
    draw();
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [open, padType, oklch.h]);

  /** drag handler 공통 — rAF throttle 로 frame 당 1회 update.
   * React 18+ 의 native event 는 batch 안 됨 → 60+/sec setState 발생 시 한 frame 안에 못 처리.
   * 매 pointermove 좌표를 buffer 하고, rAF tick 에서 가장 최근 좌표로 1회만 실행.
   * onEnd 콜백 — drag 끝 시점에 추가 작업 (예: canvas 해상도 복원) */
  const attachDrag = (handler: (ev: PointerEvent) => void, onEnd?: () => void) => {
    let raf: number | null = null;
    let lastEv: PointerEvent | null = null;
    const runLatest = () => {
      raf = null;
      const ev = lastEv;
      lastEv = null;
      if (ev) handler(ev);
    };
    const moveThrottled = (ev: PointerEvent) => {
      lastEv = ev;
      if (raf !== null) return;
      raf = requestAnimationFrame(runLatest);
    };
    const cleanup = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", moveThrottled);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
    const up = () => {
      cleanup();
      onChangeComplete?.(latestRef.current);
      onEnd?.();
    };
    document.addEventListener("pointermove", moveThrottled);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };


  // ── Pad drag — padType 따라 매핑 분기 ──
  const padRef = useRef<HTMLDivElement>(null);
  const onPadDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const apply = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
      let next: OKLCH;
      if (padType === "lc") {
        // x=Lightness, y=Chroma (top=max)
        next = {
          l: Math.round(x * 1000) / 10,
          c: Math.round((1 - y) * OKLCH_C_MAX * 1000) / 1000,
          h: oklch.h,
        };
      } else if (padType === "sl") {
        const nextHsl = { h: hsl.h, s: Math.round(x * 100), l: Math.round((1 - y) * 100) };
        next = hexToOklch(hslToHex(nextHsl));
      } else {
        // sv + wheel 모두 HSV SV pad — wheel 안쪽 정사각형 영역도 동일 매핑
        const nextHsv = { h: hsv.h, s: Math.round(x * 100), v: Math.round((1 - y) * 100) };
        next = hexToOklch(hsvToHex(nextHsv));
      }
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  // ── HSV wheel 의 외곽 Hue ring drag ──
  const ringRef = useRef<HTMLDivElement>(null);
  const onRingDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const ring = ringRef.current;
    if (!ring) return;
    const rect = ring.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const apply = (ev: PointerEvent) => {
      const dx = ev.clientX - cx;
      const dy = ev.clientY - cy;
      // atan2 는 3시 기준 반시계방향. 12시 기준 시계방향 (HSV hue) 으로 변환
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      deg = (deg + 90 + 360) % 360;
      const nextHsv = { h: Math.round(deg), s: hsv.s, v: hsv.v };
      const next = hexToOklch(hsvToHex(nextHsv));
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  // ── Hue slider drag ──
  const hueRef = useRef<HTMLDivElement>(null);
  const onHueDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = hueRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const apply = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const next: OKLCH = { l: oklch.l, c: oklch.c, h: Math.round(x * 360) };
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  // ── Alpha(투명도) slider drag — 색(oklch)은 그대로, alpha 만 조정 후 emit ──
  const alphaBarRef = useRef<HTMLDivElement>(null);
  const emitAlpha = useCallback((a: number) => {
    const clamped = clamp(Math.round(a * 100) / 100, 0, 1);
    alphaRef.current = clamped;
    setAlpha(clamped);
    const res = toResult(oklch, clamped);
    latestRef.current = res;
    onChange(res);
    return res;
  }, [oklch, onChange, toResult]);
  const onAlphaDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = alphaBarRef.current;
    if (!bar) return;
    const apply = (ev: PointerEvent) => {
      // 팝오버 진입 애니메이션(scale) 중엔 rect 가 최종 위치와 달라, 열자마자 바로 드래그하면
      // 첫 측정값에 고정돼 어긋난다 → 이동마다 재측정해 자기보정 (애니메이션 끝나면 정확해짐)
      const rect = bar.getBoundingClientRect();
      emitAlpha(clamp((ev.clientX - rect.left) / rect.width, 0, 1));
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  // ── OKLCH L / C 독립 슬라이더 (Hue 외에도 L, C 만 단독 조정 가능) ──
  const lSliderRef = useRef<HTMLDivElement>(null);
  const onLSliderDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = lSliderRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const apply = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const next: OKLCH = { l: Math.round(x * 1000) / 10, c: oklch.c, h: oklch.h };
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  const cSliderRef = useRef<HTMLDivElement>(null);
  const onCSliderDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = cSliderRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const apply = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      // C slider 의 scale 은 sRGB safe max 까지 → dome 밖으로 안 감
      const next: OKLCH = { l: oklch.l, c: Math.round(x * maxC * 1000) / 1000, h: oklch.h };
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  // ── Format 별 input handler 들 ──
  // HEX
  const [hexDraft, setHexDraft] = useStateFromProp(hexDisplay);
  // 잘못된 입력 시 popover 흔들기 — HEX commit 실패 / 붙여넣기 실패 공통
  const [shaking, setShaking] = useState(false);
  const triggerShake = useCallback(() => {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
    setTimeout(() => setShaking(false), 450);
  }, []);

  const commitHex = (raw: string) => {
    const parsed = normalizeHexAlpha(raw); // #rgb·#rgba·#rrggbb·#rrggbbaa 모두 허용
    if (parsed) {
      const next = hexToOklch(parsed.hex);
      alphaRef.current = parsed.alpha; // emit 이 최신 alpha 쓰도록 동기 반영
      setAlpha(parsed.alpha);
      update(next);
      onChangeComplete?.(toResult(next, parsed.alpha));
    } else {
      setHexDraft(hexDisplay);
      triggerShake();
      showToast("HEX 형식이 올바르지 않습니다. 예: #ff0000", "warning");
    }
  };

  // ── Clipboard — 현재 format 으로 복사 / 어떤 format 이든 자동 파싱해서 붙여넣기 ──
  const [copied, setCopied] = useState(false);
  const [pasteFlash, setPasteFlash] = useState<"ok" | "fail" | null>(null);

  const formatForCopy = useCallback((): string => {
    const a = Math.round(alpha * 100) / 100;
    const r = Math.round(rgb.r), g = Math.round(rgb.g), b = Math.round(rgb.b);
    switch (format) {
      case "hex": return hexDisplay;
      case "rgb": return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
      case "hsl": return a < 1
        ? `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, ${a})`
        : `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
      case "hsv": return `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`;
      case "oklch": return a < 1 ? formatOklch(oklch).replace(/\)$/, ` / ${a})`) : formatOklch(oklch);
    }
  }, [format, hexDisplay, rgb, hsl, hsv, oklch, alpha]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatForCopy());
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard 권한 / 보안 컨텍스트 실패 — 조용히 무시 */
    }
  }, [formatForCopy]);

  const handlePaste = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      const next = parseAnyColorToOklch(text);
      if (next) {
        const a = parseAlpha(text);
        if (a != null) { alphaRef.current = a; setAlpha(a); }
        update(next);
        onChangeComplete?.(toResult(next, a ?? alphaRef.current));
        setPasteFlash("ok");
      } else {
        setPasteFlash("fail");
        triggerShake();
        showToast("클립보드 색을 인식하지 못했습니다", "warning");
      }
      setTimeout(() => setPasteFlash(null), 1200);
    } catch {
      setPasteFlash("fail");
      triggerShake();
      showToast("클립보드를 읽지 못했습니다", "error");
      setTimeout(() => setPasteFlash(null), 1200);
    }
  }, [update, onChangeComplete, toResult, triggerShake]);

  /** RGB / HSL / HSV slider drag — handler factory (e.currentTarget 으로 rect 캐싱) */
  const onRgbSliderDown = (channel: keyof RGB) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const apply = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const nextRgb = { ...rgb, [channel]: Math.round(x * 255) };
      const next = hexToOklch(rgbToHex(nextRgb));
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  const onHslSliderDown = (channel: keyof HSL) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const max = channel === "h" ? 360 : 100;
    const apply = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const nextHsl = { ...hsl, [channel]: Math.round(x * max) };
      const next = hexToOklch(hslToHex(nextHsl));
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  const onHsvSliderDown = (channel: keyof HSV) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const max = channel === "h" ? 360 : 100;
    const apply = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const nextHsv = { ...hsv, [channel]: Math.round(x * max) };
      const next = hexToOklch(hsvToHex(nextHsv));
      latestRef.current = toResult(next);
      update(next);
    };
    apply(e.nativeEvent);
    attachDrag(apply);
  };

  // RGB
  const onRgbChange = (channel: keyof RGB, raw: string) => {
    const num = clamp(parseInt(raw, 10) || 0, 0, 255);
    const nextRgb = { ...rgb, [channel]: num };
    const next = hexToOklch(rgbToHex(nextRgb));
    update(next);
    onChangeComplete?.(toResult(next));
  };

  // HSL
  const onHslChange = (channel: keyof HSL, raw: string) => {
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return;
    const max = channel === "h" ? 360 : 100;
    const nextHsl = { ...hsl, [channel]: clamp(num, 0, max) };
    const next = hexToOklch(hslToHex(nextHsl));
    update(next);
    onChangeComplete?.(toResult(next));
  };

  // HSV
  const onHsvChange = (channel: keyof HSV, raw: string) => {
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return;
    const max = channel === "h" ? 360 : 100;
    const nextHsv = { ...hsv, [channel]: clamp(num, 0, max) };
    const next = hexToOklch(hsvToHex(nextHsv));
    update(next);
    onChangeComplete?.(toResult(next));
  };

  // OKLCH 개별 채널 — c 는 update 안에서 sRGB safe max 로 자동 clamp 됨
  const onOklchChange = (channel: keyof OKLCH, raw: string) => {
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return;
    let next: OKLCH;
    if (channel === "l") next = { ...oklch, l: clamp(num, 0, 100) };
    else if (channel === "c") next = { ...oklch, c: clamp(num, 0, OKLCH_C_MAX) };
    else next = { ...oklch, h: clamp(num, 0, 360) };
    update(next);
    onChangeComplete?.(toResult(next));
  };


  const trigger = children ? (
    children({ open, toggle: () => setOpen((v) => !v) })
  ) : (
    <Pressable
      className={`${triggerClassName ?? ""}${alpha < 1 ? ` ${styles.triggerAlpha}` : ""}`}
      style={alpha < 1
        ? ({ ...triggerStyle, "--_preview-color": hexDisplay } as CSSProperties)
        : { ...triggerStyle, background: hex }}
      onClick={() => setOpen((v) => !v)}
      aria-label="Pick color"
    />
  );

  // ── panel 본문 (pad/slider/input) — portal · inline 두 모드 공용 ──
  const panelContent = (
    <>
          {padType === "wheel" ? (
            /* HSV/HSB — 원형 Hue ring + 안쪽 SV pad */
            <div className={styles.hsvWheel}>
              <div
                ref={ringRef}
                className={styles.hsvRing}
                onPointerDown={onRingDown}
              />
              <span
                className={styles.hsvHueThumb}
                style={{
                  left: `${wheelHueX}%`,
                  top: `${wheelHueY}%`,
                  "--_hue-color": hueColor,
                } as CSSProperties}
              />
              <div
                ref={padRef}
                className={styles.hsvSquare}
                style={{ "--_hue-color": hueColor } as CSSProperties}
                onPointerDown={onPadDown}
              >
                <span
                  className={styles.svThumb}
                  style={{
                    left: `${padThumb.x}%`,
                    top: `${padThumb.y}%`,
                    "--_thumb-color": hex,
                  } as CSSProperties}
                />
              </div>
            </div>
          ) : (
            <div
              ref={padRef}
              className={padType === "lc" ? styles.lcPad : padType === "sl" ? styles.slPad : styles.svPad}
              style={{ "--_hue-color": hueColor } as CSSProperties}
              onPointerDown={onPadDown}
            >
              {padType === "lc" && (
                <canvas
                  ref={lcCanvasRef}
                  width={300}
                  height={150}
                  className={styles.lcCanvas}
                />
              )}
              <span
                className={styles.svThumb}
                style={{
                  left: `${padThumb.x}%`,
                  top: `${padThumb.y}%`,
                  "--_thumb-color": hex,
                } as CSSProperties}
              />
            </div>
          )}
          <div className={styles.controls}>
          {/* linear Hue slider — wheel/OKLCH 모드 제외 (wheel=ring, OKLCH=H 행에 통합) */}
          {padType !== "wheel" && padType !== "lc" && (
            <div
              ref={hueRef}
              className={styles.hueSlider}
              onPointerDown={onHueDown}
            >
              <span
                className={styles.hueThumb}
                style={{ left: `${(oklch.h / 360) * 100}%`, "--_hue-color": hueColor } as CSSProperties}
              />
            </div>
          )}

          {/* preview swatch + format select + info tooltip */}
          <div className={styles.inputs}>
            <span className={styles.preview} style={{ "--_preview-color": hexDisplay } as CSSProperties} aria-hidden />
            <Select
              value={format}
              options={FORMAT_OPTIONS}
              onChange={(v) => setFormat(v as InputFormat)}
              showCheck
              size="sm"
              className={styles.formatSelect}
            />
            <div className={styles.inputActions}>
            {/* 형식 설명 — 완결된 문장, 색공간을 모르는 사람도 알 수 있게(common.colorFormatInfo) */}
            <Tooltip content={t(`common.colorFormatInfo.${format}`)} placement="top">
              <Pressable
                className={styles.infoButton}
                aria-label={fillTemplate(t("common.colorFormatHelp"), { format: format.toUpperCase() })}
              >
                <Info size={14} strokeWidth={2} />
              </Pressable>
            </Tooltip>
            <Tooltip content={copied ? t("common.copied") : fillTemplate(t("common.colorCopyHint"), { format: format.toUpperCase() })} placement="top">
              <Pressable
                className={styles.infoButton}
                onClick={handleCopy}
                aria-label={t("common.colorCopy")}
              >
                {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
              </Pressable>
            </Tooltip>
            <Tooltip
              content={pasteFlash === "ok" ? t("common.colorPasted") : pasteFlash === "fail" ? t("common.colorPasteFailed") : t("common.colorPasteHint")}
              placement="top"
            >
              <Pressable
                className={styles.infoButton}
                onClick={handlePaste}
                aria-label={t("common.colorPaste")}
                data-flash={pasteFlash ?? undefined}
              >
                {pasteFlash === "ok" ? <Check size={14} strokeWidth={2} /> : <ClipboardPaste size={14} strokeWidth={2} />}
              </Pressable>
            </Tooltip>
            </div>
          </div>

          {/* Alpha(투명도) — 색과 독립. 체커보드 위 투명→불투명 그라디언트 + 우측 % 입력 */}
          <div className={styles.alphaRow}>
            <div
              ref={alphaBarRef}
              className={styles.alphaSlider}
              onPointerDown={onAlphaDown}
              data-cursor="grab"
              style={{ "--_alpha-color": hex } as CSSProperties}
              role="slider"
              aria-label={t("common.opacity")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(alpha * 100)}
            >
              <span
                className={styles.hueThumb}
                style={{ left: `${alpha * 100}%`, "--_hue-color": hexDisplay } as CSSProperties}
              />
            </div>
            <Input
              size="xs"
              type="number"
              min={0}
              max={100}
              value={String(Math.round(alpha * 100))}
              onChange={(v) => emitAlpha(clamp(parseInt(v, 10) || 0, 0, 100) / 100)}
              clearable={false}
              className={`${styles.pickerInput} ${styles.pickerInputCenter} ${styles.alphaInput}`}
            />
            <span className={styles.alphaUnit}>%</span>
          </div>

          {/* format 별 입력 영역 — 공통 Input 컴포넌트 (size="xs") 사용 */}
          {format === "hex" && (
            <div className={styles.rgbRow}>
              <Input
                size="xs"
                type="text"
                value={hexDraft}
                onChange={setHexDraft}
                onBlur={(e) => commitHex(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitHex(e.currentTarget.value); }}
                aria-label="HEX"
                spellCheck={false}
                clearable={false}
                className={styles.pickerInput}
              />
            </div>
          )}

          {format === "rgb" && (
            <div className={styles.oklchStack}>
              {(["r", "g", "b"] as const).map((ch) => {
                const startHex = rgbToHex({ ...rgb, [ch]: 0 });
                const endHex = rgbToHex({ ...rgb, [ch]: 255 });
                return (
                  <div key={ch} className={styles.oklchRow}>
                    <span className={styles.oklchChLabel}>{ch}</span>
                    <Input
                      size="xs"
                      type="number"
                      min={0}
                      max={255}
                      value={String(Math.round(rgb[ch]))}
                      onChange={(v) => onRgbChange(ch, v)}
                      clearable={false}
                      className={`${styles.pickerInput} ${styles.pickerInputCenter} ${styles.oklchChInput}`}
                    />
                    <div
                      className={`${styles.gradSlider} ${styles.oklchChSlider}`}
                      onPointerDown={onRgbSliderDown(ch)}
                      style={{ background: `linear-gradient(to right, ${startHex}, ${endHex})` }}
                      aria-label={`RGB ${ch.toUpperCase()}`}
                    >
                      <span
                        className={styles.gradThumb}
                        style={{ left: `${(rgb[ch] / 255) * 100}%`, "--_thumb-color": hex } as CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {format === "hsl" && (
            <div className={styles.oklchStack}>
              {(["h", "s", "l"] as const).map((ch) => {
                const max = ch === "h" ? 360 : 100;
                const startHex = hslToHex({ ...hsl, [ch]: 0 });
                const endHex = hslToHex({ ...hsl, [ch]: max });
                // H slider 는 rainbow gradient (current S/L 기준 hue 0→360)
                const bg = ch === "h"
                  ? `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => hslToHex({ ...hsl, h })).join(",")})`
                  : `linear-gradient(to right, ${startHex}, ${endHex})`;
                return (
                  <div key={ch} className={styles.oklchRow}>
                    <span className={styles.oklchChLabel}>{ch}</span>
                    <Input
                      size="xs"
                      type="number"
                      min={0}
                      max={max}
                      value={String(hsl[ch])}
                      onChange={(v) => onHslChange(ch, v)}
                      clearable={false}
                      className={`${styles.pickerInput} ${styles.pickerInputCenter} ${styles.oklchChInput}`}
                    />
                    <div
                      className={`${styles.gradSlider} ${styles.oklchChSlider}`}
                      onPointerDown={onHslSliderDown(ch)}
                      style={{ background: bg }}
                      aria-label={`HSL ${ch.toUpperCase()}`}
                    >
                      <span
                        className={styles.gradThumb}
                        style={{ left: `${(hsl[ch] / max) * 100}%`, "--_thumb-color": hex } as CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {format === "hsv" && (
            <div className={styles.oklchStack}>
              {(["h", "s", "v"] as const).map((ch) => {
                const max = ch === "h" ? 360 : 100;
                const startHex = hsvToHex({ ...hsv, [ch]: 0 });
                const endHex = hsvToHex({ ...hsv, [ch]: max });
                const bg = ch === "h"
                  ? `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => hsvToHex({ ...hsv, h })).join(",")})`
                  : `linear-gradient(to right, ${startHex}, ${endHex})`;
                return (
                  <div key={ch} className={styles.oklchRow}>
                    <span className={styles.oklchChLabel}>{ch}</span>
                    <Input
                      size="xs"
                      type="number"
                      min={0}
                      max={max}
                      value={String(hsv[ch])}
                      onChange={(v) => onHsvChange(ch, v)}
                      clearable={false}
                      className={`${styles.pickerInput} ${styles.pickerInputCenter} ${styles.oklchChInput}`}
                    />
                    <div
                      className={`${styles.gradSlider} ${styles.oklchChSlider}`}
                      onPointerDown={onHsvSliderDown(ch)}
                      style={{ background: bg }}
                      aria-label={`HSV ${ch.toUpperCase()}`}
                    >
                      <span
                        className={styles.gradThumb}
                        style={{ left: `${(hsv[ch] / max) * 100}%`, "--_thumb-color": hex } as CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {format === "oklch" && (
            /* oklch-picker / okcolor 패턴 — 각 채널 (L/C/H) 마다 [label + input + slider] row */
            <div className={styles.oklchStack}>
              {/* L row */}
              <div className={styles.oklchRow}>
                <span className={styles.oklchChLabel}>L</span>
                <Input
                  size="xs"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={String(oklch.l)}
                  onChange={(v) => onOklchChange("l", v)}
                  aria-label="OKLCH L"
                  clearable={false}
                  className={`${styles.pickerInput} ${styles.pickerInputCenter} ${styles.oklchChInput}`}
                />
                <div
                  ref={lSliderRef}
                  className={`${styles.gradSlider} ${styles.oklchChSlider}`}
                  onPointerDown={onLSliderDown}
                  style={{
                    background: `linear-gradient(to right, ${oklchToHex({ l: 0, c: oklch.c, h: oklch.h })}, ${oklchToHex({ l: 100, c: oklch.c, h: oklch.h })})`,
                  }}
                  aria-label="Lightness"
                >
                  <span
                    className={styles.gradThumb}
                    style={{ left: `${oklch.l}%`, "--_thumb-color": hex } as CSSProperties}
                  />
                </div>
              </div>
              {/* C row — scale 은 sRGB safe max (maxC) 기준. L/H 따라 동적. */}
              <div className={styles.oklchRow}>
                <span className={styles.oklchChLabel}>C</span>
                <Input
                  size="xs"
                  type="number"
                  min={0}
                  max={maxC}
                  step={0.001}
                  value={String(oklch.c)}
                  onChange={(v) => onOklchChange("c", v)}
                  aria-label="OKLCH C"
                  clearable={false}
                  className={`${styles.pickerInput} ${styles.pickerInputCenter} ${styles.oklchChInput}`}
                />
                <div
                  ref={cSliderRef}
                  className={`${styles.gradSlider} ${styles.oklchChSlider}`}
                  onPointerDown={onCSliderDown}
                  style={{
                    background: `linear-gradient(to right, ${oklchToHex({ l: oklch.l, c: 0, h: oklch.h })}, ${oklchToHex({ l: oklch.l, c: maxC, h: oklch.h })})`,
                  }}
                  aria-label="Chroma"
                >
                  <span
                    className={styles.gradThumb}
                    style={{ left: `${maxC > 0 ? (oklch.c / maxC) * 100 : 0}%`, "--_thumb-color": hex } as CSSProperties}
                  />
                </div>
              </div>
              {/* H row */}
              <div className={styles.oklchRow}>
                <span className={styles.oklchChLabel}>H</span>
                <Input
                  size="xs"
                  type="number"
                  min={0}
                  max={360}
                  step={1}
                  value={String(oklch.h)}
                  onChange={(v) => onOklchChange("h", v)}
                  aria-label="OKLCH H"
                  clearable={false}
                  className={`${styles.pickerInput} ${styles.pickerInputCenter} ${styles.oklchChInput}`}
                />
                <div
                  ref={hueRef}
                  className={`${styles.hueSlider} ${styles.oklchChSlider}`}
                  onPointerDown={onHueDown}
                  aria-label="Hue"
                >
                  <span
                    className={styles.hueThumb}
                    style={{ left: `${(oklch.h / 360) * 100}%`, "--_hue-color": hueColor } as CSSProperties}
                  />
                </div>
              </div>
            </div>
          )}

          </div>
    </>
  );

  return (
    <>
      <span ref={triggerRef} style={{ display: "inline-flex" }}>{trigger}</span>
      {inline ? (
        /* 인라인 — portal 없이 trigger 바로 아래에서 clip-path 로 펼침 */
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="cp-inline"
              ref={popRef}
              className={`${styles.inlinePanel} ${shaking ? styles.shaking : ""}`}
              initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
              exit={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {panelContent}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {open && useSheet && (
            <motion.div
              key="cp-backdrop"
              className={styles.sheetBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
          )}
          {open && (pos || useSheet) && (
            <motion.div
              key="cp-overlay"
              ref={popRef}
              className={`${useSheet ? `ui-sheet ${styles.sheet}` : styles.popover} ${shaking ? styles.shaking : ""}`}
              style={useSheet ? undefined : { top: pos!.top, left: pos!.left }}
              initial={useSheet ? { y: "100%" } : { opacity: 0, scale: 0.96 }}
              animate={useSheet ? { y: 0 } : { opacity: 1, scale: 1 }}
              exit={useSheet ? { y: "100%" } : { opacity: 0, scale: 0.96 }}
              transition={useSheet ? { type: "spring", damping: 30, stiffness: 280 } : { duration: 0.14 }}
              onPointerDown={(e) => e.stopPropagation()}
              role={useSheet ? "dialog" : undefined}
              aria-modal={useSheet ? true : undefined}
            >
              {useSheet && (
                <>
                  <div className="ui-sheet-handle" aria-hidden>
                    <span className="ui-sheet-handle-bar" />
                  </div>
                  <h3 className={styles.sheetTitle}>Pick color</h3>
                </>
              )}
              {panelContent}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      ))}
    </>
  );
}
