"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { ADDABLE_MIME_GROUPS, DEFAULT_LIMIT_GROUPS, MIME_ADDABLE_GROUP_KEY, MIME_GROUP_ICON, MIME_GROUP_ORDER, type MimeGroupKey, SIZE_OPTIONS } from "../_data/servicesUploadConfig";
import { Plus } from "@/components/icons";
import Select from "@/components/ui/Select";
import type { SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import styles from "./ServicesTab.module.css";
import shared from "../Settings.module.css";

/* 번들 라벨 ("JPEG / PNG / WebP") → 개별 MIME 라벨 매핑. drag chip 은 1개 MIME = 1개 chip 이라 필요. */
const MIME_LABEL: Record<string, string> = {
  // image
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/svg+xml": "SVG",
  "image/gif": "GIF",
  // video
  "video/mp4": "MP4",
  "video/webm": "WebM",
  "video/quicktime": "MOV",
  // audio
  "audio/mpeg": "MP3",
  "audio/wav": "WAV",
  "audio/ogg": "OGG",
  // document
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "text/csv": "CSV",
  // archive
  "application/zip": "ZIP",
};

/* chip 클릭 (drag 아님) 시 자동 배정될 추천 사이즈 (MB).
   SIZE_OPTIONS 값에 맞춰 정렬됨 (1/2/5/10/20/50/100). */
const RECOMMENDED_SIZES: Record<string, number> = {
  "image/jpeg": 5,
  "image/png": 5,
  "image/webp": 5,
  "image/svg+xml": 2,
  "image/gif": 10,
  "image/avif": 5,
  "image/bmp": 10,
  "image/heic": 10,
  "image/tiff": 10,
  "video/mp4": 50,
  "video/webm": 50,
  "video/quicktime": 50,
  "video/AV1": 50,
  "video/H265": 50,
  "audio/mpeg": 20,
  "audio/wav": 20,
  "audio/ogg": 20,
  "audio/flac": 20,
  "audio/x-m4a": 20,
  "application/pdf": 20,
  "application/epub+zip": 10,
  "text/markdown": 1,
  "application/msword": 20,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 20,
  "application/vnd.ms-excel": 20,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 20,
  "application/vnd.ms-powerpoint": 50,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 50,
  "text/plain": 1,
  "text/csv": 5,
  "application/json": 2,
  "application/zip": 50,
  "application/x-rar-compressed": 50,
  "application/x-7z-compressed": 50,
  "application/gzip": 50,
};

const GROUP_RECOMMENDED: Record<MimeGroupKey, number> = {
  image: 5,
  video: 50,
  audio: 20,
  document: 20,
  archive: 50,
};

export function MediaLimitsEditor({ config, setConfig, t }: {
  config: SiteConfigData;
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
  t: TFunction;
}) {
  const limits = ((config.media as Record<string, unknown>)?.limits ?? {}) as Record<string, number>;
  const blockedMimes = ((config.media as Record<string, unknown>)?.blockedMimes ?? []) as string[];
  const [dragOverSize, setDragOverSize] = useState<number | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);
  /* built-in 형식을 비활성 풀로 drag 했을 때 잠깐 shake — 시각 피드백 */
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  const updateLimits = (newLimits: Record<string, number>) => {
    setConfig((prev) => ({
      ...prev,
      media: { ...prev.media, limits: { ...prev.media.limits, ...newLimits } },
    }));
  };

  const removeMime = (key: string) => {
    setConfig((prev) => {
      const next = { ...prev.media.limits };
      delete (next as Record<string, number>)[key];
      return { ...prev, media: { ...prev.media, limits: next } };
    });
  };

  /* 전체 format 카탈로그 — built-in (DEFAULT_LIMIT_GROUPS) + addable (ADDABLE_MIME_GROUPS) 단일 평탄화 */
  type FormatItem = { key: string; label: string; group: MimeGroupKey; isAdded: boolean };
  const allFormats: FormatItem[] = [
    ...DEFAULT_LIMIT_GROUPS.flatMap((g) => {
      const ks = g.keys ?? [g.key];
      return ks.map((k) => ({ key: k, label: MIME_LABEL[k] ?? k, group: g.group, isAdded: false }));
    }),
    ...ADDABLE_MIME_GROUPS.flatMap((g) =>
      g.mimes.map((m) => ({ key: m.value, label: m.label, group: MIME_ADDABLE_GROUP_KEY[g.labelKey], isAdded: true })),
    ),
  ];

  const enabledFormats = allFormats.filter((f) => f.key in limits);
  const availableFormats = allFormats.filter((f) => f.isAdded && !(f.key in limits));

  /* click (drag 아님) 시 자동 배정 — 추천 사이즈 → fallback 그룹 추천 → 20MB */
  const getRecommendedSize = (key: string, group: MimeGroupKey): number =>
    RECOMMENDED_SIZES[key] ?? GROUP_RECOMMENDED[group] ?? 20;

  const handleChipClick = (key: string, group: MimeGroupKey) => {
    const size = getRecommendedSize(key, group);
    if (limits[key] === size) return;
    updateLimits({ [key]: size });
  };

  /* drag handlers */
  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleBucketDragOver = (e: React.DragEvent, size: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSize !== size) setDragOverSize(size);
  };
  const handleBucketDrop = (e: React.DragEvent, size: number) => {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/plain");
    if (key) updateLimits({ [key]: size });
    setDragOverSize(null);
  };
  const handlePoolDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragOverPool) setDragOverPool(true);
  };
  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPool(false);
    const key = e.dataTransfer.getData("text/plain");
    if (!key) return;
    const f = allFormats.find((x) => x.key === key);
    /* 활성화된 added MIME 만 비활성화 가능. built-in 은 거부 → shake + toast */
    if (f?.isAdded && key in limits) {
      removeMime(key);
    } else if (f && !f.isAdded) {
      setShakeKey(key);
      showToast(t("admin.settings.builtInCannotDisable"), "error");
      window.setTimeout(() => setShakeKey((cur) => (cur === key ? null : cur)), 500);
    }
  };

  /* 한 사이즈 버킷 안에서 카테고리별 chip 묶음 렌더 */
  const renderBucketContent = (formats: FormatItem[]) => {
    return MIME_GROUP_ORDER.map((catKey) => {
      const inCat = formats.filter((f) => f.group === catKey);
      if (inCat.length === 0) return null;
      const Icon = MIME_GROUP_ICON[catKey];
      return (
        <div key={catKey} className={styles.sizeBucketCategory}>
          <Icon size={11} strokeWidth={2} />
          <div className={styles.sizeBucketChips}>
            {inCat.map((f) => (
              <span
                key={f.key}
                className={`${shared.sizeChip} ${shakeKey === f.key ? styles.sizeChipShake : ""}`}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => handleDragStart(e, f.key)}
                onClick={() => handleChipClick(f.key, f.group)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleChipClick(f.key, f.group); } }}
                title={`${f.key} — 클릭: 추천 ${getRecommendedSize(f.key, f.group)} MB / 드래그: 사이즈 직접 지정`}
              >
                {f.label}
              </span>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={styles.sizeBucketStack}>
      {SIZE_OPTIONS.map((opt) => {
        const size = Number(opt.value);
        const inBucket = enabledFormats.filter((f) => (limits[f.key] ?? 0) === size);
        const isHover = dragOverSize === size;
        return (
          <div
            key={opt.value}
            className={`${styles.sizeBucket} ${isHover ? styles.sizeBucketHover : ""}`}
            onDragOver={(e) => handleBucketDragOver(e, size)}
            onDragLeave={() => setDragOverSize(null)}
            onDrop={(e) => handleBucketDrop(e, size)}
          >
            <div className={styles.sizeBucketHead}>
              <span className={styles.sizeBucketLabel}>{opt.label}</span>
              <span className={styles.sizeBucketCount}>{inBucket.length}</span>
            </div>
            <div className={styles.sizeBucketBody}>
              {inBucket.length > 0
                ? renderBucketContent(inBucket)
                : <span className={styles.sizeBucketEmpty}>—</span>}
            </div>
          </div>
        );
      })}

      {/* 비활성 풀 — 추가 가능한 형식 (드래그해서 위로 활성화) + 드래그해서 여기 놓으면 비활성화 */}
      <div
        className={`${styles.sizePoolBucket} ${dragOverPool ? styles.sizeBucketHover : ""}`}
        onDragOver={handlePoolDragOver}
        onDragLeave={() => setDragOverPool(false)}
        onDrop={handlePoolDrop}
      >
        <div className={styles.sizeBucketHead}>
          <span className={styles.sizeBucketLabel}>{t("admin.settings.sizePoolLabel")}</span>
          <span className={styles.sizeBucketCount}>{availableFormats.length}</span>
        </div>
        <div className={styles.sizeBucketBody}>
          {availableFormats.length > 0
            ? renderBucketContent(availableFormats)
            : <span className={styles.sizeBucketEmpty}>—</span>}
        </div>
      </div>

      {/* 사용자 정의 MIME 추가 — 블랙리스트 통과 시 limits 에 등록. drag 대상 아님. */}
      <CustomMimeAdder
        blockedMimes={blockedMimes}
        existingKeys={Object.keys(limits)}
        onAdd={(mime, size) => updateLimits({ [mime]: size })}
        t={t}
      />
    </div>
  );
}

function CustomMimeAdder({
  blockedMimes,
  existingKeys,
  onAdd,
  t,
}: {
  blockedMimes: string[];
  existingKeys: string[];
  onAdd: (mime: string, size: number) => void;
  t: TFunction;
}) {
  const [mime, setMime] = useState("");
  const [size, setSize] = useState("20");
  const [error, setError] = useState("");

  const handleAdd = () => {
    setError("");
    const m = mime.trim().toLowerCase();
    if (!m) {
      setError(t("admin.settings.customMimeEmpty"));
      return;
    }
    /* MIME 포맷: type/subtype (subtype 에 . + - 허용) */
    if (!/^[a-z]+\/[a-z0-9.+-]+$/.test(m)) {
      setError(t("admin.settings.customMimeInvalid"));
      return;
    }
    if (existingKeys.includes(m)) {
      setError(t("admin.settings.customMimeDup"));
      return;
    }
    if (blockedMimes.includes(m)) {
      setError(t("admin.settings.customMimeBlocked"));
      return;
    }
    onAdd(m, Number(size));
    setMime("");
  };

  return (
    <div className={styles.customMimeAdder}>
      <span className={styles.customMimeLabel}>{t("admin.settings.customMimeAdd")}</span>
      <div className={styles.customMimeRow}>
        <input
          className={styles.customMimeInput}
          type="text"
          value={mime}
          onChange={(e) => { setMime(e.target.value); if (error) setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder={t("admin.settings.customMimePlaceholder")}
        />
        <Select size="sm" value={size} options={SIZE_OPTIONS} onChange={setSize} />
        <button type="button" className={shared.customMimeAddBtn} onClick={handleAdd}>
          <Plus size={12} strokeWidth={2.4} />
          {t("admin.settings.add")}
        </button>
      </div>
      {error && <p className={styles.customMimeError}>{error}</p>}
    </div>
  );
}
