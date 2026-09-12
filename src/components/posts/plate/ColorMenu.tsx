"use client";

import React from "react";
import ColorPicker from "@/components/ui/ColorPicker";
import Tooltip from "@/components/ui/Tooltip";
import { Pipette, Dices, Check } from "@/components/icons";
import { CHECKER_BG } from "./presets";
import styles from "../RichTextEditor.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

export interface ColorSwatchDef { hex: string; label?: string; }

/**
 * 공통 색상 선택 메뉴 — 열블록/표(헤더·셀 배경·글자색 등)에서 재사용.
 * 구성: [스포이드+현재색 캡슐] [랜덤?] | [프리셋…] | [기본] [제거?] + [최근?]
 *
 * value 의미: undefined/null = 기본, removeValue 와 같으면 제거(투명), 그 외 = 커스텀 색.
 * onPick(undefined) = 기본 선택. onPick(removeValue) = 제거. onPick(hex) = 그 색.
 */
export function ColorMenu({
  label, hideLabel, hideDefault, value, onPick, onCommit, presets, defaultColor,
  defaultLabel, removeValue, removeLabel, onRandom, recent,
  checkLight, recentSlots, recentLabel, pickerFallback = "#ffffff",
}: {
  label: string;
  hideLabel?: boolean;
  /** 기본색 스와치 숨김 (예: 콜아웃 — 타입별 색이 있어 단일 기본색 개념이 없음) */
  hideDefault?: boolean;
  value: string | undefined | null;
  onPick: (v: string | undefined) => void;
  onCommit?: (v: string) => void;
  presets: ColorSwatchDef[];
  defaultColor: string;
  defaultLabel?: string;
  removeValue?: string;
  removeLabel?: string;
  onRandom?: () => string;
  recent?: string[];
  /** 프리셋·최근 스와치의 체크 표시를 밝은색(어두운 색 위)으로 */
  checkLight?: boolean;
  /** 지정 시 최근색을 고정 슬롯 수만큼 placeholder 포함해 표시 */
  recentSlots?: number;
  recentLabel?: string;
  /** 피커 초깃값 (현재색이 없을 때) */
  pickerFallback?: string;
}) {
  const { t } = useLanguage();
  /* 부르는 쪽이 이름을 주지 않으면 화면 언어의 기본 이름 */
  const defaultName = defaultLabel ?? t("editor.color_default");
  const removeName = removeLabel ?? t("editor.colorRemove");
  const recentName = recentLabel ?? t("editor.colorRecent");
  const isDefault = value === undefined || value === null;
  const isRemove = removeValue !== undefined && value === removeValue;
  const pickerVal = typeof value === "string" && !value.startsWith("var(") && value !== removeValue ? value : pickerFallback;
  const preview = isRemove ? CHECKER_BG : (value || defaultColor);
  const swatchCheck = <Check size={11} strokeWidth={3} className={checkLight ? styles.swatchCheckLight : styles.swatchCheckDark} />;
  // 바깥 .colorMenu 래퍼는 호출부가 제공 (여러 ColorMenu 를 한 popover 에 조합 가능하도록 fragment 반환)
  return (
    <>
      {!hideLabel && <div className={styles.colorMenuLabel}>{label}</div>}
      <div className={styles.swatchRow}>
        {/* 현재색 = 스포이드 캡슐 (클릭 시 피커 펼침) */}
        <ColorPicker inline value={pickerVal} onChange={(c) => onPick(c.alpha < 1 ? c.hexa : c.oklch)} onChangeComplete={(c) => onCommit?.(c.alpha < 1 ? c.hexa : c.oklch)}>
          {({ open, toggle }: { open: boolean; toggle: () => void }) => (
            <Pressable noTapScale aria-label={t("editor.colorPick")} className={`${styles.pickerCapsule} ${open ? styles.pickerCapsuleOpen : ""}`} onClick={toggle}>
              <span className={styles.pickerCapsuleIcon}><Pipette size={11} strokeWidth={2} /></span>
              <span className={styles.pickerCapsuleColor} style={{ background: preview }} />
            </Pressable>
          )}
        </ColorPicker>
        {onRandom && (
          <Tooltip content={t("editor.colorRandom")} placement="top" delay={150}>
            <Pressable noTapScale aria-label={t("editor.colorRandom")} className={`${styles.swatch} ${styles.swatchRandom}`} onClick={() => { const v = onRandom(); onPick(v); onCommit?.(v); }}><Dices size={12} strokeWidth={2} /></Pressable>
          </Tooltip>
        )}
        <span className={styles.swatchSep} />
        {presets.map((p) => (
          <Tooltip key={p.hex} content={p.label || p.hex} placement="top" delay={150}>
            <Pressable noTapScale className={`${styles.swatch} ${value === p.hex ? styles.swatchActive : ""}`} style={{ background: p.hex }} onClick={() => onPick(p.hex)}>{value === p.hex && swatchCheck}</Pressable>
          </Tooltip>
        ))}
        <span className={styles.swatchSep} />
        {!hideDefault && (
          <Tooltip content={defaultName} placement="top" delay={150}>
            <Pressable noTapScale aria-label={defaultName} className={`${styles.swatch} ${isDefault ? styles.swatchActive : ""}`} style={{ background: defaultColor }} onClick={() => onPick(undefined)}>{isDefault && swatchCheck}</Pressable>
          </Tooltip>
        )}
        {removeValue !== undefined && (
          <Tooltip content={removeName} placement="top" delay={150}>
            <Pressable noTapScale aria-label={removeName} className={`${styles.swatch} ${isRemove ? styles.swatchActive : ""}`} style={{ background: CHECKER_BG }} onClick={() => onPick(removeValue)}>{isRemove && swatchCheck}</Pressable>
          </Tooltip>
        )}
      </div>
      {recent && (recentSlots ? recentSlots > 0 : recent.length > 0) && (
        <>
          <span className={styles.colorMenuDivider} />
          <div className={styles.colorMenuFooter}>
            <span className={styles.colorMenuMiniLabel}>{recentName}</span>
            {(recentSlots
              ? Array.from({ length: recentSlots }, (_, i) => recent[i])
              : recent.slice(0, 8)
            ).map((c, i) => (c
              ? (
                <Tooltip key={i} content={c} placement="top" delay={150}>
                  <Pressable noTapScale className={`${styles.swatch} ${value === c ? styles.swatchActive : ""}`} style={{ background: c }} onClick={() => onPick(c)}>{value === c && swatchCheck}</Pressable>
                </Tooltip>
              )
              : <span key={i} className={`${styles.swatch} ${styles.swatchEmpty}`} aria-hidden />
            ))}
          </div>
        </>
      )}
    </>
  );
}
