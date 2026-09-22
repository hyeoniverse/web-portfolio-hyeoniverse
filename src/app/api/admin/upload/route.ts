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

  // 파일 크기 제한. 이력서(PDF)는 여기로 오지 않는다 — 50MB 까지 받아야 해서 배포 환경의 요청 본문
  // 한도(4.5MB)를 피해 Storage 에 직접 올린다(/api/upload/signed-url 의 purpose: "resume").
  const isBgm = folder === "bgm";
  const isFont = folder === "fonts";
  const maxSize = isBgm
    ? 10 * 1024 * 1024
    : isFont
      ? 5 * 1024 * 1024
      : 2 * 1024 * 1024;
  const maxLabel = isBgm ? "10MB" : isFont ? "5MB" : "2MB";
  if (file.size > maxSize) {
    return jsonError(`File too large (max ${maxLabel})`, 400, {
      code: "UPLOAD_TOO_LARGE",
      params: { size: (file.size / (1024 * 1024)).toFixed(1), max: maxSize / (1024 * 1024) },
    });
  }

  // 타입 검증 — 폰트는 MIME 이 브라우저마다 제각각(빈 값 포함)이라 확장자로 검사
  const mimeOk = isBgm
    ? file.type.startsWith("audio/")
    : isFont
      ? /\.(woff2?|ttf|otf)$/i.test(file.name)
      : file.type.startsWith("image/");
  const [mimeError, mimeCode] = isBgm
    ? ["Only audio files allowed", "UPLOAD_ONLY_AUDIO"] as const
    : isFont
      ? ["Only font files (woff2, woff, ttf, otf) allowed", "UPLOAD_ONLY_FONT"] as const
      : ["Only image files allowed", "UPLOAD_ONLY_IMAGE"] as const;
  if (!mimeOk) return jsonError(mimeError, 400, { code: mimeCode });

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
        { code: "UPLOAD_CONVERT_FAILED" },
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

  if (error) return jsonServerError(error, "POST /api/admin/upload");

  const {
    data: { publicUrl },
  } = admin.storage.from("uploads").getPublicUrl(fileName);

  return jsonOk({ url: publicUrl });
}
