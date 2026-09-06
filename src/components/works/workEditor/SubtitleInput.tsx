"use client";

import styles from "../WorkEditor.module.css";
import { useEffect, useRef, useState } from "react";
import { clearSeoFlash } from "@/components/admin/seoFlash";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
/**
 * 부제목 input — role 영역 높이에 맞춰 stretch 되며,
 * 2줄 이상 (높이 > 1줄 임계) 이 되면 radius 를 capsule → 2xl 로 자동 morph.
 */
export function SubtitleInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [multiLine, setMultiLine] = useState(false);

  // SEO blink 리스너 unmount 시 정리
  useEffect(() => () => clearSeoFlash(), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 1줄 baseline 기준 — 1줄 size-sm(=32px) 의 1.5배 정도 넘어가면 multi-line 으로 간주
    const SINGLE_LINE_MAX = 50;
    const update = () => setMultiLine(el.offsetHeight > SINGLE_LINE_MAX);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      className={`${es.fieldInput} ${styles.subtitleInput} ${multiLine ? styles.subtitleInputMultiLine : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
