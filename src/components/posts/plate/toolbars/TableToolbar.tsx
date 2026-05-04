"use client";

import React from "react";
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
  BorderAll, BorderOuter, BorderNone,
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

  return (
    <div className={`${styles.tableToolbar} ${!visible ? styles.tableToolbarHidden : ""}`}>
      {/* Row 1: 구조 */}
      <div className={styles.tableToolbarRow}>
        <span className={styles.tableToolbarLabel}>TABLE</span>
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.row")}</span>
          <TBtn square onClick={() => { recomputeTableIndices(editor); insertTableMergeRow(editor, { before: true }); setTimeout(reapplyZebraIfActive, 0); }} tooltip={t("editor.addRowAbove")}><TblRowBefore /></TBtn>
          <TBtn square onClick={() => { recomputeTableIndices(editor); insertTableMergeRow(editor); setTimeout(reapplyZebraIfActive, 0); }} tooltip={t("editor.addRowBelow")}><TblRowAfter /></TBtn>
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

        {/* 셀 테두리 (팝오버) */}
        <div className={styles.tableGroup} style={{ position: "relative", overflow: "visible" }}>
          <span className={styles.tableGroupLabel}>{t("editor.border")}</span>
          <TBtn
            square
            active={bp.open}
            onClick={() => {
              if (!bp.open) { saveSelection(); bp.captureCells(); }
              bp.setOpen(!bp.open);
            }}
            tooltip={t("editor.borderHint")}
          >
            <BorderAll />
          </TBtn>
          {bp.open && (
            <div ref={bp.popRef} className={styles.borderPopover}>
              <div className={styles.borderPopSection}>
                <span className={styles.borderPopLabel}>{t("editor.borderPosition")}</span>
                <div className={styles.borderGrid}>
                  {([
                    { mode: "all" as BorderMode, icon: <BorderAll />, tip: t("editor.borderAll") },
                    { mode: "none" as BorderMode, icon: <BorderNone />, tip: t("editor.borderNone") },
                    { mode: "outer" as BorderMode, icon: <BorderOuter />, tip: t("editor.borderOuter") },
                    { mode: "inner" as BorderMode, icon: <BorderInnerAll />, tip: t("editor.borderInner") },
                    { mode: "innerH" as BorderMode, icon: <BorderInnerH />, tip: t("editor.borderInnerH") },
                    { mode: "innerV" as BorderMode, icon: <BorderInnerV />, tip: t("editor.borderInnerV") },
                    { mode: "top" as BorderMode, icon: <BorderTop />, tip: t("editor.borderTop") },
                    { mode: "bottom" as BorderMode, icon: <BorderBottom />, tip: t("editor.borderBottom") },
                    { mode: "left" as BorderMode, icon: <BorderLeft />, tip: t("editor.borderLeft") },
                    { mode: "right" as BorderMode, icon: <BorderRight />, tip: t("editor.borderRight") },
                  ]).map((item) => (
                    <Tooltip key={item.mode} content={item.tip} delay={200} placement="top">
                      <button type="button" className={styles.borderGridBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => bp.applyBorders(item.mode)}>
                        {item.icon}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <div className={styles.borderPopSection}>
                <span className={styles.borderPopLabel}>{t("editor.borderStyle")}</span>
                <select value={bp.style} onChange={(e) => bp.setStyle(e.target.value)} className={styles.borderPopSelect}>
                  {TABLE_BORDER_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value === "solid" ? `───  ${t("editor.borderSolid")}` : s.value === "dotted" ? `· · ·  ${t("editor.borderDotted")}` : s.value === "dashed" ? `- - -  ${t("editor.borderDashed")}` : s.value === "double" ? `═══  ${t("editor.borderDouble")}` : `✕  ${t("editor.borderNoneStyle")}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.borderPopSection}>
                <span className={styles.borderPopLabel}>{t("editor.borderWidth")}</span>
                <div className={styles.borderWidthCapsule}>
                  {TABLE_BORDER_WIDTHS.map((w) => (
                    <button key={w} type="button" className={`${styles.borderWidthBtn} ${bp.width === w ? styles.borderWidthBtnActive : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => bp.setWidth(w)}>{w}</button>
                  ))}
                </div>
              </div>
              <div className={styles.borderPopSection}>
                <span className={styles.borderPopLabel}>{t("editor.borderColor")}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <div className={styles.colorPickerCell} style={{ borderLeft: "none", padding: 0 }}>
                    <div className={styles.colorDot} style={{ background: bp.color }} />
                    <ColorPicker value={bp.color.startsWith("var(") ? "#d1d5db" : bp.color} onChange={bp.setColor} triggerClassName={styles.colorInput} />
                  </div>
                  {TABLE_BORDER_COLORS.map((color) => (
                    <button key={color} type="button" className={`${styles.presetDotInline} ${bp.color === color ? styles.presetDotActive : ""}`} style={{ background: color }} onMouseDown={(e) => e.preventDefault()} onClick={() => bp.setColor(color)} />
                  ))}
                </div>
              </div>
            </div>
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
