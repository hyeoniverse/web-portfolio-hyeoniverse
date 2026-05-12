import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { needsConversion, convertToWebp } from "@/lib/convertImage";
import { getSiteConfig } from "@/lib/getSiteConfig";

// ── 보안: 차단 확장자 (기본값, 설정에서 오버라이드 가능) ──
const DEFAULT_BLOCKED_EXT = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif",
  "sh", "bash", "csh", "ksh",
  "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1",
  "dll", "sys", "drv",
]);

// ── 보안: MIME ↔ 확장자 매핑 (스푸핑 방지) ──
const MIME_EXT_MAP: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/bmp": ["bmp"],
  "image/heic": ["heic", "heif"],
  "image/heif": ["heic", "heif"],
  "image/tiff": ["tif", "tiff"],
  "image/svg+xml": ["svg"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
  "audio/mpeg": ["mp3"],
  "audio/wav": ["wav"],
  "audio/ogg": ["ogg"],
  "audio/x-m4a": ["m4a"],
  "audio/flac": ["flac"],
  "application/pdf": ["pdf"],
  "application/zip": ["zip"],
  "application/x-rar-compressed": ["rar"],
  "application/x-7z-compressed": ["7z"],
  "application/gzip": ["gz"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/msword": ["doc"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "text/plain": ["txt"],
  "text/csv": ["csv"],
  "application/json": ["json"],
  "application/xml": ["xml"],
  "text/xml": ["xml"],
};

// 기본 크기 제한 (MB) — 설정이 없을 때 사용
const DEFAULT_LIMIT_MB = 20;
const MAX_ABSOLUTE_MB = 100; // 어떤 경우에도 100MB 초과 금지

// POST /api/upload — 파일 업로드 (admin only)
export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return jsonError("No file provided", 400);

  // ── 설정 로드 (허용 MIME + 차단 확장자 + 크기 제한) ──
  // getSiteConfig() 가 site.config defaults + DB delta 를 자동 머지해서 반환.
  // 이전엔 DB 만 직접 읽어서 admin 이 한 번도 안 건드린 경우 site.config 의
  // 기본 limits/차단 확장자가 무시되던 버그가 있었음.
  let blockedExt = DEFAULT_BLOCKED_EXT;
  let limits: Record<string, number> = {};
  try {
    const cfg = await getSiteConfig();
    const customBlocked = cfg.media?.blockedExtensions;
    if (customBlocked && customBlocked.length > 0) {
      blockedExt = new Set(customBlocked);
    }
    const dbLimits = cfg.media?.limits as Record<string, number> | undefined;
    if (dbLimits) limits = dbLimits;
  } catch {
    // DB 설정 로드 실패 시 기본값 사용
  }

  // ── 1. 확장자 검증 (블랙리스트) ──
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ext) {
    return jsonError("File must have an extension", 400);
  }
  if (blockedExt.has(ext)) {
    return jsonError(`Blocked file type: .${ext}`, 400);
  }

  // ── 2. MIME 타입 화이트리스트 (limits에 있는 타입만 허용) ──
  const hasLimits = Object.keys(limits).length > 0;
  if (hasLimits && !(file.type in limits) && !("_default" in limits)) {
    return jsonError(`File type not allowed: ${file.type}`, 400);
  }

  // ── 3. MIME 타입 ↔ 확장자 일치 검증 (스푸핑 방지) ──
  const allowedExts = MIME_EXT_MAP[file.type];
  if (allowedExts && !allowedExts.includes(ext)) {
    return jsonError(`MIME type (${file.type}) does not match extension (.${ext})`, 400);
  }

  // ── 4. 파일 크기 검증 ──
  let limitMB = hasLimits
    ? (limits[file.type] ?? limits._default ?? DEFAULT_LIMIT_MB)
    : DEFAULT_LIMIT_MB;
  limitMB = Math.min(limitMB, MAX_ABSOLUTE_MB);
  const limitBytes = limitMB * 1024 * 1024;

  if (file.size > limitBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return jsonError(`File too large: ${sizeMB}MB (max ${limitMB}MB for ${file.type || ext})`, 400);
  }

  // ── 5. HEIC/HEIF/TIFF 변환 → WebP (브라우저 호환성 확보) ──
  let uploadBody: Blob | Buffer = file;
  let uploadContentType = file.type;
  let uploadExt = ext.replace(/[^a-z0-9]/g, "");

  if (needsConversion(file.type)) {
    try {
      const inputBuf = Buffer.from(await file.arrayBuffer());
      const converted = await convertToWebp(inputBuf, file.type);
      uploadBody = converted.buffer;
      uploadContentType = converted.contentType;
      uploadExt = converted.extension;
    } catch (err) {
      return jsonError(`Image conversion failed: ${err instanceof Error ? err.message : "unknown"}`, 500);
    }
  }

  // ── 6. 업로드 ──
  // crypto.randomUUID — CSPRNG 라 충돌 확률 무시 가능, 예측 불가
  const fileName = `${crypto.randomUUID()}.${uploadExt}`;
  const filePath = `posts/${fileName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("posts")
    .upload(filePath, uploadBody, {
      contentType: uploadContentType,
      upsert: false,
    });

  if (error) {
    return jsonServerError(error);
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("posts").getPublicUrl(filePath);

  return jsonOk({ url: publicUrl, originalName: file.name });
}
