"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import FlowDiagramEditor from "../../FlowDiagramEditor";
import { type ParsedErd } from "../../parseSqlErd";
import { EditableText, PanelStage, StageTabs, sec } from "../primitives";
import uf from "@/app/about/_components/panels/UserFlowPanel.module.css";
import { X } from "@/components/icons";
import Button from "@/components/ui/Button";
import { type UserFlow } from "@/data/about/types";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
/* ═══════════ User Flow ═══════════ */
const UF_MAX = 8;

/* 실제 패널과 동일 — 좌측 페르소나 정보 + 우측 플로우 다이어그램.
   다이어그램 좌표(row/col)는 flowLayout 이 계산하므로 여기선 값만 편집한다. */
export function UserFlowBlock({ value, onChange, lang, t, title }: {
  value: UserFlow[]; onChange: (v: UserFlow[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const [tab, setTab] = useState(0);
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<UserFlow>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const setLocal = (k: "persona" | "description", v: string) =>
    set({ [k]: { ...it[k], [lang]: v } } as Partial<UserFlow>);
  const add = () => {
    onChange([...value, { title: "", persona: { ko: "", en: "" }, description: { ko: "", en: "" }, nodes: [], edges: [] }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  const isEmpty = (f: UserFlow) => !f.title.trim() && f.nodes.length === 0;
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmpty(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };


  return (
    <section className={css.block}>
      <div className={css.slideTabs}>
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < UF_MAX}
          addLabel={lang === "ko" ? "플로우 추가" : "Add flow"}
          labelOf={(i) => value[i]?.title || (lang === "ko" ? "새 플로우" : "Untitled")} />
      </div>
      {it && (
        <PanelStage>
          <div key={cur} className={css.ufStage}>
            <div className={css.chTools}>
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{title}</h3>

            <div className={uf.ufFlowLayout}>
              {/* 좌측 — 실제와 같은 페르소나 카드 */}
              <div className={uf.ufFlowInfo}>
                <EditableText className={uf.ufFlowTitle} value={it.title}
                  onChange={(v) => set({ title: v })} placeholder={lang === "ko" ? "플로우 이름" : "Flow title"}
                  ariaLabel="title" autoFocus={isEmpty(it)} />
                <div className={uf.ufFlowProfile}>
                  <div className={uf.ufFlowProfileText}>
                    <EditableText wrap className={uf.ufFlowPersona} value={it.persona[lang] ?? ""}
                      onChange={(v) => setLocal("persona", v)}
                      placeholder={lang === "ko" ? "페르소나" : "Persona"} ariaLabel="persona" />
                    <EditableText multiline className={uf.ufFlowDesc} value={it.description[lang] ?? ""}
                      onChange={(v) => setLocal("description", v)}
                      placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>

              {/* 우측 — 실제 도형 위에서 드래그·선택하는 비주얼 편집 */}
              <FlowDiagramEditor flow={it} onChange={set} lang={lang} />
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}

/* 테이블이 하나도 안 나올 때 "왜" 를 짚어준다.
   ALTER 를 지원하면서 "CREATE TABLE 을 못 찾았다" 고만 말하면 거짓말이 되고,
   멀쩡한 SQL 을 붙여넣은 사람이 자기 SQL 을 의심하게 된다. */
export function emptyReason(parsed: ParsedErd, sql: string, lang: Language): string {
  const ko = lang === "ko";

  /* ALTER 대상이 없는 건 문법 문제가 아니다 — 원인이 다르니 먼저 말한다 */
  if (parsed.unresolved.length) {
    const names = parsed.unresolved.join(", ");
    return ko
      ? `ALTER 대상 테이블(${names})이 ERD 에 없습니다. 해당 CREATE TABLE 문을 함께 붙여넣어 주세요.`
      : `ALTER targets a table not in the ERD (${names}). Paste its CREATE TABLE too.`;
  }

  /* ALTER 를 읽긴 했는데 ERD 에 옮길 게 없던 경우 — 제약·기본값만 바꾸는 마이그레이션 */
  if (parsed.noEffect.length) {
    const names = parsed.noEffect.join(", ");
    return ko
      ? `${names} 의 변경을 읽었지만 다이어그램에 반영할 내용이 없습니다. 제약·기본값·인덱스·권한은 ERD 에 나타나지 않습니다.`
      : `Read changes to ${names}, but nothing to draw. Constraints, defaults, indexes and grants don't appear in the ERD.`;
  }

  if (parsed.skipped > 0) {
    return ko
      ? `읽지 못한 문장이 ${parsed.skipped}개 있습니다. CREATE TABLE · ALTER TABLE 문법을 확인해 주세요.`
      : `${parsed.skipped} statements couldn't be read. Check the CREATE TABLE / ALTER TABLE syntax.`;
  }

  /* 문법은 다 알아봤는데 그릴 게 없는 경우 — 함수·제약·인덱스만 있는 마이그레이션이 여기 걸린다 */
  if (parsed.statements > 0) {
    return ko
      ? `문장 ${parsed.statements}개를 읽었지만 ERD 가 달라지지 않습니다. 함수·제약·인덱스·권한은 다이어그램에 나타나지 않습니다.`
      : `Read ${parsed.statements} statements, but the ERD wouldn't change. Functions, constraints, indexes and grants don't appear in the diagram.`;
  }

  return ko ? "SQL 을 입력해 주세요" : "Enter some SQL";
}
