import type { SiteConfigData } from "@/config/site.config";

export interface SettingsTabProps {
  config: SiteConfigData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (section: any, key: any, value: any) => void;
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
  styles: Record<string, string>;
}
