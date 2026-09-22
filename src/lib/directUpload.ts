import { createClient } from "@/lib/supabase/client";
import { CodedError, errorFromBody } from "@/lib/apiError";

/**
 * Storage 직접 업로드 — 서버 /api/upload 를 거치지 않고 Supabase Storage 로 바로 올린다.
 * 배포 환경의 API 요청 본문 한도(예: 4.5MB)를 우회하므로 대용량 동영상 업로드에 사용.
 *
 * 흐름: (1) /api/upload/signed-url 로 서명 URL·토큰 발급(본문 작음) →
 *       (2) 반환된 토큰으로 클라이언트가 파일 바이트를 Storage 에 직접 PUT →
 *       (3) public URL 반환.
 *
 * 주의: supabase-js v2 의 uploadToSignedUrl 은 업로드 진행률 콜백을 제공하지 않는다
 * (진행률이 필요한 압축 단계만 별도 콜백 사용).
 *
 * `purpose: "resume"` 은 사이트 설정의 이력서(PDF)다. 서버가 PDF 만 받고 이력서 자리(uploads 버킷)에 둔다.
 *
 * @throws CodedError — 서버가 거절한 사유는 코드로 싣는다. 화면은 errorText 로 화면 언어 문구를 얻는다.
 */
export async function directUpload(
  file: File | Blob,
  fileName: string,
  contentType: string,
  purpose?: "resume",
): Promise<string> {
  // 1. 서명 URL 발급
  const res = await fetch("/api/upload/signed-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName, contentType, purpose }),
  });
  const data: { bucket?: string; path?: string; token?: string; publicUrl?: string; error?: string } =
    await res.json().catch(() => ({}));
  if (!res.ok) throw errorFromBody(data, res.status);
  if (!data.path || !data.token || !data.publicUrl) throw new CodedError("Signed upload URL response is incomplete");

  // 2. Storage 직접 업로드
  const supabase = createClient();
  /* 서명 URL 을 만든 버킷에 올려야 한다 — 다른 버킷에 쓰면 토큰이 맞지 않는다 */
  const { error } = await supabase.storage
    .from(data.bucket || "posts")
    .uploadToSignedUrl(data.path, data.token, file, { contentType });
  if (error) throw new CodedError(error.message || "Storage upload failed");

  // 3. public URL
  return data.publicUrl;
}
