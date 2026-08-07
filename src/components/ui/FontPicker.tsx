"use client";

import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import { Check, ExternalLink } from "@/components/icons";
import Select from "@/components/ui/Select";
import { useLanguage } from "@/providers/LanguageProvider";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import { useCustomFonts } from "@/hooks/useCustomFonts";
import { injectFontFace } from "@/lib/customFonts";
import styles from "./FontPicker.module.css";

type FontEntry = { label: string; value: string; googleName?: string; /** 한글 지원 폰트 — 목록에 "가" 배지 표시 */ korean?: boolean };
export type FontGroup = { group: string; fonts: FontEntry[] };

interface FontPickerProps {
  value: string;
  /** googleName 이 있으면 호출 측에서 loadGoogleFont 자동 호출 (이미 component 내부에서 처리됨) */
  onChange: (value: string, googleName?: string) => void;
  /** font entry 들. 단일 그룹이면 group="" 로 한 그룹만 넘기면 됨 (그룹 라벨 안 보임) */
  groups: FontGroup[];
  /** 한글 그룹을 영문 그룹 뒤로 이동 (영문 UI 우선) */
  preferEn?: boolean;
  /** Google Fonts 검증 활성화 (preset 일치 없을 때 입력 폰트 검색) */
  enableGoogleSearch?: boolean;
  /** Trigger 에 표시할 현재 값 render 함수. 미정의 시 group 안에서 match 된 entry.label 사용 */
  renderValue?: () => React.ReactNode;
  /** match 안 되는 value 일 때의 fallback 라벨 (예: "Default") */
  fallbackLabel?: string;
  /** dropdown 을 trigger 아래로 열기 (Select 로 전달) */
  dropAlign?: "active" | "below";
  triggerClassName?: string;
  dropdownClassName?: string;
  /** Select trigger 높이 — 툴바 등에서 다른 Select 와 높이 통일 시 "sm" (기본 default) */
  size?: "default" | "sm";
  /** value 가 그룹 내 entry.value 와 일치하는지 정규화 (예: CSS quote 차이 보정).
   *  반환값은 entries 중 하나의 value (또는 안 맞으면 원본 value). */
  resolveMatch?: (value: string, entries: FontEntry[]) => string;
  /** Google Fonts 검색 결과 클릭 시 onChange 에 넘길 value 변환 (편집기는 CSS string, 어드민은 display name).
   *  default: googleResult.name 그대로 */
  toGoogleValue?: (name: string) => string;
}

/** Subsequence 매칭 — query 의 chars 가 text 안에 순서대로 나타나면 true.
 *  case-insensitive, whitespace 무시 (querty 의 공백은 chars 로 안 침). */
function subsequenceMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Editor / Admin 양쪽에서 공통으로 쓰는 폰트 선택 컴포넌트.
 *  Select trigger + 드롭다운 안 검색 input + 그룹화된 폰트 목록 + Google Fonts 검색 결과 */
export default function FontPicker({
  value, onChange, groups,
  preferEn, enableGoogleSearch = true, dropAlign,
  renderValue, fallbackLabel,
  triggerClassName, dropdownClassName, size,
  resolveMatch,
  toGoogleValue,
}: FontPickerProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [googleMatches, setGoogleMatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 리스트 높이 애니메이션 — 내부 content 크기를 측정해 explicit height 로 적용 → CSS transition 으로 부드럽게.
  // (auto height 는 transition 불가, motion layout 은 FLIP transform 이라 footer 점프함)
  const listInnerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState<number | null>(null);
  // iOS 식 섹션 헤더 — 현재 최상단 그룹명을 목록(.list) 위 고정 영역에 표시. 항목은 .list 안에서 clip.
  const listRef = useRef<HTMLDivElement>(null);
  const [curGroup, setCurGroup] = useState("");
  const updateCurGroup = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const listTop = list.getBoundingClientRect().top;
    let cur = "";
    for (const gd of list.querySelectorAll<HTMLElement>("[data-group]")) {
      if (gd.getBoundingClientRect().top <= listTop + 4) cur = gd.dataset.group || "";
      else break;
    }
    setCurGroup(cur);
  }, []);

  // ── 커스텀 폰트(업로드 + public/fonts 스캔) — 맨 앞 "Custom" 그룹으로 합치고 @font-face 주입 ──
  // value 는 toGoogleValue 규약을 따른다 (타이포=display name, 에디터/로고=CSS 문자열).
  const customFonts = useCustomFonts();
  useEffect(() => {
    customFonts.forEach(injectFontFace);
  }, [customFonts]);
  const allGroups = useMemo<FontGroup[]>(() => {
    if (customFonts.length === 0) return groups;
    return [
      {
        group: "Custom",
        fonts: customFonts.map((f) => ({
          label: f.name,
          value: toGoogleValue ? toGoogleValue(f.name) : f.name,
        })),
      },
      ...groups,
    ];
  }, [customFonts, groups, toGoogleValue]);

  // flat list — useMemo 로 안정화 (groups 자체는 호출 측에서 재생성될 수 있어 ref 로 latest 추적).
  // useEffect deps 에 넣지 않음 → 매 렌더 effect 재실행으로 debounce 가 cancel 되던 버그 fix.
  const flat = useMemo(() => allGroups.flatMap((g) => g.fonts), [allGroups]);
  const flatRef = useRef(flat);
  flatRef.current = flat;

  const matchedValue = resolveMatch ? resolveMatch(value, flat) : value;
  const currentEntry = flat.find((f) => f.value === matchedValue);
  // 열리자마자(스크롤 전) 최상단에 올 그룹 = 현재 선택 폰트의 그룹 — 헤더 초기값으로 써서 툭 나타나지 않게.
  const activeGroup = allGroups.find((g) => g.fonts.some((f) => f.value === matchedValue))?.group ?? "";

  // 검색어 변경 시 Google Fonts 검색 (debounce) — preset 매칭 여부와 무관하게 항상 fire.
  // /api/fonts/search 가 부분 매칭 지원 — "robo" 면 Roboto, Roboto Mono, Roboto Slab 등 반환.
  // preset 결과와 Google Fonts 결과를 dropdown 에 같이 표시.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!enableGoogleSearch) { setGoogleMatches([]); return; }
    const q = query.trim();
    if (!q) {
      setGoogleMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fonts/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setGoogleMatches(Array.isArray(data.fonts) ? data.fonts : []);
      } catch {
        setGoogleMatches([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, enableGoogleSearch]);

  // 영문 우선 — 한글 그룹을 뒤로
  const orderedGroups = (() => {
    if (!preferEn) return allGroups;
    const ko = ["Korean (한글)"];
    return [
      ...allGroups.filter((g) => !ko.includes(g.group)),
      ...allGroups.filter((g) => ko.includes(g.group)),
    ];
  })();

  // 검색어로 그룹 내 폰트 필터 — subsequence 매칭 (chars 순서만 맞으면 사이 gap 허용).
  // 예: "spc" → "Space", "abc" → "AaBbCc", "bc" → "Abc" 모두 매칭.
  const filtered = query.trim()
    ? orderedGroups
        .map((g) => ({
          ...g,
          fonts: g.fonts.filter((f) => subsequenceMatch(f.label, query)),
        }))
        .filter((g) => g.fonts.length > 0)
    : orderedGroups;

  const pick = (val: string, close: () => void, googleName?: string) => {
    if (googleName) loadGoogleFont(googleName);
    onChange(val, googleName);
    close();
    setQuery("");
  };

  // dropdown content 가 변할 때마다 inner 높이 측정 → state 로 적용. CSS transition 이 부드럽게 변환.
  // max-height (320px) cap → scroll. 측정 dep 에 영향을 주는 모든 state 포함.
  useLayoutEffect(() => {
    if (!listInnerRef.current) return;
    const next = Math.min(listInnerRef.current.scrollHeight, 320);
    setListHeight(next);
    updateCurGroup();
  }, [filtered, query, googleMatches, loading, updateCurGroup]);

  return (
    <Select
      value={matchedValue}
      onChange={() => {}}
      showCheck
      renderValue={renderValue ?? (() => (
        <span style={{ fontFamily: currentEntry?.value || value || undefined }}>
          {currentEntry?.label ?? fallbackLabel ?? value}
        </span>
      ))}
      dropAlign={dropAlign}
      size={size}
      className={triggerClassName}
      dropdownClassName={dropdownClassName}
    >
      {({ close }) => (
        <>
          <div className={styles.search}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("editor.fontSearch")}
              className={styles.searchInput}
              autoFocus
            />
          </div>
          {/* 목록에 없는 폰트도 Google Fonts 에 있으면 검색으로 찾을 수 있음을 알린다 */}
          {enableGoogleSearch && (
            <p className={styles.searchHint}>{t("editor.fontSearchHint")}</p>
          )}
          {/* 현재 그룹 헤더 — 목록 위 고정 영역(hint 처럼). 항목은 .list 안에서 clip 되어 안 겹침.
              curGroup 이 아직 없으면 activeGroup 으로 — 열리자마자 툭 나타나지 않고 처음부터 보임. */}
          {(curGroup || activeGroup) && <div className={styles.stickyGroup}>{curGroup || activeGroup}</div>}
          <div
            ref={listRef}
            data-lenis-prevent
            className={styles.list}
            style={{ height: listHeight !== null ? listHeight : undefined }}
            onScroll={updateCurGroup}
          >
            <div ref={listInnerRef} className={styles.listInner}>
            {filtered.map((g) => (
              <div key={g.group} data-group={g.group || undefined}>
                {g.fonts.map((f) => {
                  const active = matchedValue === f.value;
                  return (
                    <div
                      key={f.value}
                      onMouseDown={(e) => { e.preventDefault(); pick(f.value, close, f.googleName); }}
                      data-active={active ? "" : undefined}
                      className={`${styles.item} ${active ? styles.itemActive : ""}`}
                      style={{ fontFamily: f.value || undefined }}
                      onMouseEnter={() => { if (f.googleName) loadGoogleFont(f.googleName); }}
                    >
                      {f.korean && <span className={styles.itemKr} aria-label="한글 지원">가</span>}
                      <span className={styles.itemLabel}>{f.label}</span>
                      {active && <Check className={styles.itemCheck} size={14} strokeWidth={2.5} />}
                    </div>
                  );
                })}
              </div>
            ))}
            {query.trim() && !loading && googleMatches.length > 0 && (() => {
              // preset 매칭에 이미 있는 이름은 Google 그룹에서 제외 — 중복 노출 방지
              const presetNames = new Set(filtered.flatMap((g) => g.fonts.map((f) => f.label.toLowerCase())));
              const uniqueGoogle = googleMatches.filter((n) => !presetNames.has(n.toLowerCase()));
              if (uniqueGoogle.length === 0) return null;
              return (
                <div data-group="Google Fonts">
                  {uniqueGoogle.map((name) => (
                    <div
                      key={name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const v = toGoogleValue ? toGoogleValue(name) : name;
                        pick(v, close, name);
                      }}
                      className={styles.item}
                      style={{ fontFamily: `'${name}', sans-serif` }}
                      onMouseEnter={() => loadGoogleFont(name)}
                    >
                      <span className={styles.itemLabel}>{name}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            {query.trim() && loading && <div className={styles.hint}>…</div>}
            {query.trim() && filtered.length === 0 && googleMatches.length === 0 && !loading && (
              <div className={styles.hint}>{t("editor.fontNoResult")}</div>
            )}
            </div>
          </div>
          <div className={styles.footer}>
            <a
              href="https://fonts.google.com"
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.stopPropagation()}
              className={styles.footerLink}
            >
              <ExternalLink size={12} />
              Google Fonts
            </a>
          </div>
        </>
      )}
    </Select>
  );
}
