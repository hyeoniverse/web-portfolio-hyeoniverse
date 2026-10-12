"use client";

import { useRef, type ReactNode } from "react";
import { deepEqual, getByPath } from "../../../_data/settingsConstants";
import { type SettingsTabProps } from "../../../_types";
import css from "../AboutStudio.module.css";
import StickyGlassBar from "@/components/admin/StickyGlassBar/StickyGlassBar";
import { Download } from "@/components/icons";
import Button from "@/components/ui/Button";
import { siteConfig, type SiteConfigData } from "@/config/site.config";
import { canUseMarkdown, contentPathOf } from "@/lib/about/contentSources";
import { loadPanelFiles } from "@/lib/about/loadPanelFiles";
import { type TFunction } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { type ChangeEvent } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
/* 한 패널 = 헤더 + 편집 블록. 둘을 한 <section> 으로 묶는다.
   헤더가 sticky 라서 필요하다 — 형제로 늘어놓으면 지나간 헤더들이 전부 같은 자리에
   붙어 남고, glass 가 서로 겹쳐 blur 가 곱해진다. 묶으면 sticky 가 자기 구역 안에서만
   살아 있어서 화면 위에는 지금 고치고 있는 패널의 헤더 하나만 남는다.
   data-settings-section 도 여기로 온다 — 점프바가 붙어 있는 헤더가 아니라 구역의
   시작으로 스크롤해야 한다. */
export function PanelGroup({ children, ...head }: PanelSaveHeaderProps & { children: ReactNode }) {
  /* 바뀐 패널 — 머리의 점과 같은 판정. 사이드바 목록·탭 저장 단추의 개수가 data-dirty 로 읽는다 */
  const dirty = head.paths.some((p) => !deepEqual(getByPath(head.config, p), getByPath(head.savedConfig, p)));
  return (
    <section className={css.panelGroup} data-settings-section data-section-label={head.label} data-dirty={dirty || undefined}>
      <PanelSaveHeader {...head} />
      {children}
    </section>
  );
}


/* ═══════════ 패널별 저장 헤더 — 해당 패널 config 경로만 저장/dirty 판정 ═══════════ */
export interface PanelSaveHeaderProps {
  label: string; hint?: ReactNode; paths: string[]; panelKey?: string;
  config: SiteConfigData; savedConfig: SiteConfigData;
  saveSection: SettingsTabProps["saveSection"]; revertSection: SettingsTabProps["revertSection"];
  resetSection: SettingsTabProps["resetSection"]; savingPaths: SettingsTabProps["savingPaths"];
  setAny: (k: string, v: unknown) => void; t: TFunction;
}

function PanelSaveHeader({ label, hint, paths, panelKey, config, savedConfig, saveSection, revertSection, resetSection, savingPaths, setAny, t }: PanelSaveHeaderProps) {
  const { t: tA, language } = useLanguage();
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
      showToast(result?.warnings[0] ?? (tA("admin.inline.panels.filesUnreadable")), "error");
      return;
    }
    for (const [path, value] of Object.entries(result.values)) {
      setAny(path.slice("about.".length), value);
    }
    if (result.warnings.length > 0) {
      showToast(
        `${result.count}${tA("admin.inline.panels.loadedWithWarnings")}${result.warnings[0]}`,
        "error",
      );
    } else {
      showToast(
        fillTemplate(tA("admin.inline.panels.loadedCount"), { n: result.count }),
        "success",
      );
    }
  };

  return (
    /* 편집 중에도 위에 붙어 있는 툴바. 패널 하나가 4,000px 을 넘기도 해서, 예전엔
       한 글자 고치고 저장하려고 화면 몇 개를 거슬러 올라가야 했다.
       --spacing-page-inline 를 여기서만 좁힌다 — 공통 바는 뷰포트 양끝까지 frost 를 펴는데,
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
            <Button variant="outline" icon={<Download size={12} strokeWidth={1.8} />}
              onClick={() => fileRef.current?.click()}
              title={tA("admin.inline.panels.fillFromMdFiles")}>
              {tA("admin.inline.panels.loadMd")}
            </Button>
            <input ref={fileRef} type="file" accept=".md" multiple hidden onChange={onPickFiles} />
          </>
        )}
        {mdCapable && syncedAt && (
          <span className={css.psSyncNote} title={contentPathOf(panelKey!)}>
            {tA("admin.inline.panels.fromFiles")}
            {new Date(syncedAt).toLocaleString(language === "ko" ? "ko-KR" : "en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
        <Button variant="outline" disabled={atDefault || saving} onClick={() => resetSection(paths)}
          title={t("admin.settings.resetSection")}>
          {t("admin.settings.resetSection")}
        </Button>
        <Button variant="outline" disabled={!dirty || saving} onClick={() => revertSection(paths)}
          title={t("admin.settings.revertSection")}>
          {t("admin.settings.revertSection")}
        </Button>
        <Button variant="subtle" disabled={!dirty || saving} onClick={saveWithStamp}
          title={t("admin.settings.saveSectionTooltip")}>
          {t("admin.settings.saveSection")}
        </Button>
      </span>
    </StickyGlassBar>
  );
}
