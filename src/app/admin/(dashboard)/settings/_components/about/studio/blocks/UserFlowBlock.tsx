"use client";

import css from "../../AboutStudio.module.css";
import FlowDiagramEditor from "../../FlowDiagramEditor";
import { type ParsedErd } from "@/lib/about/parseSqlErd";
import { EditableText, PanelStage, sec } from "../primitives";
import { StageTabs, useStageList } from "../stageList";
import uf from "@/app/about/_panels/panels/UserFlowPanel.module.css";
import { X } from "@/components/icons";
import Button from "@/components/ui/Button";
import { type UserFlow } from "@/data/about/types";
import { type TFunction } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { type Language } from "@/types";
/* ═══════════ User Flow ═══════════ */
const UF_MAX = 8;

/* 실제 패널과 동일 — 좌측 페르소나 정보 + 우측 플로우 다이어그램.
   다이어그램 좌표(row/col)는 flowLayout 이 계산하므로 여기선 값만 편집한다. */
export function UserFlowBlock({ value, onChange, lang, t, title }: {
  value: UserFlow[]; onChange: (v: UserFlow[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const list = useStageList(value, onChange, (): UserFlow => ({ title: "", persona: { ko: "", en: "" }, description: { ko: "", en: "" }, nodes: [], edges: [] }));
  const { cur, it, set } = list;
  const setLocal = (k: "persona" | "description", v: string) =>
    set({ [k]: { ...it[k], [lang]: v } } as Partial<UserFlow>);

  return (
    <section className={css.block}>
      <StageTabs list={list} max={UF_MAX} addLabel={t("admin.inline.userFlowBlock.addFlow")}
        labelOf={(i) => list.items[i]?.title || t("admin.inline.userFlowBlock.untitled")} />
      {it && (
        <PanelStage>
          <div key={cur} className={css.ufStage}>
            <div className={css.chTools}>
              <Button variant="subtle" shape="circle" onClick={list.remove} aria-label={t("admin.inline.userFlowBlock.remove")}>
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{title}</h3>

            <div className={uf.ufFlowLayout}>
              {/* 좌측 — 실제와 같은 페르소나 카드 */}
              <div className={uf.ufFlowInfo}>
                <EditableText className={uf.ufFlowTitle} value={it.title}
                  onChange={(v) => set({ title: v })} placeholder={t("admin.inline.userFlowBlock.flowTitle")}
                  ariaLabel={t("admin.inline.userFlowBlock.title")} autoFocus={list.isDraft} />
                <div className={uf.ufFlowProfile}>
                  <div className={uf.ufFlowProfileText}>
                    <EditableText wrap className={uf.ufFlowPersona} value={it.persona[lang] ?? ""}
                      onChange={(v) => setLocal("persona", v)}
                      placeholder={t("admin.inline.userFlowBlock.persona")} ariaLabel={t("admin.inline.userFlowBlock.persona")} />
                    <EditableText multiline className={uf.ufFlowDesc} value={it.description[lang] ?? ""}
                      onChange={(v) => setLocal("description", v)}
                      placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={t("admin.inline.userFlowBlock.description")} style={{ width: "100%" }} />
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
