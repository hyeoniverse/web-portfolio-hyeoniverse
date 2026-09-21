import type { Project } from "@/data/projects";

/* WorkArticleHeader · WorkArticleBody · WorkArticleTeam 이 공유하는 타입.
   셋은 작품 상세와 어드민 미리보기가 같은 레이아웃을 쓰도록 나눠 둔 presentational 컴포넌트다. */

export type RelatedPostItem = {
  id: string;
  title: string;
  title_en?: string;
  slug: string;
  cover_image: string;
  excerpt: string;
  category: string;
  created_at: string;
};

export type RelatedSeriesItem = {
  id: string;
  title: string;
  title_en?: string;
  cover_image?: string;
  category?: string;
  description?: string;
  description_en?: string;
};

export interface WorkArticleViewProps {
  project: Project;
  viewLang: "ko" | "en";
  /** 미리보기 모드 — 저장된 DB 레코드가 필요한 요소(좋아요/댓글 등)는 호출부에서 제외 */
  isPreview?: boolean;
  /** GitHub 저장소로 만들어진 화면에서 "들여 편집" 을 눌렀을 때 — 없으면 그 단추를 그리지 않는다 */
  onImportEdit?: () => void;
  /** 어드민 여부 — 편집 링크 노출. 미리보기에선 보통 미사용 */
  isAdmin?: boolean;
  /** 발행된 프로젝트 공개 URL — 미리보기에서 발행 상태면 새창으로 여는 버튼 노출 */
  viewHref?: string;
  onLangChange?: (l: "ko" | "en") => void;
  /** 관련 글 — info grid 안에 리스트로 표시 (Header 에서만 사용) */
  relatedPosts?: RelatedPostItem[];
  /** 관련 시리즈 — info grid 안에 표시 (Header 에서만 사용) */
  relatedSeries?: RelatedSeriesItem[];
}
