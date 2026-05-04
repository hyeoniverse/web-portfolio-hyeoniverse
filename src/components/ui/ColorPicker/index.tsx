"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  clamp,
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
  type HSV,
  type RGB,
} from "./colorMath";
import styles from "./ColorPicker.module.css";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** trigger 노드 — 클릭 시 popover 열림. 미제공이면 작은 swatch button 자동 생성 */
  children?: (ctx: { open: boolean; toggle: () => void }) => ReactNode;
  /** trigger 가 없을 때 기본 swatch 버튼의 className/style override */
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
}

/**
 * Saturation/Value pad + Hue slider + Hex/RGB input 으로 구성된 자체 color picker.
 * 브라우저 native `<input type="color">` 의 OS 별 일관성 부재를 해결.
 *
 * Trigger 는 render-prop 으로 제공 — 부모가 swatch 모양 자유롭게 결정.
 */
export default function ColorPicker({
  value,
  onChange,
  children,
  triggerClassName,
  triggerStyle,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // 현재 hex 값을 HSV 로 분해 — internal state (사용자 input 시 매끄럽게 갱신)
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  // 외부 value 가 바뀌면 sync (preset 로드 등)
  useEffect(() => {
    setHsv((prev) => {
      const incoming = hexToHsv(value);
      // 동일 hex 면 내부 hsv 유지 (사용자가 s=0 으로 가도 hue 보존)
      if (Math.abs(incoming.s - prev.s) < 1 && Math.abs(incoming.v - prev.v) < 1 && incoming.h === prev.h) return prev;
      return incoming;
    });
  }, [value]);

  const hex = hsvToHex(hsv);
  const rgb = hsvToRgb(hsv);
  // pure hue color (s=100, v=100) — SV pad 의 우상단 색
  const hueColor = hsvToHex({ h: hsv.h, s: 100, v: 100 });

  // 위치 계산
  // wrapper span 자식이 position:absolute 인 경우 wrapper 가 0×0 으로 collapse 되므로
  // firstElementChild 의 rect 를 우선 사용 (있고 크기 있을 때) — 없으면 wrapper rect fallback
  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const child = el.firstElementChild as HTMLElement | null;
    const childRect = child?.getBoundingClientRect();
    const r = childRect && (childRect.width > 0 || childRect.height > 0)
      ? childRect
      : el.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

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

  const update = useCallback((next: HSV) => {
    setHsv(next);
    onChange(hsvToHex(next));
  }, [onChange]);

  // ── SV pad drag ──
  const svRef = useRef<HTMLDivElement>(null);
  const onSvDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pad = svRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
      update({ h: hsv.h, s: Math.round(x * 100), v: Math.round((1 - y) * 100) });
    };
    move(e.nativeEvent);
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };

  // ── Hue slider drag ──
  const hueRef = useRef<HTMLDivElement>(null);
  const onHueDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = hueRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      update({ h: Math.round(x * 360), s: hsv.s, v: hsv.v });
    };
    move(e.nativeEvent);
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };

  // ── Hex input ──
  const [hexDraft, setHexDraft] = useState(hex);
  useEffect(() => { setHexDraft(hex); }, [hex]);
  const commitHex = (raw: string) => {
    const n = normalizeHex(raw);
    if (n) update(hexToHsv(n));
    else setHexDraft(hex);
  };

  // ── RGB input ──
  const onRgbChange = (channel: keyof RGB, raw: string) => {
    const num = clamp(parseInt(raw, 10) || 0, 0, 255);
    const next = { ...rgb, [channel]: num };
    update(rgbToHsv(next));
    setHexDraft(rgbToHex(next));
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
      {open && pos && typeof window !== "undefined" && createPortal(
        <div
          ref={popRef}
          className={styles.popover}
          style={{ top: pos.top, left: pos.left }}
          // 내부 클릭이 외부 닫힘 트리거 안 되게
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            ref={svRef}
            className={styles.svPad}
            style={{ "--_hue-color": hueColor } as CSSProperties}
            onPointerDown={onSvDown}
          >
            <span
              className={styles.svThumb}
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                "--_thumb-color": hex,
              } as CSSProperties}
            />
          </div>
          <div
            ref={hueRef}
            className={styles.hueSlider}
            onPointerDown={onHueDown}
          >
            <span
              className={styles.hueThumb}
              style={{ left: `${(hsv.h / 360) * 100}%`, "--_hue-color": hueColor } as CSSProperties}
            />
          </div>
          <div className={styles.inputs}>
            <span className={styles.preview} style={{ "--_preview-color": hex } as CSSProperties} aria-hidden />
            <input
              type="text"
              className={styles.hexInput}
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitHex(e.currentTarget.value); }}
              spellCheck={false}
            />
          </div>
          <div className={styles.rgbRow}>
            {(["r", "g", "b"] as const).map((ch) => (
              <label key={ch} className={styles.rgbField}>
                <input
                  type="number"
                  min={0}
                  max={255}
                  className={styles.rgbInput}
                  value={Math.round(rgb[ch])}
                  onChange={(e) => onRgbChange(ch, e.target.value)}
                />
                <span className={styles.rgbLabel}>{ch}</span>
              </label>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
