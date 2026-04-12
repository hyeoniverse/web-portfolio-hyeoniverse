"use client";

import Select from "@/components/ui/Select";
import styles from "./SearchCapsule.module.css";

export interface SearchCapsuleProps {
  searchType: string;
  searchTypeOptions: { value: string; label: string }[];
  onSearchTypeChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  align?: "left" | "right";
}

export default function SearchCapsule({
  searchType,
  searchTypeOptions,
  onSearchTypeChange,
  search,
  onSearchChange,
  placeholder = "Search...",
  align = "right",
}: SearchCapsuleProps) {
  return (
    <div className={`${styles.capsule} ${align === "right" ? styles.right : ""}`}>
      <Select
        value={searchType}
        options={searchTypeOptions}
        onChange={onSearchTypeChange}
        className={styles.selectWrap}
      />
      <svg className={styles.icon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
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
