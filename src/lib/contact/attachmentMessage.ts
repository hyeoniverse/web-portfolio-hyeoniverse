import { ATTACHMENT_LINK_TTL_SEC } from "./limits";

/**
 * 문의 메일 본문 — 첨부가 있으면 본문 아래에 구분선과 함께 파일 이름 · 내려받기 링크 · 링크가 닫히는 날을 붙인다.
 * 파일은 공급자에 싣지 않고 비공개 버킷에 올린 뒤 서명 링크로만 전한다(공급자 요금제와 상관없이 쓸 수 있다).
 * 메일은 사이트 주인이 받으므로 한국어로, 날짜는 한국 시간으로 적는다.
 */
export function contactMessageWithAttachment(
  message: string,
  attachment: { name: string; url: string } | null,
  now: Date = new Date(),
): string {
  if (!attachment) return message;
  const days = Math.round(ATTACHMENT_LINK_TTL_SEC / 86400);
  const expires = new Date(now.getTime() + ATTACHMENT_LINK_TTL_SEC * 1000);
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(expires);
  return [
    message,
    "",
    "──────────",
    `첨부 파일: ${attachment.name || "file"}`,
    `내려받기: ${attachment.url}`,
    `링크는 ${date}까지(${days}일) 열립니다. 그 뒤에는 열리지 않으니 미리 내려받아 두세요.`,
  ].join("\n");
}
