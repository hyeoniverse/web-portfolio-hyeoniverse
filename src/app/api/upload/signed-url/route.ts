import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";

// ── 보안: 차단 확장자 (route.ts 와 동일 기본값) ──
const DEFAULT_BLOCKED_EXT = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif",
  "sh", "bash", "csh", "ksh",
  "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1",
  "dll", "sys", "drv",
]);

/**
 * POST /api/upload/signed-url — Storage 직접 업로드용 서명 URL 발급 (admin only).
 *
 * 파일 바이트가 아니라 파일명·타입만 받으므로 본문이 작아 배포 환경의 요청 본문 한도(예: 4.5MB)에
 * 걸리지 않는다. 실제 바이트는 클라이언트가 반환된 서명 URL 로 Supabase Storage 에 직접 올린다
 * (대용량 동영상 대응). 검증(차단 확장자·허용 MIME)은 여기서 수행하되, 크기는 버킷 설정 +
 * 클라이언트 검증에 위임한다.
 *
 * `purpose: "resume"` 은 사이트 설정의 이력서(PDF)다. 글 첨부가 아니므로 글 첨부 허용 목록(media.limits)을
 * 보지 않고 PDF 만 받으며, 예전 서버 업로드(/api/admin/upload)와 같은 자리(uploads 버킷 resume/)에 둔다.
 * 응답의 `bucket` 이 업로드할 버킷이다.
 */
export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  let body: { fileName?: string; contentType?: string; purpose?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("잘못된 요청입니다.", 400);
  }

  const fileName = String(body?.fileName || "");
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (!ext) return jsonError("파일 확장자가 필요합니다.", 400, { code: "UPLOAD_NO_EXTENSION" });

  if (body?.purpose === "resume") {
    const contentType = String(body?.contentType || "");
    if (ext !== "pdf" || (contentType && contentType !== "application/pdf")) {
      return jsonError("Only PDF files allowed", 400, { code: "UPLOAD_ONLY_PDF" });
    }
    const resumePath = `resume/${Date.now()}.pdf`;
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("uploads").createSignedUploadUrl(resumePath);
    if (error || !data) return jsonError(error?.message || "업로드 URL 생성에 실패했습니다.", 500);
    const { data: pub } = admin.storage.from("uploads").getPublicUrl(resumePath);
    return jsonOk({ bucket: "uploads", path: data.path, token: data.token, publicUrl: pub.publicUrl });
  }

  // ── 설정 로드 (차단 확장자 + 허용 MIME) ──
  let blockedExt = DEFAULT_BLOCKED_EXT;
  let limits: Record<string, number> = {};
  try {
    const cfg = await getSiteConfig();
    const customBlocked = cfg.media?.blockedExtensions;
    if (customBlocked && customBlocked.length > 0) blockedExt = new Set(customBlocked);
    const dbLimits = cfg.media?.limits as Record<string, number> | undefined;
    if (dbLimits) limits = dbLimits;
  } catch {
    /* 기본값 사용 */
  }

  if (blockedExt.has(ext)) return jsonError(`차단된 파일 형식: .${ext}`, 400, { code: "UPLOAD_TYPE_NOT_ALLOWED", params: { ext } });

  // 확장자 화이트리스트 (limits 는 확장자 키). 브라우저 MIME 은 드문 형식에서 빈 값이라 확장자 기준.
  const hasLimits = Object.keys(limits).length > 0;
  if (hasLimits && !(ext in limits) && !("_default" in limits)) {
    return jsonError(`허용되지 않은 형식입니다: .${ext}`, 400, { code: "UPLOAD_TYPE_NOT_ALLOWED", params: { ext } });
  }

  // ── 서명 URL 발급 ──
  const uploadExt = ext.replace(/[^a-z0-9]/g, "");
  const storedName = `${crypto.randomUUID()}.${uploadExt}`;
  const filePath = `posts/${storedName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("posts").createSignedUploadUrl(filePath);
  if (error || !data) return jsonError(error?.message || "업로드 URL 생성에 실패했습니다.", 500);

  const { data: pub } = admin.storage.from("posts").getPublicUrl(filePath);

  return jsonOk({ bucket: "posts", path: data.path, token: data.token, publicUrl: pub.publicUrl });
}
