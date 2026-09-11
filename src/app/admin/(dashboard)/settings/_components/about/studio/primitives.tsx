"use client";

import * as React from "react";
import { type CSSProperties, type ReactNode } from "react";
import css from "../AboutStudio.module.css";
import frame from "@/app/about/_components/AboutPanel.module.css";
import shell from "@/app/about/_components/AboutSection.module.css";
import { ChevronLeft, ChevronRight, Plus } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
export const sec = { ...frame, ...shell };

/* ═══════════ 타입 ═══════════ */
export type ThemeBg = { primary: string; secondary: string; accent: string };

export const mediaUrlOf = (bg: string) => bg.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? bg.match(/^(\S+)/)?.[1] ?? "";

export const isVideoUrl = (u: string) => /\.(mp4|webm|mov|ogv)(\?|#|$)/i.test(u);

/* Hero 미니어처 — 실제 데스크톱 뷰포트 비율(≈16:10)로 그린 뒤 stage 폭에 맞게 scale 다운 */
export const DESIGN_W = 1440;

export const DESIGN_H = 860;

/* ═══════════ 인라인 편집 텍스트 ═══════════ */
export function EditableText({ value, onChange, placeholder, multiline, wrap, className, style, ariaLabel, onFocus, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** 값은 한 줄(줄바꿈 없음)이지만 칸 폭을 넘으면 접어서 보여 준다. input 은 접지 못해 긴 제목·경로가
      칸 끝에서 잘렸다(Key Features 제목, Backend 경로). Enter·붙여넣기의 줄바꿈은 공백으로 바꾼다. */
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  autoFocus?: boolean;
}) {
  const cls = `${css.edit} ${wrap ? css.editWrap : ""} ${className ?? ""}`;
  if (multiline || wrap) {
    return (
      <textarea className={cls} style={style} value={value} placeholder={placeholder} aria-label={ariaLabel}
        rows={1} autoFocus={autoFocus} onFocus={onFocus}
        onChange={(e) => onChange(wrap ? e.target.value.replace(/\r?\n/g, " ") : e.target.value)}
        /* 조합 중 Enter 는 글자를 확정하는 키라 막지 않는다 */
        onKeyDown={wrap ? (e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault(); } : undefined} />
    );
  }
  return (
    <input className={cls} style={style} value={value} placeholder={placeholder} aria-label={ariaLabel}
      autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} />
  );
}

/* 패널 편집 스테이지 — 편집 열 폭에 맞춰 그린다.
   글자를 줄이지도, 잘라내지도 않는다. 두 방법 모두 한 번씩 써 보고 물렀다.
   - 실제 뷰포트 폭(1440px)으로 그리고 넘치는 만큼 가로 스크롤: 열이 990px 이라 450px 이
     늘 화면 밖이었다. 글이 많은 패널(Backend·Design Decisions)은 한 줄을 읽으려고
     좌우로 밀어야 했고, 편집 중에 커서가 보이지 않는 자리로 넘어갔다.
   - transform 으로 축소: 0.72 배가 걸려 16px 본문이 11.5px 이 됐다.
   패널 CSS 는 원래 반응형이라 폭만 넘겨주면 그 폭에 맞춰 다시 흐른다. 편집기에서 보는
   줄바꿈은 실제 페이지와 다르지만, 고치는 동안 글이 다 보이는 쪽이 맞다.
   --tool-scale 은 패널 안 편집 버튼의 counter-scale 용이라 1 로 고정된다. */
export function PanelStage({ children }: { children: ReactNode }) {
  const panelStyle: CSSProperties = { width: "100%", height: "auto", minHeight: DESIGN_H, padding: "clamp(24px, 2.4vw, 48px)" };
  (panelStyle as Record<string, string | number>)["--tool-scale"] = 1;

  return (
    <div className={css.panelStage}>
      <div className={`${sec.section} ${sec.panel}`} style={panelStyle}>
        {children}
      </div>
    </div>
  );
}

/* 스테이지 전환 스트립 — 항목 제목을 탭으로 나열하면 길어져서 화면 밖으로 넘친다.
   실제 패널의 dotNav 처럼 번호 dot + 좌우 이동으로 고정 폭을 유지하고, 제목은 한 칸에서 줄임표 처리. */
export function StageTabs({ count, active, onSelect, labelOf, addLabel, onAdd, canAdd }: {
  count: number; active: number; onSelect: (i: number) => void; labelOf: (i: number) => string;
  addLabel: string; onAdd: () => void; canAdd: boolean;
}) {
  return (
    <div className={css.stageTabs}>
      <Button variant="subtle" shape="circle" size="xs" aria-label="previous"
        disabled={active <= 0} onClick={() => onSelect(active - 1)}>
        <ChevronLeft size={14} />
      </Button>
      <div className={css.stageDots}>
        {Array.from({ length: count }, (_, i) => (
          <Pressable key={i} title={labelOf(i)}
            className={`${css.stageDot} ${i === active ? css.stageDotOn : ""}`}
            onClick={() => onSelect(i)}>
            {String(i + 1).padStart(2, "0")}
          </Pressable>
        ))}
      </div>
      <Button variant="subtle" shape="circle" size="xs" aria-label="next"
        disabled={active >= count - 1} onClick={() => onSelect(active + 1)}>
        <ChevronRight size={14} />
      </Button>
      <span className={css.stageTabLabel} title={labelOf(active)}>{labelOf(active)}</span>
      {canAdd && (
        <Button variant="subtle" size="xs" icon={<Plus size={14} />} onClick={onAdd}>{addLabel}</Button>
      )}
    </div>
  );
}
