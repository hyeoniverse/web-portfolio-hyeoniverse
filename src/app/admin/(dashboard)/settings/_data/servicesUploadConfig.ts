import { ImageIcon, Video, Music, FileText, Archive, File, type LucideIcon } from "@/components/icons";
import type { SelectOption } from "@/types";
import type { MimeGroupKey } from "@/lib/uploadFormats";

// ── AI 제공자 옵션 ──
export type AICoverProvider = "nanobanana" | "huggingface";
export type AISummaryProvider = "gemini" | "openai" | "claude";
export type TranslationProvider = "gemini" | "google" | "deepl" | "claude";

export const AI_COVER_OPTIONS: SelectOption<AICoverProvider>[] = [
  { value: "nanobanana", label: "NanoBanana (Gemini)" },
  { value: "huggingface", label: "Hugging Face (FLUX)" },
];
export const AI_SUMMARY_OPTIONS: SelectOption<AISummaryProvider>[] = [
  { value: "gemini", label: "Gemini 2.0 Flash" },
  { value: "openai", label: "OpenAI GPT-4o mini" },
  { value: "claude", label: "Claude Haiku 4.5" },
];
export const TRANSLATION_OPTIONS: SelectOption<TranslationProvider>[] = [
  { value: "gemini", label: "Gemini 2.0 Flash" },
  { value: "google", label: "Google Cloud Translation" },
  { value: "deepl", label: "DeepL API Free" },
  { value: "claude", label: "Claude Haiku 4.5" },
];

// ── 업로드 형식 (확장자 기준) — 순수 데이터/로직은 서버·UI 공용 모듈에서 re-export ──
export {
  BUILTIN_FORMATS,
  ADDABLE_FORMATS,
  MIME_GROUP_ORDER,
  inferGroup,
  recommendedSize,
  normalizeLimits,
  SIZE_OPTIONS,
  STORAGE_MAX_MB,
} from "@/lib/uploadFormats";
export type { MimeGroupKey } from "@/lib/uploadFormats";

/** 그룹 아이콘 — lucide 컴포넌트라 UI 전용(서버가 import 하는 순수 모듈과 분리) */
export const MIME_GROUP_ICON: Record<MimeGroupKey | "other", LucideIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: File,
};
