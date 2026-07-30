"use client";

import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import type { SelectOption } from "@/types";
import { ChevronUp, ChevronDown, Plus } from "@/components/icons";
import {
  AI_COVER_OPTIONS, AI_SUMMARY_OPTIONS, TRANSLATION_OPTIONS,
  DEFAULT_LIMIT_GROUPS, MIME_GROUP_ORDER, MIME_GROUP_ICON, MIME_ADDABLE_GROUP_KEY, ADDABLE_MIME_GROUPS, SIZE_OPTIONS,
  type AICoverProvider, type AISummaryProvider, type TranslationProvider, type MimeGroupKey,
} from "../_data/servicesUploadConfig";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { SiteConfigData } from "@/config/site.config";
import { Switch } from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type { SettingsTabProps } from "../_types";
import Field, { FieldHelp } from "./SettingsFormFields";
import EnvVarFields from "./EnvVarFields";
import SectionHeader from "./SectionHeader";
import GiscusHelp from "./GiscusHelp";
import FieldRow from "@/components/ui/FieldRow";
import { showToast } from "@/stores/toastStore";
import styles from "./ServicesTab.module.css";
import shared from "../Settings.module.css";





interface PriorityListProps<T extends string> {
  primary: T;
  priority: T[];
  excluded: T[];
  options: SelectOption<T>[];
  onChange: (next: T[]) => void;
  onExcludedChange: (next: T[]) => void;
}

function PriorityList<T extends string>({ primary, priority, excluded, options, onChange, onExcludedChange }: PriorityListProps<T>) {
  const nonPrimary = options.filter((o) => o.value !== primary);
  const ordered = priority.length
    ? priority.filter((p) => p !== primary)
    : nonPrimary.map((o) => o.value);

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  /* ── HTML5 drag (desktop) ── */
  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = (idx: number) => {
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    dragIdx.current = null;
    setOverIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null); };

  /* ── Touch drag (mobile) ── */
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    dragIdx.current = idx;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIdx.current === null || !listRef.current) return;
    const y = e.touches[0].clientY;
    const items = listRef.current.querySelectorAll<HTMLElement>(`.${styles.priorityItem}`);
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setOverIdx(i);
        return;
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragIdx.current !== null && overIdx !== null && dragIdx.current !== overIdx) {
      const next = [...ordered];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx, 0, moved);
      onChange(next);
    }
    dragIdx.current = null;
    setOverIdx(null);
  };

  return (
    <div className={styles.priorityList} ref={listRef}>
      {ordered.map((val, idx) => {
        const label = options.find((o) => o.value === val)?.label ?? val;
        return (
          <div key={val} className={styles.priorityRow}>
            <Checkbox
              shape="square"
              checked={!excluded.includes(val)}
              onChange={(checked) => {
                onExcludedChange(
                  checked
                    ? excluded.filter((e) => e !== val)
                    : [...excluded, val]
                );
              }}
            />
            {/* 드래그 핸들 — priorityItem 바깥, checkbox 와 item 사이. drag 핸들러도 여기로 이동 */}
            <span
              className={styles.priorityGrip}
              data-draggable
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" />
                <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
                <circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" />
              </svg>
            </span>
            <div
              className={`${styles.priorityItem}${overIdx === idx ? ` ${styles.priorityItemOver}` : ""}`}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
            >
              <span className={styles.priorityBadge}>{idx + 1}</span>
              <span className={`${styles.priorityLabel} ${excluded.includes(val) ? styles.priorityLabelDisabled : ""}`}>{label}</span>
              <div className={styles.priorityBtns}>
                <button
                  type="button"
                  className={shared.priorityBtn}
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label="Move up"
                ><ChevronUp size={12} strokeWidth={2.5} /></button>
                <button
                  type="button"
                  className={shared.priorityBtn}
                  disabled={idx === ordered.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label="Move down"
                ><ChevronDown size={12} strokeWidth={2.5} /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}





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

function MediaLimitsEditor({ config, setConfig, t }: {
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

/* 발행 글 자동 cover 일괄 배정 — 기존 published + cover-less 글에 키워드 기반 Unsplash/Pexels 이미지 자동 배정.
   POST /api/posts/auto-cover. 결과 toast 로 표시. */
function AutoCoverMigrator({ t }: { t: TFunction }) {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ processed: number; succeeded: number; failed: number } | null>(null);
  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/posts/auto-cover", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setLastResult(data);
      showToast(
        t("admin.settings.autoCoverDone")
          .replace("{processed}", String(data.processed))
          .replace("{succeeded}", String(data.succeeded))
          .replace("{failed}", String(data.failed)),
        data.failed > 0 ? "error" : "success",
      );
    } catch {
      showToast(t("admin.settings.saveError"), "error");
    } finally {
      setRunning(false);
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2xs)", marginTop: "var(--spacing-md)" }}>
      <p className={shared.fieldHint}>{t("admin.settings.autoCoverHint")}</p>
      <div style={{ display: "flex", gap: "var(--spacing-xs)", alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="outline" size="sm" onClick={handleRun} loading={running} loadingVariant="wave">
          {t("admin.settings.autoCoverRun")}
        </Button>
        {lastResult && (
          <span className={shared.fieldHint} style={{ margin: 0 }}>
            {t("admin.settings.autoCoverResult")
              .replace("{processed}", String(lastResult.processed))
              .replace("{succeeded}", String(lastResult.succeeded))
              .replace("{failed}", String(lastResult.failed))}
          </span>
        )}
      </div>
    </div>
  );
}

interface ServicesTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

/** giscus 내장 테마 프리셋 (고정 목록). 이 외 값은 커스텀 CSS URL 로 간주. */
const GISCUS_THEME_PRESETS = [
  "light", "light_high_contrast", "light_tritanopia", "light_protanopia",
  "dark", "dark_dimmed", "dark_high_contrast", "dark_tritanopia", "dark_protanopia",
  "preferred_color_scheme", "transparent_dark", "noborder_light", "noborder_dark",
  "cobalt", "purple_dark", "catppuccin_latte", "catppuccin_mocha",
];

/** 테마 = 프리셋 Select + "커스텀" 선택 시 CSS URL 직접 입력. value 는 프리셋 이름 또는 URL 문자열. */
function GiscusThemeField({ label, value, defaultPreset, customLabel, urlPlaceholder, defaultCustomFile, onChange, help }: {
  label: string; value: string; defaultPreset: string; customLabel: string; urlPlaceholder: string; defaultCustomFile: string;
  onChange: (v: string) => void; help?: React.ReactNode;
}) {
  const isPreset = value === "" || GISCUS_THEME_PRESETS.includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const selectValue = custom ? "__custom__" : (value || defaultPreset);
  return (
    <>
      <FieldRow label={label} help={help}>
        <Select
          value={selectValue}
          options={[
            ...GISCUS_THEME_PRESETS.map((p) => ({ value: p, label: p })),
            { value: "__custom__", label: customLabel },
          ]}
          onChange={(v) => {
            if (v === "__custom__") {
              setCustom(true);
              // 프리셋→커스텀 전환 시 우리가 만들어둔 테마 CSS 절대 URL 로 기본값 채움 (현재 도메인 기준)
              if (GISCUS_THEME_PRESETS.includes(value)) {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                onChange(`${origin}/${defaultCustomFile}`);
              }
            } else {
              setCustom(false);
              onChange(v);
            }
          }}
        />
      </FieldRow>
      {custom && (
        <Field label={customLabel} value={value} onChange={onChange} placeholder={urlPlaceholder} maxHint={null} />
      )}
    </>
  );
}

export default function ServicesTab({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths, setConfig }: ServicesTabProps) {
  const { t, language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en); // giscus 필드 툴팁 inline 다국어

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, titleClassName: shared.sectionTitle };

  const giscus = config.comments?.giscus ?? { repo: "", repoId: "", category: "", categoryId: "", mapping: "pathname", reactionsEnabled: true, inputPosition: "bottom", strict: false, emitMetadata: false, lazyLoading: true, themeLight: "", themeDark: "" };
  /* comments.giscus 는 2단계 중첩이라 update("comments","giscus", 전체객체) 로 갱신 */
  const updateGiscus = <K extends keyof SiteConfigData["comments"]["giscus"]>(
    key: K,
    value: SiteConfigData["comments"]["giscus"][K],
  ) => {
    update("comments", "giscus", { ...giscus, [key]: value } as SiteConfigData["comments"]["giscus"]);
  };

  // 저장소 불러오기 — GitHub API 로 repoId + Discussion 카테고리 목록 획득 (카테고리 select 용)
  const [giscusCats, setGiscusCats] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [giscusLoading, setGiscusLoading] = useState(false);
  const [giscusErr, setGiscusErr] = useState("");
  const [needsToken, setNeedsToken] = useState(false);
  const loadGiscusRepo = async () => {
    const repo = giscus.repo?.trim();
    if (!repo) return;
    setGiscusLoading(true); setGiscusErr(""); setNeedsToken(false);
    try {
      const res = await fetch(`/api/admin/giscus-repo?repo=${encodeURIComponent(repo)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGiscusCats([]);
        if (data.needsToken) { setNeedsToken(true); setGiscusErr(""); }
        else setGiscusErr(data.error || "불러오기 실패");
        return;
      }
      setGiscusCats(data.categories ?? []);
      update("comments", "giscus", { ...giscus, repoId: data.repoId } as SiteConfigData["comments"]["giscus"]);
      if (!data.discussionsEnabled) setGiscusErr(t("admin.settings.giscusNoDiscussions"));
    } catch {
      setGiscusErr("불러오기 실패");
    } finally {
      setGiscusLoading(false);
    }
  };
  const selectGiscusCategory = (name: string) => {
    const cat = giscusCats.find((c) => c.name === name);
    update("comments", "giscus", { ...giscus, category: name, categoryId: cat?.id ?? giscus.categoryId } as SiteConfigData["comments"]["giscus"]);
  };
  // GITHUB_TOKEN env 필드로 스크롤 + 포커스 (토큰 없어 불러오기 실패했을 때)
  const goToGithubTokenField = () => {
    const el = document.getElementById("env-GITHUB_TOKEN");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLInputElement>("input")?.focus();
  };

  // 카테고리 help — Select/Field 두 케이스 공용
  const categoryHelp = L(
    "댓글 스레드가 생성될 Discussion 카테고리입니다. 관리자만 새 글을 만들 수 있는 'Announcements' 유형을 권장합니다.",
    "The Discussion category for comment threads. An 'Announcements'-type (maintainers only) is recommended.",
  );
  // 테마 help — light/dark 두 필드 공용
  const themeHelp = L(
    "giscus 프리셋을 고르거나 '커스텀 (CSS URL)'로 사이트에 맞춥니다. 커스텀 URL 은 배포된 공개 https 주소여야 합니다.",
    "Pick a giscus preset, or 'Custom (CSS URL)'. A custom URL must be a deployed public https address.",
  );

  return (
    <>
      {/* Email Service */}
      <section className={shared.section}>
        <SectionHeader title={t("admin.settings.emailSettings")} paths={["emailService"]} {...sh} />
        <div className={`${shared.fields} ${shared.fieldPair}`}>
          <p className={shared.fieldHint}>{t("admin.settings.emailFileUploadHint")}</p>
          <FieldRow label={<T k="admin.settings.emailServiceProvider" />}>
            <Select
              value={config.emailService.provider}
              options={[
                { value: "formspree", label: "Formspree" },
                { value: "web3forms", label: "Web3Forms" },
                { value: "emailjs", label: "EmailJS" },
              ]}
              onChange={(v) => update("emailService", "provider", v as SiteConfigData["emailService"]["provider"])}
            />
          </FieldRow>
          <Switch
            size="sm"
            label={t("admin.settings.emailFileUpload")}
            labelPosition="top"
            checked={config.emailService.enableFileUpload}
            onCheckedChange={(v) => update("emailService", "enableFileUpload", v)}
          />
        </div>
      </section>

      {/* Comment Notifications */}
      <section className={shared.section}>
        <SectionHeader
          title={t("admin.settings.commentNotifications")}
          paths={["commentEmailNotify"]}
          rowClassName={shared.sectionTitleRow}
          extra={
            <Switch
              size="sm"
              showStateText
              checked={config.commentEmailNotify ?? false}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, commentEmailNotify: v }))}
            />
          }
          {...sh}
        />
        <div className={shared.fields}>
          <p className={shared.fieldHint}>
            {(() => {
              const parts = t("admin.settings.commentEmailNotifyDesc").split("RESEND_API_KEY");
              return (
                <>
                  {parts[0]}
                  <button
                    type="button"
                    className={styles.envKeyLink}
                    onClick={() => {
                      const el = document.getElementById("env-RESEND_API_KEY");
                      if (!el) return;
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add(shared.envFieldHighlight);
                      /* 다음 인터랙션(클릭/키 입력) 시 highlight 제거.
                         이 버튼 자체의 click bubble 이 끝난 다음 tick 에 listener 등록. */
                      window.setTimeout(() => {
                        const clear = () => {
                          el.classList.remove(shared.envFieldHighlight);
                          document.removeEventListener("click", clear, true);
                          document.removeEventListener("keydown", clear, true);
                        };
                        document.addEventListener("click", clear, true);
                        document.addEventListener("keydown", clear, true);
                      }, 0);
                    }}
                  >
                    RESEND_API_KEY
                  </button>
                  {parts[1]}
                </>
              );
            })()}
          </p>
        </div>
      </section>

      {/* Comment System — 내장 커스텀 vs giscus */}
      <section className={shared.section}>
        <SectionHeader title={t("admin.settings.commentSystem")} paths={["comments"]} {...sh} />
        <div className={shared.fields}>
          <FieldRow label={<T k="admin.settings.commentProvider" />}>
            <SegmentedControl<"system" | "giscus">
              items={[
                { value: "system", label: t("admin.settings.commentProviderSystem") },
                { value: "giscus", label: "giscus" },
              ]}
              value={config.comments?.provider === "giscus" ? "giscus" : "system"}
              onChange={(v) => update("comments", "provider", v as SiteConfigData["comments"]["provider"])}
            />
          </FieldRow>

          {config.comments?.provider !== "giscus" && (
            <FieldRow label={t("admin.settings.giscusInputPosition")}>
              <SegmentedControl<"top" | "bottom">
                items={[
                  { value: "top", label: t("admin.settings.giscusInputTop") },
                  { value: "bottom", label: t("admin.settings.giscusInputBottom") },
                ]}
                value={config.comments?.systemInputPosition === "top" ? "top" : "bottom"}
                onChange={(v) => update("comments", "systemInputPosition", v as SiteConfigData["comments"]["systemInputPosition"])}
              />
            </FieldRow>
          )}

          {config.comments?.provider === "giscus" && (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--spacing-sm)" }}>
                <p className={shared.fieldHint} style={{ margin: 0 }}>{t("admin.settings.giscusHint")}</p>
                <GiscusHelp />
              </div>
              <Field
                label={t("admin.settings.giscusRepo")}
                value={giscus.repo}
                onChange={(v) => updateGiscus("repo", v)}
                placeholder="owner/name"
                maxHint={null}
                help={L(
                  "댓글(Discussion)이 저장될 공개 GitHub 저장소를 owner/name 형식으로 지정합니다.",
                  "The public GitHub repo (owner/name) where comments are stored as Discussions.",
                )}
              />
              {/* 저장소 불러오기 — repoId + 카테고리 목록 자동 획득 */}
              <div className={shared.fieldRow}>
                <label className={shared.fieldLabel} />
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
                  <Button variant="outline" size="sm" onClick={loadGiscusRepo} disabled={giscusLoading || !giscus.repo.trim()}>
                    {giscusLoading ? t("admin.settings.giscusLoading") : t("admin.settings.giscusLoadRepo")}
                  </Button>
                  {needsToken
                    ? <button
                        type="button"
                        onClick={goToGithubTokenField}
                        style={{ fontSize: "var(--font-size-xs)", color: "var(--text-accent)", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
                      >
                        {t("admin.settings.giscusNeedsToken")}
                      </button>
                    : giscusErr
                      ? <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-error)" }}>{giscusErr}</span>
                      : giscusCats.length > 0
                        ? <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-success)" }}>{t("admin.settings.giscusLoaded")}</span>
                        : null}
                </div>
              </div>
              {giscusCats.length > 0 ? (
                <FieldRow label={t("admin.settings.giscusCategory")} help={categoryHelp}>
                  <Select
                    value={giscus.category || ""}
                    placeholder={t("admin.settings.giscusCategoryPick")}
                    options={giscusCats.map((c) => ({ value: c.name, label: `${c.emoji ? c.emoji + " " : ""}${c.name}` }))}
                    onChange={selectGiscusCategory}
                  />
                </FieldRow>
              ) : (
                <Field
                  label={t("admin.settings.giscusCategory")}
                  value={giscus.category}
                  onChange={(v) => updateGiscus("category", v)}
                  placeholder="Announcements"
                  maxHint={null}
                  help={categoryHelp}
                />
              )}
              {/* repoId / categoryId — 불러오기로 자동 채워짐 (수동 입력 fallback 도 가능) */}
              <div className={shared.fieldPair}>
                <Field
                  label={t("admin.settings.giscusRepoId")}
                  value={giscus.repoId}
                  onChange={(v) => updateGiscus("repoId", v)}
                  placeholder="R_kgD..."
                  maxHint={null}
                  help={L(
                    "GitHub이 저장소에 부여하는 내부 식별자(R_…)입니다. GITHUB_TOKEN 을 설정하고 위 '저장소 불러오기'를 누르면 자동으로 채워집니다. (또는 giscus.app 스크립트의 data-repo-id 값을 직접 붙여넣어도 됩니다.)",
                    "GitHub's internal repo ID (R_…). It fills in automatically after you set GITHUB_TOKEN and click 'Load repository' above. (Or paste the data-repo-id from the giscus.app script.)",
                  )}
                />
                <Field
                  label={t("admin.settings.giscusCategoryId")}
                  value={giscus.categoryId}
                  onChange={(v) => updateGiscus("categoryId", v)}
                  placeholder="DIC_kwD..."
                  maxHint={null}
                  help={L(
                    "카테고리의 내부 식별자(DIC_…)입니다. '저장소 불러오기' 후 위에서 카테고리를 선택하면 자동으로 채워집니다. (또는 giscus.app 스크립트의 data-category-id 값을 직접 붙여넣어도 됩니다.)",
                    "The category's internal ID (DIC_…). It fills in when you pick a category above after loading the repository. (Or paste the data-category-id from the giscus.app script.)",
                  )}
                />
              </div>
              <FieldRow label={<T k="admin.settings.giscusMapping" />} help={L(
                "페이지와 Discussion 을 연결하는 방식입니다. pathname(경로)을 권장하며, 글 제목을 바꿔도 댓글이 유지됩니다.",
                "How pages map to Discussions. pathname is recommended — comments survive title edits.",
              )}>
                <Select
                  value={giscus.mapping || "pathname"}
                  options={[
                    { value: "pathname", label: "pathname" },
                    { value: "url", label: "url" },
                    { value: "title", label: "title" },
                    { value: "og:title", label: "og:title" },
                  ]}
                  onChange={(v) => updateGiscus("mapping", v as SiteConfigData["comments"]["giscus"]["mapping"])}
                />
              </FieldRow>
              <FieldRow label={<T k="admin.settings.giscusInputPosition" />} help={L(
                "댓글 입력창을 목록 위/아래 중 어디에 둘지 선택합니다.",
                "Whether the comment box sits above or below the list.",
              )}>
                <SegmentedControl<"top" | "bottom">
                  items={[
                    { value: "top", label: t("admin.settings.giscusInputTop") },
                    { value: "bottom", label: t("admin.settings.giscusInputBottom") },
                  ]}
                  value={giscus.inputPosition === "top" ? "top" : "bottom"}
                  onChange={(v) => updateGiscus("inputPosition", v as SiteConfigData["comments"]["giscus"]["inputPosition"])}
                />
              </FieldRow>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusReactions")}
                  checked={giscus.reactionsEnabled !== false}
                  onCheckedChange={(v) => updateGiscus("reactionsEnabled", v)}
                />
                <FieldHelp content={L(
                  "Discussion 메인 글의 이모지 반응을 댓글 위에 표시합니다.",
                  "Shows the main post's emoji reactions above comments.",
                )} />
              </div>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusStrict")}
                  checked={giscus.strict === true}
                  onCheckedChange={(v) => updateGiscus("strict", v)}
                />
                <FieldHelp content={L(
                  "비슷한 경로가 섞이지 않도록 페이지와 Discussion 을 더 엄격하게 매칭합니다.",
                  "Matches pages and Discussions more strictly to avoid collisions.",
                )} />
              </div>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusEmitMetadata")}
                  checked={giscus.emitMetadata === true}
                  onCheckedChange={(v) => updateGiscus("emitMetadata", v)}
                />
                <FieldHelp content={L(
                  "Discussion 메타데이터를 부모 페이지로 전달합니다. 보통 꺼 두어도 됩니다.",
                  "Sends Discussion metadata to the parent page. Usually fine to leave off.",
                )} />
              </div>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusLazyLoading")}
                  checked={giscus.lazyLoading !== false}
                  onCheckedChange={(v) => updateGiscus("lazyLoading", v)}
                />
                <FieldHelp content={L(
                  "댓글 영역이 화면에 들어올 때 로드하여 초기 로딩을 아낍니다. 켜 두기를 권장합니다.",
                  "Loads comments when scrolled into view, saving initial load. Recommended on.",
                )} />
              </div>
              <GiscusThemeField
                label={t("admin.settings.giscusThemeLight")}
                value={giscus.themeLight ?? ""}
                defaultPreset="light"
                customLabel={t("admin.settings.giscusThemeCustom")}
                urlPlaceholder="https://.../giscus-theme-light.css"
                defaultCustomFile="giscus-theme-light.css"
                onChange={(v) => updateGiscus("themeLight", v)}
                help={themeHelp}
              />
              <GiscusThemeField
                label={t("admin.settings.giscusThemeDark")}
                value={giscus.themeDark ?? ""}
                defaultPreset="dark"
                customLabel={t("admin.settings.giscusThemeCustom")}
                urlPlaceholder="https://.../giscus-theme-dark.css"
                defaultCustomFile="giscus-theme-dark.css"
                onChange={(v) => updateGiscus("themeDark", v)}
                help={themeHelp}
              />
            </>
          )}
        </div>
      </section>

      {/* Security */}
      <section className={shared.section}>
        <SectionHeader
          title={t("admin.settings.securitySettings")}
          paths={["recaptcha"]}
          rowClassName={shared.sectionTitleRow}
          extra={
            <Switch
              size="sm"
              showStateText
              checked={config.recaptcha.enabled}
              onCheckedChange={(v) => update("recaptcha", "enabled", v)}
            />
          }
          {...sh}
        />
        <div className={shared.fields}>
          <FieldRow label={<T k="admin.settings.recaptchaVersion" />}>
            <Select
              value={config.recaptcha.version}
              options={[
                { value: "v2", label: "v2 (Checkbox)" },
                { value: "v3", label: "v3 (Invisible)" },
              ]}
              onChange={(v) => update("recaptcha", "version", v as SiteConfigData["recaptcha"]["version"])}
            />
          </FieldRow>
        </div>
      </section>

      {/* Media Upload — 좌측에 3행 span, 우측에 AI 3개 (커버/요약/번역) 배치 */}
      <section className={shared.section} style={{ gridColumnStart: 1, gridRow: "span 3", borderBottom: "none" }}>
        <SectionHeader title={t("admin.settings.mediaUpload")} paths={["media"]} {...sh} />
        <ul className={shared.sectionHintList}>
          <li>{t("admin.settings.mediaUploadHint")}</li>
          <li>{t("admin.settings.mediaUploadDescDnD")}</li>
        </ul>
        <MediaLimitsEditor config={config} setConfig={setConfig} t={t} />
      </section>

      {/* AI Cover */}
      <section className={shared.section} style={{ borderBottom: "none" }}>
        <SectionHeader
          title={t("admin.settings.aiSettings")}
          paths={["aiCover"]}
          rowClassName={shared.sectionTitleRow}
          extra={
            <Switch
              size="sm"
              showStateText
              checked={config.aiCover?.enabled !== false}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, aiCover: { ...prev.aiCover, enabled: v } }))}
            />
          }
          {...sh}
        />
        <div className={`${shared.fields} ${shared.fieldPair}`}>
          <FieldRow label={<T k="admin.settings.aiCoverProvider" />}>
            <Select
              value={config.aiCover.provider}
              options={AI_COVER_OPTIONS}
              onChange={(v) => {
                const newProvider = v as AICoverProvider;
                setConfig((prev) => {
                  const oldProvider = (prev.aiCover?.provider ?? "nanobanana") as AICoverProvider;
                  const oldPriority = (prev.aiCover?.fallback?.priority ?? []) as AICoverProvider[];
                  const newPriority = [
                    ...oldPriority.filter((p) => p !== newProvider),
                    ...(oldPriority.includes(oldProvider) ? [] : [oldProvider]),
                  ].filter((p) => p !== newProvider);
                  return {
                    ...prev,
                    aiCover: {
                      ...prev.aiCover,
                      provider: newProvider,
                      fallback: prev.aiCover?.fallback ? { ...prev.aiCover.fallback, priority: newPriority } : prev.aiCover?.fallback,
                    },
                  };
                });
              }}
            />
          </FieldRow>
          <Switch
            size="sm"
            showStateText
            label={t("admin.settings.fallbackEnabled")}
            labelPosition="top"
            checked={config.aiCover?.fallback?.enabled ?? false}
            onCheckedChange={(v) => {
              const defaultPriority = AI_COVER_OPTIONS
                .filter((o) => o.value !== (config.aiCover?.provider ?? "nanobanana"))
                .map((o) => o.value) as AICoverProvider[];
              setConfig((prev) => ({
                ...prev,
                aiCover: {
                  ...prev.aiCover,
                  fallback: {
                    enabled: v,
                    priority: prev.aiCover?.fallback?.priority?.length
                      ? prev.aiCover.fallback.priority
                      : defaultPriority,
                    excluded: prev.aiCover?.fallback?.excluded ?? [],
                  },
                },
              }));
            }}
          />
          {(config.aiCover?.fallback?.enabled) && (
            <div className={shared.fallbackSection}>
              <PriorityList<AICoverProvider>
                primary={(config.aiCover?.provider ?? "nanobanana") as AICoverProvider}
                priority={(config.aiCover?.fallback?.priority ?? []) as AICoverProvider[]}
                excluded={(config.aiCover?.fallback?.excluded ?? []) as AICoverProvider[]}
                options={AI_COVER_OPTIONS}
                onChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiCover: {
                      ...prev.aiCover,
                      fallback: { ...prev.aiCover?.fallback, enabled: true, priority: next },
                    },
                  }))
                }
                onExcludedChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiCover: {
                      ...prev.aiCover,
                      fallback: { ...prev.aiCover?.fallback, enabled: true, excluded: next },
                    },
                  }))
                }
              />
            </div>
          )}

          {/* 자동 cover (Unsplash/Pexels 키워드 기반) — 기존 발행 글 일괄 적용 */}
          <AutoCoverMigrator t={t} />
        </div>
      </section>

      {/* AI Summary */}
      <section className={shared.section}>
        <SectionHeader
          title={t("admin.settings.aiSummarySettings")}
          paths={["aiSummary"]}
          rowClassName={shared.sectionTitleRow}
          extra={
            <Switch
              size="sm"
              showStateText
              checked={config.aiSummary?.enabled !== false}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, aiSummary: { ...prev.aiSummary, enabled: v } }))}
            />
          }
          {...sh}
        />
        <div className={`${shared.fields} ${shared.fieldPair}`}>
          <FieldRow label={<T k="admin.settings.aiSummaryProvider" />}>
            <Select
              value={config.aiSummary?.provider ?? "gemini"}
              options={AI_SUMMARY_OPTIONS}
              onChange={(v) => {
                const newProvider = v as AISummaryProvider;
                setConfig((prev) => {
                  const oldProvider = (prev.aiSummary?.provider ?? "gemini") as AISummaryProvider;
                  const oldPriority = (prev.aiSummary?.fallback?.priority ?? []) as AISummaryProvider[];
                  const newPriority = [
                    ...oldPriority.filter((p) => p !== newProvider),
                    ...(oldPriority.includes(oldProvider) ? [] : [oldProvider]),
                  ].filter((p) => p !== newProvider);
                  return {
                    ...prev,
                    aiSummary: {
                      ...prev.aiSummary,
                      provider: newProvider,
                      fallback: prev.aiSummary?.fallback ? { ...prev.aiSummary.fallback, priority: newPriority } : prev.aiSummary?.fallback,
                    },
                  };
                });
              }}
            />
          </FieldRow>
          <Switch
            size="sm"
            label={t("admin.settings.fallbackEnabled")}
            labelPosition="top"
            checked={config.aiSummary?.fallback?.enabled ?? false}
            onCheckedChange={(v) => {
              const defaultPriority = AI_SUMMARY_OPTIONS
                .filter((o) => o.value !== (config.aiSummary?.provider ?? "gemini"))
                .map((o) => o.value) as AISummaryProvider[];
              setConfig((prev) => ({
                ...prev,
                aiSummary: {
                  ...prev.aiSummary,
                  fallback: {
                    enabled: v,
                    priority: prev.aiSummary?.fallback?.priority?.length
                      ? prev.aiSummary.fallback.priority
                      : defaultPriority,
                    excluded: prev.aiSummary?.fallback?.excluded ?? [],
                  },
                },
              }));
            }}
          />
          {(config.aiSummary?.fallback?.enabled) && (
            <div className={shared.fallbackSection}>
              <PriorityList<AISummaryProvider>
                primary={(config.aiSummary?.provider ?? "gemini") as AISummaryProvider}
                priority={(config.aiSummary?.fallback?.priority ?? []) as AISummaryProvider[]}
                excluded={(config.aiSummary?.fallback?.excluded ?? []) as AISummaryProvider[]}
                options={AI_SUMMARY_OPTIONS}
                onChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiSummary: {
                      ...prev.aiSummary,
                      fallback: { ...prev.aiSummary?.fallback, enabled: true, priority: next },
                    },
                  }))
                }
                onExcludedChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiSummary: {
                      ...prev.aiSummary,
                      fallback: { ...prev.aiSummary?.fallback, enabled: true, excluded: next },
                    },
                  }))
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* Translation */}
      <section className={shared.section} style={{ borderBottom: "none" }}>
        <SectionHeader
          title={t("admin.settings.translationSettings")}
          paths={["translation"]}
          rowClassName={shared.sectionTitleRow}
          extra={
            <Switch
              size="sm"
              showStateText
              checked={config.translation?.enabled !== false}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, translation: { ...prev.translation, enabled: v } }))}
            />
          }
          {...sh}
        />
        <div className={`${shared.fields} ${shared.fieldPair}`}>
          <FieldRow label={<T k="admin.settings.translationProvider" />}>
            <Select
              value={config.translation?.provider ?? "deepl"}
              options={TRANSLATION_OPTIONS}
              onChange={(v) => {
                const newProvider = v as TranslationProvider;
                setConfig((prev) => {
                  const oldProvider = (prev.translation?.provider ?? "deepl") as TranslationProvider;
                  const oldPriority = (prev.translation?.fallback?.priority ?? []) as TranslationProvider[];
                  const newPriority = [
                    ...oldPriority.filter((p) => p !== newProvider),
                    ...(oldPriority.includes(oldProvider) ? [] : [oldProvider]),
                  ].filter((p) => p !== newProvider);
                  return {
                    ...prev,
                    translation: {
                      ...prev.translation,
                      provider: newProvider,
                      fallback: prev.translation?.fallback ? { ...prev.translation.fallback, priority: newPriority } : prev.translation?.fallback,
                    },
                  };
                });
              }}
            />
          </FieldRow>
          <Switch
            size="sm"
            label={t("admin.settings.fallbackEnabled")}
            labelPosition="top"
            checked={config.translation?.fallback?.enabled ?? false}
            onCheckedChange={(v) => {
              const defaultPriority = TRANSLATION_OPTIONS
                .filter((o) => o.value !== (config.translation?.provider ?? "deepl"))
                .map((o) => o.value) as TranslationProvider[];
              setConfig((prev) => ({
                ...prev,
                translation: {
                  ...prev.translation,
                  fallback: {
                    enabled: v,
                    priority: prev.translation?.fallback?.priority?.length
                      ? prev.translation.fallback.priority
                      : defaultPriority,
                    excluded: prev.translation?.fallback?.excluded ?? [],
                  },
                },
              }));
            }}
          />
          {(config.translation?.fallback?.enabled) && (
            <div className={shared.fallbackSection}>
              <PriorityList<TranslationProvider>
                primary={(config.translation?.provider ?? "deepl") as TranslationProvider}
                priority={(config.translation?.fallback?.priority ?? []) as TranslationProvider[]}
                excluded={(config.translation?.fallback?.excluded ?? []) as TranslationProvider[]}
                options={TRANSLATION_OPTIONS}
                onChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      fallback: { ...prev.translation?.fallback, enabled: true, priority: next },
                    },
                  }))
                }
                onExcludedChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      fallback: { ...prev.translation?.fallback, enabled: true, excluded: next },
                    },
                  }))
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* Environment Variables — 자체 PATCH API 로 별도 저장. SectionHeader 는 EnvVarFields 내부에서 customActions 로 렌더 → 액션 버튼이 title 라인에 위치. */}
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <EnvVarFields
          provider={config.emailService.provider}
          aiProvider={config.aiCover.provider}
          aiProviderFallbacks={config.aiCover?.fallback?.enabled ? (config.aiCover.fallback.priority ?? []) as string[] : []}
          recaptchaEnabled={config.recaptcha.enabled}
          translateProvider={config.translation?.provider ?? "deepl"}
          translateFallbacks={config.translation?.fallback?.enabled ? (config.translation.fallback.priority ?? []) as string[] : []}
          commentEmailNotify={config.commentEmailNotify ?? false}
          summaryProvider={config.aiSummary?.provider ?? "gemini"}
          summaryFallbacks={config.aiSummary?.fallback?.enabled ? (config.aiSummary.fallback.priority ?? []) as string[] : []}
          giscusEnabled={config.comments?.provider === "giscus"}
          sectionHeader={{
            title: t("admin.settings.envVars"),
            config: sh.config,
            savedConfig: sh.savedConfig,
            saveSection: sh.saveSection,
            savingPaths: sh.savingPaths,
            titleClassName: shared.sectionTitle,
          }}
        />
      </section>
    </>
  );
}
