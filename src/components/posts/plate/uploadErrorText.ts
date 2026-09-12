import type { TFunction } from "@/providers/LanguageProvider";
import { CodedError, errorText } from "@/lib/apiError";

/**
 * 본문 편집기 업로드 오류 창의 문구 — 편집기와 첨부 이미지 패널이 함께 쓴다.
 * 사유를 아는 실패(코드)는 그 문구를 화면 언어로, 모르는 실패(네트워크·서버 오류)는 실패 문구에 상태와
 * 도움말을 붙인다. 오류 문장은 서버나 브라우저가 쓴 한 언어라 보이지 않는다(#862).
 */
export function uploadErrorText(err: unknown, t: TFunction): string {
  const reason = errorText(err, t, "");
  if (reason) return reason;
  const status = err instanceof CodedError && err.status ? ` (${err.status})` : "";
  return `${t("editor.uploadFail")}${status}\n\n${t("editor.uploadFailHint")}`;
}
