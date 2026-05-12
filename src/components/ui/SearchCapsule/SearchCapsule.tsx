"use client";

import { Search } from "lucide-react";
import Select from "@/components/ui/Select";
import styles from "./SearchCapsule.module.css";

export interface SearchCapsuleProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** 검색 타입 selector — 객체로 묶어 "셋 다 또는 0개" 를 타입으로 강제 */
  typeSelector?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  };
  align?: "left" | "right";
  className?: string;
}

/** 공통 검색 capsule — Select(옵션) + 아이콘 + input. tag/sort capsule 과 동일 높이 */
export default function SearchCapsule({
  search,
  onSearchChange,
  placeholder = "Search...",
  typeSelector,
  align = "right",
  className,
}: SearchCapsuleProps) {
  return (
    <div className={`${styles.capsule} ${align === "right" ? styles.right : ""} ${className ?? ""}`}>
      {typeSelector && (
        <Select
          value={typeSelector.value}
          options={typeSelector.options}
          onChange={typeSelector.onChange}
          className={styles.selectWrap}
        />
      )}
      <Search className={styles.icon} size={14} />
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.input}
      />
    </div>
  );
}
