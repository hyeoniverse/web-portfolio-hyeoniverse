import React from "react";
import { Lock, Unlock, AlignLeft, AlignCenter, AlignRight, AlignJustify, Trash2 } from "@/components/icons";

// ── SVG Icons ──
export function LockIcon() {
  return <Lock size={12} />;
}

export function UnlockIcon() {
  return <Unlock size={12} />;
}

export function AlignIcon({ align }: { align: "left" | "center" | "right" | "justify" }) {
  if (align === "left") return <AlignLeft size={13} />;
  if (align === "center") return <AlignCenter size={13} />;
  if (align === "right") return <AlignRight size={13} />;
  return <AlignJustify size={13} />;
}

// ── Table toolbar icons ──
export function TblRowBefore() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="8.5" width="13" height="6" rx="0.5"/>
      <line x1="1.5" y1="11.5" x2="14.5" y2="11.5"/><line x1="8" y1="8.5" x2="8" y2="14.5"/>
      <line x1="8" y1="2" x2="8" y2="6.5"/><polyline points="5.5,4.5 8,2 10.5,4.5"/>
    </svg>
  );
}
export function TblRowAfter() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="6" rx="0.5"/>
      <line x1="1.5" y1="4.5" x2="14.5" y2="4.5"/><line x1="8" y1="1.5" x2="8" y2="7.5"/>
      <line x1="8" y1="9.5" x2="8" y2="14"/><polyline points="5.5,11.5 8,14 10.5,11.5"/>
    </svg>
  );
}
export function TblRowRemove() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="5" width="13" height="6" rx="0.5"/>
      <line x1="1.5" y1="8" x2="14.5" y2="8"/><line x1="8" y1="5" x2="8" y2="11"/>
      <line x1="5" y1="1.5" x2="11" y2="3.5"/><line x1="11" y1="1.5" x2="5" y2="3.5"/>
    </svg>
  );
}
export function TblColBefore() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8.5" y="1.5" width="6" height="13" rx="0.5"/>
      <line x1="11.5" y1="1.5" x2="11.5" y2="14.5"/><line x1="8.5" y1="8" x2="14.5" y2="8"/>
      <line x1="2" y1="8" x2="6.5" y2="8"/><polyline points="4.5,5.5 2,8 4.5,10.5"/>
    </svg>
  );
}
export function TblColAfter() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="1.5" width="6" height="13" rx="0.5"/>
      <line x1="4.5" y1="1.5" x2="4.5" y2="14.5"/><line x1="1.5" y1="8" x2="7.5" y2="8"/>
      <line x1="9.5" y1="8" x2="14" y2="8"/><polyline points="11.5,5.5 14,8 11.5,10.5"/>
    </svg>
  );
}
export function TblColRemove() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="1.5" width="6" height="13" rx="0.5"/>
      <line x1="8" y1="1.5" x2="8" y2="14.5"/><line x1="5" y1="8" x2="11" y2="8"/>
      <line x1="1.5" y1="1.5" x2="3.5" y2="3.5"/><line x1="3.5" y1="1.5" x2="1.5" y2="3.5"/>
    </svg>
  );
}
export function TblMergeCells() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="5.5" height="10" rx="0.5"/>
      <rect x="9.5" y="3" width="5.5" height="10" rx="0.5"/>
      <polyline points="9,6 11.5,8 9,10"/><polyline points="7,6 4.5,8 7,10"/>
    </svg>
  );
}
export function TblSplitCell() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="0.5"/>
      <line x1="8" y1="3" x2="8" y2="13"/>
      <polyline points="5.5,6 3,8 5.5,10"/><polyline points="10.5,6 13,8 10.5,10"/>
    </svg>
  );
}
export function TblTrash() {
  return <Trash2 size={12} strokeWidth={1.5} />;
}

export function TblCellColorIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12"/>
      <path d="m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z"/>
      <path d="m2 22 .414-.414"/>
    </svg>
  );
}
export function TblVAlignTop() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="4" y1="4.5" x2="12" y2="4.5"/><line x1="4" y1="7.5" x2="9" y2="7.5"/>
    </svg>
  );
}
export function TblVAlignMiddle() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="4" y1="6.5" x2="12" y2="6.5"/><line x1="4" y1="9.5" x2="9" y2="9.5"/>
    </svg>
  );
}
export function TblVAlignBottom() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="4" y1="9" x2="12" y2="9"/><line x1="4" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
export function TblZebra() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="2" width="14" height="12" rx="0.5"/>
      <rect x="1.75" y="6.25" width="12.5" height="3.5" fill="currentColor" fillOpacity="0.25" stroke="none"/>
      <line x1="1" y1="6" x2="15" y2="6"/><line x1="1" y1="10" x2="15" y2="10"/>
    </svg>
  );
}
// ── Cell border position selector icons (12px grid) ──
const BS = { width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
const bThin = 1;
const bThick = 2.5;
/** 모든 테두리 */
export function BorderAll() {
  return (<svg {...BS}><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThick}/><line x1="1" y1="8" x2="15" y2="8" strokeWidth={bThin}/><line x1="8" y1="1" x2="8" y2="15" strokeWidth={bThin}/></svg>);
}
/** 바깥 테두리만 */
export function BorderOuter() {
  return (<svg {...BS}><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThick}/></svg>);
}
/** 테두리 없음 */
export function BorderNone() {
  return (<svg {...BS} strokeWidth={bThin} strokeDasharray="2 2"><rect x="1" y="1" width="14" height="14" rx="0.5"/></svg>);
}
/** 위 */
export function BorderTop() {
  return (<svg {...BS}><line x1="1" y1="1.5" x2="15" y2="1.5" strokeWidth={bThick}/><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThin} strokeDasharray="2 2" opacity="0.3"/></svg>);
}
/** 아래 */
export function BorderBottom() {
  return (<svg {...BS}><line x1="1" y1="14.5" x2="15" y2="14.5" strokeWidth={bThick}/><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThin} strokeDasharray="2 2" opacity="0.3"/></svg>);
}
/** 왼쪽 */
export function BorderLeft() {
  return (<svg {...BS}><line x1="1.5" y1="1" x2="1.5" y2="15" strokeWidth={bThick}/><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThin} strokeDasharray="2 2" opacity="0.3"/></svg>);
}
/** 오른쪽 */
export function BorderRight() {
  return (<svg {...BS}><line x1="14.5" y1="1" x2="14.5" y2="15" strokeWidth={bThick}/><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThin} strokeDasharray="2 2" opacity="0.3"/></svg>);
}
/** 가로 안쪽선 */
export function BorderInnerH() {
  return (<svg {...BS}><line x1="1" y1="8" x2="15" y2="8" strokeWidth={bThick}/><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThin} strokeDasharray="2 2" opacity="0.3"/></svg>);
}
/** 세로 안쪽선 */
export function BorderInnerV() {
  return (<svg {...BS}><line x1="8" y1="1" x2="8" y2="15" strokeWidth={bThick}/><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThin} strokeDasharray="2 2" opacity="0.3"/></svg>);
}
/** 안쪽선 모두 */
export function BorderInnerAll() {
  return (<svg {...BS}><line x1="1" y1="8" x2="15" y2="8" strokeWidth={bThick}/><line x1="8" y1="1" x2="8" y2="15" strokeWidth={bThick}/><rect x="1" y="1" width="14" height="14" rx="0.5" strokeWidth={bThin} strokeDasharray="2 2" opacity="0.3"/></svg>);
}

export function TblResetFormat() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="0.5"/>
      <line x1="1" y1="7.5" x2="15" y2="7.5"/><line x1="7" y1="3" x2="7" y2="13"/>
      <line x1="9.5" y1="4.5" x2="13.5" y2="6.5" strokeWidth="1.2"/>
      <line x1="13.5" y1="4.5" x2="9.5" y2="6.5" strokeWidth="1.2"/>
    </svg>
  );
}
