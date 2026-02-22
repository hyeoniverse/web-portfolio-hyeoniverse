"use client";

import { useState, useCallback, useMemo } from "react";
import type { PostContext } from "./index";
import styles from "./CoverImagePicker.module.css";

interface AIGenerateTabProps {
  onSelect: (url: string) => void;
  postContext?: PostContext;
}

const styleOptions = [
  { key: "abstract", label: "Abstract" },
  { key: "minimal", label: "Minimal" },
  { key: "geometric", label: "Geometric" },
  { key: "photographic", label: "Photographic" },
  { key: "illustration", label: "Illustration" },
  { key: "watercolor", label: "Watercolor" },
  { key: "cyberpunk", label: "Cyberpunk" },
  { key: "vintage", label: "Vintage" },
  { key: "3d-render", label: "3D Render" },
  { key: "flat-design", label: "Flat Design" },
] as const;

type StyleKey = (typeof styleOptions)[number]["key"];

const FALLBACK_PROMPTS = [
  "serene mountain landscape at golden hour",
  "futuristic neon cityscape",
  "calm ocean waves at sunset",
  "colorful abstract fluid art",
];

/** 포스트 제목/태그/요약을 기반으로 이미지 프롬프트 후보 생성 */
function buildPromptSuggestions(ctx: PostContext): string[] {
  const suggestions: string[] = [];
  const title = ctx.title.trim();
  const tags = ctx.tags.filter((t) => t.trim());
  const excerpt = ctx.excerpt.trim();

  // 제목 기반
  if (title) {
    suggestions.push(`blog cover about "${title}"`);
    suggestions.push(`abstract representation of ${title}`);
  }

  // 태그 기반 — 태그를 조합해서 프롬프트 생성
  if (tags.length > 0) {
    const tagStr = tags.slice(0, 4).join(", ");
    suggestions.push(`visual concept of ${tagStr}`);
    if (tags.length >= 2) {
      suggestions.push(`${tags[0]} and ${tags[1]}, artistic illustration`);
    }
  }

  // excerpt 기반 (짧게 잘라서)
  if (excerpt) {
    const short = excerpt.length > 60 ? excerpt.slice(0, 60) + "..." : excerpt;
    suggestions.push(`illustration for: ${short}`);
  }

  // 제목+태그 조합
  if (title && tags.length > 0) {
    suggestions.push(`${title} with ${tags[0]} theme, cinematic`);
  }

  return suggestions.slice(0, 6);
}

export default function AIGenerateTab({ onSelect, postContext }: AIGenerateTabProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleKey>("abstract");
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [permanentUrl, setPermanentUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const promptSuggestions = useMemo(() => {
    if (!postContext) return FALLBACK_PROMPTS;
    const built = buildPromptSuggestions(postContext);
    return built.length > 0 ? built : FALLBACK_PROMPTS;
  }, [postContext]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setPreviewUrl(null);
    setPermanentUrl(null);

    try {
      const res = await fetch("/api/cover/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewUrl(data.url);
      setPermanentUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [prompt, style]);

  const handleClear = useCallback(() => {
    setPrompt("");
    setPreviewUrl(null);
    setPermanentUrl(null);
    setError("");
  }, []);

  return (
    <div className={styles.aiForm}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the cover image you want..."
        />
        {prompt && (
          <button type="button" className={styles.clearBtn} onClick={handleClear}>
            &times;
          </button>
        )}
      </div>

      {!prompt && !previewUrl && (
        <div className={styles.suggestions}>
          {promptSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.suggestionChip}
              onClick={() => setPrompt(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={styles.styleRow}>
        {styleOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`${styles.styleChip} ${style === opt.key ? styles.styleChipActive : ""}`}
            onClick={() => setStyle(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.generateBtn}
        onClick={handleGenerate}
        disabled={generating || !prompt.trim()}
      >
        {generating ? "Generating..." : "Generate"}
      </button>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {previewUrl && (
        <div className={styles.aiPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="AI generated cover" />
          <div className={styles.aiActions}>
            <button
              type="button"
              className={styles.useBtn}
              onClick={() => permanentUrl && onSelect(permanentUrl)}
            >
              Use this
            </button>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={handleGenerate}
              disabled={generating}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
