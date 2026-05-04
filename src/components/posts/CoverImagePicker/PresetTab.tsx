"use client";

import { useRef, useEffect, useState } from "react";
import { presets, type CoverPreset } from "./presets";
import CustomGradientEditor from "./CustomGradientEditor";
import { renderGradient, type PresetConfig } from "./gradientUtils";
import { extractPalette } from "@/components/admin/CoverImageField/extractPalette";
import styles from "./CoverImagePicker.module.css";

interface PresetTabProps {
  onSelect: (url: string, name: string) => void;
  /** 이미지 업로드로 색 추출 시 — 부모가 history 에 추가 */
  onImageUploaded?: (url: string, name: string) => void;
  /** 현재 cover URL — 사용자가 따로 편집 안 한 초기 상태에서 이 이미지 색상으로 stops seed */
  currentUrl?: string;
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
    <button
      type="button"
      className={`${styles.presetItem} ${active ? styles.presetItemActive : ""}`}
      onClick={() => onLoad(preset.config, preset.name)}
      title={preset.name}
    >
      <canvas ref={canvasRef} />
      <span className={styles.presetName}>{preset.name}</span>
    </button>
  );
}

export default function PresetTab({ onSelect, onImageUploaded, currentUrl }: PresetTabProps) {
  // editor state — preset 클릭 시 여기를 update → CustomGradientEditor 가 controlled props 로 받음
  const [config, setConfig] = useState<PresetConfig>(presets[0].config);
  const [activeId, setActiveId] = useState<string | null>(null);
  // 사용자가 직접 편집 시작했는지 추적 — 시작했으면 currentUrl seed 효과 비활성
  const userEditedRef = useRef(false);

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
