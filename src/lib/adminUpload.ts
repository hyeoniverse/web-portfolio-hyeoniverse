import { errorFromResponse } from "@/lib/apiError";

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
