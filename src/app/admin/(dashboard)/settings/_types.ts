import type { SiteConfigData } from "@/config/site.config";

/** SiteConfigData 안의 임의 nested key 를 안전하게 업데이트하기 위한 generic 함수 시그니처.
 *  callsite 가 (section, key) 타입을 매번 명시하므로 호출부에서 자동 좁혀짐. */
type UpdateSettingFn = <S extends keyof SiteConfigData>(
  section: S,
  key: keyof SiteConfigData[S],
  value: SiteConfigData[S][keyof SiteConfigData[S]],
) => void;

export interface SettingsTabProps {
  config: SiteConfigData;
  /** 마지막 저장 상태 — 섹션별 hasChanges 계산에 사용 */
  savedConfig: SiteConfigData;
  update: UpdateSettingFn;
  /** 지정된 dot-path 만 부분 저장. 섹션 헤더의 저장 버튼이 호출 */
  saveSection: (paths: string[]) => Promise<void>;
  /** 지정된 dot-path 만 savedConfig 로 되돌리기. 섹션 헤더의 되돌리기 버튼이 호출 */
  revertSection: (paths: string[]) => void;
  /** 지정된 dot-path 만 siteConfig 기본값으로 재설정 */
  resetSection: (paths: string[]) => void;
  /** 현재 저장 중인 paths (UI 비활성/스피너용). null 이면 idle. */
  savingPaths: string[] | null;
}

/** 카테고리·태그가 사용된 게시물 정보 — CategoriesEditor · ContentTab 리스트 공용 */
export interface AdminPostUsageInfo {
  id: string;
  title: string;
  title_en: string;
  category: string;
  slug: string;
  published: boolean;
  published_at: string | null;
  created_at: string | null;
  view_count: number;
  tags: string[];
}

/** 게시물/작품 row 메타 표시용 (발행상태 · 날짜 · 조회수). view_count 없으면 미표시 */
export interface PostMetaInfo {
  published: boolean;
  published_at: string | null;
  created_at: string | null;
  view_count?: number;
}

/** 저장/수정 작업 결과 (성공 여부 + 메시지) */
export interface Outcome {
  ok: boolean;
  msg: string;
}

export interface AccountTabProps {
  accountEmail: string;
  accountNewEmail: string;
  setAccountNewEmail: (v: string) => void;
  accountPassword: string;
  setAccountPassword: (v: string) => void;
  accountConfirm: string;
  setAccountConfirm: (v: string) => void;
  accountCurrentPassword: string;
  setAccountCurrentPassword: (v: string) => void;
  accountMessage: string;
  setAccountMessage: (v: string) => void;
  accountSaving: boolean;
  showPasswordConfirm: boolean;
  setShowPasswordConfirm: (v: boolean) => void;
  handleAccountUpdate: () => void;
  pendingEmail: string | null;
  emailChangeSentAt: string | null;
  onCancelPendingEmail: () => void;
  passwordPolicy: string;
  onPasswordPolicyChange: (v: string) => void;
}
