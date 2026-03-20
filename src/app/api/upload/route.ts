import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // ── 1. 확장자 검증 ──
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ext) {
    return NextResponse.json({ error: "File must have an extension" }, { status: 400 });
  }
  if (DEFAULT_BLOCKED_EXT.has(ext)) {
    return NextResponse.json({ error: `Blocked file type: .${ext}` }, { status: 400 });
  }

  // ── 2. MIME 타입 ↔ 확장자 일치 검증 (스푸핑 방지) ──
  const allowedExts = MIME_EXT_MAP[file.type];
  if (allowedExts && !allowedExts.includes(ext)) {
    return NextResponse.json(
      { error: `MIME type (${file.type}) does not match extension (.${ext})` },
      { status: 400 },
    );
  }

  // ── 3. 파일 크기 검증 ──
  // 설정에서 limits 로드 시도
  let limitMB = DEFAULT_LIMIT_MB;
  try {
    const admin = createAdminClient();
    const { data: configRow } = await admin
      .from("site_config")
      .select("value")
      .eq("key", "media")
      .single();
    if (configRow?.value) {
      const mediaConfig = configRow.value as Record<string, unknown>;
      const limits = mediaConfig.limits as Record<string, number> | undefined;
      if (limits) {
        limitMB = limits[file.type] ?? limits._default ?? DEFAULT_LIMIT_MB;
      }
    }
  } catch {
    // DB 설정 로드 실패 시 기본값 사용
  }

  // 절대 상한 적용
  limitMB = Math.min(limitMB, MAX_ABSOLUTE_MB);
  const limitBytes = limitMB * 1024 * 1024;

  if (file.size > limitBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { error: `File too large: ${sizeMB}MB (max ${limitMB}MB for ${file.type || ext})` },
      { status: 400 },
    );
  }

  // ── 4. 업로드 ──
  const safeExt = ext.replace(/[^a-z0-9]/g, ""); // 확장자 sanitize
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
  const filePath = `posts/${fileName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("posts")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("posts").getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl });
}
