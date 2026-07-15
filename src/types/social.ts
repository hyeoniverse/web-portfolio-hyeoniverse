/** 소셜/외부 링크 — 설정의 소셜 링크와 작성자(Author) 링크가 공유하는 구조. */
export interface SocialLink {
  /** 플랫폼 키 (SOCIAL_ICONS 의 key). "custom" 이면 label/icon 직접 지정 */
  platform: string;
  url: string;
  /** custom 표시 라벨 (없으면 플랫폼 이름 사용) */
  label?: string;
  /** custom 업로드 아이콘 URL */
  icon?: string;
}
