"use client";

import { Search } from "lucide-react";
import Select from "@/components/ui/Select";
import styles from "./SearchCapsule.module.css";

export interface SearchCapsuleProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** 옵션: 검색 타입 selector. 셋 다 함께 전달해야 활성. */
  searchType?: string;
  searchTypeOptions?: { value: string; label: string }[];
  onSearchTypeChange?: (value: string) => void;
  align?: "left" | "right";
  className?: string;
}

/** 공통 검색 capsule — Select(옵션) + 아이콘 + input. tag/sort capsule 과 동일 높이 */
export default function SearchCapsule({
  search,
  onSearchChange,
  placeholder = "Search...",
  searchType,
  searchTypeOptions,
  onSearchTypeChange,
  align = "right",
  className,
}: SearchCapsuleProps) {
  const showSelect = !!(searchType !== undefined && searchTypeOptions && onSearchTypeChange);
  return (
    <div className={`${styles.capsule} ${align === "right" ? styles.right : ""} ${className ?? ""}`}>
      {showSelect && (
        <Select
          value={searchType!}
          options={searchTypeOptions!}
          onChange={onSearchTypeChange!}
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
