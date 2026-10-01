"use client";

/* 라이브러리 섹션 머리 — 다섯 목록이 같은 꼴을 쓴다.
   제목·개수 → 설명 한 줄 → 도구막대(왼쪽 걸러 보기, 오른쪽 검색·단추). 도구막대는 위아래 실선으로 목록과 나눈다.
   예전엔 검색만 제목 줄에, 걸러 보기는 그 아래 줄에 따로 있어 목록마다 배치가 달랐다. */
import type { ReactNode } from "react";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import settings from "../Settings.module.css";
import lib from "./Library.module.css";

interface Props {
  title: string;
  count?: ReactNode;
  hint: ReactNode;
  /** 도구막대 왼쪽 — 걸러 보기(SegmentedControl·Switch 등) */
  filters?: ReactNode;
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  /** 도구막대 맨 오른쪽 — 추가 단추·보기 전환 */
  actions?: ReactNode;
}

export default function LibraryHead({ title, count, hint, filters, search, actions }: Props) {
  const toolbar = filters || search || actions;
  return (
    <>
      <div className={lib.headRow}>
        <h2 className={settings.sectionTitle}>{title}</h2>
        {count != null && <span className={lib.headCount}>{count}</span>}
      </div>
      <p className={lib.hint}>{hint}</p>
      {toolbar && (
        <div className={lib.toolbar}>
          {filters && <div className={lib.toolbarFilters}>{filters}</div>}
          <div className={lib.toolbarEnd}>
            {search && (
              <div className={lib.headSearch}>
                <SearchCapsule search={search.value} onSearchChange={search.onChange} placeholder={search.placeholder} align="left" />
              </div>
            )}
            {actions}
          </div>
        </div>
      )}
    </>
  );
}
