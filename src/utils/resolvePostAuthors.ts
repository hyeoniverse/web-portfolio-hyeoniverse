import type { Author } from "@/types/author";

/**
 * 소유자 프로필의 고정 id.
 *
 * site.config 의 authors 첫 항목이자, 소유자 계정의 app_metadata.author_id 가 가리키는 값이다.
 * 기존 게시물의 author_ids 도 이 값을 참조하므로 바꾸면 연결이 끊어진다.
 */
export const OWNER_AUTHOR_ID = "owner";

/**
 * 소유자 프로필을 찾는다.
 *
 * 첫 항목이 아니라 id 로 찾는 이유는, 설정에서 저자를 추가·삭제하면 배열 순서가 바뀌기
 * 때문이다. 실제로 소유자 프로필이 배열에서 빠지고 다른 프로필이 첫 자리로 올라가
 * 모든 게시물의 작성자가 그 사람으로 표시된 적이 있다.
 */
export function findOwnerAuthor(authors: readonly Author[]): Author | null {
  return authors.find((a) => a.id === OWNER_AUTHOR_ID) ?? null;
}

/**
 * 게시물의 author_ids 를 Author 목록으로 해석한다.
 *
 * 작성자가 지정되지 않았거나 지정된 id 가 설정에 없으면 **소유자**로 돌아간다.
 * 소유자는 관리자이자 저자이므로, 주인이 명시되지 않은 글의 주인은 소유자다.
 */
export function resolvePostAuthors(
  authors: readonly Author[] | undefined,
  authorIds: readonly string[] | null | undefined,
): Author[] {
  const all = authors ?? [];
  const resolved = (authorIds ?? [])
    .map((id) => all.find((a) => a.id === id))
    .filter((a): a is Author => Boolean(a));
  if (resolved.length > 0) return resolved;
  const owner = findOwnerAuthor(all);
  return owner ? [owner] : [];
}

/**
 * 소유자 프로필이 반드시 목록에 있게 만든다.
 *
 * 저자 배열은 설정에서 저장할 때 통째로 교체된다(병합이 배열을 합치지 않는다). 그 저장에
 * 소유자 항목이 빠지면 소유자 프로필이 사라지고, 그에 기대는 것들이 함께 무너진다 —
 * 작성자 미지정 글의 표시, 작성자 필터, 설정 화면의 소유자 행("나" 배지 포함).
 *
 * 이미 있으면 그대로 둔다(이름·아바타를 고쳤을 수 있다). 없을 때만 맨 앞에 되돌린다.
 * 서버(getSiteConfig)와 설정 화면이 같은 함수를 써야 한 쪽만 고쳐지는 일이 없다.
 */
export function withOwnerAuthor(
  authors: readonly Author[] | undefined,
  ownerFallback: Author | undefined,
): Author[] {
  const list = Array.isArray(authors) ? [...authors] : [];
  if (!ownerFallback) return list;
  if (list.some((a) => a.id === OWNER_AUTHOR_ID)) return list;
  return [structuredClone(ownerFallback), ...list];
}
