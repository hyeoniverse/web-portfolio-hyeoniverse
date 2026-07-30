import { ImageIcon, Video, Music, FileText, Archive, File, type LucideIcon } from "@/components/icons";
import type { SelectOption } from "@/types";

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

// ── 업로드 MIME 그룹 ──
export type MimeGroupKey = "image" | "video" | "audio" | "document" | "archive";

/** built-in 기본 허용 MIME 그룹 */
export interface MimeLimitGroup {
  label: string;
  key: string;
  keys?: string[];
  group: MimeGroupKey;
}
export const DEFAULT_LIMIT_GROUPS: MimeLimitGroup[] = [
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

export const MIME_GROUP_ORDER: MimeGroupKey[] = ["image", "video", "audio", "document", "archive"];

export const MIME_GROUP_ICON: Record<MimeGroupKey | "other", LucideIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: File,
};

export const MIME_ADDABLE_GROUP_KEY: Record<string, MimeGroupKey> = {
  "admin.settings.mimeGroupImage": "image",
  "admin.settings.mimeGroupVideo": "video",
  "admin.settings.mimeGroupAudio": "audio",
  "admin.settings.mimeGroupDocument": "document",
  "admin.settings.mimeGroupArchive": "archive",
};

/** admin 이 추가 가능한 MIME 그룹 */
export interface AddableMimeGroup {
  labelKey: string;
  targetKey: string;
  mimes: SelectOption[];
}
export const ADDABLE_MIME_GROUPS: AddableMimeGroup[] = [
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

export const SIZE_OPTIONS: SelectOption[] = [
  { value: "1", label: "1 MB" },
  { value: "2", label: "2 MB" },
  { value: "5", label: "5 MB" },
  { value: "10", label: "10 MB" },
  { value: "20", label: "20 MB" },
  { value: "50", label: "50 MB" },
  { value: "100", label: "100 MB" },
];
