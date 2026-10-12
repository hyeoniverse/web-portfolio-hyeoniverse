/**
 * 관리자 화면의 시스템 글(알림 제목 · 본문 등 사전 밖의 정해진 글) 번역 — 서버 · 브라우저 공용 상수.
 */

/** 한 요청에 묻는 글 수 · 글 하나의 길이 상한 */
export const ADMIN_TEXTS_MAX = 50;
export const ADMIN_TEXT_MAX_CHARS = 2000;

/** 한글이 들어 있으면 한국어 원문, 아니면 영어 */
export const adminTextSourceLang = (s: string): "ko" | "en" => (/[ㄱ-ㆎ가-힣]/.test(s) ? "ko" : "en");
