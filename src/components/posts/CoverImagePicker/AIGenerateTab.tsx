"use client";

import { useState, useCallback, useMemo } from "react";
import { Check, Download, RotateCw } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import type { PostContext } from "./index";
import styles from "./CoverImagePicker.module.css";

interface AIGenerateTabProps {
  onSelect: (url: string) => void;
  /** 이미지 생성 즉시 호출 — 부모 picker 가 history 추가 + cover 자동저장 */
  onGenerated: (url: string, prompt: string) => void;
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

export default function AIGenerateTab({ onSelect, onGenerated, postContext }: AIGenerateTabProps) {
  const { t } = useLanguage();
  const tc = useCallback((key: string) => t(`admin.posts.coverPicker.${key}`), [t]);
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
      // 부모가 history 추가 + cover 자동저장 처리
      onGenerated(data.url, prompt.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("generationFailed"));
    } finally {
      setGenerating(false);
    }
  }, [prompt, style, tc, onGenerated]);

  const _handleClear = useCallback(() => {
    setPrompt("");
    setPreviewUrl(null);
    setPermanentUrl(null);
    setError("");
  }, []);

  /** 임의 url 을 blob 으로 fetch 해서 임시 anchor 로 다운로드 — suggested filename 포함 */
  const downloadUrl = useCallback(async (url: string, suggestedName: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = (blob.type.split("/")[1] || "png").replace(/[^a-z0-9]/g, "");
      const safe = suggestedName.trim().slice(0, 30).replace(/[^a-z0-9가-힣]+/gi, "_") || "ai-cover";
      a.download = `${safe}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("generationFailed"));
    }
  }, [tc]);

  const handleDownload = useCallback(() => {
    if (!permanentUrl) return;
    downloadUrl(permanentUrl, prompt);
  }, [permanentUrl, prompt, downloadUrl]);

  return (
    <>
      <div className={styles.aiForm}>
      <div className={styles.inputRow}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SearchCapsule
            search={prompt}
            onSearchChange={setPrompt}
            placeholder={tc("aiPlaceholder")}
            align="left"
            size="sm"
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          className={styles.generateBtn}
          onClick={handleGenerate}
          loading={generating}
          loadingVariant="wave"
          disabled={!prompt.trim()}
        >
          {tc("generate")}
        </Button>
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

      {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      {/* aiPreview 는 .aiForm 밖 — body 와 직접 인접해 padding 없이 full-width 표시 */}
      {previewUrl && (
        <div className={styles.aiPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="AI generated cover" />
          <div className={styles.aiActions}>
            <Button
              variant="ghost"
              size="sm"
              className={styles.useBtn}
              icon={<Check size={12} strokeWidth={2.5} />}
              onClick={() => permanentUrl && onSelect(permanentUrl)}
            >
              {tc("useThis")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={styles.retryBtn}
              icon={<Download size={12} strokeWidth={2} />}
              onClick={handleDownload}
            >
              {tc("download")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={styles.retryBtn}
              icon={<RotateCw size={12} strokeWidth={2} />}
              onClick={handleGenerate}
              disabled={generating}
            >
              {tc("regenerate")}
            </Button>
          </div>
        </div>
      )}

    </>
  );
}
