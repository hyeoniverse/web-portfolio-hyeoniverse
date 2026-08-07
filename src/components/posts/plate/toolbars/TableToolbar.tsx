"use client";

import React, { useCallback } from "react";
import { CAPTION_EDIT_EVENT } from "../constants";
import {
  insertTableMergeRow,
  insertTableMergeColumn,
  deleteTable,
  deleteTableMergeRow,
  deleteTableMergeColumn,
  mergeTableCells,
  splitTableCell,
  setTableRowSize,
  setTableColSize,
  getSelectedCells,
} from "@platejs/table";
import { Table, Palette, Type, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Eraser, Sparkles, StretchHorizontal, PanelTop, PanelLeft, ArrowUpToLine, ArrowLeftToLine, PaintBucket } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import TBtn from "../TBtn";
import FloatingBar from "./FloatingBar";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import {
  TblRowBefore, TblRowAfter, TblRowRemove,
  TblColBefore, TblColAfter, TblColRemove,
  TblMergeCells, TblSplitCell,
  TblVAlignTop, TblVAlignMiddle, TblVAlignBottom,
  TblZebra, TblResetFormat, TblTrash,
  BorderAll, BorderOuter,
  BorderTop, BorderBottom, BorderLeft, BorderRight,
  BorderInnerH, BorderInnerV, BorderInnerAll,
} from "../icons";
import {
  TABLE_BG_PRESETS,
  TABLE_TEXT_PRESETS,
  ZEBRA_COLOR_DEFAULT,
  TABLE_BORDER_STYLES,
  TABLE_BORDER_WIDTHS,
  TABLE_BORDER_COLORS,
} from "../constants";
import { ColorMenu } from "../ColorMenu";
import { CHECKER_BG } from "../presets";
import type { BorderMode } from "../hooks";
import { recomputeTableIndices, fixZeroColSizes } from "../TableElements";
import { useRecentColors } from "../useRecentColors";
import styles from "../../RichTextEditor.module.css";

interface TableToolbarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  visible: boolean;
  cellBg: string;
  cellVAlign: string;
  tableCaption: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentTableInfo: { node: any; path: number[] } | null;
  isZebraActive: boolean;
  currentZebraColor: string | null;
  // actions
  setCellAttr: (attr: string, val: unknown) => void;
  toggleZebraStripe: (customColor?: string) => void;
  reapplyZebraIfActive: () => void;
  resetTableFormat: () => void;
  saveSelection: () => void;
  // border popover
  borderPopover: {
    open: boolean;
    setOpen: (v: boolean) => void;
    style: string;
    setStyle: (v: string) => void;
    width: string;
    setWidth: (v: string) => void;
    color: string;
    setColor: (v: string) => void;
    selectedPosition: BorderMode | null;
    setSelectedPosition: (pos: BorderMode | null) => void;
    mixed: { style: boolean; width: boolean; color: boolean };
    selectionSpan: { rows: number; cols: number };
    popRef: React.RefObject<HTMLDivElement | null>;
    captureCells: () => void;
    applyBorders: (mode: BorderMode) => void;
  };
}

export default React.memo(function TableToolbar({
  editor, visible,
  cellBg, cellVAlign, tableCaption, currentTableInfo,
  isZebraActive, currentZebraColor,
  setCellAttr, toggleZebraStripe, reapplyZebraIfActive,
  saveSelection, borderPopover,
}: TableToolbarProps) {
  const { t, language } = useLanguage();

  // 대상 셀 경로 — 선택된 셀들(없으면 현재 커서 셀). 모든 정리/초기화 동작은 이 범위에만 적용.
  const getTargetCellPaths = useCallback((): number[][] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cells: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { cells = (getSelectedCells(editor as any) as any[]) || []; } catch { cells = []; }
    if (!cells.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { const entry = editor.api.above({ match: (n: any) => n.type === "td" || n.type === "th" }); if (entry) cells = [entry[0]]; } catch { /* noop */ }
    }
    const paths: number[][] = [];
    for (const cell of cells) {
      try { const p = editor.api.findPath(cell); if (p) paths.push(Array.from(p) as number[]); } catch { /* noop */ }
    }
    return paths;
  }, [editor]);

  // 텍스트에 적용되는 마크(스타일) 키 — 콘텐츠 서식 제거 대상
  const MARK_KEYS = ["color", "backgroundColor", "bold", "italic", "underline", "strikethrough", "code", "kbd", "highlight", "fontSize", "fontFamily", "fontWeight", "subscript", "superscript"];

  // 내용(텍스트) 지우기 — 셀 구조는 유지, 텍스트만 제거
  // 표 안 **모든** 셀의 경로 — currentTableInfo(table > tr > td/th)에서 바로 뽑는다.
  const getAllCellPaths = useCallback((): number[][] => {
    const info = currentTableInfo;
    const rows = (info?.node?.children ?? []) as { children?: unknown[] }[];
    if (!info?.path || !rows.length) return [];
    const paths: number[][] = [];
    rows.forEach((row, r) => (row?.children ?? []).forEach((_, c) => paths.push([...info.path, r, c])));
    return paths;
  }, [currentTableInfo]);

  // 내용 지우기 — 셀(칸) 자체는 남기고 안의 내용만 비운다. 셀 구조가 안 바뀌므로 경로는 그대로 유효하다.
  const clearCells = useCallback((paths: number[][]) => {
    if (!paths.length) return;
    editor.tf.withoutNormalizing(() => {
      for (const p of paths) {
        try {
          const anchor = editor.api.start(p);
          const focus = editor.api.end(p);
          if (anchor && focus) editor.tf.delete({ at: { anchor, focus } });
        } catch { /* noop */ }
      }
    });
  }, [editor]);
  const clearContentSelected = useCallback(() => clearCells(getTargetCellPaths()), [clearCells, getTargetCellPaths]);
  const clearContentAll = useCallback(() => clearCells(getAllCellPaths()), [clearCells, getAllCellPaths]);

  // 표 서식 제거(선택 셀) — 셀 배경/테두리/세로정렬/너비만
  const resetCellStyle = useCallback(() => {
    const paths = getTargetCellPaths();
    if (!paths.length) return;
    editor.tf.withoutNormalizing(() => {
      for (const p of paths) {
        try { editor.tf.setNodes({ background: null, colwidth: null, verticalAlign: null, cellBorders: null }, { at: p }); } catch { /* noop */ }
      }
    });
  }, [editor, getTargetCellPaths]);

  // 콘텐츠 서식 제거(선택 셀) — 셀 안 텍스트의 마크(색·굵게 등) 제거, 텍스트/구조는 유지
  const resetCellContent = useCallback(() => {
    const paths = getTargetCellPaths();
    if (!paths.length) return;
    editor.tf.withoutNormalizing(() => {
      for (const p of paths) {
        try {
          const anchor = editor.api.start(p);
          const focus = editor.api.end(p);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (anchor && focus) editor.tf.unsetNodes(MARK_KEYS, { at: { anchor, focus }, match: (n: any) => typeof n.text === "string", split: true });
        } catch { /* noop */ }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, getTargetCellPaths]);

  // 서식 모두 제거(선택 셀) — 표 서식 + 콘텐츠 서식
  const resetCellAll = useCallback(() => { resetCellStyle(); resetCellContent(); }, [resetCellStyle, resetCellContent]);
  const bp = borderPopover;
  const recentBorderColors = useRecentColors("border-color");
  const RECENT_SLOTS = 8;

  // 스타일 팝오버 — 줄무늬/셀배경 각각의 최근색
  const recentZebra = useRecentColors("zebra-stripe");
  const recentCellBg = useRecentColors("cell-bg");
  const applyZebra = (color?: string) => { toggleZebraStripe(color); if (color) recentZebra.addColor(color); };
  const applyCellBg = (color: string | null) => { setCellAttr("background", color); if (color) recentCellBg.addColor(color); };

  // 선택 셀이 단일/단일행/단일열 인지 — inner / innerH / innerV 비활성화 판단
  const span = bp.selectionSpan;
  const singleCell = span.rows <= 1 && span.cols <= 1;
  const singleRow = span.rows <= 1;
  const singleCol = span.cols <= 1;
  const isDisabled = (mode: BorderMode): boolean => {
    if (mode === "inner") return singleCell;
    if (mode === "innerH") return singleRow;
    if (mode === "innerV") return singleCol;
    return false;
  };

  // (테두리 popover 는 공통 Popover 로 전환 — 커스텀 portal/위치계산 제거)

  // plate 의 insertTableMergeRow 는 인접 row (헤더 바로 위/아래 삽입 시 헤더 행) 의
  // 셀 type/스타일을 템플릿으로 사용 → 새 row 가 header 스타일로 추가됨. 사용자는
  // 선택한 셀 기준이 자연스러우므로 삽입 후 새 row 의 셀들을 selected 셀의 type 으로 강제 변환.
  const insertRow = (before: boolean) => {
    recomputeTableIndices(editor);
    // 선택 셀의 type / 배경 캡처
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cellEntry = editor.api.node({ match: { type: ["table_cell", "table_cell_header"] } }) as any;
    const selectedCellType = cellEntry?.[0]?.type ?? "table_cell";
    const selectedCellPath: number[] | undefined = cellEntry?.[1];

    insertTableMergeRow(editor, { before });

    // 삽입된 새 row 의 path = selectedCellPath 의 row index 를 기반으로 계산
    if (selectedCellPath) {
      const tablePath = selectedCellPath.slice(0, -2);
      const selectedRowIdx = selectedCellPath[selectedCellPath.length - 2];
      const newRowIdx = before ? selectedRowIdx : selectedRowIdx + 1;
      const newRowPath = [...tablePath, newRowIdx];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newRow = editor.api.node(newRowPath) as any;
        if (newRow?.[0]?.children) {
          const isHeaderSelected = selectedCellType === "table_cell_header";
          newRow[0].children.forEach((_cell: unknown, idx: number) => {
            const cellPath = [...newRowPath, idx];
            // type 만 변환 (background 같은 inline 스타일은 selected 셀 기준 매번 다르니 그대로 두고 header→body 변경만)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor.tf.setNodes({ type: isHeaderSelected ? "table_cell_header" : "table_cell", background: null } as any, { at: cellPath });
          });
        }
      } catch { /* ignore — path 변형 케이스 */ }
    }
    setTimeout(reapplyZebraIfActive, 0);
  };

  // 모든 열 너비를 균등하게 (colSizes 균등 분배)
  const equalizeColWidths = useCallback(() => {
    if (!currentTableInfo) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = currentTableInfo.node as any;
    const path = currentTableInfo.path;
    const colCount = node.children?.[0]?.children?.length || (node.colSizes?.length ?? 0);
    if (!colCount) return;
    const existing: number[] = node.colSizes || [];
    const total = existing.reduce((a: number, b: number) => a + (b || 0), 0);
    let per: number;
    if (total > 0) per = Math.round(total / colCount);
    else {
      const dom = editor.api.toDOMNode(node) as HTMLElement | null;
      per = Math.round((dom?.getBoundingClientRect().width ?? colCount * 120) / colCount);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.tf.setNodes({ colSizes: Array(colCount).fill(per) } as any, { at: path });
  }, [editor, currentTableInfo]);

  // 모든 행 높이를 균등하게 — 현재 가장 큰 행 높이에 맞춤
  const equalizeRowHeights = useCallback(() => {
    if (!currentTableInfo) return;
    const dom = editor.api.toDOMNode(currentTableInfo.node) as HTMLElement | null;
    if (!dom) return;
    const trs = Array.from(dom.querySelectorAll("tr"));
    if (!trs.length) return;
    let maxH = 0;
    trs.forEach((tr) => { maxH = Math.max(maxH, tr.getBoundingClientRect().height); });
    maxH = Math.round(maxH);
    if (!maxH) return;
    const path = currentTableInfo.path;
    editor.tf.withoutNormalizing(() => {
      trs.forEach((_, rowIndex) => setTableRowSize(editor, { rowIndex, height: maxH }, { at: path }));
    });
  }, [editor, currentTableInfo]);

  // 헤더행/헤더열 — 첫 행/열 셀 타입을 td↔th 로 토글. (0,0) 코너는 행·열 헤더 중 하나라도 켜져 있으면 th 유지.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tblRows = (currentTableInfo?.node as any)?.children as any[] | undefined;
  const firstRowCells = tblRows?.[0]?.children as any[] | undefined;
  const firstRowIsHeader = !!firstRowCells?.length && firstRowCells.every((c: any) => c?.type === "th");
  const firstColIsHeader = !!tblRows?.length && tblRows.every((r: any) => r?.children?.[0]?.type === "th");
  const toggleHeaderRow = useCallback(() => {
    if (!currentTableInfo) return;
    const path = currentTableInfo.path;
    const rows = (currentTableInfo.node as any)?.children as any[] | undefined;
    const cells = rows?.[0]?.children as any[] | undefined;
    if (!cells?.length) return;
    const newHeader = !cells.every((c: any) => c?.type === "th");
    const colHeader = !!rows?.length && rows.every((r: any) => r?.children?.[0]?.type === "th");
    editor.tf.withoutNormalizing(() => {
      cells.forEach((_: any, i: number) => {
        const th = newHeader || (i === 0 && colHeader); // 코너는 헤더열이면 유지
        editor.tf.setNodes({ type: th ? "th" : "td" }, { at: [...path, 0, i] });
      });
    });
  }, [editor, currentTableInfo]);
  const toggleHeaderCol = useCallback(() => {
    if (!currentTableInfo) return;
    const path = currentTableInfo.path;
    const rows = (currentTableInfo.node as any)?.children as any[] | undefined;
    if (!rows?.length) return;
    const newHeader = !rows.every((r: any) => r?.children?.[0]?.type === "th");
    const rowHeader = !!rows[0]?.children?.length && rows[0].children.every((c: any) => c?.type === "th");
    editor.tf.withoutNormalizing(() => {
      rows.forEach((row: any, r: number) => {
        if (!row?.children?.[0]) return;
        const th = newHeader || (r === 0 && rowHeader); // 코너는 헤더행이면 유지
        editor.tf.setNodes({ type: th ? "th" : "td" }, { at: [...path, r, 0] });
      });
    });
  }, [editor, currentTableInfo]);
  // 고정 — 선택 셀 기준. 세로 스크롤은 없음(행=페이지 sticky, 열=가로 내부 스크롤).
  //  · 행 고정: 첫 N행(선택 행까지) 고정. 열 고정: 첫 M열(선택 열까지) 고정.
  //  현재 개수(구버전 boolean 호환) — 버튼 active + 토글(같은 범위면 해제) 판정용.
  const curFreezeRows = typeof (currentTableInfo?.node as any)?.freezeRows === "number"
    ? (currentTableInfo!.node as any).freezeRows as number
    : ((currentTableInfo?.node as any)?.freezeRow || (currentTableInfo?.node as any)?.freezeHeader ? 1 : 0);
  const curFreezeCols = typeof (currentTableInfo?.node as any)?.freezeCols === "number"
    ? (currentTableInfo!.node as any).freezeCols as number
    : ((currentTableInfo?.node as any)?.freezeCol ? 1 : 0);
  const freezeRow = curFreezeRows > 0;
  const freezeCol = curFreezeCols > 0;
  // 선택 영역의 최하단 행 / 최우측 열 인덱스 (없으면 0=첫 행/열).
  const selectedRC = useCallback(() => {
    const paths = getTargetCellPaths();
    let row = 0, col = 0;
    for (const p of paths) { row = Math.max(row, p[p.length - 2]); col = Math.max(col, p[p.length - 1]); }
    return { row, col };
  }, [getTargetCellPaths]);
  // 켜져 있으면 어떤 셀이 선택돼 있든 무조건 해제. 꺼져 있으면 선택 셀(선택 행/열까지 포함) 기준으로 고정.
  const toggleFreezeRow = useCallback(() => {
    if (!currentTableInfo) return;
    const path = currentTableInfo.path;
    if (curFreezeRows > 0) editor.tf.setNodes({ freezeRows: null, freezeRow: null, freezeHeader: null }, { at: path });
    else editor.tf.setNodes({ freezeRows: selectedRC().row + 1, freezeRow: null, freezeHeader: null }, { at: path });
  }, [editor, currentTableInfo, curFreezeRows, selectedRC]);
  const toggleFreezeCol = useCallback(() => {
    if (!currentTableInfo) return;
    const path = currentTableInfo.path;
    if (curFreezeCols > 0) editor.tf.setNodes({ freezeCols: null, freezeCol: null }, { at: path });
    else editor.tf.setNodes({ freezeCols: selectedRC().col + 1, freezeCol: null }, { at: path });
  }, [editor, currentTableInfo, curFreezeCols, selectedRC]);
  // 화면 너비 맞춤 — "일회성 실행". 컨테이너 폭에 정확히 맞춰 열 폭을 비례 재계산해 저장(토글/상태 없음).
  const fitTableToWidth = useCallback(() => {
    if (!currentTableInfo) return;
    const path = currentTableInfo.path;
    const node = currentTableInfo.node as any;
    const dom = editor.api.toDOMNode(currentTableInfo.node) as HTMLElement | null;
    const scroll = dom?.closest("[data-tbl-scroll]") as HTMLElement | null;
    const containerWidth = scroll?.clientWidth ?? dom?.parentElement?.clientWidth ?? 600;
    // 열추가 버튼(표 오른쪽 옆 28px + gap)만큼 확실히 비워 클리핑·가로스크롤 방지
    const available = Math.max(160, containerWidth - 44);
    // 저장된 colSizes 를 우선 사용 — DOM 렌더 폭 측정은 레이아웃 상태에 따라 어긋나 "한 번에 안 맞는" 원인.
    const stored: number[] = Array.isArray(node?.colSizes) ? node.colSizes : [];
    let cur: number[];
    if (stored.length && stored.every((s) => s > 0)) {
      cur = stored;
    } else {
      const firstRow = dom?.querySelector(":scope > tbody > tr") as HTMLElement | null;
      const cells = firstRow ? Array.from(firstRow.children) as HTMLElement[] : [];
      if (!cells.length) return;
      cur = cells.map((c) => c.getBoundingClientRect().width);
    }
    const total = cur.reduce((a, b) => a + b, 0) || 1;
    const scale = available / total;
    const MIN = 48;
    const target = cur.map((w) => Math.max(MIN, Math.round(w * scale)));
    // 반올림·하한(48) 누적 오차를 흡수할 수 있는 열에 잔차를 반영 → 합계가 정확히 available (잔여 오버플로/여백 없음)
    let diff = available - target.reduce((a, b) => a + b, 0);
    if (diff !== 0) {
      for (let i = target.length - 1; i >= 0 && diff !== 0; i--) {
        if (target[i] + diff >= MIN) { target[i] += diff; diff = 0; }
      }
    }
    editor.tf.withoutNormalizing(() => {
      target.forEach((w, i) => setTableColSize(editor, { colIndex: i, width: w }, { at: path }));
    });
  }, [editor, currentTableInfo]);
  // 헤더 전용 스타일 — 표 노드에 headerBg/headerColor/headerBold 저장 → th 에 CSS 변수로 주입
  const headerBg = (currentTableInfo?.node as any)?.headerBg as string | undefined;
  const headerColor = (currentTableInfo?.node as any)?.headerColor as string | undefined;
  const headerBold = (currentTableInfo?.node as any)?.headerBold !== false; // 기본 굵게
  const setHeaderStyle = useCallback((patch: Record<string, unknown>) => {
    if (currentTableInfo) editor.tf.setNodes(patch, { at: currentTableInfo.path });
  }, [editor, currentTableInfo]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // 선택한 표에 anchor — FloatingBar 가 위치/스크롤추적/드래그/클립 처리.
  // 캡션이 표 아래에 있으면 anchor 하단을 캡션까지 확장 → bar 가 flip(아래)될 때 캡션을 안 가림.
  const getRect = useCallback((): DOMRect => {
    try {
      const dom = currentTableInfo?.node ? editor.api.toDOMNode(currentTableInfo.node) : null;
      const table = dom as HTMLElement | null;
      const base = table?.getBoundingClientRect() ?? new DOMRect();
      const wrap = table?.closest("[data-table-wrap]") as HTMLElement | null;
      const cap = wrap?.querySelector("[data-img-caption]") as HTMLElement | null;
      if (cap && base.width) {
        const cr = cap.getBoundingClientRect();
        if (cr.bottom > base.bottom) return new DOMRect(base.x, base.y, base.width, cr.bottom - base.y);
      }
      return base;
    } catch { return new DOMRect(); }
  }, [editor, currentTableInfo]);

  // 현재 대상 표의 인스턴스 식별자(path) — 표 툴바가 열린 채 다른 표로 옮겨가면 값이 바뀌어
  // FloatingBar 의 pin/오프셋이 리셋되고 새 표에 재앵커된다.
  const anchorKey = currentTableInfo ? currentTableInfo.path.join(",") : null;

  return (
    <FloatingBar open={visible} getAnchorRect={getRect} inline anchorKey={anchorKey}>
      {/* 구조 — 행 / 열 / 셀 / 세로정렬 */}
      <Popover openOnHover placement="bottom-start" offset={8}
        trigger={<TBtn tooltip={t("editor.tableStructure")}><span className={styles.tblBarLabel}><Table size={15} strokeWidth={1.75} />{t("editor.tableStructure")}</span></TBtn>}>
        {() => (
          <div className={styles.tableMenu} onMouseDown={(e) => e.preventDefault()}>
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>{t("editor.row")}</span>
              <TBtn square onClick={() => insertRow(true)} tooltip={t("editor.addRowAbove")}><TblRowBefore /></TBtn>
              <TBtn square onClick={() => insertRow(false)} tooltip={t("editor.addRowBelow")}><TblRowAfter /></TBtn>
              <TBtn square onClick={() => { recomputeTableIndices(editor); deleteTableMergeRow(editor); setTimeout(reapplyZebraIfActive, 0); }} tooltip={t("editor.deleteRow")}><TblRowRemove /></TBtn>
              <TBtn square onClick={equalizeRowHeights} tooltip={t("editor.equalRowHeight")}><AlignVerticalSpaceAround size={15} strokeWidth={1.75} /></TBtn>
            </div>
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>{t("editor.column")}</span>
              <TBtn square onClick={() => { recomputeTableIndices(editor); insertTableMergeColumn(editor, { before: true }); fixZeroColSizes(editor); }} tooltip={t("editor.addColLeft")}><TblColBefore /></TBtn>
              <TBtn square onClick={() => { recomputeTableIndices(editor); insertTableMergeColumn(editor); fixZeroColSizes(editor); }} tooltip={t("editor.addColRight")}><TblColAfter /></TBtn>
              <TBtn square onClick={() => { recomputeTableIndices(editor); deleteTableMergeColumn(editor); }} tooltip={t("editor.deleteCol")}><TblColRemove /></TBtn>
              <TBtn square onClick={equalizeColWidths} tooltip={t("editor.equalColWidth")}><AlignHorizontalSpaceAround size={15} strokeWidth={1.75} /></TBtn>
            </div>
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>{t("editor.cell")}</span>
              <TBtn square onClick={() => { recomputeTableIndices(editor); mergeTableCells(editor); }} tooltip={`${t("editor.mergeCells")}\n${t("editor.mergeCellsHint")}`}><TblMergeCells /></TBtn>
              <TBtn square onClick={() => { recomputeTableIndices(editor); splitTableCell(editor); }} tooltip={t("editor.splitCell")}><TblSplitCell /></TBtn>
            </div>
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>{t("editor.verticalAlign")}</span>
              <TBtn square active={!cellVAlign || cellVAlign === "top"} onClick={() => setCellAttr("verticalAlign", "top")} tooltip={t("editor.alignTop")}><TblVAlignTop /></TBtn>
              <TBtn square active={cellVAlign === "middle"} onClick={() => setCellAttr("verticalAlign", "middle")} tooltip={t("editor.alignMiddle")}><TblVAlignMiddle /></TBtn>
              <TBtn square active={cellVAlign === "bottom"} onClick={() => setCellAttr("verticalAlign", "bottom")} tooltip={t("editor.alignBottom")}><TblVAlignBottom /></TBtn>
            </div>
          </div>
        )}
      </Popover>

      {/* 스타일 — 줄무늬 / 셀 배경 */}
      <Popover openOnHover placement="bottom-start" offset={8}
        trigger={<TBtn tooltip={t("editor.tableStyle")}><span className={styles.tblBarLabel}><Palette size={15} strokeWidth={1.75} />{t("editor.tableStyle")}</span></TBtn>}>
        {() => (
          <div className={styles.colorMenu} onMouseDown={(e) => e.preventDefault()}>
            {/* 줄무늬 */}
            <div className={styles.colorMenuHeadRow}>
              <span className={styles.colorMenuLabel}>{t("editor.zebra")}</span>
              <TBtn square active={isZebraActive} onClick={() => toggleZebraStripe()} tooltip={t("editor.zebraHint")}><TblZebra /></TBtn>
            </div>
            <ColorMenu
              label={t("editor.background")}
              hideLabel
              value={currentZebraColor}
              onPick={(v) => toggleZebraStripe(v ?? ZEBRA_COLOR_DEFAULT)}
              onCommit={(v) => applyZebra(v)}
              presets={TABLE_BG_PRESETS.map((h) => ({ hex: h }))}
              defaultColor={ZEBRA_COLOR_DEFAULT}
              defaultLabel={language === "ko" ? "기본" : "Default"}
              recent={recentZebra.colors}
            />
            <span className={styles.colorMenuDivider} />
            {/* 셀 배경 */}
            <ColorMenu
              label={t("editor.background")}
              value={cellBg}
              onPick={(v) => setCellAttr("background", v === undefined ? null : v)}
              onCommit={(v) => applyCellBg(v)}
              presets={TABLE_BG_PRESETS.map((h) => ({ hex: h }))}
              defaultColor={CHECKER_BG}
              defaultLabel={t("editor.removeBg")}
              recent={recentCellBg.colors}
            />
          </div>
        )}
      </Popover>

      {/* 테두리 — 공통 Popover(openOnHover). 열릴 때 선택/셀 캡처. contentRef 로 훅의 outside-click 연결. */}
      <Popover
        openOnHover
        placement="bottom-start"
        offset={6}
        open={bp.open}
        onOpenChange={(o) => { if (o && !bp.open) { saveSelection(); bp.captureCells(); } bp.setOpen(o); }}
        contentRef={bp.popRef}
        contentClassName={styles.borderPopover}
        trigger={
          <TBtn active={bp.open} tooltip={t("editor.border")}>
            <span className={styles.tblBarLabel}><BorderAll />{t("editor.border")}</span>
          </TBtn>
        }
      >
        {() => (
          <>
            <div className={styles.borderPopTopRow}>
                <div className={styles.borderPopSection}>
                  <div className={styles.borderPopSectionHeader}>
                    <span className={styles.borderPopLabel}>{t("editor.borderPosition")}</span>
                  </div>
                  <div className={styles.borderGrid}>
                  {/* 3x3:
                       Row 1: 바깥선 안쪽선 모두
                       Row 2: 왼쪽 세로안쪽 오른쪽
                       Row 3: 위   가로안쪽 아래 */}
                  {([
                    { mode: "outer" as BorderMode, icon: <BorderOuter />, tip: t("editor.borderOuter") },
                    { mode: "inner" as BorderMode, icon: <BorderInnerAll />, tip: t("editor.borderInner") },
                    { mode: "all" as BorderMode, icon: <BorderAll />, tip: t("editor.borderAll") },
                    { mode: "left" as BorderMode, icon: <BorderLeft />, tip: t("editor.borderLeft") },
                    { mode: "innerV" as BorderMode, icon: <BorderInnerV />, tip: t("editor.borderInnerV") },
                    { mode: "right" as BorderMode, icon: <BorderRight />, tip: t("editor.borderRight") },
                    { mode: "top" as BorderMode, icon: <BorderTop />, tip: t("editor.borderTop") },
                    { mode: "innerH" as BorderMode, icon: <BorderInnerH />, tip: t("editor.borderInnerH") },
                    { mode: "bottom" as BorderMode, icon: <BorderBottom />, tip: t("editor.borderBottom") },
                  ]).map((item) => {
                    const disabled = isDisabled(item.mode);
                    return (
                      <Tooltip key={item.mode} content={item.tip} delay={200} placement="top">
                        <button
                          type="button"
                          className={`${styles.borderGridBtn} ${bp.selectedPosition === item.mode ? styles.borderGridBtnActive : ""} ${disabled ? styles.borderGridBtnDisabled : ""}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { if (!disabled) bp.setSelectedPosition(bp.selectedPosition === item.mode ? null : item.mode); }}
                          aria-disabled={disabled}
                          tabIndex={disabled ? -1 : 0}
                        >
                          {item.icon}
                        </button>
                      </Tooltip>
                    );
                  })}
                  </div>
                </div>
                <div className={styles.borderPopRightStack}>
                  <div className={styles.borderPopSection}>
                    <div className={styles.borderPopSectionHeader}>
                      <span className={styles.borderPopLabel}>{t("editor.borderStyle")}</span>
                      <Tooltip content={t("editor.borderClear")} placement="top">
                        <button
                          type="button"
                          className={styles.borderClearBtn}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => bp.applyBorders("none")}
                        >
                          {t("editor.borderClear")}
                        </button>
                      </Tooltip>
                    </div>
                    <select value={bp.mixed.style ? "__mixed" : bp.style} onChange={(e) => { if (e.target.value !== "__mixed") bp.setStyle(e.target.value); }} className={styles.borderPopSelect}>
                      {bp.mixed.style && <option value="__mixed">{t("editor.borderMixed")}</option>}
                      {TABLE_BORDER_STYLES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value === "solid" ? `───  ${t("editor.borderSolid")}` : s.value === "dotted" ? `· · ·  ${t("editor.borderDotted")}` : s.value === "dashed" ? `- - -  ${t("editor.borderDashed")}` : `═══  ${t("editor.borderDouble")}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.borderPopSection}>
                    <span className={styles.borderPopLabel}>{t("editor.borderWidth")}</span>
                    <div className={styles.borderWidthCapsule}>
                      {bp.mixed.width && <span className={styles.borderMixedLabel}>{t("editor.borderMixed")}</span>}
                      {TABLE_BORDER_WIDTHS.map((w) => (
                        <button key={w} type="button" className={`${styles.borderWidthBtn} ${!bp.mixed.width && bp.width === w ? styles.borderWidthBtnActive : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => bp.setWidth(w)}>{w}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* 테두리 색 — 공통 ColorMenu 컴포넌트/클래스 사용(다른 색상 popover 와 동일 구조·스타일) */}
              <span className={styles.colorMenuDivider} />
              <div className={styles.colorMenu}>
                <ColorMenu
                  label={t("editor.borderColor")}
                  value={bp.color === "var(--border-light-color)" ? undefined : bp.color}
                  onPick={(v) => bp.setColor(v ?? "var(--border-light-color)")}
                  onCommit={(v) => { bp.setColor(v); recentBorderColors.addColor(v); }}
                  presets={TABLE_BORDER_COLORS.map((c) => ({ hex: c }))}
                  defaultColor="var(--border-light-color)"
                  defaultLabel={language === "ko" ? "기본" : "Default"}
                  recent={recentBorderColors.colors}
                  recentSlots={RECENT_SLOTS}
                  recentLabel={t("editor.borderColorRecent")}
                />
              </div>
          </>
        )}
      </Popover>

      {/* 캡션 — 표 DOM 노드에 커스텀 이벤트 dispatch → 표가 캡션 input 을 렌더 + focus.
          (input 이 아직 없어도 표 쪽에서 먼저 렌더시킨 뒤 focus 하므로 안정적) */}
      <TBtn active={!!tableCaption.trim()} tooltip={t("editor.caption")}
        onClick={() => {
          try {
            const dom = currentTableInfo ? editor.api.toDOMNode(currentTableInfo.node) : null;
            (dom as HTMLElement | null)?.dispatchEvent(new CustomEvent(CAPTION_EDIT_EVENT.table, { bubbles: true }));
          } catch { /* ignore */ }
        }}>
        <span className={styles.tblBarLabel}><Type size={15} strokeWidth={1.75} />{t("editor.caption")}</span>
      </TBtn>

      {/* 헤더행/헤더열(제목) 토글 — 첫 행/열을 헤더(th)로 */}
      <TBtn square active={firstRowIsHeader} onClick={toggleHeaderRow} tooltip={language === "ko" ? "제목행(헤더)" : "Header row"}>
        <PanelTop size={15} strokeWidth={1.75} />
      </TBtn>
      <TBtn square active={firstColIsHeader} onClick={toggleHeaderCol} tooltip={language === "ko" ? "제목열(헤더)" : "Header column"}>
        <PanelLeft size={15} strokeWidth={1.75} />
      </TBtn>
      {/* 행 고정 — 선택 행까지 상단 고정(페이지 스크롤 시 유지). 다시 누르면 해제 */}
      <TBtn square active={freezeRow} onClick={toggleFreezeRow} tooltip={language === "ko" ? "행 고정 (선택 행까지 상단 유지)" : "Freeze rows (through selection)"}>
        <ArrowUpToLine size={15} strokeWidth={1.75} />
      </TBtn>
      {/* 열 고정 — 선택 열까지 좌측 고정(가로 스크롤 시 유지) */}
      <TBtn square active={freezeCol} onClick={toggleFreezeCol} tooltip={language === "ko" ? "열 고정 (선택 열까지 좌측 유지)" : "Freeze columns (through selection)"}>
        <ArrowLeftToLine size={15} strokeWidth={1.75} />
      </TBtn>
      {/* 헤더 스타일 — 배경/글자색/굵기 (헤더 셀에만 적용) */}
      <Popover openOnHover placement="bottom-start" offset={8}
        trigger={<TBtn square tooltip={language === "ko" ? "헤더 스타일" : "Header style"}><PaintBucket size={15} strokeWidth={1.75} /></TBtn>}>
        {() => (
          <div className={styles.colorMenu} onMouseDown={(e) => e.preventDefault()}>
            <ColorMenu
              label={language === "ko" ? "헤더 배경" : "Header background"}
              value={headerBg}
              onPick={(v) => setHeaderStyle({ headerBg: v ?? null })}
              presets={TABLE_BG_PRESETS.map((h) => ({ hex: h }))}
              defaultColor="var(--bg-tertiary)"
              defaultLabel={language === "ko" ? "기본" : "Default"}
            />
            <span className={styles.colorMenuDivider} />
            <ColorMenu
              label={language === "ko" ? "헤더 글자" : "Header text"}
              value={headerColor}
              onPick={(v) => setHeaderStyle({ headerColor: v ?? null })}
              presets={TABLE_TEXT_PRESETS.map((h) => ({ hex: h }))}
              defaultColor="var(--text-primary)"
              defaultLabel={language === "ko" ? "기본" : "Default"}
            />
            <span className={styles.colorMenuDivider} />
            <div className={styles.colorMenuFooter}>
              <span className={styles.colorMenuMiniLabel}>{language === "ko" ? "굵게" : "Bold"}</span>
              <Tooltip content={language === "ko" ? "헤더 굵게" : "Bold header"} placement="top" delay={150}>
                <button type="button" className={`${styles.swatch} ${styles.swatchRandom} ${headerBold ? styles.swatchActive : ""}`} onClick={() => setHeaderStyle({ headerBold: headerBold ? false : null })}><span style={{ fontWeight: 700, fontSize: 11 }}>B</span></button>
              </Tooltip>
            </div>
          </div>
        )}
      </Popover>

      {/* 화면 너비 맞춤 — 일회성 실행 버튼(토글 아님). 현재 열 폭을 비례로 화면 폭에 맞춰 한 번 재계산. */}
      <TBtn square onClick={fitTableToWidth}
        tooltip={language === "ko" ? "화면 너비 맞춤" : "Fit to width"}>
        <StretchHorizontal size={15} strokeWidth={1.75} />
      </TBtn>

      {/* 정리 / 초기화 — 선택 영역(선택 셀/현재 셀)에만 적용 */}
      <Popover openOnHover placement="bottom-end" offset={8} contentClassName={styles.blockToolsMenu}
        trigger={<TBtn square tooltip={language === "ko" ? "정리 · 초기화" : "Clean up"}><TblResetFormat /></TBtn>}>
        {({ close }: { close: () => void }) => (
          <div onMouseDown={(e) => e.preventDefault()}>
            <MenuItem icon={<Sparkles size={15} />} label={language === "ko" ? "서식 모두 제거" : "Remove all formatting"} onClick={() => { resetCellAll(); close(); }} />
            <MenuItem icon={<Table size={15} />} label={language === "ko" ? "표 서식 제거" : "Remove table formatting"} onClick={() => { resetCellStyle(); close(); }} />
            <MenuItem icon={<Type size={15} />} label={language === "ko" ? "콘텐츠 서식 제거" : "Remove content formatting"} onClick={() => { resetCellContent(); close(); }} />
            <MenuDivider />
            <MenuItem icon={<Eraser size={15} />} label={language === "ko" ? "내용 모두 지우기" : "Clear all content"} onClick={() => { clearContentAll(); close(); }} />
            <MenuItem icon={<Eraser size={15} />} label={language === "ko" ? "선택한 셀의 내용 지우기" : "Clear selected cells"} onClick={() => { clearContentSelected(); close(); }} />
          </div>
        )}
      </Popover>
      <TBtn square className={styles.tableDangerBtn} onClick={() => deleteTable(editor)} tooltip={t("editor.deleteTable")}><TblTrash /></TBtn>
    </FloatingBar>
  );
})
