import { CodedError, errorFromResponse } from "@/lib/apiError";
import { directUpload } from "@/lib/directUpload";

/**
 * 관리자 파일 업로드 — multipart 로 `/api/admin/upload` 에 올리고 public URL 을 돌려준다.
 * `folder` 로 저장 경로(logos·resume·bgm·icons 등)를 지정한다.
 *
 * 대용량 동영상은 API 본문 한도를 우회하는 {@link import("./directUpload").directUpload} 를 쓴다.
 * 이 함수는 로고·아이콘·오디오 등 일반 파일용이며, 여러 곳에 흩어져 있던 동일 fetch 를 한곳으로 모은 것.
 *
 * @throws 업로드 실패 시 CodedError — 호출부에서 삼키거나(silent) errorText 로 화면 언어 문구를 만들어 보인다.
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) throw await errorFromResponse(res);
  const data = await res.json();
  return data.url as string;
}

/** 이력서(PDF) 최대 크기(MB). Supabase Storage 의 파일당 한도(무료 요금제 50MB)에 맞춘다. */
export const RESUME_MAX_MB = 50;

/**
 * 이력서 업로드 — {@link uploadFile} 처럼 서버를 거치지 않고 Storage 에 직접 올린다.
 * 배포 환경의 서버 함수는 요청 본문이 4.5MB 를 넘으면 받지 못해, 그보다 큰 PDF 는 서버 라우트로는 올릴 수 없다.
 * 서명 URL 은 크기를 막지 못하므로 형식과 크기는 여기서 먼저 확인한다.
 *
 * @throws CodedError — UPLOAD_ONLY_PDF·UPLOAD_TOO_LARGE, 또는 서버·Storage 가 거절한 사유
 */
export async function uploadResume(file: File): Promise<string> {
  const isPdf = file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name));
  if (!isPdf) throw new CodedError("Only PDF files allowed", { code: "UPLOAD_ONLY_PDF" });
  if (file.size > RESUME_MAX_MB * 1024 * 1024) {
    throw new CodedError(`File too large (max ${RESUME_MAX_MB}MB)`, {
      code: "UPLOAD_TOO_LARGE",
      params: { size: (file.size / (1024 * 1024)).toFixed(1), max: RESUME_MAX_MB },
    });
  }
  return directUpload(file, file.name, "application/pdf", "resume");
}
