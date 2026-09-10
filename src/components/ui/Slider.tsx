"use client";

import { useState, useRef, useCallback } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import styles from "./Slider.module.css";
import { cn } from "@/utils";

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

function Slider({
  value: controlledValue,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(
    () => controlledValue ?? defaultValue ?? [min]
  );
  const values = controlledValue ?? internalValue;
  const trackRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef(values);
  useSyncRef(valuesRef, values);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const quantize = (v: number) => Math.round((v - min) / step) * step + min;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const getValueFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return clamp(quantize(min + ratio * (max - min)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step]
  );

  const doUpdate = useCallback(
    (idx: number, newVal: number) => {
      const prev = valuesRef.current;
      const next = [...prev];
      next[idx] = newVal;

      // range 모드: thumb 교차 방지
      if (next.length === 2) {
        if (idx === 0 && next[0] > next[1]) next[0] = next[1];
        if (idx === 1 && next[1] < next[0]) next[1] = next[0];
      }

      if (!controlledValue) setInternalValue(next);
      onValueChange?.(next);
    },
    [controlledValue, onValueChange]
  );

  const startDrag = useCallback(
    (idx: number, e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        doUpdate(idx, getValueFromPointer(ev.clientX));
      };

      const onUp = () => {
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [disabled, doUpdate, getValueFromPointer]
  );

  const handleTrackClick = (e: React.PointerEvent) => {
    if (disabled) return;
    const val = getValueFromPointer(e.clientX);
    // 가장 가까운 thumb에 적용
    let closestIdx = 0;
    if (values.length > 1) {
      const distances = values.map((v) => Math.abs(v - val));
      closestIdx = distances[0] <= distances[1] ? 0 : 1;
    }
    doUpdate(closestIdx, val);
    startDrag(closestIdx, e);
  };

  // range 계산
  const rangeLeft = values.length === 1 ? 0 : pct(values[0]);
  const rangeRight = pct(values[values.length - 1]);

  return (
    <div
      className={cn(styles.root, className)}
      data-disabled={disabled || undefined}
    >
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={handleTrackClick}
      >
        <div
          className={styles.range}
          style={{
            left: `${rangeLeft}%`,
            width: `${rangeRight - rangeLeft}%`,
          }}
        />
      </div>
      {values.map((v, i) => (
        <div
          key={i}
          className={styles.thumb}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={v}
          aria-disabled={disabled}
          data-draggable
          style={{ left: `calc(${pct(v)}% - 8px)` }}
          onPointerDown={(e) => startDrag(i, e)}
          onKeyDown={(e) => {
            if (disabled) return;
            let newVal = v;
            switch (e.key) {
              case "ArrowRight":
              case "ArrowUp":
                newVal = clamp(v + step);
                break;
              case "ArrowLeft":
              case "ArrowDown":
                newVal = clamp(v - step);
                break;
              case "Home":
                newVal = min;
                break;
              case "End":
                newVal = max;
                break;
              default:
                return;
            }
            e.preventDefault();
            doUpdate(i, newVal);
          }}
        />
      ))}
    </div>
  );
}

export { Slider };
