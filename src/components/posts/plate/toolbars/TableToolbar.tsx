"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  insertTableMergeRow,
  insertTableMergeColumn,
  deleteTable,
  deleteTableMergeRow,
  deleteTableMergeColumn,
  mergeTableCells,
  splitTableCell,
} from "@platejs/table";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import ColorPicker from "@/components/ui/ColorPicker";
import TBtn from "../TBtn";
import {
  TblRowBefore, TblRowAfter, TblRowRemove,
  TblColBefore, TblColAfter, TblColRemove,
  TblMergeCells, TblSplitCell,
  TblVAlignTop, TblVAlignMiddle, TblVAlignBottom,
  TblZebra, TblResetFormat, TblTrash, TblCellColorIcon,
  BorderAll, BorderOuter,
  BorderTop, BorderBottom, BorderLeft, BorderRight,
  BorderInnerH, BorderInnerV, BorderInnerAll,
} from "../icons";
import {
  TABLE_BG_PRESETS,
  TABLE_BORDER_STYLES,
  TABLE_BORDER_WIDTHS,
  TABLE_BORDER_COLORS,
} from "../constants";
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
  setCellAttr, toggleZebraStripe, reapplyZebraIfActive, resetTableFormat,
  saveSelection, borderPopover,
}: TableToolbarProps) {
  const { t } = useLanguage();
  const bp = borderPopover;
  const recentBorderColors = useRecentColors("border-color");
  const setBorderColorWithRecent = (color: string) => {
    bp.setColor(color);
    recentBorderColors.addColor(color);
  };

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

  // 테두리 popover 를 portal 로 띄워 editor 영역 밖에서도 안 잘리게.
  // 트리거 버튼 ref + open 시 위치 계산 + scroll/resize 시 close.
  const borderTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!bp.open) { setPopPos(null); return; }
    const update = () => {
      const el = borderTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPopPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
    };
    update();
    // scroll / resize 시 close 가 아니라 popover 위치 재계산 → trigger 따라 이동.
    // 닫기는 useOutsideClick (popRef) 가 처리.
    let rafId: number | null = null;
    const onScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => { rafId = null; update(); });
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [bp.open]);


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

  return (
    <div className={`${styles.tableToolbar} ${!visible ? styles.tableToolbarHidden : ""}`}>
      {/* Row 1: 구조 */}
      <div className={styles.tableToolbarRow}>
        <span className={styles.tableToolbarLabel}>TABLE</span>
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.row")}</span>
          <TBtn square onClick={() => insertRow(true)} tooltip={t("editor.addRowAbove")}><TblRowBefore /></TBtn>
          <TBtn square onClick={() => insertRow(false)} tooltip={t("editor.addRowBelow")}><TblRowAfter /></TBtn>
          <TBtn square onClick={() => { recomputeTableIndices(editor); deleteTableMergeRow(editor); setTimeout(reapplyZebraIfActive, 0); }} tooltip={t("editor.deleteRow")}><TblRowRemove /></TBtn>
        </div>
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.column")}</span>
          <TBtn square onClick={() => { recomputeTableIndices(editor); insertTableMergeColumn(editor, { before: true }); fixZeroColSizes(editor); }} tooltip={t("editor.addColLeft")}><TblColBefore /></TBtn>
          <TBtn square onClick={() => { recomputeTableIndices(editor); insertTableMergeColumn(editor); fixZeroColSizes(editor); }} tooltip={t("editor.addColRight")}><TblColAfter /></TBtn>
          <TBtn square onClick={() => { recomputeTableIndices(editor); deleteTableMergeColumn(editor); }} tooltip={t("editor.deleteCol")}><TblColRemove /></TBtn>
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
        <div className={styles.tableToolbarActions}>
          <TBtn square onClick={resetTableFormat} tooltip={`${t("editor.resetTableFormat")}\n${t("editor.resetTableFormatHint")}`}><TblResetFormat /></TBtn>
          <TBtn square className={styles.tableDangerBtn} onClick={() => deleteTable(editor)} tooltip={t("editor.deleteTable")}><TblTrash /></TBtn>
        </div>
      </div>

      {/* Row 2: 스타일 */}
      <div className={styles.tableToolbarRow}>
        <span className={styles.tableToolbarLabel}>STYLE</span>

        {/* 줄무늬 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.zebra")}</span>
          <TBtn square active={isZebraActive} onClick={() => toggleZebraStripe()} tooltip={t("editor.zebraHint")}><TblZebra /></TBtn>
          <div className={styles.colorPickerCell}>
            <div className={styles.colorDot} style={{ background: currentZebraColor || "var(--bg-tertiary)" }} />
            <ColorPicker value="#888888" onChange={(c) => toggleZebraStripe(c)} triggerClassName={styles.colorInput} />
          </div>
          {TABLE_BG_PRESETS.slice(0, 5).map((color) => (
            <Tooltip key={color} content={color} delay={300} placement="top">
              <button type="button" className={`${styles.presetDotInline} ${currentZebraColor === color ? styles.presetDotActive : ""}`} style={{ background: color }} onClick={() => toggleZebraStripe(color)} />
            </Tooltip>
          ))}
        </div>

        <div className={styles.divider} />

        {/* 셀 배경색 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.background")}</span>
          <div className={styles.colorPickerCell}>
            <TblCellColorIcon />
            <div className={styles.colorDot} style={{ background: cellBg || "transparent", border: cellBg ? "none" : "1px solid var(--border-light-color)" }} />
            <ColorPicker value={cellBg || "#ffffff"} onChange={(c) => setCellAttr("background", c)} triggerClassName={styles.colorInput} />
          </div>
          {TABLE_BG_PRESETS.map((color) => (
            <Tooltip key={color} content={color} delay={300} placement="top">
              <button type="button" className={`${styles.presetDotInline} ${cellBg === color ? styles.presetDotActive : ""}`} style={{ background: color }} onClick={() => setCellAttr("background", color)} />
            </Tooltip>
          ))}
          {cellBg && <TBtn onClick={() => setCellAttr("background", null)} tooltip={t("editor.removeBg")} style={{ marginLeft: 2 }}>×</TBtn>}
        </div>

        {/* 셀 테두리 (팝오버 — portal 로 렌더해서 editor 영역 밖에서도 안 잘림) */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.border")}</span>
          <TBtn
            square
            active={bp.open}
            ref={borderTriggerRef}
            onClick={() => {
              if (!bp.open) { saveSelection(); bp.captureCells(); }
              bp.setOpen(!bp.open);
            }}
            tooltip={t("editor.borderHint")}
          >
            <BorderAll />
          </TBtn>
          {bp.open && popPos && typeof document !== "undefined" && createPortal(
            <div
              ref={bp.popRef}
              className={styles.borderPopover}
              style={{ position: "fixed", top: popPos.top, left: popPos.left, transform: "translateX(-50%)" }}
            >
              <div className={styles.borderPopSection}>
                <div className={styles.borderPopSectionHeader}>
                  <span className={styles.borderPopLabel}>{t("editor.borderPosition")}</span>
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
              <div className={styles.borderPopSection}>
                <span className={styles.borderPopLabel}>{t("editor.borderStyle")}</span>
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
              <div className={styles.borderPopSection}>
                <span className={styles.borderPopLabel}>{t("editor.borderColor")}</span>
                <div className={styles.borderColorRow}>
                  {/* ColorPicker — preset 과 시각적 구분: 큰 사이즈 + 라벨 + 오른쪽 divider */}
                  <div className={styles.borderColorPicker}>
                    <ColorPicker value={bp.color.startsWith("var(") ? "#d1d5db" : bp.color} onChange={setBorderColorWithRecent} triggerClassName={styles.colorInput} />
                    <span className={styles.borderColorPickerDot} style={{ background: bp.color }} />
                  </div>
                  <span className={styles.borderColorDivider} aria-hidden />
                  <div className={styles.borderColorPresets}>
                    {TABLE_BORDER_COLORS.map((color) => (
                      <button key={color} type="button" className={`${styles.presetDotInline} ${bp.color === color ? styles.presetDotActive : ""}`} style={{ background: color }} onMouseDown={(e) => e.preventDefault()} onClick={() => setBorderColorWithRecent(color)} />
                    ))}
                  </div>
                </div>
                {recentBorderColors.colors.length > 0 && (
                  <>
                    <span className={styles.borderPopLabel} style={{ marginTop: 6 }}>{t("editor.borderColorRecent")}</span>
                    <div className={styles.borderColorPresets}>
                      {recentBorderColors.colors.map((color) => (
                        <button key={color} type="button" className={`${styles.presetDotInline} ${bp.color === color ? styles.presetDotActive : ""}`} style={{ background: color }} onMouseDown={(e) => e.preventDefault()} onClick={() => setBorderColorWithRecent(color)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* 캡션 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.caption")}</span>
          <input
            type="text"
            value={tableCaption.trim()}
            placeholder={t("editor.captionPlaceholder")}
            onChange={(e) => {
              if (!currentTableInfo) return;
              editor.tf.setNodes({ caption: e.target.value }, { at: currentTableInfo.path });
            }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className={styles.fontSelect}
            style={{ width: 160 }}
          />
          <TBtn
            onClick={() => { if (currentTableInfo) editor.tf.setNodes({ caption: undefined }, { at: currentTableInfo.path }); }}
            tooltip={t("editor.removeCaption")}
            style={{ visibility: tableCaption.trim() ? "visible" : "hidden" }}
          >×</TBtn>
        </div>
      </div>
    </div>
  );
})
