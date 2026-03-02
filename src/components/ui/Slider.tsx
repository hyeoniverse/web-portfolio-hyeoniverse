"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const dragging = useRef<number | null>(null);

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

  const updateValue = useCallback(
    (idx: number, newVal: number) => {
      const next = [...values];
      next[idx] = newVal;

      // range 모드: thumb 교차 방지
      if (next.length === 2) {
        if (idx === 0 && next[0] > next[1]) next[0] = next[1];
        if (idx === 1 && next[1] < next[0]) next[1] = next[0];
      }

      if (!controlledValue) setInternalValue(next);
      onValueChange?.(next);
    },
    [values, controlledValue, onValueChange]
  );

  useEffect(() => {
    if (dragging.current === null) return;

    const onMove = (e: PointerEvent) => {
      if (dragging.current === null) return;
      updateValue(dragging.current, getValueFromPointer(e.clientX));
    };

    const onUp = () => {
      dragging.current = null;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [getValueFromPointer, updateValue]);

  const handleThumbDown = (idx: number) => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragging.current = idx;
    document.body.style.userSelect = "none";
  };

  const handleTrackClick = (e: React.PointerEvent) => {
    if (disabled) return;
    const val = getValueFromPointer(e.clientX);
    // 가장 가까운 thumb에 적용
    let closestIdx = 0;
    if (values.length > 1) {
      const distances = values.map((v) => Math.abs(v - val));
      closestIdx = distances[0] <= distances[1] ? 0 : 1;
    }
    updateValue(closestIdx, val);
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
          style={{ left: `calc(${pct(v)}% - 8px)` }}
          onPointerDown={handleThumbDown(i)}
        />
      ))}
    </div>
  );
}

export { Slider };
