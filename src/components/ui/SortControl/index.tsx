"use client";

import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./SortControl.module.css";

/* 정렬 컨트롤 — 필드 Select + 역순 토글을 하나의 pill 로 결합.
   달력 블록 툴바의 규격이 기준이고, 댓글도 같은 걸 쓴다(예전엔 각자 달랐다).

   역순 아이콘은 **현재 방향을 반영**한다 — 고정 아이콘(ArrowUpDown)은 "누르면 뒤집힌다"는 것만
   알려줄 뿐 지금이 어느 방향인지 못 알려준다. */

export type SortDirection = "asc" | "desc";

interface SortControlProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  dir: SortDirection;
  onDirChange: (d: SortDirection) => void;
  /** Select 드롭다운에 얹을 클래스 — 모달 위 등 z-index 가 필요한 자리용 */
  dropdownClassName?: string;
  /** 배치용 className 만 (시각 override 금지) */
  className?: string;
}

export default function SortControl<T extends string>({
  value, onChange, options, dir, onDirChange, dropdownClassName, className,
}: SortControlProps<T>) {
  const { language } = useLanguage();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  return (
    <div className={`${styles.group}${className ? ` ${className}` : ""}`}>
      <Select
        value={value}
        onChange={(v) => onChange(v as T)}
        options={options}
        size="sm"
        dropdownClassName={dropdownClassName}
      />
      <Tooltip content={dir === "asc" ? t("오름차순", "Ascending") : t("내림차순", "Descending")}>
        <Button
          variant="ghost"
          size="sm"
          soundDisabled
          className={styles.dir}
          icon={dir === "asc" ? <ArrowDownNarrowWide size={14} /> : <ArrowUpNarrowWide size={14} />}
          onClick={() => onDirChange(dir === "asc" ? "desc" : "asc")}
          aria-label={t("역순", "Reverse")}
        />
      </Tooltip>
    </div>
  );
}
