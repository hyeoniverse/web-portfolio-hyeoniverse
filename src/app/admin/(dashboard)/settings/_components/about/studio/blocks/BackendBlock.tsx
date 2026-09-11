"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import { EditableText, PanelStage, StageTabs, sec, useL } from "../primitives";
import bk from "@/app/about/_components/panels/BackendPanel.module.css";
import { Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type BackendItem } from "@/data/about/types";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
/* ═══════════ Backend ═══════════ */
const BK_MAX = 12;

/* 실제 패널과 동일 — 좌측 목록 + 우측 상세. 실제도 한 항목씩 보므로 탭으로 전환. */
export function BackendBlock({ value, onChange, lang, t, title }: {
  value: BackendItem[]; onChange: (v: BackendItem[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const L = useL();
  const [tab, setTab] = useState(0);
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<BackendItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const setLocal = (k: "description" | "designNote", v: string) =>
    set({ [k]: { ...(it[k] ?? { ko: "", en: "" }), [lang]: v } } as Partial<BackendItem>);
  const add = () => {
    onChange([...value, { name: "", kind: "api", description: { ko: "", en: "" }, endpoints: [] }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  const isEmpty = (c: BackendItem) => !c.name.trim() && !c.description.ko.trim() && !c.description.en.trim();
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmpty(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };

  const endpoints = it?.endpoints ?? [];
  const setEndpoints = (v: NonNullable<BackendItem["endpoints"]>) => set({ endpoints: v });
  const columns = it?.columns ?? [];
  const setColumns = (v: NonNullable<BackendItem["columns"]>) => set({ columns: v });

  return (
    <section className={css.block}>
      <div className={css.slideTabs}>
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < BK_MAX}
          addLabel={L("항목 추가", "Add item")}
          labelOf={(i) => value[i]?.name || (L("새 항목", "Untitled"))} />
      </div>
      {it && (
        <PanelStage>
          <div key={cur} className={css.bkStage}>
            <div className={css.chTools}>
              <SegmentedControl<"api" | "table"> size="sm" value={it.kind}
                onChange={(v) => set({ kind: v })}
                items={[{ value: "api", label: "API" }, { value: "table", label: "TABLE" }]} />
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label={L("삭제", "Remove")}>
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{title}</h3>

            <div className={css.bkBody}>
              <div className={bk.dbList}>
                {value.map((item, i) => (
                  <div key={i} className={`${bk.dbListItem} ${i === cur ? bk.dbListItemActive : ""}`}
                    role="button" tabIndex={0}
                    onClick={() => selectTab(i)}
                    onKeyDown={(e) => { if (e.key === "Enter") selectTab(i); }}>
                    <span className={bk.dbNumber}>{String(i + 1).padStart(2, "0")}</span>
                    <div className={bk.dbListMeta}>
                      <span className={bk.dbListTitle}>
                        {item.name || (L("새 항목", "Untitled"))}
                        <span className={`${bk.dbKindBadge} ${bk.dbKindBadgeSm} ${item.kind === "api" ? bk.dbKindApi : bk.dbKindTable}`}>
                          {item.kind === "api" ? "API" : "TABLE"}
                        </span>
                      </span>
                      <span className={bk.dbListDesc}>{item.description[lang]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={bk.dbDetail}>
                <div className={bk.detailHeader}>
                  <EditableText wrap className={bk.dbTitle} value={it.name}
                    onChange={(v) => set({ name: v })} placeholder="posts" ariaLabel={L("이름", "Name")} autoFocus={isEmpty(it)} />
                </div>
                <EditableText multiline className={css.bkDesc} value={it.description[lang] ?? ""}
                  onChange={(v) => setLocal("description", v)}
                  placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={L("설명", "Description")} style={{ width: "100%" }} />
                <EditableText multiline className={css.bkNote} value={it.designNote?.[lang] ?? ""}
                  onChange={(v) => setLocal("designNote", v)}
                  placeholder={L("설계 노트 (선택)", "Design note (optional)")} ariaLabel={L("설계 노트", "Design note")} style={{ width: "100%" }} />

                {it.kind === "api" ? (
                  <div className={bk.entryBlock}>
                    <span className={bk.entryLabel}>ENDPOINTS</span>
                    {endpoints.map((ep, i) => (
                      <div key={i} className={`${bk.dbEndpoint} ${css.bkRow}`}>
                        <EditableText className={css.bkMethod} value={ep.method}
                          onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, method: v.toUpperCase() } : x)))}
                          placeholder="GET" ariaLabel={L("메서드", "Method")} />
                        <EditableText wrap className={bk.dbEndpointPath} value={ep.path}
                          onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, path: v } : x)))}
                          placeholder="/api/posts" ariaLabel={L("경로", "Path")} />
                        <EditableText wrap className={bk.dbEndpointDesc} value={ep.description[lang] ?? ""}
                          onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, description: { ...x.description, [lang]: v } } : x)))}
                          placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={L("엔드포인트 설명", "Endpoint description")} style={{ flex: 1 }} />
                        <Button variant="subtle" shape="circle" size="2xs" aria-label={L("엔드포인트 삭제", "Remove endpoint")}
                          onClick={() => setEndpoints(endpoints.filter((_, j) => j !== i))}>
                          <X size={11} />
                        </Button>
                      </div>
                    ))}
                    <Button variant="subtle" size="xs" icon={<Plus size={13} />}
                      onClick={() => setEndpoints([...endpoints, { method: "GET", path: "", description: { ko: "", en: "" } }])}>
                      {L("엔드포인트 추가", "Add endpoint")}
                    </Button>
                  </div>
                ) : (
                  <div className={bk.entryBlock}>
                    <span className={bk.entryLabel}>SCHEMA</span>
                    {columns.map((cl, i) => (
                      <div key={i} className={`${bk.dbSchemaRow} ${css.bkRow}`}>
                        <EditableText className={bk.dbColName} value={cl.name}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, name: v } : x)))}
                          placeholder="id" ariaLabel={L("컬럼 이름", "Column name")} />
                        <EditableText className={bk.dbColType} value={cl.type}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, type: v } : x)))}
                          placeholder="uuid" ariaLabel={L("타입", "Type")} />
                        <EditableText className={bk.dbColConstraint} value={cl.constraint ?? ""}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, constraint: v } : x)))}
                          placeholder="PK" ariaLabel={L("제약", "Constraint")} />
                        <EditableText wrap className={bk.dbColDesc} value={cl.description[lang] ?? ""}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, description: { ...x.description, [lang]: v } } : x)))}
                          placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={L("컬럼 설명", "Column description")} style={{ flex: 1 }} />
                        <Button variant="subtle" shape="circle" size="2xs" aria-label={L("컬럼 삭제", "Remove column")}
                          onClick={() => setColumns(columns.filter((_, j) => j !== i))}>
                          <X size={11} />
                        </Button>
                      </div>
                    ))}
                    <Button variant="subtle" size="xs" icon={<Plus size={13} />}
                      onClick={() => setColumns([...columns, { name: "", type: "", description: { ko: "", en: "" } }])}>
                      {L("컬럼 추가", "Add column")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}
