import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { needsConversion, convertToWebp } from "@/lib/convertImage";

// POST /api/admin/upload — 파일 업로드 (인증 필수)
export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "logos";

  if (!file) return jsonError("No file provided", 400);

  // 파일 크기 제한
  const isResume = folder === "resume";
  const isBgm = folder === "bgm";
  const isFont = folder === "fonts";
  const maxSize = isBgm
    ? 10 * 1024 * 1024
    : isFont || isResume
      ? 5 * 1024 * 1024
      : 2 * 1024 * 1024;
  const maxLabel = isBgm ? "10MB" : isFont || isResume ? "5MB" : "2MB";
  if (file.size > maxSize) {
    return jsonError(`File too large (max ${maxLabel})`, 400);
  }

  // 타입 검증 — 폰트는 MIME 이 브라우저마다 제각각(빈 값 포함)이라 확장자로 검사
  const mimeOk = isBgm
    ? file.type.startsWith("audio/")
    : isResume
      ? file.type === "application/pdf"
      : isFont
        ? /\.(woff2?|ttf|otf)$/i.test(file.name)
        : file.type.startsWith("image/");
  const mimeError = isBgm
    ? "Only audio files allowed"
    : isResume
      ? "Only PDF files allowed"
      : isFont
        ? "Only font files (woff2, woff, ttf, otf) allowed"
        : "Only image files allowed";
  if (!mimeOk) return jsonError(mimeError, 400);

  // HEIC/HEIF/TIFF → WebP 변환 (브라우저 호환성)
  let uploadBody: Blob | Buffer = file;
  let uploadContentType = file.type;
  let ext = file.name.split(".").pop() || "png";

  if (needsConversion(file.type)) {
    try {
      const inputBuf = Buffer.from(await file.arrayBuffer());
      const converted = await convertToWebp(inputBuf, file.type);
      uploadBody = converted.buffer;
      uploadContentType = converted.contentType;
      ext = converted.extension;
    } catch (err) {
      return jsonError(
        `Image conversion failed: ${err instanceof Error ? err.message : "unknown"}`,
        500,
      );
    }
  }

  const admin = createAdminClient();
  const fileName = `${folder}/${Date.now()}.${ext}`;

  const { error } = await admin.storage
    .from("uploads")
    .upload(fileName, uploadBody, {
      contentType: uploadContentType,
      upsert: true,
    });

  if (error) return jsonServerError(error);

  const {
    data: { publicUrl },
  } = admin.storage.from("uploads").getPublicUrl(fileName);

  return jsonOk({ url: publicUrl });
}
