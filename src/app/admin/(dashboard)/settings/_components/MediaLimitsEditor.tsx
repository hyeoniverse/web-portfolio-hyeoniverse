"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import {
  ADDABLE_FORMATS,
  BUILTIN_FORMATS,
  MIME_GROUP_ICON,
  MIME_GROUP_ORDER,
  type MimeGroupKey,
  STORAGE_MAX_MB_CEILING,
  inferGroup,
  normalizeLimits,
  recommendedSize,
  resolveStorageMaxMb,
  sizeOptionsFor,
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
  /* 저장소 상한 — 형식별 선택지의 천장. 무료 플랜 기본 50, 설정에서 플랜에 맞게 올린다 */
  const storageMax = resolveStorageMaxMb((config.media as Record<string, unknown>)?.storageMaxMb);
  const sizeOptions = sizeOptionsFor(storageMax);

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

  /* 형식 하나 = 칩 하나("이름 [크기▾] ×") — 행 반복 대신 칩 wrap 으로 압축.
     기본 형식은 × 가 없는 것으로 구분한다(라벨 반복 제거), 사유는 title 로 남긴다 */
  const renderChip = (ext: string, label: string, isBuiltin: boolean) => (
    <span
      key={ext}
      className={styles.formatChip}
      data-builtin={isBuiltin || undefined}
      title={isBuiltin ? `.${ext} — ${t("admin.settings.builtInCannotDisable")}` : `.${ext}`}
    >
      <span className={styles.formatChipName}>{label}</span>
      <Select
        size="sm"
        width="min"
        /* 저장소 상한을 넘는 저장값은 선택지에 없다 — 실제로 적용되는 값(상한)으로 보인다 */
        value={String(Math.min(limits[ext] ?? 20, storageMax))}
        options={sizeOptions}
        onChange={(v) => updateLimits({ [ext]: Number(v) })}
        triggerClassName={styles.formatChipSelect}
      />
      {!isBuiltin && (
        <CloseButton
          size="xs"
          onClick={() => removeExt(ext)}
          ariaLabel={t("admin.settings.mediaRemoveFormat")}
          title={t("admin.settings.mediaRemoveFormat")}
        />
      )}
    </span>
  );

  /* 카테고리 하나 = 한 행 — 왼쪽 고정 폭 라벨 + 오른쪽 칩 wrap. 세로 나열보다 훨씬 얕다 */
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
      {/* 상단 컨트롤 — 저장소 상한(왼쪽)과 사용자 정의 확장자 추가(오른쪽)를 한 줄에 */}
      <div className={styles.mediaControls}>
        <StorageMaxInput
          key={storageMax}
          storageMax={storageMax}
          onCommit={(mb) =>
            setConfig((prev) => ({ ...prev, media: { ...prev.media, storageMaxMb: mb } }))
          }
          t={t}
        />
        {/* 입력 시 inferGroup 으로 알맞은 카테고리에 배정 */}
        <CustomExtAdder
          blockedExtensions={blockedExtensions}
          existingKeys={Object.keys(limits)}
          onAdd={(ext) => updateLimits({ [ext]: recommendedSize(ext, inferGroup(ext)) })}
          t={t}
        />
      </div>

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
            {enabled.map((f) => renderChip(f.ext, f.label, f.isBuiltin))}
            {custom.map((e) => renderChip(e, e.toUpperCase(), false))}
            {available.length > 0 && (
              <Select
                value=""
                placeholder={`+ ${t("admin.settings.mediaAddFormat")}`}
                options={available.map((f) => ({ value: f.ext, label: f.label }))}
                onChange={(ext) => {
                  const f = available.find((x) => x.ext === ext);
                  if (f) updateLimits({ [f.ext]: recommendedSize(f.ext, f.group) });
                }}
                triggerClassName={styles.addFormatChip}
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
          <>{customByGroup.get("other")!.map((e) => renderChip(e, e.toUpperCase(), false))}</>,
        )}
    </div>
  );
}

/** 저장소 한 파일 최대 용량(MB) 입력 — blur/Enter 에 확정. 범위 밖·숫자 아님은 확정하지 않고 사유를 보인다 */
function StorageMaxInput({
  storageMax,
  onCommit,
  t,
}: {
  storageMax: number;
  onCommit: (mb: number) => void;
  t: TFunction;
}) {
  const [draft, setDraft] = useState(String(storageMax));
  const [error, setError] = useState("");

  const commit = () => {
    const n = Number(draft.trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > STORAGE_MAX_MB_CEILING) {
      setError(t("admin.settings.mediaStorageMaxInvalid"));
      return;
    }
    setError("");
    if (n !== storageMax) onCommit(n);
  };

  return (
    <div className={styles.storageMax}>
      <span className={styles.customMimeLabel}>{t("admin.settings.mediaStorageMaxLabel")}</span>
      <div className={styles.storageMaxRow}>
        {/* md(32) — 탭의 다른 입력칸(API 키 등)이 전부 md 라 sm 이면 이 둘만 낮아 보인다 */}
        <Input
          value={draft}
          onChange={(v) => { setDraft(v); if (error) setError(""); }}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          error={!!error}
        />
        <span className={styles.storageMaxUnit}>MB</span>
      </div>
      {error
        ? <p className={styles.customMimeError}>{error}</p>
        : <p className={styles.storageMaxHint}>{t("admin.settings.mediaStorageMaxHint")}</p>}
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
          value={ext}
          onChange={(v) => { setExt(v); if (error) setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder={t("admin.settings.customMimePlaceholder")}
        />
        <Button variant="outline" icon={<Plus size={12} strokeWidth={2.4} />} onClick={handleAdd}>
          {t("admin.settings.add")}
        </Button>
      </div>
      {error && <p className={styles.customMimeError}>{error}</p>}
    </div>
  );
}
