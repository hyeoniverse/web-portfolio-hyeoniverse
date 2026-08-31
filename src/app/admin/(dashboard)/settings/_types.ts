/** 저장 시도의 결과 — 실패하면 이유를 함께 돌려준다(호출부가 그대로 보여줄 수 있게). */
export interface SaveResult {
  ok: boolean;
  reason?: string;
}

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
  /** 두 번째 인자는 읽어 갈 config — setConfig 직후라 state 가 아직 낡았을 때 넘긴다.
   *  구현(page.tsx)은 처음부터 받고 있었는데 타입에만 빠져 있었다. */
  saveSection: (paths: string[], source?: SiteConfigData) => Promise<unknown>;
  /** 지정된 dot-path 만 savedConfig 로 되돌리기. 섹션 헤더의 되돌리기 버튼이 호출 */
  revertSection: (paths: string[]) => void;
  /** 지정된 dot-path 만 siteConfig 기본값으로 재설정 */
  resetSection: (paths: string[]) => void;
  /** 현재 저장 중인 paths (UI 비활성/스피너용). null 이면 idle. */
  savingPaths: string[] | null;
  /** 현재 탭의 필수값 위반 메시지 (없으면 null). 있으면 섹션 저장 버튼도 비활성화. */
  validationError?: string | null;
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
  /** 비밀번호 로그인을 쓰는 계정인가. false 면 이메일·비밀번호 변경을 그리지 않는다. */
  hasPassword: boolean;
  /** passwordPolicy 는 개인 설정이 아니라 사이트 전역 설정이라 소유자에게만 보인다. */
  isOwner: boolean;
}
