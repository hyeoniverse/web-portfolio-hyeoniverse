"use client";

import React, { useState, useEffect } from "react";
import { insertTableMergeRow } from "@platejs/table";
import styles from "../../RichTextEditor.module.css";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/providers/LanguageProvider";
import { GripVertical, GripHorizontal, Grid2x2, Plus } from "@/components/icons";
import { findScrollParent } from "./tableFreeze";
import { addColumnAtEnd, applyHeaderToNewLine, recomputeTableIndices, selectLastRowCell, selectTableAll, selectTableColumn, selectTableRow } from "./tableSelection";

/**
 * 표 가장자리에 붙는 손잡이 — 행·열을 고르는 띠와, 행·열을 더하는 단추.
 *
 * 표 바깥으로 튀어나온 자리에 그리므로 표를 감싸는 상자를 기준으로 위치를 잡는다.
 * 무엇을 고를지는 tableSelection 이 정하고, 여기서는 그리기와 누름만 맡는다.
 */

// 열 선택 핸들 — 셀 안(첫 행). 행/전체 핸들은 스크롤 밖 rail(아래 SelectRail)에서 렌더.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CellSelectHandles({ editor, element, rowIndex }: { editor: any; element: any; rowIndex: number }) {
  const { t } = useLanguage();
  if (rowIndex !== 0) return null;
  const onCol = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { const p = editor.api.findPath(element); if (p) selectTableColumn(editor, Array.from(p) as number[]); } catch { /* noop */ }
  };
  return (
    <div className={styles.tblColSelect} data-col-handle contentEditable={false} data-cursor="pointer" title={t("editor.selectColumn")} onMouseDown={onCol}>
      <GripHorizontal size={11} strokeWidth={2} />
    </div>
  );
}

// 행/전체 선택 rail — 스크롤 컨테이너 바깥(wrapper)에 렌더. 각 행 y 중앙 + 좌상단(전체).
// 세로 스크롤이 없어 행 y는 정적 — 리사이즈/내용 변경 시 재측정.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TableSelectRail({ editor, tablePath, wrapRef, freezeRows = 0 }: { editor: any; tablePath: number[] | null; wrapRef: React.RefObject<HTMLDivElement | null>; freezeRows?: number }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<{ y: number; hidden: boolean }[]>([]);
  // hover 중이거나 셀이 선택된 행 인덱스 — 그 행 핸들만 노출(모든 핸들 동시 노출 방지)
  const [active, setActive] = useState<number[]>([]);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0, lastX: number | undefined, lastY: number | undefined;
    const compute = () => {
      raf = 0;
      const table = wrap.querySelector("table"); if (!table) return;
      const trs = Array.from(table.querySelectorAll(":scope > tbody > tr"));
      // 행 핸들 — 그 행 Y범위에 마우스가 있거나(가로 전체 감지) 그 행 셀이 선택됐을 때
      const set = new Set<number>();
      trs.forEach((tr, i) => {
        const r = tr.getBoundingClientRect();
        if (lastY != null && lastY >= r.top && lastY <= r.bottom) set.add(i);
        if (tr.querySelector("[data-cell-selected]")) set.add(i);
      });
      const arr = Array.from(set).sort((a, b) => a - b);
      setActive((prev) => (prev.length === arr.length && prev.every((v, k) => v === arr[k]) ? prev : arr));
      // 열 핸들 — 그 열 X범위에 마우스가 있거나(세로 전체 감지) 그 열 셀이 선택됐을 때 (핸들은 첫 행에 있지만 열 전체로 감지)
      const tr0 = table.getBoundingClientRect();
      const inY = lastY != null && lastY >= tr0.top && lastY <= tr0.bottom;
      table.querySelectorAll("[data-col-handle]").forEach((el) => {
        const h = el as HTMLElement;
        const cell = h.closest("td, th") as HTMLElement | null;
        if (!cell) return;
        const r = cell.getBoundingClientRect();
        const on = (inY && lastX != null && lastX >= r.left && lastX <= r.right) || cell.hasAttribute("data-cell-selected");
        if (on) h.setAttribute("data-col-active", ""); else h.removeAttribute("data-col-active");
      });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(compute); };
    const onMove = (e: MouseEvent) => { lastX = e.clientX; lastY = e.clientY; schedule(); };
    const onLeave = () => { lastX = undefined; lastY = undefined; schedule(); };
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    const mo = new MutationObserver(schedule); // 셀 선택(data-cell-selected) 변화 추적
    mo.observe(wrap, { attributes: true, subtree: true, attributeFilter: ["data-cell-selected"] });
    compute();
    return () => { wrap.removeEventListener("mousemove", onMove); wrap.removeEventListener("mouseleave", onLeave); mo.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [wrapRef]);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sp = findScrollParent(wrap); // 에디터 세로 스크롤 컨테이너(band 판정용)
    let raf = 0;
    const measure = () => {
      raf = 0;
      const table = wrap.querySelector("table");
      if (!table) return;
      const wrapRect = wrap.getBoundingClientRect();
      const trs = Array.from(table.querySelectorAll(":scope > tbody > tr"));
      // 보이는 영역(band, 뷰포트 기준) 밖의 행 핸들은 숨김. 고정 행 블록 아래부터(그 뒤로 스크롤된 행 핸들 숨김).
      //  고정 행은 셀 transform 으로 pin 되어 tr rect 엔 안 잡히므로 pin offset 을 직접 더해 시각 위치 계산.
      const spRect = sp ? sp.getBoundingClientRect() : null;
      let bandTopVp = spRect ? spRect.top : -Infinity;
      const bandBotVp = spRect ? spRect.bottom : Infinity;
      const nFreeze = Math.min(freezeRows, trs.length);
      let pinOff = 0;
      if (nFreeze > 0) {
        const first = (trs[0] as HTMLElement).getBoundingClientRect();
        const pinLine = (spRect ? spRect.top : 0) + 10; // PIN_INSET
        pinOff = Math.max(0, pinLine - first.top);
        const last = (trs[nFreeze - 1] as HTMLElement).getBoundingClientRect();
        bandTopVp = Math.max(bandTopVp, last.bottom + pinOff); // 고정 블록 pin 된 하단
      }
      const next = trs.map((tr, i) => {
        const r = tr.getBoundingClientRect();
        const frozen = i < nFreeze;
        const vTop = frozen ? r.top + pinOff : r.top;    // 고정 행은 pin 위치
        const y = vTop - wrapRect.top + r.height / 2;    // rail 위치(wrap 기준)
        const vpc = vTop + r.height / 2;                 // 뷰포트 기준(숨김 판정)
        const hidden = frozen ? false : (vpc < bandTopVp + 1 || vpc > bandBotVp - 1);
        return { y, hidden };
      });
      setRows((prev) => (prev.length === next.length && prev.every((v, i) => Math.abs(v.y - next[i].y) < 0.5 && v.hidden === next[i].hidden) ? prev : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    const rafId = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    // scroll 은 버블 안 하므로 capture 단계로 잡아 중첩 스크롤(editorContent 등)까지 재측정. + resize.
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId); if (raf) cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
    };
  }, [wrapRef, freezeRows]);
  if (!tablePath) return null;
  const selRow = (e: React.MouseEvent, i: number) => {
    e.preventDefault(); e.stopPropagation();
    selectTableRow(editor, [...tablePath, i, 0]);
  };
  const selAll = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    selectTableAll(editor, [...tablePath, 0, 0]);
  };
  return (
    <div className={styles.tblSelectRail} contentEditable={false}>
      <div className={styles.tblAllSelect} data-cursor="pointer" title={t("editor.selectTable")} onMouseDown={selAll}>
        <Grid2x2 size={11} strokeWidth={2} />
      </div>
      {rows.map((row, i) => row.hidden ? null : (
        <div key={i} className={styles.tblRowSelect} style={{ position: "absolute", top: row.y }} data-row-active={active.includes(i) ? "" : undefined} data-cursor="pointer" title={t("editor.selectRow")} onMouseDown={(e) => selRow(e, i)}>
          <GripVertical size={11} strokeWidth={2} />
        </div>
      ))}
    </div>
  );
}
// ── 행/열 추가 버튼 스타일 ──
/** 행/열 추가 버튼 크기(px) — 행·열 버튼 동일 */
const TBL_ADD_BTN = 22;

const addBtnBase: React.CSSProperties = {
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-color-light)",
  color: "var(--text-muted)",
  cursor: "pointer",
  opacity: 0,
  transition: "opacity 0.15s",
  zIndex: 4,
  padding: 0,
  fontSize: 19,
  lineHeight: 1,
  fontWeight: 400,
};

/** 열 추가 버튼(고정/비고정 공용) — 표 우측 끝 바로 옆(거터)에 위치하는 hover 존(행추가 버튼과 동일 패턴).
 *  표 rect 를 측정해 표 우측을 따라다니므로 표 위 콘텐츠에 절대 안 겹침. 평소 숨김 → hover 시 + 버튼 노출.
 *  표가 넓어 가로 스크롤 중이면 우측 끝이 화면 밖 → 스크롤로 우측 끝을 보이게 하면 그때 hover 로 접근. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AddColumnRail({ editor, tableElement, wrapRef }: { editor: any; tableElement: any; wrapRef: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useLanguage();
  const { isTouch } = useIsMobile();
  const [box, setBox] = useState<{ left: number; top: number; height: number } | null>(null);
  const [show, setShow] = useState(false);
  // 터치: hover 없음 → 열추가 버튼 상시 노출
  const shown = show || isTouch;
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const GAP = 4; // 표 우측과 버튼 사이 간격(거터)
    let raf = 0;
    const measure = () => {
      raf = 0;
      const table = wrap.querySelector("table");
      if (!table) return;
      const wr = wrap.getBoundingClientRect();
      const tr = table.getBoundingClientRect();
      const top = tr.top - wr.top;
      const height = tr.height;
      const left = (tr.right - wr.left) + GAP; // 표 우측 끝 바로 옆(거터) — 스크롤에 따라 표를 따라다님
      setBox((p) => (p && Math.abs(p.left - left) < 0.5 && Math.abs(p.top - top) < 0.5 && Math.abs(p.height - height) < 0.5 ? p : { left, top, height }));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    const rafId = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    // .tblScroll 가로 스크롤은 버블 안 하므로 capture 로 잡음. + resize.
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId); if (raf) cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
    };
  }, [wrapRef]);
  if (!box) return null;
  return (
    <div
      contentEditable={false}
      data-table-add-btn
      data-clickable
      role="button"
      aria-label={t("editor.addColRight")}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); addColumnAtEnd(editor, tableElement); }}
      style={{ position: "absolute", left: box.left, top: box.top, height: box.height, width: TBL_ADD_BTN, cursor: "pointer", zIndex: 15 }}
    >
      <div style={{
        ...addBtnBase,
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 999,
        // 평소 숨김 → hover 시 표 우측 끝에서 가로로 펼쳐지며 노출(접힐 땐 반대). 행추가 버튼과 동일한 reveal 성격.
        transformOrigin: "left center",
        transform: shown ? "scaleX(1)" : "scaleX(0.35)",
        opacity: shown ? 1 : 0,
        transition: "opacity 0.16s ease, transform 0.16s ease",
      }}><Plus size={14} /></div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AddRowBtn({ editor, tableElement, hovered }: { editor: any; tableElement: any; hovered: boolean }) {
  // hover 존(부모 wrapper)이 높이/hover 상태를 제어 → 버튼은 그 영역을 절대배치로 채우기만.
  const { t } = useLanguage();
  return (
    <div
      contentEditable={false}
      data-table-add-btn
      data-clickable
      role="button"
      aria-label={t("editor.addRowBelow")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // 마지막 행 아래에 추가
        try {
          const tp = editor.api.findPath(tableElement);
          selectLastRowCell(editor, tableElement);
          recomputeTableIndices(editor);
          insertTableMergeRow(editor);
          applyHeaderToNewLine(editor, tp ? Array.from(tp) : null, "row");
        } catch { /* ignore */ }
      }}
      style={{
        position: "absolute",
        inset: 0,
        cursor: "pointer",
      }}
    >
      <div style={{
        ...addBtnBase,
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 999,
        opacity: hovered ? 1 : 0,
      }}><Plus size={14} /></div>
    </div>
  );
}
