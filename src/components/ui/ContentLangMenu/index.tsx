"use client";

import { useMemo, useState } from "react";
import { Languages, Check, Undo2 } from "@/components/icons";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import Input from "@/components/ui/Input";
import Tooltip from "@/components/ui/Tooltip";
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
}

/**
 * 상세 헤더의 "다른 언어로 읽기" — LanguageToggle 옆의 지구본 단추 + 언어 메뉴.
 * 메뉴는 그 언어로 쓴 이름(日本語, Deutsch …)을 보이고, 화면 언어의 이름(일본어 / Japanese)으로도 찾을 수 있다.
 * 번역 중이면 맨 위에 "원문 보기"를 둔다. 언어 목록은 lib/translationLanguages 한 곳에서.
 */
export default function ContentLangMenu({ value, onChange }: ContentLangMenuProps) {
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

  const label = t("contentTranslate.menuLabel");
  return (
    <Popover
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}
      placement="bottom-end"
      menu
      maxHeight={false}
      sheetTitle={label}
      contentClassName={styles.panel}
      trigger={
        <Tooltip content={label} placement="top" delay={200}>
          <Pressable
            type="button"
            className={cn(styles.trigger, value && styles.triggerActive)}
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <Languages size={14} />
            {value && <span className={styles.triggerCode}>{value}</span>}
          </Pressable>
        </Tooltip>
      }
    >
      {({ close }) => (
        <>
          {value && (
            <>
              <MenuItem icon={<Undo2 size={14} />} label={t("contentTranslate.showOriginal")} onClick={() => pick(null, close)} />
              <MenuDivider />
            </>
          )}
          <div className={styles.search}>
            <Input value={query} onChange={setQuery} size="xs" placeholder={t("contentTranslate.search")} aria-label={t("contentTranslate.search")} />
          </div>
          <div className={styles.list} role="menu">
            {items.length === 0 && <p className={styles.empty}>{t("contentTranslate.noMatch")}</p>}
            {items.map((l) => (
              <MenuItem
                key={l.code}
                active={l.code === value}
                label={
                  <span className={styles.itemLabel} lang={l.code}>
                    {l.native}
                    {l.local !== l.native && <span className={styles.itemSub}>{l.local}</span>}
                  </span>
                }
                trailing={l.code === value ? <Check size={14} className={styles.check} aria-hidden /> : undefined}
                onClick={() => pick(l.code, close)}
              />
            ))}
          </div>
        </>
      )}
    </Popover>
  );
}
