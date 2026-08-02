"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import {
  ADDABLE_FORMATS,
  BUILTIN_FORMATS,
  MIME_GROUP_ICON,
  MIME_GROUP_ORDER,
  type MimeGroupKey,
  SIZE_OPTIONS,
  inferGroup,
  normalizeLimits,
  recommendedSize,
} from "../_data/servicesUploadConfig";
import { Plus } from "@/components/icons";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import type { SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import styles from "./MediaLimitsEditor.module.css";

type FormatItem = { ext: string; label: string; group: MimeGroupKey; isBuiltin: boolean };
/* 형식 카탈로그 — built-in(끄기 불가) + addable(끄기 가능). 확장자 키. */
const FORMAT_CATALOG: FormatItem[] = [
  ...BUILTIN_FORMATS.map((f) => ({ ext: f.ext, label: f.label, group: f.group, isBuiltin: true })),
  ...ADDABLE_FORMATS.map((f) => ({ ext: f.ext, label: f.label, group: f.group, isBuiltin: false })),
];
const CATALOG_EXTS = new Set(FORMAT_CATALOG.map((f) => f.ext));

export function MediaLimitsEditor({ config, setConfig, t }: {
  config: SiteConfigData;
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
  t: TFunction;
}) {
  // 구 MIME-키 config 도 확장자로 정규화해서 표시 (마이그레이션)
  const limits = normalizeLimits((config.media as Record<string, unknown>)?.limits as Record<string, number>);
  const blockedExtensions = ((config.media as Record<string, unknown>)?.blockedExtensions ?? []) as string[];

  // 쓰기는 항상 정규화된(확장자) limits 위에서 — 저장 시 MIME 키가 자연스럽게 확장자로 이관된다
  const updateLimits = (newLimits: Record<string, number>) => {
    setConfig((prev) => ({
      ...prev,
      media: { ...prev.media, limits: { ...normalizeLimits(prev.media.limits), ...newLimits } },
    }));
  };
  const removeExt = (ext: string) => {
    setConfig((prev) => {
      const next = normalizeLimits(prev.media.limits);
      delete next[ext];
      return { ...prev, media: { ...prev.media, limits: next } };
    });
  };

  // 카탈로그에 없는 사용자 정의 확장자 — 추론한 그룹으로 자동 배정 ("사용자 정의"에 몰지 않음)
  const customExts = Object.keys(limits).filter((e) => e !== "_default" && !CATALOG_EXTS.has(e));
  const customByGroup = new Map<MimeGroupKey | "other", string[]>();
  for (const e of customExts) {
    const g = inferGroup(e);
    if (!customByGroup.has(g)) customByGroup.set(g, []);
    customByGroup.get(g)!.push(e);
  }

  const renderRow = (ext: string, label: string, isBuiltin: boolean) => (
    <div key={ext} className={styles.mediaFormatRow}>
      <span className={styles.mediaFormatLabel} title={`.${ext}`}>{label}</span>
      <Select
        size="sm"
        width="s"
        value={String(limits[ext] ?? 20)}
        options={SIZE_OPTIONS}
        onChange={(v) => updateLimits({ [ext]: Number(v) })}
      />
      <span className={styles.mediaFormatTrailing}>
        {isBuiltin ? (
          <span className={styles.mediaFormatBuiltin}>{t("admin.settings.mediaBuiltIn")}</span>
        ) : (
          <CloseButton
            size="xs"
            onClick={() => removeExt(ext)}
            ariaLabel={t("admin.settings.mediaRemoveFormat")}
            title={t("admin.settings.mediaRemoveFormat")}
          />
        )}
      </span>
    </div>
  );

  const renderCategory = (catKey: MimeGroupKey | "other", label: string, count: number, body: React.ReactNode) => {
    const Icon = MIME_GROUP_ICON[catKey];
    return (
      <div key={catKey} className={styles.mediaCategory}>
        <div className={styles.mediaCategoryHead}>
          <Icon size={13} strokeWidth={2} />
          <span>{label}</span>
          <span className={styles.mediaCategoryCount}>{count}</span>
        </div>
        <div className={styles.mediaFormatList}>{body}</div>
      </div>
    );
  };

  return (
    <div className={styles.mediaLimits}>
      {/* 사용자 정의 확장자 추가 (상단) — 입력 시 inferGroup 으로 알맞은 카테고리에 배정 */}
      <CustomExtAdder
        blockedExtensions={blockedExtensions}
        existingKeys={Object.keys(limits)}
        onAdd={(ext) => updateLimits({ [ext]: recommendedSize(ext, inferGroup(ext)) })}
        t={t}
      />

      {MIME_GROUP_ORDER.map((catKey) => {
        const enabled = FORMAT_CATALOG.filter((f) => f.group === catKey && f.ext in limits);
        const available = FORMAT_CATALOG.filter((f) => f.group === catKey && !f.isBuiltin && !(f.ext in limits));
        const custom = customByGroup.get(catKey) ?? [];
        if (enabled.length === 0 && available.length === 0 && custom.length === 0) return null;
        return renderCategory(
          catKey,
          t(`admin.settings.mimeGroup${catKey[0].toUpperCase()}${catKey.slice(1)}`),
          enabled.length + custom.length,
          <>
            {enabled.map((f) => renderRow(f.ext, f.label, f.isBuiltin))}
            {custom.map((e) => renderRow(e, e.toUpperCase(), false))}
            {available.length > 0 && (
              <Select
                size="sm"
                value=""
                placeholder={`+ ${t("admin.settings.mediaAddFormat")}`}
                options={available.map((f) => ({ value: f.ext, label: f.label }))}
                onChange={(ext) => {
                  const f = available.find((x) => x.ext === ext);
                  if (f) updateLimits({ [f.ext]: recommendedSize(f.ext, f.group) });
                }}
                className={styles.mediaAddFormat}
              />
            )}
          </>,
        );
      })}

      {/* 그룹 추론이 안 되는(other) 커스텀 확장자만 별도 표시 */}
      {(customByGroup.get("other")?.length ?? 0) > 0 &&
        renderCategory(
          "other",
          t("admin.settings.mediaCustomCategory"),
          customByGroup.get("other")!.length,
          <>{customByGroup.get("other")!.map((e) => renderRow(e, e.toUpperCase(), false))}</>,
        )}
    </div>
  );
}

function CustomExtAdder({
  blockedExtensions,
  existingKeys,
  onAdd,
  t,
}: {
  blockedExtensions: string[];
  existingKeys: string[];
  onAdd: (ext: string) => void;
  t: TFunction;
}) {
  const [ext, setExt] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    setError("");
    // 앞 점 제거 + 소문자
    const e = ext.trim().replace(/^\.+/, "").toLowerCase();
    if (!e) {
      setError(t("admin.settings.customMimeEmpty"));
      return;
    }
    if (!/^[a-z0-9]{1,12}$/.test(e)) {
      setError(t("admin.settings.customMimeInvalid"));
      return;
    }
    if (existingKeys.includes(e)) {
      setError(t("admin.settings.customMimeDup"));
      return;
    }
    if (blockedExtensions.includes(e)) {
      setError(t("admin.settings.customMimeBlocked"));
      return;
    }
    onAdd(e);
    setExt("");
  };

  return (
    <div className={styles.customMimeAdder}>
      <span className={styles.customMimeLabel}>{t("admin.settings.customMimeAdd")}</span>
      <div className={styles.customMimeRow}>
        <Input
          size="sm"
          value={ext}
          onChange={(v) => { setExt(v); if (error) setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder={t("admin.settings.customMimePlaceholder")}
        />
        <Button variant="outline" size="sm" icon={<Plus size={12} strokeWidth={2.4} />} onClick={handleAdd}>
          {t("admin.settings.add")}
        </Button>
      </div>
      {error && <p className={styles.customMimeError}>{error}</p>}
    </div>
  );
}
