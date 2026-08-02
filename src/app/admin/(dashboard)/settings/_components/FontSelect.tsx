"use client";

import { useEffect } from "react";
import { FONT_GROUPS, FONT_FAMILIES_FLAT } from "@/components/posts/plate/constants";
import FontPicker, { type FontGroup } from "@/components/ui/FontPicker";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import styles from "../Settings.module.css";

interface FontSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

// 타이포그래피는 폰트 "이름"을 저장한다(ThemeProvider 가 이름으로 CSS var 매핑/로드).
// 공용 FONT_GROUPS(단일 소스)를 이름-value 로 변환해, 로고·에디터와 같은 카탈로그를 노출하되
// 값 규약(display name)만 맞춘다. FontPicker 가 Custom 그룹·Google 검색은 알아서 얹는다.
const TYPO_GROUPS: FontGroup[] = FONT_GROUPS.map((g) => ({
  group: g.group,
  fonts: g.fonts.map((f) => ({ label: f.label, value: f.label, googleName: f.googleName, korean: f.korean })),
}));

/** 어드민 typography 폰트 선택 — 공통 FontPicker 위 얇은 wrapper. value 는 display name. */
export default function FontSelect({ label, value, onChange }: FontSelectProps) {
  // 선택 폰트 미리보기 로드 — 프리셋은 Google 로드, 커스텀/업로드는 @font-face 로 이미 준비됨
  const entry = FONT_FAMILIES_FLAT.find((f) => f.label === value);
  useEffect(() => {
    if (entry?.googleName) loadGoogleFont(entry.googleName);
  }, [entry]);

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <FontPicker
        value={value}
        onChange={(v) => onChange(v)}
        groups={TYPO_GROUPS}
        triggerClassName={styles.fontPickerSelect}
        dropdownClassName={styles.fontPickerDropdown}
        renderValue={() => <span style={{ fontFamily: value ? `"${value}"` : undefined }}>{value}</span>}
      />
    </div>
  );
}
