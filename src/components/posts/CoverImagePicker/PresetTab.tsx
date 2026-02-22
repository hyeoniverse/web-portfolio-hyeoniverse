"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { presets, type CoverPreset } from "./presets";
import styles from "./CoverImagePicker.module.css";

interface PresetTabProps {
  onSelect: (url: string) => void;
}

function PresetCard({
  preset,
  onSelect,
}: {
  preset: CoverPreset;
  onSelect: (url: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Thumbnail size
    canvas.width = 240;
    canvas.height = 126;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    preset.render(ctx, 240, 126);
  }, [preset]);

  const handleClick = useCallback(async () => {
    setUploading(true);
    try {
      // Full-size render
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      preset.render(ctx, 1200, 630);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", new File([blob], `cover-${preset.id}.png`, { type: "image/png" }));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSelect(data.url);
    } catch (err) {
      console.error("Preset upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, [preset, onSelect]);

  return (
    <button
      type="button"
      className={`${styles.presetItem} ${uploading ? styles.presetUploading : ""}`}
      onClick={handleClick}
      disabled={uploading}
    >
      <canvas ref={canvasRef} />
      <span className={styles.presetName}>
        {uploading ? "Uploading..." : preset.name}
      </span>
    </button>
  );
}

export default function PresetTab({ onSelect }: PresetTabProps) {
  return (
    <div className={styles.presetGrid}>
      {presets.map((preset) => (
        <PresetCard key={preset.id} preset={preset} onSelect={onSelect} />
      ))}
    </div>
  );
}
