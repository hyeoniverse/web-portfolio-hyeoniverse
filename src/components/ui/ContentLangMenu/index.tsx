"use client";

import { useMemo, useState } from "react";
import { Languages, Check, Search } from "@/components/icons";
import Popover, { MenuItem } from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
import LoadingDots from "@/components/ui/LoadingDots";
import { useLanguage } from "@/providers/LanguageProvider";
import { TRANSLATION_LANGUAGES } from "@/lib/translationLanguages";
import { localLangName } from "@/utils/localLangName";
import { cn } from "@/utils/cn";
import styles from "./ContentLangMenu.module.css";

interface ContentLangMenuProps {
  /** 지금 번역해 보고 있는 언어 — null 이면 원문(KO/EN) */
  value: string | null;
  /** 언어 고르기 — null 은 원문 보기 */
  onChange: (lang: string | null) => void;
  /** 번역을 받아 오는 중 — 언어 코드 자리에 움직이는 점을 둔다 */
  busy?: boolean;
  /** 단추 모양을 쓰는 쪽 것으로 — 내비게이션의 원형 단추(SiteLangMenu). 켜졌을 때 클래스도 같이 */
  triggerClassName?: string;
  triggerActiveClassName?: string;
  /** 언어 코드 글자 모양을 쓰는 쪽 것으로 — 내비게이션은 옆 KO/EN 토글과 같은 글자(langText) */
  codeClassName?: string;
  /** 단추 말풍선 · 이름 — 기본은 상세 화면의 문구("다른 언어로 읽기" / "번역 끄기") */
  labels?: { open: string; off: string };
  /** 말풍선 위치 — 내비게이션은 아래 */
  tooltipPlacement?: "top" | "bottom";
  /** 아이콘 옆에 이름(열기 · 끄기 문구)도 보인다 — 메뉴 서랍처럼 아이콘만으로는 뜻이 안 보이는 자리 */
  showLabel?: boolean;
}

/**
 * 상세 헤더의 "다른 언어로 읽기" — LanguageToggle 옆의 지구본 단추 + 언어 메뉴.
 * 메뉴는 그 언어로 쓴 이름(日本語, Deutsch …)을 보이고, 화면 언어의 이름(일본어 / Japanese)으로도 찾을 수 있다.
 * 켜진 언어(체크)를 다시 누르면 번역을 끄고 원문으로 돌아간다. 언어 목록은 lib/translationLanguages 한 곳에서.
 */
export default function ContentLangMenu({
  value,
  onChange,
  busy = false,
  triggerClassName,
  triggerActiveClassName,
  codeClassName,
  labels,
  tooltipPlacement = "top",
  showLabel = false,
}: ContentLangMenuProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRANSLATION_LANGUAGES
      .map((l) => ({ ...l, local: localLangName(l.code, language) }))
      .filter((l) => !q || [l.native, l.name, l.local, l.code].some((s) => s.toLowerCase().includes(q)));
  }, [query, language]);

  const pick = (lang: string | null, close: () => void) => {
    onChange(lang);
    setQuery("");
    close();
  };

  const label = value ? labels?.off ?? t("contentTranslate.turnOff") : labels?.open ?? t("contentTranslate.menuLabel");
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        /* 번역이 켜져 있으면 단추는 끄기 — 메뉴를 열지 않고 원문으로 돌아간다. 꺼진 뒤 다시 누르면 메뉴가 열린다 */
        if (o && value) { onChange(null); return; }
        setOpen(o);
        if (!o) setQuery("");
      }}
      placement="bottom-end"
      menu
      maxHeight={false}
      sheetTitle={label}
      contentClassName={styles.panel}
      trigger={
        <Tooltip content={label} placement={tooltipPlacement} delay={200}>
          <Pressable
            type="button"
            className={triggerClassName
              ? cn(triggerClassName, value && triggerActiveClassName)
              : cn(styles.trigger, value && styles.triggerActive)}
            aria-label={label}
            aria-haspopup={value ? undefined : "menu"}
            aria-expanded={value ? undefined : open}
            aria-pressed={value ? true : undefined}
            aria-busy={busy || undefined}
          >
            <Languages size={14} />
            {showLabel && <span>{label}</span>}
            {value && (busy
              ? <LoadingDots className={styles.triggerBusy} />
              : <span className={cn(styles.triggerCode, codeClassName)}>{value}</span>)}
          </Pressable>
        </Tooltip>
      }
    >
      {({ close }) => (
        <>
          {/* 검색 — 칸 안의 칸이 되지 않게 테두리 없는 한 줄로, 아래 실선으로만 목록과 나눈다 */}
          <label className={styles.search}>
            <Search size={14} className={styles.searchIcon} aria-hidden />
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("contentTranslate.search")}
              aria-label={t("contentTranslate.search")}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className={styles.list} role="menu">
            {items.length === 0 && <p className={styles.empty}>{t("contentTranslate.noMatch")}</p>}
            {items.map((l) => {
              const on = l.code === value;
              return (
                <MenuItem
                  key={l.code}
                  active={on}
                  className={styles.item}
                  label={<span lang={l.code}>{l.native}</span>}
                  /* 오른쪽 칸은 하나만 — 고른 언어는 체크, 나머지는 화면 언어로 쓴 이름 */
                  trailing={on
                    ? <Check size={14} className={styles.check} aria-hidden />
                    : l.local !== l.native ? <span className={styles.itemSub}>{l.local}</span> : undefined}
                  /* 켜진 언어를 다시 누르면 번역을 끈다(원문으로) — 따로 "원문 보기" 줄을 두지 않는다 */
                  onClick={() => pick(on ? null : l.code, close)}
                />
              );
            })}
          </div>
        </>
      )}
    </Popover>
  );
}
