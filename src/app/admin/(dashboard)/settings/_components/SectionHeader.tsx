"use client";

import type { ReactNode } from "react";
/* 섹션 헤더 버튼은 아이콘 없이 텍스트만 */
import type { SiteConfigData } from "@/config/site.config";
import { siteConfig } from "@/config/site.config";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { deepEqual, getByPath } from "../_data/settingsConstants";
import localStyles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  /** 섹션 타이틀 (이미 번역된 string 또는 JSX) */
  title: ReactNode;
  /** 이 섹션이 책임지는 dot-path 들. 빈 배열이면 저장 버튼 미표시 (read-only) */
  paths: string[];
  config: SiteConfigData;
  savedConfig: SiteConfigData;
  saveSection: (paths: string[]) => Promise<void>;
  revertSection?: (paths: string[]) => void;
  /** 이 섹션을 siteConfig 의 기본값으로 되돌림 */
  resetSection?: (paths: string[]) => void;
  savingPaths: string[] | null;
  /** 타이틀 우측에 함께 표시할 추가 element (hint 등) — 타이틀 옆 (gap 만큼 떨어져) 배치 */
  extra?: ReactNode;
  /** spacer (저장/되돌리기/기본값 버튼 그룹) 맨 앞에 배치할 element. toggle 등 우측 정렬용. */
  spacerExtra?: ReactNode;
  /** row 바로 아래에 SectionHeader 안에 함께 묶어 렌더할 element. drawer / 추가 컨트롤 등. */
  below?: ReactNode;
  /** 섹션 타이틀 row 의 className — 기존 sectionTitleRow 와 호환 */
  rowClassName?: string;
  /** 타이틀 className */
  titleClassName?: string;
  /** paths 외 추가 dirty 신호 — pending list 등 client-side side-effect 가 있을 때 활성화. */
  extraDirty?: boolean;
  /** saveSection 직전에 실행되는 hook — pending API 호출 등 처리. throw 하면 save 중단. */
  beforeSave?: () => void | Promise<void>;
  /** revertSection 와 함께 실행 — client-side pending 상태 클리어. */
  extraRevert?: () => void;
  /** spacer 의 기본 save/revert/reset 버튼 대신 렌더할 custom 액션. paths=[] 인 섹션도 spacer 표시 */
  customActions?: ReactNode;
  /** config paths 가 기본값과 같더라도 기본값(reset) 버튼을 강제로 활성화 — config 밖 데이터(ex. 게시물 태그)가
   *  기본 세트와 다를 때 사용. */
  resetForceEnabled?: boolean;
  /** 기본값(reset) 버튼 클릭 시 resetSection(paths) 대신 실행할 커스텀 핸들러. */
  onResetOverride?: () => void;
}

export default function SectionHeader({
  title,
  paths,
  config,
  savedConfig,
  saveSection,
  revertSection,
  resetSection,
  savingPaths,
  extra,
  spacerExtra,
  below,
  rowClassName,
  titleClassName,
  extraDirty = false,
  beforeSave,
  extraRevert,
  customActions,
  resetForceEnabled = false,
  onResetOverride,
}: SectionHeaderProps) {
  const { t } = useLanguage();

  const pathsDirty = paths.some((p) => !deepEqual(getByPath(config, p), getByPath(savedConfig, p)));
  const dirty = pathsDirty || extraDirty;
  const isSavingThis = savingPaths != null && savingPaths.length === paths.length && savingPaths.every((p) => paths.includes(p));
  const isSavingOther = savingPaths != null && !isSavingThis;
  /* 기본값(reset) 버튼 비활성 조건 — config paths 가 기본값과 같고 + 강제활성(resetForceEnabled)도 아닐 때.
     resetForceEnabled 는 config 밖 데이터(게시물 태그 등)가 기본 세트와 다를 때 켜짐. */
  const configAtDefault = paths.every((p) => deepEqual(getByPath(config, p), getByPath(siteConfig as unknown as SiteConfigData, p)));
  const isAtDefault = configAtDefault && !resetForceEnabled;

  return (
    /* data-settings-section — SectionJumpNav 가 패널 안 섹션을 스캔·점프하는 앵커.
       scroll-margin-top 은 sticky 탭바 아래로 정확히 멈추게 한다. */
    <div className={localStyles.wrap} data-settings-section>
      <div className={`${localStyles.row} ${rowClassName ?? ""}`.trim()}>
        <h2 className={titleClassName}>{title}</h2>
        {extra}
        {customActions ? (
          <div className={localStyles.spacer}>
            {spacerExtra}
            {customActions}
          </div>
        ) : paths.length > 0 && (
          <div className={localStyles.spacer}>
            {spacerExtra}
            {resetSection && (
              <Button
                variant="outline"
                size="2xs"
                disabled={isAtDefault || isSavingOther || isSavingThis}
                onClick={() => (onResetOverride ? onResetOverride() : resetSection(paths))}
                title={t("admin.settings.resetSection")}
              >
                {t("admin.settings.resetSection")}
              </Button>
            )}
            {revertSection && (
              <Button
                variant="outline"
                size="2xs"
                disabled={!dirty || isSavingOther || isSavingThis}
                onClick={() => { revertSection(paths); extraRevert?.(); }}
                title={t("admin.settings.revertSection")}
              >
                {t("admin.settings.revertSection")}
              </Button>
            )}
            <Button
              variant="outline"
              size="2xs"
              disabled={!dirty || isSavingOther}
              loading={isSavingThis}
              loadingVariant="wave"
              onClick={async () => {
                if (beforeSave) {
                  try { await beforeSave(); } catch { return; }
                }
                await saveSection(paths);
              }}
            >
              {t("admin.settings.saveSection")}
            </Button>
          </div>
        )}
      </div>
      {below}
    </div>
  );
}
