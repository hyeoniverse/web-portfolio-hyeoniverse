"use client";

import css from "../../AboutStudio.module.css";
import { DragHandle, RemoveButton, SortableItem, SortableList } from "../listControls";
import { EditableText, PanelStage, sec } from "../primitives";
import { useLanguage } from "@/providers/LanguageProvider";
import { StageTabs, useStageList } from "../stageList";
import bk from "@/app/about/_panels/panels/BackendPanel.module.css";
import { Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type BackendItem } from "@/data/about/types";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
import { arrayMove } from "@dnd-kit/sortable";
/* ═══════════ Backend ═══════════ */
/* 추가 한도는 분량 조절용이다. 포트폴리오에서 항목이 너무 많으면 끝까지 읽히지 않는다.
   테이블 설계는 Database Design 패널이 맡는다(#811). */
const BK_MAX = 12;

/* 실제 패널과 동일 — 좌측 목록 + 우측 상세. 실제도 한 항목씩 보므로 탭으로 전환. */
export function BackendBlock({ value, onChange, lang, t, title }: {
  value: BackendItem[]; onChange: (v: BackendItem[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const { t: tA } = useLanguage();
  const list = useStageList(value, onChange, (): BackendItem => ({ name: "", kind: "api", description: { ko: "", en: "" }, endpoints: [] }));
  const { cur, it, set } = list;
  const setLocal = (k: "description" | "designNote", v: string) =>
    set({ [k]: { ...(it[k] ?? { ko: "", en: "" }), [lang]: v } } as Partial<BackendItem>);

  const endpoints = it?.endpoints ?? [];
  const setEndpoints = (v: NonNullable<BackendItem["endpoints"]>) => set({ endpoints: v });
  const columns = it?.columns ?? [];
  const setColumns = (v: NonNullable<BackendItem["columns"]>) => set({ columns: v });

  return (
    <section className={css.block}>
      <StageTabs list={list} max={BK_MAX} addLabel={tA("admin.inline.backendBlock.addItem")}
        labelOf={(i) => list.items[i]?.name || tA("admin.inline.backendBlock.untitled")} />
      {it && (
        <PanelStage>
          <div key={cur} className={css.bkStage}>
            <div className={css.chTools}>
              <SegmentedControl<"api" | "table"> value={it.kind}
                onChange={(v) => set({ kind: v })}
                items={[{ value: "api", label: "API" }, { value: "table", label: "TABLE" }]} />
              <Button variant="subtle" shape="circle" onClick={list.remove} aria-label={tA("admin.inline.backendBlock.remove")}>
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{title}</h3>

            <div className={css.bkBody}>
              <div className={bk.dbList}>
                {list.items.map((item, i) => (
                  <div key={i} className={`${bk.dbListItem} ${i === cur ? bk.dbListItemActive : ""}`}
                    role="button" tabIndex={0}
                    onClick={() => list.select(i)}
                    onKeyDown={(e) => { if (e.key === "Enter") list.select(i); }}>
                    <span className={bk.dbNumber}>{String(i + 1).padStart(2, "0")}</span>
                    <div className={bk.dbListMeta}>
                      <span className={bk.dbListTitle}>
                        {item.name || (tA("admin.inline.backendBlock.untitled"))}
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
                    onChange={(v) => set({ name: v })} placeholder="posts" ariaLabel={tA("admin.inline.backendBlock.name")} autoFocus={list.isDraft} />
                </div>
                <EditableText multiline className={css.bkDesc} value={it.description[lang] ?? ""}
                  onChange={(v) => setLocal("description", v)}
                  placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={tA("admin.inline.backendBlock.description")} style={{ width: "100%" }} />
                <EditableText multiline className={css.bkNote} value={it.designNote?.[lang] ?? ""}
                  onChange={(v) => setLocal("designNote", v)}
                  placeholder={tA("admin.inline.backendBlock.designNoteOptional")} ariaLabel={tA("admin.inline.backendBlock.designNote")} style={{ width: "100%" }} />

                {it.kind === "api" ? (
                  <div className={bk.entryBlock}>
                    <span className={bk.entryLabel}>ENDPOINTS</span>
                    <SortableList layout="list" count={endpoints.length} onMove={(from, to) => setEndpoints(arrayMove(endpoints, from, to))}>
                      {endpoints.map((ep, i) => (
                        <SortableItem key={i} index={i}>{(row) => (
                          <div ref={row.ref} style={row.style} className={`${bk.dbEndpoint} ${css.bkRow}`}>
                            <EditableText className={css.bkMethod} value={ep.method}
                              onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, method: v.toUpperCase() } : x)))}
                              placeholder="GET" ariaLabel={tA("admin.inline.backendBlock.method")} />
                            <EditableText wrap className={bk.dbEndpointPath} value={ep.path}
                              onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, path: v } : x)))}
                              placeholder="/api/posts" ariaLabel={tA("admin.inline.backendBlock.path")} />
                            <EditableText wrap className={bk.dbEndpointDesc} value={ep.description[lang] ?? ""}
                              onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, description: { ...x.description, [lang]: v } } : x)))}
                              placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={tA("admin.inline.backendBlock.endpointDescription")} style={{ flex: 1 }} />
                            <span className={css.itemTools}>
                              <DragHandle handle={row.handle} />
                              <RemoveButton label={tA("admin.inline.backendBlock.removeEndpoint")} onClick={() => setEndpoints(endpoints.filter((_, j) => j !== i))} />
                            </span>
                          </div>
                        )}</SortableItem>
                      ))}
                    </SortableList>
                    <Button variant="subtle" icon={<Plus size={13} />}
                      onClick={() => setEndpoints([...endpoints, { method: "GET", path: "", description: { ko: "", en: "" } }])}>
                      {tA("admin.inline.backendBlock.addEndpoint")}
                    </Button>
                  </div>
                ) : (
                  <div className={bk.entryBlock}>
                    <span className={bk.entryLabel}>SCHEMA</span>
                    <SortableList layout="list" count={columns.length} onMove={(from, to) => setColumns(arrayMove(columns, from, to))}>
                      {columns.map((cl, i) => (
                        <SortableItem key={i} index={i}>{(row) => (
                          <div ref={row.ref} style={row.style} className={`${bk.dbSchemaRow} ${css.bkRow}`}>
                            <EditableText className={bk.dbColName} value={cl.name}
                              onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, name: v } : x)))}
                              placeholder="id" ariaLabel={tA("admin.inline.backendBlock.columnName")} />
                            <EditableText className={bk.dbColType} value={cl.type}
                              onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, type: v } : x)))}
                              placeholder="uuid" ariaLabel={tA("admin.inline.backendBlock.type")} />
                            <EditableText className={bk.dbColConstraint} value={cl.constraint ?? ""}
                              onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, constraint: v } : x)))}
                              placeholder="PK" ariaLabel={tA("admin.inline.backendBlock.constraint")} />
                            <EditableText wrap className={bk.dbColDesc} value={cl.description[lang] ?? ""}
                              onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, description: { ...x.description, [lang]: v } } : x)))}
                              placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={tA("admin.inline.backendBlock.columnDescription")} style={{ flex: 1 }} />
                            <span className={css.itemTools}>
                              <DragHandle handle={row.handle} />
                              <RemoveButton label={tA("admin.inline.backendBlock.removeColumn")} onClick={() => setColumns(columns.filter((_, j) => j !== i))} />
                            </span>
                          </div>
                        )}</SortableItem>
                      ))}
                    </SortableList>
                    <Button variant="subtle" icon={<Plus size={13} />}
                      onClick={() => setColumns([...columns, { name: "", type: "", description: { ko: "", en: "" } }])}>
                      {tA("admin.inline.backendBlock.addColumn")}
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
