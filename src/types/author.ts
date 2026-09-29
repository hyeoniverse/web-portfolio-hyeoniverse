/** 작성자 프로필 — site.config 의 authors 리스트에 저장되고, 게시물은 author_ids 로 참조. */
import type { SocialLink } from "./social";

export interface Author {
  /** 안정적 식별자 — 게시물의 author_ids 가 이 값을 참조 */
  id: string;
  name: string;
  /** 프로필 이미지 URL (없으면 이니셜 fallback) */
  avatar: string;
  /** 한 줄 역할/직함 */
  role: string;
  /** 이메일 (mailto 링크로 표시) */
  email: string;
  /** 소개 (길이 제한 없음, optional) */
  bio: string;
  /** 활동 지역 — GitHub 프로필의 location 에서 채워진다. 없으면 표시하지 않는다. */
  location?: string;
  /** 소셜/외부 링크 — SocialLinksEditor 로 편집 */
  links: SocialLink[];
  /* 영어 화면용 — 비어 있으면 위의 기본(한국어) 값을 쓴다(localizeAuthor). 작업물 팀원 연결도 이 값을 가져간다 */
  name_en?: string;
  role_en?: string;
  bio_en?: string;
  location_en?: string;
}
