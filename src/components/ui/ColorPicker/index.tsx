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
import { createPortal } from "react-dom";
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
  normalizeHex,
  oklchToHex,
  oklchToRgbRaw,
  OKLCH_C_MAX,
  parseOklchString,
  rgbToHex,
  type HSL,
  type HSV,
  type OKLCH,
  type RGB,
} from "./colorMath";
import Select from "../Select";
import Input from "../Input";
import Tooltip from "../Tooltip";
import { Info, Copy, ClipboardPaste, Check } from "lucide-react";
import { showToast } from "@/stores/toastStore";
import styles from "./ColorPicker.module.css";

type InputFormat = "hex" | "rgb" | "hsl" | "hsv" | "oklch";
const FORMAT_OPTIONS = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "hsv", label: "HSV / HSB" },
  { value: "oklch", label: "OKLCH" },
];

/** format 별 의미 설명 — i 버튼 Tooltip 에 표시. 완결된 문장 + 색공간 모르는 사용자도 이해 가능. */
const FORMAT_INFO: Record<InputFormat, string> = {
  hex: "HEX 는 색을 6자리 코드로 적는 방식입니다. 앞에 # 을 붙이고 0–9 와 a–f 를 조합해서 #ff0000 (빨강) 처럼 표기합니다. 웹과 디자인 툴에서 가장 흔하게 쓰이는 형식이라 색을 공유하거나 검색할 때 편합니다.",
  rgb: "RGB 는 빛의 3원색인 빨강 · 초록 · 파랑을 각각 0 부터 255 까지의 숫자로 섞어 색을 만드는 방식입니다. 모니터 픽셀이 실제로 빛을 내는 원리와 같기 때문에 컴퓨터 그래픽의 기본이 되는 모델이지만, 숫자만 보고는 결과 색을 떠올리기 어렵습니다.",
  hsl: "HSL 은 사람이 색을 인식하는 방식에 가깝게 색상(H), 채도(S), 밝기(L) 세 값으로 색을 표현합니다. ‘어떤 색을, 얼마나 진하게, 얼마나 밝게’ 라는 직관적인 흐름으로 조절할 수 있어서 RGB 보다 색을 다듬기 쉽습니다.",
  hsv: "HSV (또는 HSB) 는 색상(H), 채도(S), 밝기(V/B) 로 표현한다는 점에서 HSL 과 비슷하지만, 밝기 100% 가 ‘가장 진하고 선명한 색’ 을 의미합니다. Photoshop · Figma 등 디자인 툴의 컬러 피커가 기본으로 쓰는 방식이라 친숙합니다.",
  oklch: "OKLCH 는 최근 웹 표준에 도입된 색공간입니다. 사람의 눈이 실제로 느끼는 밝기 차이가 균일하도록 설계되어 있어서, 색상이 달라도 같은 L 값이면 비슷한 밝기로 보입니다. 그래서 같은 톤의 색들을 만들거나 다크 / 라이트 테마용 팔레트를 설계할 때 유리합니다.",
};

/** onChange 가 emit 하는 통합 결과 — consumer 가 .hex / .oklch 등 원하는 format 골라 사용 */
export interface ColorResult {
  /** `#rrggbb` (sRGB clip) */
  hex: string;
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
}

/**
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
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  /* 모바일 (화면 너비 ≤ 768px) 일 땐 dropdown 대신 bottom sheet 으로 렌더. */
  const { isMobile } = useIsMobile();
  const useSheet = isMobile;

  // source of truth — OKLCH
  const [oklch, setOklch] = useState<OKLCH>(() => parseAnyToOklch(value));
  const [format, setFormat] = useState<InputFormat>(defaultFormat);

  // 외부 value sync — 동일 색이면 내부 state 유지 (c=0 이어도 hue 보존)
  useEffect(() => {
    setOklch((prev) => {
      const incoming = parseAnyToOklch(value);
      if (
        Math.abs(incoming.l - prev.l) < 0.1
        && Math.abs(incoming.c - prev.c) < 0.001
        && incoming.h === prev.h
      ) return prev;
      return incoming;
    });
  }, [value]);

  const hex = oklchToHex(oklch);
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

  /** trigger rect + popover size → viewport 안에 들어오는 top/left 계산.
   *  좌/우 overflow 시 반대 가장자리 기준으로 align, 하단 overflow 시 trigger 위로 flip. */
  const computePos = useCallback((rect: DOMRect): { top: number; left: number } => {
    const MARGIN = 8;
    const GAP = 6;
    const pop = popRef.current;
    const popW = pop?.offsetWidth ?? 260;
    const popH = pop?.offsetHeight ?? 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    if (left + popW > vw - MARGIN) left = vw - popW - MARGIN;
    if (left < MARGIN) left = MARGIN;

    // 기본은 trigger 아래. 아래 공간 부족하고 위 공간 충분하면 위로 flip.
    let top = rect.bottom + GAP;
    if (top + popH > vh - MARGIN) {
      const above = rect.top - GAP - popH;
      if (above >= MARGIN) top = above;
      else top = Math.max(MARGIN, vh - popH - MARGIN);
    }
    return { top, left };
  }, []);

  /* 위치 동기화 — 초기 1회만 React state 로 portal mount 트리거.
   * 이후 scroll/resize 에는 rAF + DOM 직접 mutate 로 처리해 rerender 없이 매끄럽게 따라감
   * (Lenis smooth scroll 환경에서 setState 기반은 한 프레임씩 튐). */
  useLayoutEffect(() => {
    if (!open || useSheet) return;
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
  }, [open, useSheet, measure, computePos]);

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

  const toResult = useCallback((next: OKLCH): ColorResult => {
    const h = oklchToHex(next);
    return {
      hex: h,
      oklch: formatOklch(next),
      rgb: hexToRgb(h),
      hsl: hexToHsl(h),
      hsv: hexToHsv(h),
    };
  }, []);

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
  const latestRef = useRef<ColorResult>(toResult(oklch));
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

  /* ── LC pad 의 canvas 픽셀 그리기 ─ oklch.com 스타일
   *    x=Lightness 0→100, y=Chroma top=max → 0.
   *    in-gamut (sRGB 안): 실제 OKLCH 색
   *    out-of-gamut: 대각선 hatching (mid gray 2색)
   *    useLayoutEffect 로 portal mount 후 paint 전 즉시 그림 (open 시 첫 빈 화면 방지).
   *    오버샘플링 — sample 해상도가 표시 크기보다 커서 부드럽게 보임. */
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
      const W = canvas.width;
      const H = canvas.height;
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) {
        const C = (1 - y / (H - 1)) * OKLCH_C_MAX;
        for (let x = 0; x < W; x++) {
          const L = (x / (W - 1)) * 100;
          const rgb = oklchToRgbRaw({ l: L, c: C, h: oklch.h });
          const inGamut = rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1;
          const idx = (y * W + x) * 4;
          if (inGamut) {
            img.data[idx] = Math.round(rgb.r * 255);
            img.data[idx + 1] = Math.round(rgb.g * 255);
            img.data[idx + 2] = Math.round(rgb.b * 255);
          } else {
            // 대각선 4px 단위 stripe — out-of-gamut 영역 시각화
            const stripe = (((x + y) >> 2) & 1) === 0 ? 96 : 124;
            img.data[idx] = stripe;
            img.data[idx + 1] = stripe;
            img.data[idx + 2] = stripe;
          }
          img.data[idx + 3] = 255;
        }
      }
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
  const [hexDraft, setHexDraft] = useState(hex);
  useEffect(() => { setHexDraft(hex); }, [hex]);
  // 잘못된 입력 시 popover 흔들기 — HEX commit 실패 / 붙여넣기 실패 공통
  const [shaking, setShaking] = useState(false);
  const triggerShake = useCallback(() => {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
    setTimeout(() => setShaking(false), 450);
  }, []);

  const commitHex = (raw: string) => {
    const n = normalizeHex(raw);
    if (n) {
      const next = hexToOklch(n);
      update(next);
      onChangeComplete?.(toResult(next));
    } else {
      setHexDraft(hex);
      triggerShake();
      showToast("HEX 형식이 올바르지 않습니다. 예: #ff0000", "warning");
    }
  };

  // ── Clipboard — 현재 format 으로 복사 / 어떤 format 이든 자동 파싱해서 붙여넣기 ──
  const [copied, setCopied] = useState(false);
  const [pasteFlash, setPasteFlash] = useState<"ok" | "fail" | null>(null);

  const formatForCopy = useCallback((): string => {
    switch (format) {
      case "hex": return hex;
      case "rgb": return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
      case "hsl": return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
      case "hsv": return `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`;
      case "oklch": return formatOklch(oklch);
    }
  }, [format, hex, rgb, hsl, hsv, oklch]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatForCopy());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard 권한 / 보안 컨텍스트 실패 — 조용히 무시 */
    }
  }, [formatForCopy]);

  const handlePaste = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      const next = parseAnyColorToOklch(text);
      if (next) {
        update(next);
        onChangeComplete?.(toResult(next));
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
    <button
      type="button"
      className={triggerClassName}
      style={{ ...triggerStyle, background: hex }}
      onClick={() => setOpen((v) => !v)}
      aria-label="Pick color"
    />
  );

  return (
    <>
      <span ref={triggerRef} style={{ display: "inline-flex" }}>{trigger}</span>
      {typeof window !== "undefined" && createPortal(
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
            <span className={styles.preview} style={{ "--_preview-color": hex } as CSSProperties} aria-hidden />
            <Select
              value={format}
              options={FORMAT_OPTIONS}
              onChange={(v) => setFormat(v as InputFormat)}
              variant="compact"
              size="sm"
              className={styles.formatSelect}
            />
            <Tooltip content={FORMAT_INFO[format]} placement="top">
              <button
                type="button"
                className={styles.infoButton}
                aria-label={`${format.toUpperCase()} 형식 설명`}
              >
                <Info size={14} strokeWidth={2} />
              </button>
            </Tooltip>
            <Tooltip content={copied ? "복사됨" : `현재 색을 ${format.toUpperCase()} 형식으로 클립보드에 복사`} placement="top">
              <button
                type="button"
                className={styles.infoButton}
                onClick={handleCopy}
                aria-label="색 복사"
              >
                {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
              </button>
            </Tooltip>
            <Tooltip
              content={pasteFlash === "ok" ? "붙여넣기 완료" : pasteFlash === "fail" ? "인식 못함" : "클립보드 색을 자동 인식해 적용 (HEX / RGB / HSL / HSV / OKLCH)"}
              placement="top"
            >
              <button
                type="button"
                className={styles.infoButton}
                onClick={handlePaste}
                aria-label="색 붙여넣기"
                data-flash={pasteFlash ?? undefined}
              >
                {pasteFlash === "ok" ? <Check size={14} strokeWidth={2} /> : <ClipboardPaste size={14} strokeWidth={2} />}
              </button>
            </Tooltip>
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

        </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/** 외부 value (hex 또는 oklch string) → OKLCH 객체 */
function parseAnyToOklch(input: string): OKLCH {
  const trimmed = input.trim();
  if (trimmed.startsWith("oklch")) {
    return parseOklchString(trimmed) ?? { l: 0, c: 0, h: 0 };
  }
  return hexToOklch(trimmed);
}

/** 붙여넣기용 — HEX / RGB / HSL / HSV / OKLCH 어떤 형식이든 자동 감지해 OKLCH 로 변환. 실패 시 null. */
function parseAnyColorToOklch(input: string): OKLCH | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // 1. oklch(...)
  if (s.startsWith("oklch")) return parseOklchString(s);

  // 2. hex (with or without #) — 정확히 3 또는 6 자리
  if (s.startsWith("#") || /^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(s)) {
    const n = normalizeHex(s.startsWith("#") ? s : `#${s}`);
    if (n) return hexToOklch(n);
  }

  // 3. rgb(r, g, b) / rgba(r, g, b, a) — 0~255, alpha 무시
  const rgbMatch = s.match(/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/);
  if (rgbMatch) {
    const r = clamp(parseFloat(rgbMatch[1]), 0, 255);
    const g = clamp(parseFloat(rgbMatch[2]), 0, 255);
    const b = clamp(parseFloat(rgbMatch[3]), 0, 255);
    return hexToOklch(rgbToHex({ r, g, b }));
  }

  // 4. hsl(h, s%, l%) / hsla(...)
  const hslMatch = s.match(/^hsla?\(\s*([0-9.]+)[\s,]+([0-9.]+)%?[\s,]+([0-9.]+)%?/);
  if (hslMatch) {
    const h = clamp(parseFloat(hslMatch[1]), 0, 360);
    const sat = clamp(parseFloat(hslMatch[2]), 0, 100);
    const l = clamp(parseFloat(hslMatch[3]), 0, 100);
    return hexToOklch(hslToHex({ h, s: sat, l }));
  }

  // 5. hsv(h, s%, v%) / hsb(h, s%, b%)
  const hsvMatch = s.match(/^(?:hsv|hsb)\(\s*([0-9.]+)[\s,]+([0-9.]+)%?[\s,]+([0-9.]+)%?/);
  if (hsvMatch) {
    const h = clamp(parseFloat(hsvMatch[1]), 0, 360);
    const sat = clamp(parseFloat(hsvMatch[2]), 0, 100);
    const v = clamp(parseFloat(hsvMatch[3]), 0, 100);
    return hexToOklch(hsvToHex({ h, s: sat, v }));
  }

  // 6. bare "r, g, b" — 숫자 3개 콤마 구분 (RGB 추정)
  const bare = s.match(/^([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)$/);
  if (bare) {
    const r = clamp(parseFloat(bare[1]), 0, 255);
    const g = clamp(parseFloat(bare[2]), 0, 255);
    const b = clamp(parseFloat(bare[3]), 0, 255);
    return hexToOklch(rgbToHex({ r, g, b }));
  }

  return null;
}
