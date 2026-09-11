"use client";

import { useRef, useEffect, useState } from "react";
import { Check, FolderOpen, Palette } from "@/components/icons";
import { presets, type CoverPreset } from "./presets";
import CustomGradientEditor from "./CustomGradientEditor";
import { renderGradient, type PresetConfig } from "./gradientUtils";
import { extractPalette } from "@/components/admin/CoverImageField/extractPalette";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./CoverImagePicker.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

interface LocalFile {
  url: string;
  name: string;
  sizeBytes: number;
}

interface PresetTabProps {
  onSelect: (url: string, name: string) => void;
  /** 이미지 업로드로 색 추출 시 — 부모가 history 에 추가 */
  onImageUploaded?: (url: string, name: string) => void;
  /** 현재 cover URL — 사용자가 따로 편집 안 한 초기 상태에서 이 이미지 색상으로 stops seed */
  currentUrl?: string;
  /** 로컬 파일 endpoint — 지정 시 grid 맨 앞에 preset 스타일로 표시 */
  localFilesEndpoint?: string;
  /** 로컬 파일 섹션 hint */
  localFilesHint?: string;
}

/** 로컬 파일 셀 — preset 스타일에 맞춰 16:9, 이름 overlay. */
function LocalFileCard({
  file,
  onSelect,
  active,
}: {
  file: LocalFile;
  onSelect: (url: string, name: string) => void;
  active: boolean;
}) {
  const video = isVideoUrl(file.url);
  return (
    <Pressable noTapScale
      className={`${styles.presetItem} ${active ? styles.presetItemActive : ""}`}
      onClick={() => onSelect(file.url, file.name)}
      title={file.name}
    >
      {video ? (
        <video
          src={file.url}
          muted
          playsInline
          preload="metadata"
          onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={file.url}
          alt={file.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
      {active && (
        <span className={styles.localFileActiveCheck} aria-hidden>
          <Check size={11} strokeWidth={3} />
        </span>
      )}
      <span className={styles.presetName}>{file.name}</span>
    </Pressable>
  );
}

/** preset 셀 — config 를 canvas 에 thumbnail 렌더. 클릭 시 onLoad 로 editor 에 전달 */
function PresetCard({
  preset,
  onLoad,
  active,
}: {
  preset: CoverPreset;
  onLoad: (config: PresetConfig, name: string) => void;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 240;
    canvas.height = 135;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderGradient(ctx, 240, 135, preset.config);
  }, [preset]);

  return (
    <Pressable noTapScale
      className={`${styles.presetItem} ${active ? styles.presetItemActive : ""}`}
      onClick={() => onLoad(preset.config, preset.name)}
      title={preset.name}
    >
      <canvas ref={canvasRef} />
      <span className={styles.presetName}>{preset.name}</span>
    </Pressable>
  );
}

export default function PresetTab({ onSelect, onImageUploaded, currentUrl, localFilesEndpoint, localFilesHint }: PresetTabProps) {
  const { t } = useLanguage();
  // editor state — preset 클릭 시 여기를 update → CustomGradientEditor 가 controlled props 로 받음
  const [config, setConfig] = useState<PresetConfig>(presets[0].config);
  const [activeId, setActiveId] = useState<string | null>(null);
  // 사용자가 직접 편집 시작했는지 추적 — 시작했으면 currentUrl seed 효과 비활성
  const userEditedRef = useRef(false);

  // 로컬 파일 fetch
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  useEffect(() => {
    if (!localFilesEndpoint) return;
    let cancelled = false;
    fetch(localFilesEndpoint)
      .then((r) => r.ok ? r.json() : { files: [] })
      .then((d) => { if (!cancelled) setLocalFiles(d.files ?? d.videos ?? []); })
      .catch(() => { if (!cancelled) setLocalFiles([]); });
    return () => { cancelled = true; };
  }, [localFilesEndpoint]);

  // ── currentUrl 기반 초기 seed ──
  // 마운트 시 한 번 — currentUrl 이 있고 사용자가 아직 편집하지 않은 상태면
  // 해당 이미지에서 palette 추출해 stops 로 사용 (linear gradient default).
  // CORS / 로드 실패 시 presets[0] 유지.
  useEffect(() => {
    if (!currentUrl) return;
    let cancelled = false;
    extractPalette(currentUrl, 5)
      .then((colors) => {
        if (cancelled || userEditedRef.current) return;
        if (colors.length < 2) return;
        const limited = colors.slice(0, 4);
        setConfig({
          type: "linear",
          angle: 135,
          size: 1,
          speed: 1,
          stops: limited.map((color, i) => ({
            color,
            pos: limited.length === 1 ? 0.5 : i / (limited.length - 1),
          })),
        });
      })
      .catch(() => {/* 무시 — presets[0] default */});
    return () => { cancelled = true; };
  }, [currentUrl]);

  const handleLoad = (cfg: PresetConfig, _name: string) => {
    userEditedRef.current = true;
    setConfig(cfg);
    // active 표시 — id 매칭으로 찾음
    const matched = presets.find((p) => p.config === cfg);
    setActiveId(matched?.id ?? null);
  };

  return (
    <>
      <CustomGradientEditor
        config={config}
        onConfigChange={(c) => {
          userEditedRef.current = true;
          setConfig(c);
          setActiveId(null); /* manual edit → preset active 해제 */
        }}
        onSelect={onSelect}
        onImageUploaded={onImageUploaded}
      />
      {localFiles.length > 0 && (
        <>
          <div className={styles.presetSectionHeader}>
            <span className={styles.presetSectionLabel}>
              <FolderOpen size={11} strokeWidth={2} />
              {t("admin.posts.coverPicker.localMedia")} <span className={styles.presetSectionCount}>{localFiles.length}</span>
            </span>
          </div>
          {localFilesHint && <p className={styles.presetSectionHint}>{localFilesHint}</p>}
          <div className={styles.presetGrid}>
            {localFiles.map((file) => (
              <LocalFileCard
                key={file.url}
                file={file}
                onSelect={onSelect}
                active={currentUrl === file.url}
              />
            ))}
          </div>
        </>
      )}
      <div className={styles.presetSectionHeader}>
        <span className={styles.presetSectionLabel}>
          <Palette size={11} strokeWidth={2} />
          {t("admin.posts.coverPicker.gradientPresets")} <span className={styles.presetSectionCount}>{presets.length}</span>
        </span>
      </div>
      <div className={styles.presetGrid}>
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onLoad={handleLoad}
            active={activeId === preset.id}
          />
        ))}
      </div>
    </>
  );
}
