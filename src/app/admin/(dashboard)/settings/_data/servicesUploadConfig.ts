import { ImageIcon, Video, Music, FileText, Archive, File, type LucideIcon } from "@/components/icons";
import type { SelectOption } from "@/types";
import type { MimeGroupKey } from "@/lib/uploadFormats";

// ── AI 제공자 옵션 ──
export type AICoverProvider = "nanobanana" | "huggingface";
export type AISummaryProvider = "gemini" | "openai" | "groq" | "claude";
export type TranslationProvider = "gemini" | "google" | "deepl" | "claude";
export type TtsProviderOption = "fish" | "google" | "edge";

export const AI_COVER_OPTIONS: SelectOption<AICoverProvider>[] = [
  { value: "nanobanana", label: "NanoBanana" },
  { value: "huggingface", label: "Hugging Face" },
];
export const AI_SUMMARY_OPTIONS: SelectOption<AISummaryProvider>[] = [
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "claude", label: "Claude" },
];
export const TTS_OPTIONS: SelectOption<TtsProviderOption>[] = [
  { value: "fish", label: "Fish Audio" },
  { value: "google", label: "Google Cloud TTS (Neural2)" },
  { value: "edge", label: "Edge TTS" },
];
export const TRANSLATION_OPTIONS: SelectOption<TranslationProvider>[] = [
  { value: "gemini", label: "Gemini" },
  { value: "google", label: "Google Cloud Translation" },
  /* 무료 키(:fx)와 유료 키 모두 받는다 — 키에 맞는 주소로 보낸다(translationProviders) */
  { value: "deepl", label: "DeepL" },
  { value: "claude", label: "Claude" },
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
  STORAGE_MAX_MB_CEILING,
  resolveStorageMaxMb,
  sizeOptionsFor,
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
