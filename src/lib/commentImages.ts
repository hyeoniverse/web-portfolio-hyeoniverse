/**
 * 댓글 이미지 — 방문자가 댓글 입력란의 이미지 단추로 올리는 사진(#1455).
 *
 * 로그인 없는 공개 업로드라 세 가지로 묶는다.
 * - 한 장의 용량: 설정 › 댓글의 `comments.imageMaxMb`(기본 2MB). 서버가 받는 본문 한도(배포 환경 4.5MB) 아래에서만 고른다.
 * - 하루 개수: 방문자(IP 해시)마다 하루 COMMENT_IMAGE_DAILY_LIMIT 장. 저장 경로가 `comments/<날짜>/<IP 해시>/` 라
 *   그 폴더의 파일 수가 곧 오늘 올린 수다 — 따로 세는 표가 없다.
 * - 뒷정리: 하루가 지나도 어느 댓글에도 쓰이지 않은 이미지는 지운다(api/commentImages 의 sweep).
 *   설정 › 라이브러리의 "댓글 이미지 정리"에서 지울 때가 지난 이미지와 곧 지워질 이미지를 보고 직접 지울 수도 있다.
 *
 * 이 파일은 브라우저 · 서버가 함께 쓰는 값과 순수 함수만 둔다.
 */

export const COMMENT_IMAGE_BUCKET = "uploads";
export const COMMENT_IMAGE_PREFIX = "comments";
export const COMMENT_IMAGE_DEFAULT_MB = 2;
/** 설정에서 고를 수 있는 한 장 용량(MB) — 배포 환경의 요청 본문 한도(4.5MB) 안 */
export const COMMENT_IMAGE_MB_CHOICES = [1, 2, 3, 4] as const;
export const COMMENT_IMAGE_DAILY_LIMIT = 20;
/** 다시 저장할 때 긴 변의 상한(px) — 댓글 폭에서는 이보다 크게 보일 일이 없다 */
export const COMMENT_IMAGE_MAX_SIDE = 1600;
/** 받는 형식 — SVG 는 스크립트를 품을 수 있어 받지 않는다. 받은 뒤에는 모두 webp 로 다시 저장한다 */
export const COMMENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/heic", "image/heif"] as const;

/** 설정 값을 고를 수 있는 용량으로 — 모르는 값이면 기본값 */
export function resolveCommentImageMaxMb(value: unknown): number {
  return (COMMENT_IMAGE_MB_CHOICES as readonly number[]).includes(value as number) ? (value as number) : COMMENT_IMAGE_DEFAULT_MB;
}

/** 저장 폴더의 날짜(UTC) — 하루 개수를 세는 단위이자 뒷정리의 기준 */
export function commentImageDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 쓰이지 않으면 지워지기 시작하는 때 — 날짜 폴더 다음다음 날 0시(UTC). 올린 지 적어도 하루는 지나야
 *  (댓글을 아직 쓰는 중일 수 있다) 정리한다. 자동 정리 · 라이브러리 화면이 같은 규칙을 쓴다. 댓글 이미지가 아니면 null */
export function commentImageDeleteAfter(path: string): Date | null {
  const m = new RegExp(`^${COMMENT_IMAGE_PREFIX}/(\\d{4}-\\d{2}-\\d{2})/`).exec(path);
  if (!m) return null;
  const day = Date.parse(`${m[1]}T00:00:00Z`);
  return Number.isFinite(day) ? new Date(day + 2 * 24 * 60 * 60 * 1000) : null;
}

/** 그 방문자가 그날 올린 이미지의 폴더 */
export function commentImageFolder(day: string, ipHash: string): string {
  return `${COMMENT_IMAGE_PREFIX}/${day}/${ipHash}`;
}

const PATH_IN_TEXT = new RegExp(`/${COMMENT_IMAGE_BUCKET}/(${COMMENT_IMAGE_PREFIX}/\\d{4}-\\d{2}-\\d{2}/[0-9a-f]+/[\\w-]+\\.webp)`, "g");

/** 댓글 본문들이 쓰는 댓글 이미지의 저장 경로 */
export function commentImagePathsIn(contents: Iterable<string>): Set<string> {
  const used = new Set<string>();
  for (const text of contents) for (const m of text.matchAll(PATH_IN_TEXT)) used.add(m[1]);
  return used;
}
