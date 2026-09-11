"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { deepEqual, getByPath } from "../../../_data/settingsConstants";
import { type SettingsTabProps } from "../../../_types";
import css from "../AboutStudio.module.css";
import { ABOUT_PANELS } from "../aboutPanels";
import StickyGlassBar from "@/components/admin/StickyGlassBar/StickyGlassBar";
import { Download, Lock } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { Switch } from "@/components/ui/Switch";
import { siteConfig, type SiteConfigData } from "@/config/site.config";
import { aboutPanelLabel } from "@/data/about/panels";
import { canUseMarkdown, contentPathOf } from "@/lib/about/contentSources";
import { loadPanelFiles } from "@/lib/about/loadPanelFiles";
import { type TFunction } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { type Language } from "@/types";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { type ChangeEvent } from "react";
/* 한 패널 = 헤더 + 편집 블록. 둘을 한 <section> 으로 묶는다.
   헤더가 sticky 라서 필요하다 — 형제로 늘어놓으면 지나간 헤더들이 전부 같은 자리에
   붙어 남고, glass 가 서로 겹쳐 blur 가 곱해진다. 묶으면 sticky 가 자기 구역 안에서만
   살아 있어서 화면 위에는 지금 고치고 있는 패널의 헤더 하나만 남는다.
   data-settings-section 도 여기로 온다 — 점프바가 붙어 있는 헤더가 아니라 구역의
   시작으로 스크롤해야 한다. */
export function PanelGroup({ children, ...head }: PanelSaveHeaderProps & { children: ReactNode }) {
  return (
    <section className={css.panelGroup} data-settings-section data-section-label={head.label}>
      <PanelSaveHeader {...head} />
      {children}
    </section>
  );
}

/* ═══════════ Panel manager — 순서(DnD) + 표시 토글. hero/credits 는 순서 고정 ═══════════ */
const LOCKED_PANELS = new Set(["hero", "credits"]);

export function PanelManager({ about, setAny, t, lang }: {
  about: SiteConfigData["about"]; setAny: (k: string, v: unknown) => void; t: TFunction; lang: Language;
}) {
  const hidden = (about.hiddenPanels ?? []) as string[];
  const titles = about.panelTitles ?? {};
  const allKeys = ABOUT_PANELS.map((p) => p.key);
  const savedOrder = (about.panelOrder ?? []).filter((k) => allKeys.includes(k));
  const ordered = [...savedOrder, ...allKeys.filter((k) => !savedOrder.includes(k))];
  const middle = ordered.filter((k) => !LOCKED_PANELS.has(k));
  const defaultLabel = (k: string) => ABOUT_PANELS.find((p) => p.key === k)?.label ?? k;
  /* 칩에는 마침표를 뗀 이름을 보인다. 지정한 제목도 같은 형태로 — 여기서 보이는 그대로를
     다시 저장하게 되므로, 마침표가 붙은 채 보이면 고칠 때마다 하나씩 더 붙는다. */
  const labelOf = (k: string) => aboutPanelLabel(k, titles[k]?.[lang]);
  const shownCount = allKeys.length - hidden.filter((k) => allKeys.includes(k) && !LOCKED_PANELS.has(k)).length;
  const [editKey, setEditKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = middle.indexOf(String(active.id));
    const newIdx = middle.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    setAny("panelOrder", ["hero", ...arrayMove(middle, oldIdx, newIdx), "credits"]);
  };
  const toggle = (k: string) => {
    const set = new Set(hidden);
    if (set.has(k)) set.delete(k); else set.add(k);
    setAny("hiddenPanels", Array.from(set));
  };
  const rename = (k: string, name: string) => {
    const next: Record<string, { ko?: string; en?: string }> = { ...titles };
    const cur = { ...(next[k] ?? {}) };
    const v = name.trim();
    if (v && v !== defaultLabel(k)) cur[lang] = v; else delete cur[lang];
    if (cur.ko || cur.en) next[k] = cur; else delete next[k];
    setAny("panelTitles", next);
    setEditKey(null);
  };

  const chipCls = (k: string) => `${css.chip} ${!hidden.includes(k) ? css.chipOn : css.chipOff}`;
  const editInput = (k: string) => (
    <input key={k} className={`${css.chip} ${css.chipEdit}`} autoFocus defaultValue={labelOf(k)} aria-label="패널 이름"
      onBlur={(e) => rename(k, e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") rename(k, e.currentTarget.value); else if (e.key === "Escape") setEditKey(null); }} />
  );
  /* intro/credits — 순서·표시 모두 잠금(항상 표시). 이름만 더블클릭으로 수정 가능. */
  const lockedChip = (k: string) => (
    <Pressable className={`${css.chip} ${css.chipOn} ${css.chipLocked}`} onDoubleClick={() => setEditKey(k)} title={lang === "ko" ? "고정됨 · 더블클릭으로 이름만 수정" : "Locked · Double-click to rename"}>
      <Lock className={css.chipLock} size={11} />{labelOf(k)}
    </Pressable>
  );

  return (
    <div className={css.strip}>
      <div className={css.stripHead}>
        <span className={css.stripTitle}>{t("admin.settings.aboutPanelVisibility")} · {shownCount}/{allKeys.length}</span>
        <Switch checked={about.infiniteScroll ?? false} onCheckedChange={(v) => setAny("infiniteScroll", v)}
          label={t("admin.settings.aboutInfiniteScrollLabel")} size="sm" showStateText stateLabels={{ on: "ON", off: "OFF" }} />
      </div>
      <p className={css.stripHint}>{lang === "ko" ? "드래그로 순서 변경 · 더블클릭으로 이름 수정 · 클릭으로 표시 전환" : "Drag to reorder · Double-click to rename · Click to toggle"}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className={css.stripChips}>
          {editKey === "hero" ? editInput("hero") : lockedChip("hero")}
          <SortableContext items={middle} strategy={rectSortingStrategy}>
            {middle.map((k) => (
              editKey === k
                ? editInput(k)
                : <PanelSortChip key={k} id={k} className={chipCls(k)} label={labelOf(k)} onToggle={() => toggle(k)} onEdit={() => setEditKey(k)} />
            ))}
          </SortableContext>
          {editKey === "credits" ? editInput("credits") : lockedChip("credits")}
        </div>
      </DndContext>
    </div>
  );
}

function PanelSortChip({ id, className, label, onToggle, onEdit }: { id: string; className: string; label: string; onToggle: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: DndCSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined, position: isDragging ? "relative" : undefined };
  return (
    <Pressable ref={setNodeRef} style={style}
      className={`${className} ${css.chipDrag} ${isDragging ? css.chipDragging : ""}`}
      onClick={onToggle} onDoubleClick={onEdit} {...attributes} {...listeners}>
      <span className={css.chipDot} />{label}
    </Pressable>
  );
}

/* ═══════════ 패널별 저장 헤더 — 해당 패널 config 경로만 저장/dirty 판정 ═══════════ */
export interface PanelSaveHeaderProps {
  label: string; hint?: ReactNode; paths: string[]; panelKey?: string;
  config: SiteConfigData; savedConfig: SiteConfigData;
  saveSection: SettingsTabProps["saveSection"]; revertSection: SettingsTabProps["revertSection"];
  resetSection: SettingsTabProps["resetSection"]; savingPaths: SettingsTabProps["savingPaths"];
  setAny: (k: string, v: unknown) => void; lang: Language; t: TFunction;
}

function PanelSaveHeader({ label, hint, paths, panelKey, config, savedConfig, saveSection, revertSection, resetSection, savingPaths, setAny, lang, t }: PanelSaveHeaderProps) {
  const dirty = paths.some((p) => !deepEqual(getByPath(config, p), getByPath(savedConfig, p)));
  /* 이미 기본값이면 "기본값" 버튼은 할 일이 없다 */
  const atDefault = paths.every((p) => deepEqual(getByPath(config, p), getByPath(siteConfig as unknown as SiteConfigData, p)));
  const saving = savingPaths != null && savingPaths.length === paths.length && savingPaths.every((p) => paths.includes(p));

  const about = config.about as unknown as Record<string, unknown>;
  const mdCapable = !!panelKey && canUseMarkdown(panelKey);
  const fileRef = useRef<HTMLInputElement>(null);
  const syncedAt = ((about.contentSyncedAt ?? {}) as Record<string, string>)[panelKey ?? ""];

  /* 저장 시각을 같이 남긴다. 동기화가 이 값과 파일 수정 시각을 견줘 더 최근 쪽을 남기므로,
     이걸 안 찍으면 화면에서 방금 고친 내용을 오래된 파일이 덮는다. */
  const saveWithStamp = () => {
    if (!mdCapable) { void saveSection(paths); return; }
    const stamps = { ...((about.contentEditedAt ?? {}) as Record<string, string>), [panelKey!]: new Date().toISOString() };
    setAny("contentEditedAt", stamps);
    const next = { ...config, about: { ...config.about, contentEditedAt: stamps } } as SiteConfigData;
    void saveSection([...paths, "about.contentEditedAt"], next);
  };

  /* 고른 .md 를 읽어 편집 상태에 채운다. 저장은 하지 않는다 — 눈으로 보고 섹션저장을
     누르는 흐름이라, 파일을 잘못 골라도 되돌리기로 물릴 수 있다. */
  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    const files = await Promise.all(picked.map(async (f) => ({ name: f.name, text: await f.text() })));
    const result = loadPanelFiles(panelKey!, files);
    if (!result || result.count === 0) {
      showToast(result?.warnings[0] ?? (lang === "ko" ? "읽지 못했습니다." : "Could not read the files."), "error");
      return;
    }
    for (const [path, value] of Object.entries(result.values)) {
      setAny(path.slice("about.".length), value);
    }
    if (result.warnings.length > 0) {
      showToast(
        `${result.count}${lang === "ko" ? "개를 불러왔지만 경고가 있습니다 — " : " loaded with warnings — "}${result.warnings[0]}`,
        "error",
      );
    } else {
      showToast(
        lang === "ko" ? `${result.count}개를 불러왔습니다. 확인 후 저장하세요.` : `Loaded ${result.count}. Review, then save.`,
        "success",
      );
    }
  };

  return (
    /* 편집 중에도 위에 붙어 있는 툴바. 패널 하나가 4,000px 을 넘기도 해서, 예전엔
       한 글자 고치고 저장하려고 화면 몇 개를 거슬러 올라가야 했다.
       --page-px 를 여기서만 좁힌다 — 공통 바는 뷰포트 양끝까지 frost 를 펴는데,
       설정 화면은 왼쪽에 사이드바가 있는 2열이라 그대로 두면 사이드바 일부가 같이 흐려진다. */
    <StickyGlassBar className={css.psHeader}>
      <span className={css.psLabel}>{label}</span>
      <span className={`${css.psDot} ${dirty ? css.psDotOn : ""}`} aria-hidden />
      {hint && <span className={css.psHint}>{hint}</span>}
      {/* 버튼 묶음 — 좁은 폭에서는 이름 아래 줄로 통째로 내려간다 */}
      <span className={css.psActions}>
        {/* 옆 세 버튼과 같은 공통 Button 을 쓴다. 예전엔 <label> 에 직접 스타일을 붙여
            파일 입력을 감쌌는데, 높이(30.8 vs 24)도 글꼴(Inter vs Space Grotesk)도 달라
            한 줄에서 이것만 커 보였다. 파일 선택창은 숨긴 input 을 눌러서 연다. */}
        {mdCapable && (
          <>
            <Button variant="outline" size="xs" icon={<Download size={12} strokeWidth={1.8} />}
              onClick={() => fileRef.current?.click()}
              title={lang === "ko" ? ".md 파일을 읽어 채웁니다" : "Fill from .md files"}>
              {lang === "ko" ? "md 불러오기" : "Load .md"}
            </Button>
            <input ref={fileRef} type="file" accept=".md" multiple hidden onChange={onPickFiles} />
          </>
        )}
        {mdCapable && syncedAt && (
          <span className={css.psSyncNote} title={contentPathOf(panelKey!)}>
            {lang === "ko" ? "파일에서 " : "from files "}
            {new Date(syncedAt).toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
        <Button variant="outline" size="xs" disabled={atDefault || saving} onClick={() => resetSection(paths)}
          title={t("admin.settings.resetSection")}>
          {t("admin.settings.resetSection")}
        </Button>
        <Button variant="outline" size="xs" disabled={!dirty || saving} onClick={() => revertSection(paths)}
          title={t("admin.settings.revertSection")}>
          {t("admin.settings.revertSection")}
        </Button>
        <Button variant="subtle" size="xs" disabled={!dirty || saving} onClick={saveWithStamp}>
          {t("admin.settings.saveSection")}
        </Button>
      </span>
    </StickyGlassBar>
  );
}
