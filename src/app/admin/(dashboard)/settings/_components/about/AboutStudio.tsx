"use client";

/* ─────────────────────────────────────────────────────────────
   About Studio — 새 /about(프레지)을 고치는 화면. 왼쪽은 고칠 곳 목록, 오른쪽은 고른 곳 하나.
   - 장: 코드 기본값(src/app/about/_data) 위에 고친 장면만 about.texts[장][장면] 에 장면째 남긴다
     (페이지는 useAboutText 로 둘을 겹쳐 그린다). 글 · 항목 추가 · 삭제 · 순서. 장 하나 = 저장 단위 하나.
   - 미리보기: 실제 /about 을 iframe 으로 띄워 저장 전 설정을 보내고, 고치는 장으로 카메라를 옮긴다.
   - 구조 그림: 기술 그래프 · 사용자 흐름 · DB 설계는 about.archDiagram · userFlows ·
     erdTables/erdRelations 를 통째로 고친다.
   한 번에 한 곳만 그려서 긴 화면을 오르내리지 않고, 무거운 그림 편집기도 열 때만 싣는다.
   ───────────────────────────────────────────────────────────── */

import { useState, useSyncExternalStore } from "react";
import st from "./AboutStudio.module.css";
import ArchDiagramEditor from "./ArchDiagramEditor";
import { erdTables as staticErdTables, erdRelations as staticErdRelations } from "@/data/about/erd";
import { userFlows } from "@/data/about/architecture";
import type { L10n } from "@/app/about/_data/showcase";
import { ABOUT_TEXT_DEFAULTS, type AboutChapterKey } from "@/app/about/_data/texts";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import { type SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../../_types";
import { deepEqual, getByPath } from "../../_data/settingsConstants";
import Input from "@/components/ui/Input";
import Pressable from "@/components/ui/Pressable";
import { PanelGroup } from "./studio/panels";
import { useL } from "./studio/primitives";
import { SceneEditor, countSceneMatches } from "./studio/blocks/SceneEditor";
import PreviewPane from "./studio/PreviewPane";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { UserFlowBlock } from "./studio/blocks/UserFlowBlock";
import { ErdBlock } from "./studio/blocks/ErdBlock";

/* 장 — 페이지의 차례(목차) 그대로. 랜딩 조각(첫 화면 단추 · 신뢰 · 자주 묻는 질문 · 마지막 단추 · 크레딧)은 끝에 모은다 */
/* anchor — 미리보기 카메라가 갈 목차 앵커 */
const CHAPTERS: { key: AboutChapterKey; label: L10n; anchor: string }[] = [
  { key: "showcase", label: { ko: "첫 화면 · 한눈에 보기", en: "Opening · At a glance" }, anchor: "#facts" },
  { key: "features", label: { ko: "기능", en: "Features" }, anchor: "#features" },
  { key: "ai", label: { ko: "AI", en: "AI" }, anchor: "#ai" },
  { key: "architecture", label: { ko: "구조", en: "Architecture" }, anchor: "#architecture" },
  { key: "journeys", label: { ko: "API 요청 길", en: "API journeys" }, anchor: "#architecture" },
  { key: "decisions", label: { ko: "설계 결정 · 보안", en: "Decisions · Security" }, anchor: "#decisions" },
  { key: "design", label: { ko: "디자인", en: "Design" }, anchor: "#design" },
  { key: "code", label: { ko: "코드", en: "Code" }, anchor: "#code" },
  { key: "making", label: { ko: "만든 과정", en: "Making of" }, anchor: "#making" },
  { key: "landing", label: { ko: "신뢰 · 질문 · 단추 · 크레딧", en: "Trust · FAQ · CTAs · Credits" }, anchor: "#trust" },
];

type FigureKey = "graph" | "flows" | "erd";
const FIGURES: { key: FigureKey; label: L10n; paths: string[] }[] = [
  { key: "graph", label: { ko: "기술 그래프", en: "Tech graph" }, paths: ["about.archDiagram"] },
  { key: "flows", label: { ko: "사용자 흐름", en: "User flows" }, paths: ["about.userFlows"] },
  { key: "erd", label: { ko: "DB 설계", en: "Database design" }, paths: ["about.erdTables", "about.erdRelations"] },
];

const WIDE = "(width >= 1280px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

type View = { kind: "texts"; key: AboutChapterKey } | { kind: "figure"; key: FigureKey };

type AboutStudioProps = {
  config: SiteConfigData;
  update: SettingsTabProps["update"];
  savedConfig: SettingsTabProps["savedConfig"];
  saveSection: SettingsTabProps["saveSection"];
  revertSection: SettingsTabProps["revertSection"];
  resetSection: SettingsTabProps["resetSection"];
  savingPaths: SettingsTabProps["savingPaths"];
  t: TFunction;
};

export default function AboutStudio({ config, update, savedConfig, saveSection, revertSection, resetSection, savingPaths, t }: AboutStudioProps) {
  const L = useL();
  const { language } = useLanguage();
  const about = config.about;
  const texts = about.texts ?? {};
  const [view, setView] = useState<View>({ kind: "texts", key: "showcase" });
  const [query, setQuery] = useState("");
  /* 미리보기 — 세 칸이 들어가는 넓은 화면에서만 처음부터 켠다. 좁으면 편집 칸을 밀어내므로 끄고 시작 */
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
  const [previewPref, setPreview] = useState<boolean | null>(null);
  const preview = previewPref ?? wide;
  const pick = (v: L10n) => (language === "ko" ? v.ko : v.en);

  const setAny = (key: string, value: unknown) =>
    update("about", key as keyof SiteConfigData["about"], value as SiteConfigData["about"][keyof SiteConfigData["about"]]);
  const saveHdr = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, setAny, t };
  const dirty = (paths: string[]) => paths.some((p) => !deepEqual(getByPath(config, p), getByPath(savedConfig, p)));

  /* 찾기 — 글을 찾는 중이면 장마다 맞는 칸 수를 보이고, 맞는 곳이 없는 장은 흐리게 */
  const q = query.trim();
  const matches = (ch: AboutChapterKey) => (q ? countSceneMatches(ABOUT_TEXT_DEFAULTS[ch], texts[ch] ?? {}, q) : 0);
  /* 고친 장면 수 */
  const edits = (ch: AboutChapterKey) => Object.keys(texts[ch] ?? {}).length;

  const navItem = (key: string, label: string, on: boolean, onClick: () => void, meta: { dirty: boolean; count?: number; dim?: boolean }) => (
    <li key={key}>
      <Pressable className={st.navItem} data-on={on || undefined} data-dim={meta.dim || undefined} onClick={onClick}
        aria-current={on ? "page" : undefined}>
        <span className={st.navLabel}>{label}</span>
        {meta.count != null && meta.count > 0 && <span className={st.navCount}>{meta.count}</span>}
        {meta.dirty && <span className={st.navDirty} aria-label={L("저장 안 됨", "Unsaved")} />}
      </Pressable>
    </li>
  );

  const chapter = view.kind === "texts" ? CHAPTERS.find((c) => c.key === view.key)! : null;
  const figure = view.kind === "figure" ? FIGURES.find((f) => f.key === view.key)! : null;

  return (
    <div className={st.studio} data-preview={preview || undefined} style={{ gridColumn: "1 / -1" }}>
      <nav className={st.nav} aria-label={L("About 편집할 곳", "About sections")}>
        <Input value={query} onChange={setQuery} size="sm" placeholder={L("글 찾기", "Find text")}
          aria-label={L("글 찾기", "Find text")}
          onFocus={() => { if (view.kind !== "texts") setView({ kind: "texts", key: "showcase" }); }} />
        <p className={st.navHead}>{L("페이지 글", "Page text")}</p>
        <ul className={st.navList}>
          {CHAPTERS.map((c) => {
            const m = matches(c.key);
            return navItem(c.key, pick(c.label), view.kind === "texts" && view.key === c.key,
              () => setView({ kind: "texts", key: c.key }),
              { dirty: dirty([`about.texts.${c.key}`]), count: q ? m : edits(c.key), dim: !!q && m === 0 });
          })}
        </ul>
        <p className={st.navHead}>{L("구조 장의 그림", "Architecture figures")}</p>
        <ul className={st.navList}>
          {FIGURES.map((f) => navItem(f.key, pick(f.label), view.kind === "figure" && view.key === f.key,
            () => setView({ kind: "figure", key: f.key }), { dirty: dirty(f.paths) }))}
        </ul>
        <div className={st.navPreview}>
          <span className={st.navHead}>{L("미리보기", "Preview")}</span>
          <SegmentedControl<"on" | "off"> value={preview ? "on" : "off"} onChange={(v) => setPreview(v === "on")}
            items={[{ value: "on", label: L("켜기", "On") }, { value: "off", label: L("끄기", "Off") }]} />
        </div>
        <p className={st.navHint}>{t("admin.settings.aboutStudioHint")}</p>
      </nav>

      {preview && (
        <aside className={st.previewCol}>
          <PreviewPane about={about} anchor={chapter?.anchor ?? "#architecture"} />
        </aside>
      )}

      <div className={st.main}>
        {chapter && (
          <PanelGroup key={chapter.key} label={pick(chapter.label)} paths={[`about.texts.${chapter.key}`]} panelKey={`texts-${chapter.key}`} {...saveHdr}>
            <SceneEditor key={chapter.key} chapter={chapter.key} defaults={ABOUT_TEXT_DEFAULTS[chapter.key]} value={texts[chapter.key] ?? {}} query={query}
              onChange={(v) => setAny("texts", { ...texts, [chapter.key]: v })} />
          </PanelGroup>
        )}

        {figure?.key === "graph" && (
          <PanelGroup label={pick(figure.label)} paths={figure.paths} panelKey="architecture" {...saveHdr}>
            <ArchDiagramEditor value={about.archDiagram ?? { nodes: [], edges: [] }} onChange={(v) => setAny("archDiagram", v)} />
          </PanelGroup>
        )}

        {figure?.key === "flows" && (
          <PanelGroup label={pick(figure.label)} paths={figure.paths} panelKey="userflow" {...saveHdr}>
            <UserFlowBlock onChange={(v) => setAny("userFlows", v)}
              value={about.userFlows?.length ? about.userFlows : userFlows} />
          </PanelGroup>
        )}

        {figure?.key === "erd" && (
          <PanelGroup label={pick(figure.label)} paths={figure.paths} panelKey="erd" {...saveHdr}>
            <ErdBlock lang={language === "ko" ? "ko" : "en"}
              tables={about.erdTables?.length ? about.erdTables : staticErdTables}
              relations={about.erdTables?.length ? about.erdRelations ?? [] : staticErdRelations}
              onChange={(tb, rl) => { setAny("erdTables", tb); setAny("erdRelations", rl); }} />
          </PanelGroup>
        )}
      </div>
    </div>
  );
}
