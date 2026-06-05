"use client";

import FontPicker, { type FontGroup } from "@/components/ui/FontPicker";
import { getFontFamily } from "../_data/settingsConstants";
import styles from "../Settings.module.css";

interface FontSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

/** 어드민 typography 폰트 선택 — 공통 FontPicker 위의 얇은 wrapper.
 *  options(string[]) 을 FontGroup 형태로 변환. value 는 display name (예: "Space Grotesk"). */
export default function FontSelect({ label, value, options, onChange }: FontSelectProps) {
  // 단일 group — 첫 entry 가 default (label 에 hint 표기)
  const groups: FontGroup[] = [
    {
      group: "",
      fonts: options.map((o, i) => ({
        label: i === 0 ? `${o} (기본)` : o,
        value: o,
        googleName: o,
      })),
    },
  ];

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <FontPicker
        value={value}
        onChange={(v) => onChange(v)}
        groups={groups}
        triggerClassName={styles.fontPickerSelect}
        dropdownClassName={styles.fontPickerDropdown}
        renderValue={() => (
          <span style={{ fontFamily: getFontFamily(value) }}>{value || options[0]}</span>
        )}
      />
    </div>
  );
}
