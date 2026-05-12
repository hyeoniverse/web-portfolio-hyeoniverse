import type { SiteConfigData } from "@/config/site.config";

/** SiteConfigData 안의 임의 nested key 를 안전하게 업데이트하기 위한 generic 함수 시그니처.
 *  callsite 가 (section, key) 타입을 매번 명시하므로 호출부에서 자동 좁혀짐. */
export type UpdateSettingFn = <S extends keyof SiteConfigData>(
  section: S,
  key: keyof SiteConfigData[S],
  value: SiteConfigData[S][keyof SiteConfigData[S]],
) => void;

export interface SettingsTabProps {
  config: SiteConfigData;
  update: UpdateSettingFn;
  styles: Record<string, string>;
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
  styles: Record<string, string>;
}
