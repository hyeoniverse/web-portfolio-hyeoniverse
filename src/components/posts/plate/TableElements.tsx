"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { CAPTION_EDIT_EVENT } from "./constants";
import { PlateElement, type PlateElementProps, useEditorRef, useEditorSelector } from "platejs/react";
import { TableProvider, TablePlugin, useTableColSizes, useTableElement, useSelectedCells } from "@platejs/table/react";
import { setTableColSize } from "@platejs/table";
import { InlineCaption } from "./elements/shared";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { BlockTailClickZone } from "./elements/shared";
import styles from "../RichTextEditor.module.css";
import { useIsMobile } from "@/hooks/useIsMobile";
import { COL_NOT_FROZEN, FREEZE_MAX_RATIO, TBL_STICKY_LINE, TableFreezeCtx, findScrollParent } from "./table/tableFreeze";
import { AddColumnRail, AddRowBtn, TableSelectRail } from "./table/TableRails";

// 바깥(도구 모음·플러그인)에서 쓰던 이름을 그대로 유지한다 — 나누기 전과 부르는 쪽이 같다.
export { TableCellElement, TableCellHeaderElement } from "./table/TableCell";
export { recomputeTableIndices, fixZeroColSizes } from "./table/tableSelection";

// ── 테이블 엘리먼트 (colgroup + tbody + 가로스크롤 래핑) ──
// TableProvider를 바깥에 감싸야 useTableElement / useTableColSizes가 store에 접근 가능
export function TableElement(props: PlateElementProps) {
  return (
    <TableProvider>
      <TableElementInner {...props} />
    </TableProvider>
  );
}

function TableElementInner({ children, attributes, style, element }: PlateElementProps) {
  const { isTouch } = useIsMobile();
  const editor = useEditorRef();
  const { props: tableProps } = useTableElement();
  // Plate v53: useTableElement 반환에서 isSelectingCell 가 빠지고 plugin API 로 이동.
  // 타입 정의 상 isSelectingCell 이 intersection 의 한쪽에만 있어서 unknown 으로 우회 cast.
  const isSelectingCell = useEditorSelector(
    (e) => (e.getApi(TablePlugin).table as unknown as { isSelectingCell: () => boolean }).isSelectingCell(),
    [],
  );
  const rawColSizes = useTableColSizes();
  const colSizes = Array.isArray(rawColSizes) ? rawColSizes : [];
  useSelectedCells();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const initializedRef = useRef(false);

  const el = element as Record<string, unknown>;
  const caption = (el.caption as string) || "";
  const borderColor = (el.borderColor as string) || "var(--border-color-light)";
  const borderStyle = (el.borderStyle as string) || "solid";
  const borderWidth = (el.borderWidth as string) || "1px";
  const [captionEditing, setCaptionEditing] = useState(false);
  const [rowBtnHovered, setRowBtnHovered] = useState(false);
  // 행 추가 + 버튼 — 커서가 벗어나도 잠깐 유지(grace delay) → 좁은 영역에서 바로 닫혀 깜빡이는 것 방지
  const rowBtnTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRowBtn = React.useCallback(() => { if (rowBtnTimer.current) { clearTimeout(rowBtnTimer.current); rowBtnTimer.current = null; } setRowBtnHovered(true); }, []);
  const closeRowBtnDelayed = React.useCallback(() => {
    if (rowBtnTimer.current) clearTimeout(rowBtnTimer.current);
    rowBtnTimer.current = setTimeout(() => setRowBtnHovered(false), 400);
  }, []);
  // 터치: hover 없음 → 행추가 버튼(밴드) 상시 노출
  const rowBtnShown = rowBtnHovered || isTouch;
  React.useEffect(() => () => { if (rowBtnTimer.current) clearTimeout(rowBtnTimer.current); }, []);
  // 열 고정 누적 left(px) — CSS sticky-left offset. (행 pin·stuck 구분선은 스크롤 중 DOM 직접 처리)
  const [colLefts, setColLefts] = useState<number[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  // 캡션 input 은 (1) 이미 캡션이 있거나 (2) 툴바의 "캡션 추가" 버튼을 눌러 편집을 시작했을 때만 렌더.
  // 단순 선택만으로는 뜨지 않는다.
  const showCaption = !!(caption || captionEditing);

  // 툴바 캡션 버튼 → 표 DOM 노드에서 커스텀 이벤트가 버블 → 편집 모드 진입 + input focus.
  // (버튼 클릭 시 selection 이 표에서 벗어나 input 이 아직 없어도, 여기서 먼저 렌더시킨 뒤 focus)
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const handler = () => {
      setCaptionEditing(true);
      requestAnimationFrame(() => {
        const input = node.querySelector("[data-img-caption]") as HTMLElement | null;
        if (input) {
          input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          setTimeout(() => input.focus(), 0);
        }
      });
    };
    node.addEventListener(CAPTION_EDIT_EVENT.table, handler);
    return () => node.removeEventListener(CAPTION_EDIT_EVENT.table, handler);
  }, []);

  const setTableAttr = useCallback((attrs: Record<string, unknown>) => {
    const path = editor.api.findPath(element);
    if (path) editor.tf.setNodes(attrs, { at: path });
  }, [editor, element]);

  // colSizes가 모두 0이면 컨테이너 너비 기반으로 균등 분배해 초기화
  // (예전엔 minWidth:100% + cells[i].offsetWidth 측정 방식이었으나, 셀 stretched 너비를 사용하다 보니
  //  열추가 후 inline-block 의 minWidth 100% 가 table 보다 커져서 열추가 버튼 사이에 큰 여백이 생겼음)
  useEffect(() => {
    if (initializedRef.current) return;
    if (!tableRef.current) return;
    const allZero = colSizes.every((s) => !s);
    if (!allZero) { initializedRef.current = true; return; }
    const firstRow = tableRef.current.querySelector("tbody > tr");
    if (!firstRow) return;
    const numCols = firstRow.children.length;
    if (numCols === 0) return;

    const scrollContainer = tableRef.current.parentElement?.parentElement as HTMLElement | null;
    const containerWidth = scrollContainer?.clientWidth ?? 600;
    const available = Math.max(200, containerWidth - 26 /* paddingRight */);
    const targetWidth = Math.floor(available / numCols);

    const tablePath = editor.api.findPath(element);
    if (!tablePath) return;
    for (let i = 0; i < numCols; i++) {
      setTableColSize(editor, { colIndex: i, width: targetWidth }, { at: tablePath });
    }
    initializedRef.current = true;
  });

  // colSizes 합계로 테이블 너비 결정 (마지막 열 리사이즈 시 표 자체가 늘어남)
  const allSet = colSizes.length > 0 && colSizes.every((s) => s > 0);
  const totalWidth = allSet ? colSizes.reduce((sum, w) => sum + w, 0) : undefined;
  // 화면 너비 맞춤은 이제 "일회성 실행"(툴바 버튼) — 열 너비를 그때 계산해 저장하므로 상시 fit 모드/상태 없음.
  const freezeRows = typeof el.freezeRows === "number" ? (el.freezeRows as number)
    : (el.freezeRow === true || el.freezeHeader === true ? 1 : 0);
  const freezeCols = typeof el.freezeCols === "number" ? (el.freezeCols as number)
    : (el.freezeCol === true ? 1 : 0);
  const rowFreeze = freezeRows > 0;
  const colFreeze = freezeCols > 0;
  const anyFreeze = rowFreeze || colFreeze;
  // 가로는 .tblScroll overflow-x auto 가 공간 부족 시 스크롤. 행은 JS transform pin.
  const scrollOverflow: React.CSSProperties = {};

  // 고정 처리 — 열 sticky-left offset(React 상태) + 행 pin(transform) + stuck 구분선/마스크(box-shadow).
  //  부드러움: 스크롤 중 "연속 rAF 루프"로 매 프레임 scrollTop 을 폴링해 적용(스크롤 이벤트 지연 제거).
  //  측정값은 캐시(reflow 없음), stuck 구분선도 DOM 직접(React 리렌더 없음).
  useEffect(() => {
    if (!anyFreeze) { setColLefts((p) => (p.length ? [] : p)); return; }
    const wrap = wrapRef.current; if (!wrap) return;
    const table = wrap.querySelector("table") as HTMLTableElement | null; if (!table) return;
    const scrollEl = wrap.querySelector("[data-tbl-scroll]") as HTMLElement | null;
    const sp = findScrollParent(wrap);
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.5);
    const PIN_INSET = 10; // 헤더를 핀 라인보다 이만큼 아래에 → 위 여백에 열 선택 핸들 노출
    let base = 0, maxOff = 0, blockH = 0, rowCells: HTMLElement[] = [];
    let edges: { c: HTMLElement; fr: boolean; fc: boolean; t: boolean; b: boolean; l: boolean; r: boolean }[] = [];
    let colHandles: { h: HTMLElement; cell: HTMLElement; frozen: boolean }[] = [];
    const applyAt = (s: number) => {
      const off = freezeRows > 0 ? Math.max(0, Math.min(s - base, maxOff)) : 0;
      const tf = off > 0.5 ? `translate3d(0,${off}px,0)` : "";
      for (const c of rowCells) c.style.transform = tf;
      const rowStuck = off > 0.5;
      const colStuck = colFreeze && !!scrollEl && scrollEl.scrollLeft > 0;
      // 스크롤로 고정 블록 뒤에 가려진 비고정 열의 열-핸들은 숨김(핸들이 z 높아 고정 블록 위로 삐져나오므로).
      //  핸들 중심이 고정 블록 오른쪽 경계보다 왼쪽(뒤)이면 숨김. 부분적으로 가려진 열도 처리.
      if (colHandles.length) {
        const boundary = colStuck ? edges.find((e) => e.r)?.c : null;
        const frozenRight = boundary ? boundary.getBoundingClientRect().right : -Infinity;
        for (const { h, frozen } of colHandles) {
          const hr = h.getBoundingClientRect();
          const hide = colStuck && !frozen && (hr.left + hr.right) / 2 < frozenRight;
          h.style.visibility = hide ? "hidden" : "";
        }
      }
      for (const e of edges) {
        // 불투명 배경 — stuck(스크롤) 됐을 때만. 정지 시엔 투명(일반 셀처럼) → 배경색 안 바뀜.
        //  셀 자체 배경(el.background/헤더 tint, 반투명 가능)을 불투명 base(--bg-primary) 위에 얹어 완전 불투명화.
        const needBg = (e.fr && rowStuck) || (e.fc && colStuck);
        if (needBg) {
          const cellBg = e.c.style.backgroundColor || "var(--bg-primary)";
          e.c.style.backgroundImage = `linear-gradient(${cellBg}, ${cellBg}), linear-gradient(var(--bg-primary), var(--bg-primary))`;
        } else e.c.style.backgroundImage = "";
        const parts: string[] = [];
        // 상단/좌측(고정 블록 바깥 모서리)은 셀 자체 테두리(1px)가 이미 있으니 마스크만.
        // 스크롤 경계(하단=행 고정, 우측=열 고정)만 2px 구분선 — 인접 셀 테두리가 스크롤로 사라지므로.
        if (rowStuck && e.t) parts.push(`0 -${PIN_INSET + 8}px 0 0 var(--bg-primary)`);
        if (rowStuck && e.b) parts.push(`inset 0 -2px 0 ${TBL_STICKY_LINE}`);
        if (colStuck && e.r) parts.push(`inset -2px 0 0 ${TBL_STICKY_LINE}`);
        e.c.style.boxShadow = parts.join(", ");
      }
    };
    // 연속 rAF 루프 — 스크롤 중 매 프레임 폴링(이벤트 지연 없이 컴포지터와 근접 동기), idle 시 정지.
    //  세로(행 pin) + 가로(열 경계)를 모두 추적 — 가로만 스크롤해도 루프가 살아 border 갱신.
    let looping = false, idle = 0, lastS = NaN, lastL = NaN, rafId = 0;
    const readS = () => (sp ? sp.scrollTop : window.scrollY);
    const frame = () => {
      const s = readS();
      const l = scrollEl ? scrollEl.scrollLeft : 0;
      if (s !== lastS || l !== lastL) { lastS = s; lastL = l; idle = 0; applyAt(s); } else idle++;
      if (idle > 6) { looping = false; return; }
      rafId = requestAnimationFrame(frame);
    };
    // base(표의 스크롤-콘텐츠 상 위치)만 가볍게 재계산 — 표 크기 그대로여도 위 블록 reflow 로 위치만
    // 바뀐 경우(ResizeObserver 가 못 잡음)를 스크롤 시작마다 보정. transform/state 는 안 건드려 flicker 없음.
    const refreshBase = () => {
      const rect = table.getBoundingClientRect();
      maxOff = Math.max(0, rect.height - blockH);
      base = (sp ? rect.top - sp.getBoundingClientRect().top + sp.scrollTop : rect.top + window.scrollY) - PIN_INSET;
    };
    const onScroll = () => { if (!looping) { looping = true; idle = 0; refreshBase(); rafId = requestAnimationFrame(frame); } };
    const measure = () => {
      // 이전 인라인 스타일 정리(리사이즈로 sticky 열 구성이 바뀌면 잔상 방지)
      for (const c of rowCells) c.style.transform = "";
      for (const e of edges) { e.c.style.boxShadow = ""; e.c.style.backgroundImage = ""; }
      const trs = Array.from(table.querySelectorAll(":scope > tbody > tr")) as HTMLElement[];
      const frozenRows = trs.slice(0, freezeRows);
      rowCells = frozenRows.flatMap((tr) => Array.from(tr.children) as HTMLElement[]);
      const firstCells = trs[0] ? Array.from(trs[0].children) : [];
      // 열 sticky offset — 고정 열 합이 표시 너비의 FREEZE_MAX_RATIO 를 넘으면 왼쪽 고정 열부터 sticky 해제(-1),
      //  오른쪽(마지막) 고정 열 우선 유지. 스크롤 영역은 항상 (1-RATIO) 이상 확보. 최소 1개(마지막)는 유지.
      const nCols = firstCells.length;
      const colLefts: number[] = new Array(nCols).fill(COL_NOT_FROZEN);
      if (freezeCols > 0 && nCols > 0) {
        const widths = firstCells.map((c) => (c as HTMLElement).getBoundingClientRect().width);
        const view = scrollEl ? scrollEl.clientWidth : 0;
        const budget = view > 0 ? view * FREEZE_MAX_RATIO : Infinity;
        // 오른쪽(마지막)부터 왼쪽으로, budget 안에 들어가는 만큼만 유지.
        let start = freezeCols, acc = 0;
        for (let j = freezeCols - 1; j >= 0; j--) {
          if (acc + (widths[j] || 0) <= budget) { acc += widths[j] || 0; start = j; } else break;
        }
        if (start === freezeCols) {
          // 마지막 열조차 budget 초과 → 그 열만 negative sticky 로 오른쪽 budget폭만 고정(왼쪽은 스크롤)
          colLefts[freezeCols - 1] = Math.min(0, budget - (widths[freezeCols - 1] || 0));
        } else {
          let left = 0;
          for (let j = start; j < freezeCols; j++) { colLefts[j] = left; left += widths[j] || 0; }
        }
      }
      setColLefts((prev) => (same(prev, colLefts) ? prev : colLefts));
      const colStart = colLefts.findIndex((v) => v < COL_NOT_FROZEN); // 실제 sticky 시작 열
      edges = [];
      trs.forEach((tr, i) => Array.from(tr.children).forEach((cell, j) => {
        const fr = i < freezeRows, fc = colLefts[j] < COL_NOT_FROZEN;
        if (!fr && !fc) return;
        edges.push({ c: cell as HTMLElement, fr, fc, t: fr && i === 0, b: fr && i === freezeRows - 1, l: fc && j === colStart, r: fc && j === freezeCols - 1 });
      }));
      // 열-핸들(첫 행 셀) 목록 — 고정 블록 뒤로 가려질 때 숨기려고
      for (const { h } of colHandles) h.style.visibility = "";
      colHandles = [];
      if (trs[0]) Array.from(trs[0].children).forEach((cell, j) => {
        const h = (cell as HTMLElement).querySelector("[data-col-handle]") as HTMLElement | null;
        if (h) colHandles.push({ h, cell: cell as HTMLElement, frozen: colLefts[j] < COL_NOT_FROZEN });
      });
      blockH = 0; frozenRows.forEach((tr) => { blockH += tr.getBoundingClientRect().height; });
      const rect = table.getBoundingClientRect();
      maxOff = Math.max(0, rect.height - blockH);
      // base = 표 상단 콘텐츠 좌표 - PIN_INSET → off = scrollTop - base (핀 라인보다 PIN_INSET 아래에 붙음)
      base = (sp ? rect.top - sp.getBoundingClientRect().top + sp.scrollTop : rect.top + window.scrollY) - PIN_INSET;
      lastS = NaN; lastL = NaN; applyAt(readS());
    };
    measure();
    // 초기 레이아웃이 늦게 안정될 때(폰트·이미지·에디터 하이드레이션) base 재측정.
    //  특히 새로고침은 스크롤 위치를 복원해서, 표가 이미 스크롤된 채 마운트되면 정지 상태에서도 pin 이 틀어진다.
    let settleCancelled = false;
    const remeasure = () => { if (!settleCancelled) measure(); };
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(remeasure));
    document.fonts?.ready.then(remeasure).catch(() => {});
    window.addEventListener("load", remeasure);
    const vt: Window | HTMLElement = sp || window;
    vt.addEventListener("scroll", onScroll, { passive: true });
    if (scrollEl) scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    const ro = new ResizeObserver(measure); ro.observe(table); if (sp) ro.observe(sp);
    return () => {
      settleCancelled = true;
      cancelAnimationFrame(raf2);
      window.removeEventListener("load", remeasure);
      vt.removeEventListener("scroll", onScroll);
      if (scrollEl) scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      for (const c of rowCells) { c.style.transform = ""; c.style.boxShadow = ""; }
      for (const e of edges) { e.c.style.boxShadow = ""; e.c.style.backgroundImage = ""; }
      for (const { h } of colHandles) h.style.visibility = "";
    };
  }, [freezeRows, freezeCols, anyFreeze, colFreeze]);
  // 헤더 전용 스타일 — 표 레벨 CSS 변수로 th 에 주입 (미지정 시 th 기본값 사용)
  const headerBg = el.headerBg as string | undefined;
  const headerColor = el.headerColor as string | undefined;
  const headerBold = el.headerBold; // undefined = 기본 굵게 / false = 보통

  // attributes.ref와 tableRef를 합침
  const mergedRef = useCallback((node: HTMLTableElement | null) => {
    tableRef.current = node;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrRef = (attributes as any).ref;
    if (typeof attrRef === "function") attrRef(node);
    else if (attrRef) attrRef.current = node;
  }, [attributes]);

  const elPath = (() => { try { const p = editor.api.findPath(element); return p ? Array.from(p) : null; } catch { return null; } })();

  const { blockDragProps } = useBlockDrag(elPath);

  return (
    <BlockDropZone path={elPath}>
    <TableFreezeCtx.Provider value={{ rows: freezeRows, cols: freezeCols, colLefts }}>
    <div {...blockDragProps}
      ref={wrapRef}
      data-table-wrap
      style={{
        position: "relative",
        maxWidth: "100%",
        margin: "var(--spacing-2xs, 4px) 0 0 0",
        ["--tbl-border-color" as string]: borderColor,
        ["--tbl-border-style" as string]: borderStyle,
        ["--tbl-border-width" as string]: borderWidth,
      } as React.CSSProperties}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("td, th") && !target.closest("[data-table-add-btn]")) {
          e.preventDefault();
          e.stopPropagation();
          if (editor.selection) editor.tf.deselect();
          const active = document.activeElement as HTMLElement | null;
          if (active?.closest?.("[data-slate-editor]")) active.blur();
        }
      }}
    >
      {/* 행/전체 선택 rail — 스크롤 밖(wrapper)이라 가로 스크롤해도 좌측에 항상 보임 */}
      <TableSelectRail editor={editor} tablePath={elPath} wrapRef={wrapRef} freezeRows={freezeRows} />
      {/* 상단 여백 + 동일 음수 margin — 표 위치는 그대로 두면서 열/전체 핸들이 위 테두리에 걸쳐도 안 잘리게.
          엑셀 틀 고정: 고정 시 표 내부 2D 스크롤 박스(maxHeight + overflow auto)에서 행·열 sticky. */}
      <div className={styles.tblScroll} data-tbl-scroll style={{
        paddingTop: 9, marginTop: -9,
        ...scrollOverflow,
      }}>
        <div style={{ position: "relative", display: anyFreeze ? "block" : "inline-block", verticalAlign: "top" }}>
          <table
            {...attributes}
            ref={mergedRef}
            {...tableProps}
            data-freeze-row={rowFreeze ? "" : undefined}
            data-freeze-col={colFreeze ? "" : undefined}
            style={{
              ...style,
              width: totalWidth ?? "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRight: borderStyle === "none" ? "none" : `${borderWidth} ${borderStyle} ${borderColor}`,
              borderBottom: borderStyle === "none" ? "none" : `${borderWidth} ${borderStyle} ${borderColor}`,
              tableLayout: "fixed",
              userSelect: isSelectingCell ? "none" : undefined,
              ...(headerBg ? { ["--tbl-header-bg" as string]: headerBg } : {}),
              ...(headerColor ? { ["--tbl-header-color" as string]: headerColor } : {}),
              ...(headerBold === false ? { ["--tbl-header-weight" as string]: "400" } : {}),
            } as React.CSSProperties}
          >
            <colgroup contentEditable={false}>
              {colSizes.map((w, i) => {
                const colStyle = w ? { width: w } : undefined;
                return <col key={i} style={colStyle} />;
              })}
            </colgroup>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
      {/* 열 추가(고정/비고정 공용) — 스크롤 컨테이너 밖(wrapper)이라 어떤 overflow 에도 안 잘림.
          표 우측 끝 ↔ .tblScroll 뷰포트 우측 끝 중 더 왼쪽에 배치(TableSelectRail 좌측 rail 과 대칭). */}
      <AddColumnRail editor={editor} tableElement={element} wrapRef={wrapRef} />
      {/* 행 추가 — 평소엔 얇은 hover 존이라 캡션이 표 바로 아래에 붙고,
          이 영역에 hover 하면 버튼이 나타나며 그 높이만큼 캡션이 자연스럽게 아래로 내려감.
          (overflow-x:auto 가 overflow-y:clip 을 강제하므로 스크롤 컨테이너 바깥에 위치) */}
      <div
        contentEditable={false}
        onMouseEnter={() => { if (!captionEditing) openRowBtn(); }}
        onMouseLeave={closeRowBtnDelayed}
        style={{
          // 상단 위치는 고정(marginTop 불변) — hover 시 이게 바뀌면 커서가 margin 영역에 놓여
          // mouseenter/leave 가 반복(깜빡임)됨. 높이만 아래로 늘려 캡션을 밀어낸다.
          position: "relative",
          width: totalWidth,
          maxWidth: "100%",
          height: rowBtnShown ? 24 : 6,
          // 가로 스크롤바(.tblScroll padding-bottom: md)가 행버튼을 밀어내지 않게, 밴드 위로 끌어올려
          // 표에서 항상 2xs 간격에 고정. (스크롤바는 md 밴드 아래에 위치 — 서로 안 밀어냄)
          marginTop: "calc(var(--spacing-2xs) - var(--spacing-md))",
          transition: "height 0.15s ease",
        }}
      >
        <AddRowBtn editor={editor} tableElement={element} hovered={rowBtnShown} />
      </div>
      {showCaption && (
        <div contentEditable={false} style={{ width: totalWidth, maxWidth: "100%" }}>
          <InlineCaption caption={caption} onCommit={(v) => setTableAttr({ caption: v || undefined })} onEditingChange={setCaptionEditing} />
        </div>
      )}
    </div>
    <BlockTailClickZone path={elPath} />
    </TableFreezeCtx.Provider>
    </BlockDropZone>
  );
}

// ── 테이블 행 엘리먼트 ──
// Slate가 블록 사이에 삽입하는 빈 텍스트 노드(<span>)는 CSS로 숨김 (children 필터링하면 path 추적 깨짐)
export function TableRowElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="tr" style={{ ...props.style, position: "relative" }}>
      {props.children}
    </PlateElement>
  );
}
