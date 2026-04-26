"use client";

import { Search } from "lucide-react";
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
  className?: string;
}

export default function SearchCapsule({
  searchType,
  searchTypeOptions,
  onSearchTypeChange,
  search,
  onSearchChange,
  placeholder = "Search...",
  align = "right",
  className,
}: SearchCapsuleProps) {
  return (
    <div className={`${styles.capsule} ${align === "right" ? styles.right : ""} ${className ?? ""}`}>
      <Select
        value={searchType}
        options={searchTypeOptions}
        onChange={onSearchTypeChange}
        className={styles.selectWrap}
      />
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
