"use client";

import type { ReactNode } from "react";
import { Undo2, Check } from "lucide-react";
import type { SiteConfigData } from "@/config/site.config";
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
  savingPaths: string[] | null;
  /** 타이틀 우측에 함께 표시할 추가 element (toggle 등). 저장 버튼 앞에 배치 */
  extra?: ReactNode;
  /** 섹션 타이틀 row 의 className — 기존 sectionTitleRow 와 호환 */
  rowClassName?: string;
  /** 타이틀 className */
  titleClassName?: string;
}

export default function SectionHeader({
  title,
  paths,
  config,
  savedConfig,
  saveSection,
  revertSection,
  savingPaths,
  extra,
  rowClassName,
  titleClassName,
}: SectionHeaderProps) {
  const { t } = useLanguage();

  const dirty = paths.some((p) => !deepEqual(getByPath(config, p), getByPath(savedConfig, p)));
  const isSavingThis = savingPaths != null && savingPaths.length === paths.length && savingPaths.every((p) => paths.includes(p));
  const isSavingOther = savingPaths != null && !isSavingThis;

  return (
    <div className={`${localStyles.row} ${rowClassName ?? ""}`.trim()}>
      <h2 className={titleClassName}>{title}</h2>
      {extra}
      {paths.length > 0 && (
        <div className={localStyles.spacer}>
          {revertSection && (
            <Button
              variant="outline"
              size="2xs"
              disabled={!dirty || isSavingOther || isSavingThis}
              onClick={() => revertSection(paths)}
              icon={<Undo2 size={12} strokeWidth={2} />}
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
            onClick={() => saveSection(paths)}
            icon={<Check size={12} strokeWidth={2.5} />}
          >
            {t("admin.settings.saveSection")}
          </Button>
        </div>
      )}
    </div>
  );
}
