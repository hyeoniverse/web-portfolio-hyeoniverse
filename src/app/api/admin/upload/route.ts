import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { needsConversion, convertToWebp } from "@/lib/convertImage";

// POST /api/admin/upload — 파일 업로드 (인증 필수)
export async function POST(request: Request) {
  // 인증 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "logos";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 파일 크기 제한
  const isResume = folder === "resume";
  const isBgm = folder === "bgm";
  const maxSize = isBgm ? 10 * 1024 * 1024 : isResume ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
  const maxLabel = isBgm ? "10MB" : isResume ? "5MB" : "2MB";
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large (max ${maxLabel})` },
      { status: 400 },
    );
  }

  // MIME 타입 검증
  const mimeOk = isBgm
    ? file.type.startsWith("audio/")
    : isResume
      ? file.type === "application/pdf"
      : file.type.startsWith("image/");
  const mimeError = isBgm
    ? "Only audio files allowed"
    : isResume
      ? "Only PDF files allowed"
      : "Only image files allowed";
  if (!mimeOk) {
    return NextResponse.json({ error: mimeError }, { status: 400 });
  }

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
      return NextResponse.json(
        { error: `Image conversion failed: ${err instanceof Error ? err.message : "unknown"}` },
        { status: 500 },
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("uploads").getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl });
}
