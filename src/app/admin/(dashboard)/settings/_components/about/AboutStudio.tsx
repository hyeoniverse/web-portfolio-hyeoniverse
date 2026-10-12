"use client";

/* ─────────────────────────────────────────────────────────────
   About Studio — 새 /about(프레지)을 장 순서대로 고친다.
   - 장마다의 글: 코드 기본값(src/app/about/_data) 위에 고친 글만 about.texts[장] 에 남긴다
     (페이지는 useAboutText 로 둘을 겹쳐 그린다). 장 하나 = 패널 하나라 저장 · 되돌리기도 장 단위.
   - 구조 장의 그림: 기술 그래프 · 사용자 흐름 · DB 설계는 about.archDiagram · userFlows ·
     erdTables/erdRelations 를 통째로 고친다 — 구조 장 글 바로 뒤에 둔다.
   KO/EN 은 글을 고칠 언어, 찾기는 모든 장의 칸을 거른다.
   ───────────────────────────────────────────────────────────── */

import css from "./AboutStudio.module.css";
import ArchDiagramEditor from "./ArchDiagramEditor";
import { erdTables as staticErdTables, erdRelations as staticErdRelations } from "@/data/about/erd";
import { userFlows } from "@/data/about/architecture";
import { stackScene, flowScene, erdScene } from "@/app/about/_data/architecture";
import type { L10n } from "@/app/about/_data/showcase";
import { ABOUT_TEXT_DEFAULTS, type AboutChapterKey } from "@/app/about/_data/texts";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import type { Language } from "@/types";
import { Fragment, useState } from "react";
import { type SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../../_types";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Input from "@/components/ui/Input";
import { TextsBlock } from "./studio/blocks/TextsBlock";
import { PanelGroup } from "./studio/panels";
import { UserFlowBlock } from "./studio/blocks/UserFlowBlock";
import { ErdBlock } from "./studio/blocks/ErdBlock";

/* 장 이름 — 페이지의 장 순서(목차)를 따른다. 랜딩 조각(첫 화면 단추 · 신뢰 · 자주 묻는 질문 · 마지막 단추 · 크레딧)은 끝에 모은다 */
const CHAPTER_LABELS: Record<AboutChapterKey, L10n> = {
  showcase: { ko: "첫 화면 · 한눈에 보기", en: "Opening · At a glance" },
  features: { ko: "기능", en: "Features" },
  ai: { ko: "AI", en: "AI" },
  architecture: { ko: "구조", en: "Architecture" },
  journeys: { ko: "구조 — API 요청 길", en: "Architecture — API journeys" },
  decisions: { ko: "설계 결정 · 보안", en: "Decisions · Security" },
  design: { ko: "디자인", en: "Design" },
  code: { ko: "코드", en: "Code" },
  making: { ko: "만든 과정", en: "Making of" },
  landing: { ko: "신뢰 · 자주 묻는 질문 · 단추 · 크레딧", en: "Trust · FAQ · CTAs · Credits" },
};
const CHAPTER_ORDER: AboutChapterKey[] = ["showcase", "features", "ai", "architecture", "journeys", "decisions", "design", "code", "making", "landing"];

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
  const [query, setQuery] = useState("");
  /* 패널 이름은 공개 페이지의 장면 라벨 그대로 — 관리자 화면 언어로 */
  const sceneLabel = (v: L10n) => (language === "ko" ? v.ko || v.en : v.en || v.ko);
  const texts = about.texts ?? {};

  const setAny = (key: string, value: unknown) =>
    update("about", key as keyof SiteConfigData["about"], value as SiteConfigData["about"][keyof SiteConfigData["about"]]);
  const saveHdr = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, setAny, t };

  /* 구조 장의 그림 셋 — 공개 페이지의 장면 순서 */
  const structure = (
    <>
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
    </>
  );

  return (
    <div className={css.studio} style={{ gridColumn: "1 / -1" }}>
      <div className={css.bar}>
        <SegmentedControl<Language> value={lang} onChange={setLang} className={css.segFit}
          items={[{ value: "ko", label: "KO" }, { value: "en", label: "EN" }]} />
        <Input value={query} onChange={setQuery} size="sm" aria-label={language === "ko" ? "글 찾기" : "Find text"}
          placeholder={language === "ko" ? "글 찾기" : "Find text"} />
        <p className={css.barHint}>{t("admin.settings.aboutStudioHint")}</p>
      </div>

      {CHAPTER_ORDER.map((ch) => (
        <Fragment key={ch}>
          <PanelGroup label={sceneLabel(CHAPTER_LABELS[ch])} paths={[`about.texts.${ch}`]} panelKey={`texts-${ch}`} {...saveHdr}>
            <TextsBlock defaults={ABOUT_TEXT_DEFAULTS[ch]} value={texts[ch] ?? {}} lang={lang} query={query}
              onChange={(v) => setAny("texts", { ...texts, [ch]: v })} />
          </PanelGroup>
          {ch === "architecture" && structure}
        </Fragment>
      ))}
    </div>
  );
}

