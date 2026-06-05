"use client";

import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { ChevronUp, ChevronDown, ImageIcon, Video, Music, FileText, Archive, File, Plus, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { SiteConfigData } from "@/config/site.config";
import { Switch } from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import type { SettingsTabProps } from "../_types";
import EnvVarFields from "./EnvVarFields";
import SectionHeader from "./SectionHeader";
import { showToast } from "@/stores/toastStore";
import styles from "../Settings.module.css";

type AICoverProvider = "nanobanana" | "huggingface";
type AISummaryProvider = "gemini" | "openai" | "claude";
type TranslationProvider = "gemini" | "google" | "deepl" | "claude";

const AI_COVER_OPTIONS: { value: AICoverProvider; label: string }[] = [
  { value: "nanobanana", label: "NanoBanana (Gemini)" },
  { value: "huggingface", label: "Hugging Face (FLUX)" },
];

const AI_SUMMARY_OPTIONS: { value: AISummaryProvider; label: string }[] = [
  { value: "gemini", label: "Gemini 2.0 Flash" },
  { value: "openai", label: "OpenAI GPT-4o mini" },
  { value: "claude", label: "Claude Haiku 4.5" },
];

const TRANSLATION_OPTIONS: { value: TranslationProvider; label: string }[] = [
  { value: "gemini", label: "Gemini 2.0 Flash" },
  { value: "google", label: "Google Cloud Translation" },
  { value: "deepl", label: "DeepL API Free" },
  { value: "claude", label: "Claude Haiku 4.5" },
];

interface PriorityListProps<T extends string> {
  primary: T;
  priority: T[];
  excluded: T[];
  options: { value: T; label: string }[];
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
                  className={styles.priorityBtn}
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label="Move up"
                ><ChevronUp size={12} strokeWidth={2.5} /></button>
                <button
                  type="button"
                  className={styles.priorityBtn}
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

type MimeGroupKey = "image" | "video" | "audio" | "document" | "archive";
const DEFAULT_LIMIT_GROUPS: { label: string; key: string; keys?: string[]; group: MimeGroupKey }[] = [
  // image
  { label: "JPEG / PNG / WebP", key: "image/jpeg", keys: ["image/jpeg", "image/png", "image/webp"], group: "image" },
  { label: "SVG", key: "image/svg+xml", group: "image" },
  { label: "GIF", key: "image/gif", group: "image" },
  // video — MOV (iOS 흔함) 추가
  { label: "MP4 / WebM / MOV", key: "video/mp4", keys: ["video/mp4", "video/webm", "video/quicktime"], group: "video" },
  // audio
  { label: "Audio (MP3/WAV/OGG)", key: "audio/mpeg", keys: ["audio/mpeg", "audio/wav", "audio/ogg"], group: "audio" },
  // document — 흔히 쓰는 텍스트/Office 모두 built-in 으로 승격
  { label: "PDF", key: "application/pdf", group: "document" },
  { label: "DOCX", key: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", group: "document" },
  { label: "XLSX", key: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", group: "document" },
  { label: "PPTX", key: "application/vnd.openxmlformats-officedocument.presentationml.presentation", group: "document" },
  { label: "TXT / MD / CSV", key: "text/plain", keys: ["text/plain", "text/markdown", "text/csv"], group: "document" },
  // archive
  { label: "ZIP", key: "application/zip", group: "archive" },
];

const MIME_GROUP_ORDER: MimeGroupKey[] = ["image", "video", "audio", "document", "archive"];
const _MIME_GROUP_LABEL_KEY: Record<MimeGroupKey, string> = {
  image: "admin.settings.mimeGroupImage",
  video: "admin.settings.mimeGroupVideo",
  audio: "admin.settings.mimeGroupAudio",
  document: "admin.settings.mimeGroupDocument",
  archive: "admin.settings.mimeGroupArchive",
};
const MIME_GROUP_ICON: Record<MimeGroupKey | "other", LucideIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: File,
};
const MIME_ADDABLE_GROUP_KEY: Record<string, MimeGroupKey> = {
  "admin.settings.mimeGroupImage": "image",
  "admin.settings.mimeGroupVideo": "video",
  "admin.settings.mimeGroupAudio": "audio",
  "admin.settings.mimeGroupDocument": "document",
  "admin.settings.mimeGroupArchive": "archive",
};

const SIZE_OPTIONS = [
  { value: "1", label: "1 MB" },
  { value: "2", label: "2 MB" },
  { value: "5", label: "5 MB" },
  { value: "10", label: "10 MB" },
  { value: "20", label: "20 MB" },
  { value: "50", label: "50 MB" },
  { value: "100", label: "100 MB" },
];

const ADDABLE_MIME_GROUPS: { labelKey: string; targetKey: string; mimes: { value: string; label: string }[] }[] = [
  {
    labelKey: "admin.settings.mimeGroupImage",
    targetKey: "image/jpeg",
    mimes: [
      { value: "image/avif", label: "AVIF" },
      { value: "image/bmp", label: "BMP" },
      { value: "image/heic", label: "HEIC" },
      { value: "image/tiff", label: "TIFF" },
    ],
  },
  {
    labelKey: "admin.settings.mimeGroupVideo",
    targetKey: "video/mp4",
    mimes: [
      { value: "video/AV1", label: "WebM AV1" },
      { value: "video/H265", label: "HEVC" },
    ],
  },
  {
    labelKey: "admin.settings.mimeGroupAudio",
    targetKey: "audio/mpeg",
    mimes: [
      { value: "audio/flac", label: "FLAC" },
      { value: "audio/x-m4a", label: "M4A" },
    ],
  },
  {
    labelKey: "admin.settings.mimeGroupDocument",
    targetKey: "application/pdf",
    mimes: [
      { value: "application/epub+zip", label: "EPUB" },
      { value: "application/json", label: "JSON" },
      /* 레거시 binary Office (DOC/XLS/PPT) — 거의 안 쓰이지만 호환성 위해 addable 로 유지 */
      { value: "application/msword", label: "DOC" },
      { value: "application/vnd.ms-excel", label: "XLS" },
      { value: "application/vnd.ms-powerpoint", label: "PPT" },
    ],
  },
  {
    labelKey: "admin.settings.mimeGroupArchive",
    targetKey: "application/zip",
    mimes: [
      { value: "application/x-rar-compressed", label: "RAR" },
      { value: "application/x-7z-compressed", label: "7Z" },
      { value: "application/gzip", label: "GZ" },
    ],
  },
];

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
  t: (k: string) => string;
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
                className={`${styles.sizeChip} ${shakeKey === f.key ? styles.sizeChipShake : ""}`}
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
  t: (k: string) => string;
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
        <button type="button" className={styles.customMimeAddBtn} onClick={handleAdd}>
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
function AutoCoverMigrator({ t }: { t: (k: string) => string }) {
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
      <p className={styles.fieldHint}>{t("admin.settings.autoCoverHint")}</p>
      <div style={{ display: "flex", gap: "var(--spacing-xs)", alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="outline" size="sm" onClick={handleRun} loading={running} loadingVariant="wave">
          {t("admin.settings.autoCoverRun")}
        </Button>
        {lastResult && (
          <span className={styles.fieldHint} style={{ margin: 0 }}>
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

export default function ServicesTab({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths, setConfig }: ServicesTabProps) {
  const { t } = useLanguage();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, titleClassName: styles.sectionTitle };

  return (
    <>
      {/* Email Service */}
      <section className={styles.section}>
        <SectionHeader title={t("admin.settings.emailSettings")} paths={["emailService"]} {...sh} />
        <div className={`${styles.fields} ${styles.fieldPair}`}>
          <p className={styles.fieldHint}>{t("admin.settings.emailFileUploadHint")}</p>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.emailServiceProvider" /></label>
            <Select
              value={config.emailService.provider}
              options={[
                { value: "formspree", label: "Formspree" },
                { value: "web3forms", label: "Web3Forms" },
                { value: "emailjs", label: "EmailJS" },
              ]}
              onChange={(v) => update("emailService", "provider", v as SiteConfigData["emailService"]["provider"])}
            />
          </div>
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
      <section className={styles.section}>
        <SectionHeader
          title={t("admin.settings.commentNotifications")}
          paths={["commentEmailNotify"]}
          rowClassName={styles.sectionTitleRow}
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
        <div className={styles.fields}>
          <p className={styles.fieldHint}>
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
                      el.classList.add(styles.envFieldHighlight);
                      /* 다음 인터랙션(클릭/키 입력) 시 highlight 제거.
                         이 버튼 자체의 click bubble 이 끝난 다음 tick 에 listener 등록. */
                      window.setTimeout(() => {
                        const clear = () => {
                          el.classList.remove(styles.envFieldHighlight);
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

      {/* Security */}
      <section className={styles.section}>
        <SectionHeader
          title={t("admin.settings.securitySettings")}
          paths={["recaptcha"]}
          rowClassName={styles.sectionTitleRow}
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
        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.recaptchaVersion" /></label>
            <Select
              value={config.recaptcha.version}
              options={[
                { value: "v2", label: "v2 (Checkbox)" },
                { value: "v3", label: "v3 (Invisible)" },
              ]}
              onChange={(v) => update("recaptcha", "version", v as SiteConfigData["recaptcha"]["version"])}
            />
          </div>
        </div>
      </section>

      {/* Media Upload — 좌측에 3행 span, 우측에 AI 3개 (커버/요약/번역) 배치 */}
      <section className={styles.section} style={{ gridColumnStart: 1, gridRow: "span 3", borderBottom: "none" }}>
        <SectionHeader title={t("admin.settings.mediaUpload")} paths={["media"]} {...sh} />
        <ul className={styles.sectionHintList}>
          <li>{t("admin.settings.mediaUploadHint")}</li>
          <li>{t("admin.settings.mediaUploadDescDnD")}</li>
        </ul>
        <MediaLimitsEditor config={config} setConfig={setConfig} t={t} />
      </section>

      {/* AI Cover */}
      <section className={styles.section} style={{ borderBottom: "none" }}>
        <SectionHeader
          title={t("admin.settings.aiSettings")}
          paths={["aiCover"]}
          rowClassName={styles.sectionTitleRow}
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
        <div className={`${styles.fields} ${styles.fieldPair}`}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.aiCoverProvider" /></label>
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
          </div>
          <Switch
            size="sm"
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
            <div className={styles.fallbackSection}>
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
      <section className={styles.section}>
        <SectionHeader
          title={t("admin.settings.aiSummarySettings")}
          paths={["aiSummary"]}
          rowClassName={styles.sectionTitleRow}
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
        <div className={`${styles.fields} ${styles.fieldPair}`}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.aiSummaryProvider" /></label>
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
          </div>
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
            <div className={styles.fallbackSection}>
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
      <section className={styles.section} style={{ borderBottom: "none" }}>
        <SectionHeader
          title={t("admin.settings.translationSettings")}
          paths={["translation"]}
          rowClassName={styles.sectionTitleRow}
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
        <div className={`${styles.fields} ${styles.fieldPair}`}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.translationProvider" /></label>
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
          </div>
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
            <div className={styles.fallbackSection}>
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
      <section className={`${styles.section} ${styles.sectionWide}`}>
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
          sectionHeader={{
            title: t("admin.settings.envVars"),
            config: sh.config,
            savedConfig: sh.savedConfig,
            saveSection: sh.saveSection,
            savingPaths: sh.savingPaths,
            titleClassName: styles.sectionTitle,
          }}
        />
      </section>
    </>
  );
}
