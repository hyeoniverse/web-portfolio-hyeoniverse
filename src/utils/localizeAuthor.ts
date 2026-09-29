import type { Author } from "@/types/author";

/**
 * 화면 언어에 맞춘 저자 프로필 — 영어 화면이면 *_en 값을 쓰고, 비어 있으면 기본(한국어) 값으로 둔다.
 * 프로필의 기본 필드(name·role·bio·location)는 한국어이고, 영어는 설정의 멤버 편집에서 따로 적는다.
 */
export function localizeAuthor(author: Author, lang: "ko" | "en"): Author {
  if (lang !== "en") return author;
  return {
    ...author,
    name: author.name_en?.trim() || author.name,
    role: author.role_en?.trim() || author.role,
    bio: author.bio_en?.trim() || author.bio,
    location: author.location_en?.trim() || author.location,
  };
}
