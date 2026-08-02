import type { SelectOption } from "@/types";

// ── 업로드 허용 형식 (확장자 기준) — 아이콘·UI 의존 없는 순수 데이터/로직 ──
// 서버(업로드 검증·getSiteConfig)와 admin UI 가 함께 import 한다.
// 업로드 시 신뢰 가능한 식별자는 확장자다(브라우저 MIME 은 드문 형식에서 빈 값/octet-stream).

export type MimeGroupKey = "image" | "video" | "audio" | "document" | "archive";

export interface FormatDef {
  ext: string;
  label: string;
  group: MimeGroupKey;
  /** 대표 MIME — 구 MIME-키 config 마이그레이션 참고용 */
  mime?: string;
}

/** 기본(항상 켜짐) 형식 — 끄지 못하고 크기만 조정 가능 */
export const BUILTIN_FORMATS: FormatDef[] = [
  { ext: "jpg", label: "JPG", group: "image", mime: "image/jpeg" },
  { ext: "jpeg", label: "JPEG", group: "image", mime: "image/jpeg" },
  { ext: "png", label: "PNG", group: "image", mime: "image/png" },
  { ext: "webp", label: "WebP", group: "image", mime: "image/webp" },
  { ext: "svg", label: "SVG", group: "image", mime: "image/svg+xml" },
  { ext: "gif", label: "GIF", group: "image", mime: "image/gif" },
  { ext: "mp4", label: "MP4", group: "video", mime: "video/mp4" },
  { ext: "webm", label: "WebM", group: "video", mime: "video/webm" },
  { ext: "mov", label: "MOV", group: "video", mime: "video/quicktime" },
  { ext: "mp3", label: "MP3", group: "audio", mime: "audio/mpeg" },
  { ext: "wav", label: "WAV", group: "audio", mime: "audio/wav" },
  { ext: "ogg", label: "OGG", group: "audio", mime: "audio/ogg" },
  { ext: "pdf", label: "PDF", group: "document", mime: "application/pdf" },
  { ext: "docx", label: "DOCX", group: "document", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { ext: "xlsx", label: "XLSX", group: "document", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { ext: "pptx", label: "PPTX", group: "document", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  { ext: "txt", label: "TXT", group: "document", mime: "text/plain" },
  { ext: "md", label: "MD", group: "document", mime: "text/markdown" },
  { ext: "csv", label: "CSV", group: "document", mime: "text/csv" },
  { ext: "zip", label: "ZIP", group: "archive", mime: "application/zip" },
];

/** 관리자가 켤 수 있는 추가 형식 */
export const ADDABLE_FORMATS: FormatDef[] = [
  { ext: "avif", label: "AVIF", group: "image", mime: "image/avif" },
  { ext: "bmp", label: "BMP", group: "image", mime: "image/bmp" },
  { ext: "heic", label: "HEIC", group: "image", mime: "image/heic" },
  { ext: "tiff", label: "TIFF", group: "image", mime: "image/tiff" },
  { ext: "mkv", label: "MKV", group: "video", mime: "video/x-matroska" },
  { ext: "avi", label: "AVI", group: "video", mime: "video/x-msvideo" },
  { ext: "flac", label: "FLAC", group: "audio", mime: "audio/flac" },
  { ext: "m4a", label: "M4A", group: "audio", mime: "audio/x-m4a" },
  { ext: "aac", label: "AAC", group: "audio", mime: "audio/aac" },
  { ext: "doc", label: "DOC", group: "document", mime: "application/msword" },
  { ext: "xls", label: "XLS", group: "document", mime: "application/vnd.ms-excel" },
  { ext: "ppt", label: "PPT", group: "document", mime: "application/vnd.ms-powerpoint" },
  { ext: "hwp", label: "HWP", group: "document", mime: "application/x-hwp" },
  { ext: "epub", label: "EPUB", group: "document", mime: "application/epub+zip" },
  { ext: "json", label: "JSON", group: "document", mime: "application/json" },
  { ext: "rar", label: "RAR", group: "archive", mime: "application/x-rar-compressed" },
  { ext: "7z", label: "7Z", group: "archive", mime: "application/x-7z-compressed" },
  { ext: "gz", label: "GZ", group: "archive", mime: "application/gzip" },
  { ext: "tar", label: "TAR", group: "archive", mime: "application/x-tar" },
];

export const MIME_GROUP_ORDER: MimeGroupKey[] = ["image", "video", "audio", "document", "archive"];

/** 확장자 → 그룹 (카탈로그 + 흔한 확장자 보강) — 커스텀 확장자 자동 배정용 */
const EXT_GROUP: Record<string, MimeGroupKey> = (() => {
  const extra: Record<string, MimeGroupKey> = {
    ico: "image", tif: "image", psd: "image", ai: "image", jfif: "image", apng: "image", raw: "image",
    mpeg: "video", mpg: "video", wmv: "video", flv: "video", m4v: "video", "3gp": "video", ogv: "video", ts: "video",
    aiff: "audio", opus: "audio", weba: "audio", mid: "audio", amr: "audio", wma: "audio",
    rtf: "document", odt: "document", ods: "document", odp: "document", pages: "document", key: "document",
    numbers: "document", tex: "document", hwpx: "document", xml: "document", yaml: "document", yml: "document", djvu: "document",
    bz2: "archive", xz: "archive", tgz: "archive", tbz2: "archive", lz: "archive", lzma: "archive", cab: "archive", iso: "archive",
  };
  const m: Record<string, MimeGroupKey> = { ...extra };
  for (const f of [...BUILTIN_FORMATS, ...ADDABLE_FORMATS]) m[f.ext] = f.group;
  return m;
})();

/** 확장자 → 그룹 추론 (모르면 "other") */
export function inferGroup(ext: string): MimeGroupKey | "other" {
  return EXT_GROUP[ext.toLowerCase()] ?? "other";
}

/** 형식 켤 때 자동 배정될 추천 크기 (MB) */
export const RECOMMENDED_SIZE: Record<string, number> = {
  jpg: 5, jpeg: 5, png: 5, webp: 5, svg: 2, gif: 10, avif: 5, bmp: 10, heic: 10, tiff: 10,
  mp4: 200, webm: 200, mov: 200, mkv: 200, avi: 200,
  mp3: 20, wav: 20, ogg: 20, flac: 20, m4a: 20, aac: 20,
  pdf: 20, docx: 20, xlsx: 20, pptx: 50, txt: 1, md: 1, csv: 5,
  doc: 20, xls: 20, ppt: 50, hwp: 20, epub: 10, json: 2, rtf: 10,
  zip: 50, rar: 50, "7z": 50, gz: 50, tar: 50,
};

export const GROUP_RECOMMENDED: Record<MimeGroupKey, number> = {
  image: 5, video: 200, audio: 20, document: 20, archive: 50,
};

/** 확장자(+그룹) → 추천 크기 */
export function recommendedSize(ext: string, group: MimeGroupKey | "other"): number {
  return RECOMMENDED_SIZE[ext.toLowerCase()] ?? (group !== "other" ? GROUP_RECOMMENDED[group] : 20);
}

/** 대표 MIME → 확장자들 (구 MIME-키 limits 마이그레이션용) */
export const MIME_TO_EXTS: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {};
  for (const f of [...BUILTIN_FORMATS, ...ADDABLE_FORMATS]) {
    if (!f.mime) continue;
    (m[f.mime] ??= []).push(f.ext);
  }
  return m;
})();

/** limits 정규화 — 구 MIME 키를 확장자 키로 변환. 확장자/_default 는 통과, 모르는 MIME 은 버림. */
export function normalizeLimits(limits: Record<string, number> | undefined): Record<string, number> {
  if (!limits) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(limits)) {
    if (k === "_default" || !k.includes("/")) {
      out[k] = v;
      continue;
    }
    const exts = MIME_TO_EXTS[k];
    if (exts) for (const e of exts) if (!(e in out)) out[e] = v;
  }
  return out;
}

export const SIZE_OPTIONS: SelectOption[] = [
  { value: "1", label: "1 MB" },
  { value: "2", label: "2 MB" },
  { value: "5", label: "5 MB" },
  { value: "10", label: "10 MB" },
  { value: "20", label: "20 MB" },
  { value: "50", label: "50 MB" },
  { value: "100", label: "100 MB" },
  { value: "200", label: "200 MB" },
];
