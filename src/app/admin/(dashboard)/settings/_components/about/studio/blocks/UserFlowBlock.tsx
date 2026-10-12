"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import FlowDiagramEditor from "../../FlowDiagramEditor";
import { type ParsedErd } from "@/lib/about/parseSqlErd";
import { StageTabs, useStageList } from "../stageList";
import { Trash2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type UserFlow } from "@/data/about/types";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { type Language } from "@/types";
/* ═══════════ User Flow ═══════════ */
const UF_MAX = 12;

/* 흐름 하나씩 — 위는 이름 · 누구 · 설명(한국어 · 영어 나란히), 아래는 흐름 그림.
   그림 칸의 글은 한 언어씩 고치므로 그림 위에만 언어 고르기를 둔다.
   다이어그램 좌표(row/col)는 flowLayout 이 계산하므로 여기선 값만 편집한다. */
export function UserFlowBlock({ value, onChange }: {
  value: UserFlow[]; onChange: (v: UserFlow[]) => void;
}) {
  const { t } = useLanguage();
  const T = (k: string) => t(`admin.inline.userFlowBlock.${k}`);
  const [lang, setLang] = useState<Language>("ko");
  const list = useStageList(value, onChange, (): UserFlow => ({ title: "", persona: { ko: "", en: "" }, description: { ko: "", en: "" }, nodes: [], edges: [] }));
  const { cur, it, set } = list;
  const setLocal = (k: "persona" | "description", l: "ko" | "en", v: string) =>
    set({ [k]: { ...it[k], [l]: v } } as Partial<UserFlow>);
  /* "누구 (한국어)" 처럼 칸 이름에 언어를 붙인 이름 */
  const named = (field: string, l: "korean" | "english") => `${T(field)} (${T(l)})`;

  return (
    <section className={css.ufBlock}>
      <StageTabs list={list} max={UF_MAX} addLabel={T("addFlow")}
        labelOf={(i) => list.items[i]?.title || T("untitled")} />
      {it && (
        <div key={cur} className={css.ufCard}>
          <div className={css.ufFields}>
            <label className={css.ufField}>
              <span className={css.ufFieldLabel}>{T("name")}</span>
              <Input value={it.title} onChange={(v) => set({ title: v })} placeholder={T("flowName")}
                autoFocus={list.isDraft} clearable={false} />
            </label>
            <div className={css.ufPair}>
              <span className={css.ufFieldLabel}>{T("persona")}</span>
              <Input value={it.persona.ko ?? ""} onChange={(v) => setLocal("persona", "ko", v)} placeholder={T("korean")} aria-label={named("persona", "korean")} clearable={false} />
              <Input value={it.persona.en ?? ""} onChange={(v) => setLocal("persona", "en", v)} placeholder={T("english")} aria-label={named("persona", "english")} clearable={false} />
            </div>
            <div className={css.ufPair}>
              <span className={css.ufFieldLabel}>{T("description")}</span>
              <textarea className={css.ufText} rows={2} value={it.description.ko ?? ""} placeholder={T("korean")}
                aria-label={named("description", "korean")} onChange={(e) => setLocal("description", "ko", e.target.value)} />
              <textarea className={css.ufText} rows={2} value={it.description.en ?? ""} placeholder={T("english")}
                aria-label={named("description", "english")} onChange={(e) => setLocal("description", "en", e.target.value)} />
            </div>
          </div>

          <div className={css.ufDiagramHead}>
            <span className={css.ufFieldLabel}>{T("diagram")}</span>
            <SegmentedControl<Language> value={lang} onChange={setLang} className={css.segFit}
              items={[{ value: "ko", label: T("korean") }, { value: "en", label: T("english") }]} />
            <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={list.remove} className={css.ufRemove}>
              {T("deleteFlow")}
            </Button>
          </div>
          <FlowDiagramEditor flow={it} onChange={set} lang={lang} />
        </div>
      )}
    </section>
  );
}

/* 테이블이 하나도 안 나올 때 "왜" 를 짚어준다.
   ALTER 를 지원하면서 "CREATE TABLE 을 못 찾았다" 고만 말하면 거짓말이 되고,
   멀쩡한 SQL 을 붙여넣은 사람이 자기 SQL 을 의심하게 된다. */
/* 안내 문구라 관리자 화면 언어로 고른다 — 부르는 쪽이 t 를 넘긴다 */
export function emptyReason(parsed: ParsedErd, sql: string, t: TFunction): string {

  /* ALTER 대상이 없는 건 문법 문제가 아니다 — 원인이 다르니 먼저 말한다 */
  if (parsed.unresolved.length) {
    const names = parsed.unresolved.join(", ");
    return fillTemplate(t("admin.inline.userFlowBlock.alterTargetMissing"), { names });
  }

  /* ALTER 를 읽긴 했는데 ERD 에 옮길 게 없던 경우 — 제약·기본값만 바꾸는 마이그레이션 */
  if (parsed.noEffect.length) {
    const names = parsed.noEffect.join(", ");
    return fillTemplate(t("admin.inline.userFlowBlock.alterNoEffect"), { names });
  }

  if (parsed.skipped > 0) {
    return fillTemplate(t("admin.inline.userFlowBlock.statementsSkipped"), { n: parsed.skipped });
  }

  /* 문법은 다 알아봤는데 그릴 게 없는 경우 — 함수·제약·인덱스만 있는 마이그레이션이 여기 걸린다 */
  if (parsed.statements > 0) {
    return fillTemplate(t("admin.inline.userFlowBlock.statementsNoChange"), { n: parsed.statements });
  }

  return t("admin.inline.userFlowBlock.enterSomeSql");
}
