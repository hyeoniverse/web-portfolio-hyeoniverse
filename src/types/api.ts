// 내부 API 응답 DTO — 여러 훅/컴포넌트가 공유하는 fetch 응답 shape.

/** POST /api/upload 응답 — 성공 시 url(+originalName), 실패 시 error */
export interface UploadResponse {
  url?: string;
  originalName?: string;
  error?: string;
}

/** GitHub 저장소 import 응답 — 파일명/내용 목록 */
export interface GithubImportResponse {
  files: { fileName: string; content: string }[];
}
