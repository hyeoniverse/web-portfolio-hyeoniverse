"use client";

import React from "react";

import NumberInput from "@/components/ui/NumberInput";

import styles from "../RichTextEditor.module.css";

import { measureColumnPxs } from "./editorHtmlOps";
import { COLUMN_MIN_PX, COLUMN_MAX_PX, COLUMN_GROUP_MAX_PX, distributeInts } from "./presets";
import { showToast } from "@/stores/toastStore";

/* 열 너비 조절 컨트롤 — 툴바에서 활성 열 그룹의 폭을 px 로 조정 — PlateEditor.tsx 에서 분리 (#680). */

export function ColumnWidthControls({ colChildren, colCount, activePath, editor, language, tGroupMax }: {
  colChildren: { width?: string; widthPx?: number }[];
  colCount: number;
  activePath: number[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  language: string;
  /** editor.columnGroupMaxWidth 문구 — "{{max}}" 치환용 (드래그(elements.tsx)와 같은 문구를 공유) */
  tGroupMax: string;
}) {
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const clampPx = (w: number) => Math.min(COLUMN_MAX_PX, Math.max(COLUMN_MIN_PX, Math.round(w)));
  const pxs = measureColumnPxs(editor, activePath, colChildren.length);
  const totalPx = pxs.reduce((a, b) => a + b, 0) || 1;
  const hasPx = colChildren.some((c) => typeof c.widthPx === "number" && c.widthPx > 0);
  // % 입력 → "블록 너비 기준" 재비율(페이지에 강제로 안 맞춤). 모드 보존:
  //  · px 블록(폭 고정/오버플로): 블록 총폭 유지한 채 그 열을 v%, 나머지는 현재 비율로 px 재분배.
  //  · fill 블록(유동): 정수 %(합 100, 크래시 방지) 재분배 — 유동 채움 유지.
  const applyPercent = (idx: number, v: number) => {
    const n = colCount;
    if (hasPx) {
      const clampedV = Math.max(1, Math.min(99, Math.round(v)));
      const targetPx = Math.max(COLUMN_MIN_PX, Math.round((totalPx * clampedV) / 100));
      const otherIdxs = pxs.map((_, i) => i).filter((i) => i !== idx);
      const otherTotal = otherIdxs.reduce((a, i) => a + pxs[i], 0) || 1;
      const remaining = Math.max(0, totalPx - targetPx);
      editor.tf.withoutNormalizing(() => {
        editor.tf.setNodes({ widthPx: clampPx(targetPx) }, { at: [...activePath, idx] });
        otherIdxs.forEach((i) => editor.tf.setNodes({ widthPx: clampPx((remaining * pxs[i]) / otherTotal) }, { at: [...activePath, i] }));
      });
      return;
    }
    const clampedV = Math.max(1, Math.min(100 - (n - 1), Math.round(v))); // 나머지 열이 각 ≥1 되도록 상한 제한
    const otherIdxs = pxs.map((_, i) => i).filter((i) => i !== idx);
    const others = distributeInts(100 - clampedV, otherIdxs.map((i) => pxs[i])); // n-1 개, 합 = 100-clampedV
    const result = pxs.map(() => 0);
    result[idx] = clampedV;
    otherIdxs.forEach((i, k) => { result[i] = others[k]; });
    editor.tf.withoutNormalizing(() => {
      result.forEach((wv, j) => editor.tf.setNodes({ width: `${wv}%`, widthPx: null }, { at: [...activePath, j] }));
    });
  };
  /* px 입력 → 그 열을 정확한 px 로 고정. width(%) 는 그대로 둔다(normalizer 가 합 100 유지 → 루프 방지).

     한 열만 px 로 바꾸면 안 된다: 나머지 열은 유동(flex: weight 1 0)이라 남는 공간을 **흡수**해서
     총폭이 컨테이너(=화면) 폭에 묶인다 — 열을 넓혀도 다른 열이 줄어들 뿐 블록이 안 커진다.
     그래서 px 를 지정하는 순간, 아직 유동인 열들도 지금 렌더 폭 그대로 px 로 고정한다.
     그러면 총폭 = px 들의 합이 되어 화면보다 넓어질 수 있고, 넘치면 그룹이 가로 스크롤한다. */
  const setPxWidth = (idx: number, v: number) => {
    /* 열 하나 상한(COLUMN_MAX_PX) 안내는 공통 NumberInput 이 이미 띄우고 clamp 까지 한다 — 여기서 중복 안내 안 함.
       하지만 **블록 전체 상한**은 NumberInput 이 모른다(자기 max 는 열 하나 기준). 그래서 여기서 본다. */
    const othersSum = pxs.reduce((sum, w, i) => (i === idx ? sum : sum + w), 0);
    const groupRoom = COLUMN_GROUP_MAX_PX - othersSum;
    let applied = v;
    if (v > groupRoom) {
      applied = Math.max(COLUMN_MIN_PX, groupRoom);
      showToast(tGroupMax.replace("{{max}}", String(COLUMN_GROUP_MAX_PX)), "info");
    }
    editor.tf.withoutNormalizing(() => {
      colChildren.forEach((c, i) => {
        if (i === idx) return;
        if (typeof c?.widthPx === "number" && c.widthPx > 0) return; // 이미 px 고정
        editor.tf.setNodes({ widthPx: clampPx(pxs[i]) }, { at: [...activePath, i] });
      });
      editor.tf.setNodes({ widthPx: clampPx(applied) }, { at: [...activePath, idx] });
    });
  };
  return (
    <div className={styles.colWidthList}>
      {colChildren.map((_, i) => (
        <div key={i} className={styles.colWidthRow}>
          <span className={styles.colWidthIdx}>{i + 1}</span>
          <NumberInput value={Math.max(1, Math.round((pxs[i] / totalPx) * 100))} onCommit={(n) => applyPercent(i, n)} min={1} max={99} step={1} unit="%" width={26} height={24} ariaLabel={L(`열 ${i + 1} 너비 %`, `Column ${i + 1} width %`)} />
          <NumberInput value={clampPx(pxs[i])} onCommit={(n) => setPxWidth(i, n)} min={COLUMN_MIN_PX} max={COLUMN_MAX_PX} step={10} unit="px" width={40} height={24} ariaLabel={L(`열 ${i + 1} 너비 px`, `Column ${i + 1} width px`)} />
        </div>
      ))}
    </div>
  );
}

// 다중 블록 선택 시 — 텍스트 하이라이트 대신 블록 전체에 배경 표시.
// selection 이 두 개 이상의 top-level 블록에 걸치면 해당 블록 DOM 에 data-block-selected 부여.
