import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // 파일 크기 제한 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 2MB)" },
      { status: 400 },
    );
  }

  // 이미지 MIME 타입만 허용
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files allowed" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const fileName = `${folder}/${Date.now()}.${ext}`;

  const { error } = await admin.storage
    .from("uploads")
    .upload(fileName, file, {
      contentType: file.type,
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
