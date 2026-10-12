"use client";

/* ─────────────────────────────────────────────────────────────
   About Studio — 지금 /about 이 관리자 설정에서 읽는 값만 고친다.
   개편된 About(프레지)은 글 · 장면을 코드(src/app/about/_data)에 두고, 구조 장의
   기술 그래프 · 사용자 흐름 · DB 설계 세 장면만 about.* 설정을 먼저 쓴다
   (ArchitectureChapter 의 useAboutConfig). 그래서 편집기도 그 셋을 장면 순서대로 둔다.
   저장은 패널마다(PanelGroup), KO/EN 은 흐름 글의 편집 언어.
   ───────────────────────────────────────────────────────────── */

import css from "./AboutStudio.module.css";
import ArchDiagramEditor from "./ArchDiagramEditor";
import { erdTables as staticErdTables, erdRelations as staticErdRelations } from "@/data/about/erd";
import { userFlows } from "@/data/about/architecture";
import { stackScene, flowScene, erdScene } from "@/app/about/_data/architecture";
import type { L10n } from "@/app/about/_data/showcase";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import type { Language } from "@/types";
import { useState } from "react";
import { type SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../../_types";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { PanelGroup } from "./studio/panels";
import { UserFlowBlock } from "./studio/blocks/UserFlowBlock";
import { ErdBlock } from "./studio/blocks/ErdBlock";

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
  const { language } = useLanguage();
  const about = config.about;
  const [lang, setLang] = useState<Language>("ko");
  /* 패널 이름은 공개 페이지의 장면 라벨 그대로 — 관리자 화면 언어로 */
  const sceneLabel = (v: L10n) => (language === "ko" ? v.ko ?? v.en : v.en ?? v.ko) ?? "";

  const setAny = (key: string, value: unknown) =>
    update("about", key as keyof SiteConfigData["about"], value as SiteConfigData["about"][keyof SiteConfigData["about"]]);
  const saveHdr = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, setAny, t };

  return (
    <div className={css.studio} style={{ gridColumn: "1 / -1" }}>
      <div className={css.bar}>
        <SegmentedControl<Language> value={lang} onChange={setLang} className={css.segFit}
          items={[{ value: "ko", label: "KO" }, { value: "en", label: "EN" }]} />
        <p className={css.barHint}>{t("admin.settings.aboutStudioHint")}</p>
      </div>

      {/* ── 1 · 기술 그래프 ── */}
      <PanelGroup label={sceneLabel(stackScene.label)} paths={["about.archDiagram"]} panelKey="architecture" {...saveHdr}>
        <section className={css.block}>
          <ArchDiagramEditor value={about.archDiagram ?? { nodes: [], edges: [] }} onChange={(v) => setAny("archDiagram", v)} />
        </section>
      </PanelGroup>

      {/* ── 2 · 사용자 흐름 ── */}
      <PanelGroup label={sceneLabel(flowScene.label)} paths={["about.userFlows"]} panelKey="userflow" {...saveHdr}>
        <UserFlowBlock lang={lang} t={t} title={sceneLabel(flowScene.title)}
          onChange={(v) => setAny("userFlows", v)}
          value={about.userFlows?.length ? about.userFlows : userFlows} />
      </PanelGroup>

      {/* ── 3 · DB 설계 ── */}
      <PanelGroup label={sceneLabel(erdScene.label)} paths={["about.erdTables", "about.erdRelations"]} panelKey="erd" {...saveHdr}>
        <ErdBlock lang={lang}
          tables={about.erdTables?.length ? about.erdTables : staticErdTables}
          relations={about.erdTables?.length ? about.erdRelations ?? [] : staticErdRelations}
          onChange={(tb, rl) => { setAny("erdTables", tb); setAny("erdRelations", rl); }} />
      </PanelGroup>
    </div>
  );
}
