"use client";

import css from "../../AboutStudio.module.css";
import { EditableText, PanelStage, sec, useL } from "../primitives";
import { securityIcons } from "@/app/about/_components/panels/SecurityPanel";
import secu from "@/app/about/_components/panels/SecurityPanel.module.css";
import { Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Popover from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import { type SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
export type SecurityItem = NonNullable<SiteConfigData["about"]["security"]>[number];

/* ═══════════ Security ═══════════ */
export function SecurityBlock({ value, onChange, lang, t, title }: {
  value: SecurityItem[]; onChange: (v: SecurityItem[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const L = useL();
  const set = (i: number, p: Partial<SecurityItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const MAX = 10;
  return (
    <PanelStage>
      <div className={css.secStage}>
      <h3 className={sec.panelTitle}>{title}</h3>
      <div className={secu.secGrid}>
        {value.map((it, i) => (
          <div key={i} className={`${secu.secItem} ${css.editSecItem}`}>
            <div className={secu.secHeader}>
              {/* className 은 Popover 가 trigger 를 감싸는 span 에 붙는다. 버튼이 그 안에 있어서
                  줄 높이를 받으려면(align-self: stretch) 이 래퍼부터 늘어나야 한다. */}
              <Popover placement="bottom-start" className={css.secIconTrigger} trigger={
                /* 이 패널에서 글자가 아닌 유일한 편집 지점이다. 결과물과 똑같이 아이콘만
                   놓여 있어서 눌러서 바꿀 수 있다는 걸 알 수 없었다 — 옆 입력 칸들과 같은
                   테두리를 줘서 같은 편집 면으로 읽히게 한다. */
                <Pressable className={css.secIconBtn}
                  title={L("아이콘 바꾸기", "Change icon")}
                  aria-label={L("아이콘 바꾸기", "Change icon")}>
                  <span className={secu.secIcon}>{securityIcons[it.icon] ?? securityIcons.shield}</span>
                </Pressable>
              }>
                <div className={css.iconPickPanel}>
                  <div className={css.iconPickGrid}>
                    {Object.keys(securityIcons).map((k) => (
                      <Pressable key={k} className={`${css.iconPickBtn} ${it.icon === k ? css.iconPickOn : ""}`} onClick={() => set(i, { icon: k })} aria-label={k}>
                        {securityIcons[k]}
                      </Pressable>
                    ))}
                  </div>
                </div>
              </Popover>
              <EditableText className={secu.secTitle} value={lang === "ko" ? it.title_ko : it.title_en}
                onChange={(v) => set(i, lang === "ko" ? { title_ko: v } : { title_en: v })} placeholder={t("admin.settings.aboutItemTitle")} ariaLabel={L("제목", "Title")} />
            </div>
            <EditableText multiline className={secu.secDesc} value={lang === "ko" ? it.description_ko : it.description_en}
              onChange={(v) => set(i, lang === "ko" ? { description_ko: v } : { description_en: v })} placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={L("설명", "Description")} style={{ width: "100%" }} />
            <EditableText className={secu.secScope} value={lang === "ko" ? it.scope_ko : it.scope_en}
              onChange={(v) => set(i, lang === "ko" ? { scope_ko: v } : { scope_en: v })} placeholder={t("admin.settings.aboutSecurityScope")} ariaLabel={L("적용 범위", "Scope")} />
            <span className={css.editStatX}><Button variant="subtle" shape="circle" size="xs" onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label={L("삭제", "Remove")}><X size={13} /></Button></span>
          </div>
        ))}
        {value.length < MAX && (
          <Pressable className={css.addSecCell}
            onClick={() => onChange([...value, { icon: "shield", title_ko: "새 항목", title_en: "New", description_ko: "", description_en: "", scope_ko: "", scope_en: "" }])}>
            <Plus size={18} /> {L("항목 추가", "Add item")}
          </Pressable>
        )}
      </div>
      </div>
    </PanelStage>
  );
}
