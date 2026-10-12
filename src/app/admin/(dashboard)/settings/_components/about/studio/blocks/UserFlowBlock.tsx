"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import FlowDiagramEditor from "../../FlowDiagramEditor";
import { type ParsedErd } from "@/lib/about/parseSqlErd";
import { useL } from "../primitives";
import { StageTabs, useStageList } from "../stageList";
import { Trash2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type UserFlow } from "@/data/about/types";
import { type Language } from "@/types";
/* ═══════════ User Flow ═══════════ */
const UF_MAX = 12;

/* 흐름 하나씩 — 위는 이름 · 누구 · 설명(한국어 · 영어 나란히), 아래는 흐름 그림.
   그림 칸의 글은 한 언어씩 고치므로 그림 위에만 언어 고르기를 둔다.
   다이어그램 좌표(row/col)는 flowLayout 이 계산하므로 여기선 값만 편집한다. */
export function UserFlowBlock({ value, onChange }: {
  value: UserFlow[]; onChange: (v: UserFlow[]) => void;
}) {
  const L = useL();
  const [lang, setLang] = useState<Language>("ko");
  const list = useStageList(value, onChange, (): UserFlow => ({ title: "", persona: { ko: "", en: "" }, description: { ko: "", en: "" }, nodes: [], edges: [] }));
  const { cur, it, set } = list;
  const setLocal = (k: "persona" | "description", l: "ko" | "en", v: string) =>
    set({ [k]: { ...it[k], [l]: v } } as Partial<UserFlow>);

  return (
    <section className={css.ufBlock}>
      <StageTabs list={list} max={UF_MAX} addLabel={L("흐름 추가", "Add flow")}
        labelOf={(i) => list.items[i]?.title || L("새 흐름", "Untitled")} />
      {it && (
        <div key={cur} className={css.ufCard}>
          <div className={css.ufFields}>
            <label className={css.ufField}>
              <span className={css.ufFieldLabel}>{L("이름", "Name")}</span>
              <Input value={it.title} onChange={(v) => set({ title: v })} placeholder={L("흐름 이름", "Flow name")}
                autoFocus={list.isDraft} clearable={false} />
            </label>
            <div className={css.ufPair}>
              <span className={css.ufFieldLabel}>{L("누구", "Persona")}</span>
              <Input value={it.persona.ko ?? ""} onChange={(v) => setLocal("persona", "ko", v)} placeholder="한국어" aria-label={L("누구 (한국어)", "Persona (Korean)")} clearable={false} />
              <Input value={it.persona.en ?? ""} onChange={(v) => setLocal("persona", "en", v)} placeholder="English" aria-label={L("누구 (영어)", "Persona (English)")} clearable={false} />
            </div>
            <div className={css.ufPair}>
              <span className={css.ufFieldLabel}>{L("설명", "Description")}</span>
              <textarea className={css.ufText} rows={2} value={it.description.ko ?? ""} placeholder="한국어"
                aria-label={L("설명 (한국어)", "Description (Korean)")} onChange={(e) => setLocal("description", "ko", e.target.value)} />
              <textarea className={css.ufText} rows={2} value={it.description.en ?? ""} placeholder="English"
                aria-label={L("설명 (영어)", "Description (English)")} onChange={(e) => setLocal("description", "en", e.target.value)} />
            </div>
          </div>

          <div className={css.ufDiagramHead}>
            <span className={css.ufFieldLabel}>{L("흐름 그림", "Flow diagram")}</span>
            <SegmentedControl<Language> value={lang} onChange={setLang} className={css.segFit}
              items={[{ value: "ko", label: "한국어" }, { value: "en", label: "English" }]} />
            <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={list.remove} className={css.ufRemove}>
              {L("이 흐름 삭제", "Delete this flow")}
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
/* 안내 문구라 관리자 화면 언어로 고른다 — 부르는 쪽이 useL() 의 L 을 넘긴다 */
export function emptyReason(parsed: ParsedErd, sql: string, L: (ko: string, en: string) => string): string {

  /* ALTER 대상이 없는 건 문법 문제가 아니다 — 원인이 다르니 먼저 말한다 */
  if (parsed.unresolved.length) {
    const names = parsed.unresolved.join(", ");
    return L(
      `ALTER 대상 테이블(${names})이 ERD 에 없습니다. 해당 CREATE TABLE 문을 함께 붙여넣어 주세요.`,
      `ALTER targets a table not in the ERD (${names}). Paste its CREATE TABLE too.`,
    );
  }

  /* ALTER 를 읽긴 했는데 ERD 에 옮길 게 없던 경우 — 제약·기본값만 바꾸는 마이그레이션 */
  if (parsed.noEffect.length) {
    const names = parsed.noEffect.join(", ");
    return L(
      `${names} 의 변경을 읽었지만 다이어그램에 반영할 내용이 없습니다. 제약·기본값·인덱스·권한은 ERD 에 나타나지 않습니다.`,
      `Read changes to ${names}, but nothing to draw. Constraints, defaults, indexes and grants don't appear in the ERD.`,
    );
  }

  if (parsed.skipped > 0) {
    return L(
      `읽지 못한 문장이 ${parsed.skipped}개 있습니다. CREATE TABLE · ALTER TABLE 문법을 확인해 주세요.`,
      `${parsed.skipped} statements couldn't be read. Check the CREATE TABLE / ALTER TABLE syntax.`,
    );
  }

  /* 문법은 다 알아봤는데 그릴 게 없는 경우 — 함수·제약·인덱스만 있는 마이그레이션이 여기 걸린다 */
  if (parsed.statements > 0) {
    return L(
      `문장 ${parsed.statements}개를 읽었지만 ERD 가 달라지지 않습니다. 함수·제약·인덱스·권한은 다이어그램에 나타나지 않습니다.`,
      `Read ${parsed.statements} statements, but the ERD wouldn't change. Functions, constraints, indexes and grants don't appear in the diagram.`,
    );
  }

  return L("SQL 을 입력해 주세요", "Enter some SQL");
}
