"use client";

import { createContext, useContext, type ReactNode } from "react";
import SectionActions from "./SectionActions";
import { deepEqual } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import type { ProfileData } from "@/types/profile";

export type ProfileKey = keyof ProfileData;

/**
 * 프로필 섹션의 기본값 / 되돌리기 / 섹션 저장.
 *
 * 사이트 설정(config)은 SectionHeader 가 같은 일을 하지만 그건 dot-path 와 saveSection 에
 * 묶여 있다. 프로필 내용은 config 가 아니라 별도 blob(/api/admin/profile)에 있어 저장 경로가
 * 다르다 — 그래서 같은 모양의 버튼을 이쪽 데이터에 맞춰 따로 둔다.
 *
 * 값을 위에서부터 일일이 내려보내면 ContentTab 을 지나 세 컴포넌트로 갈라진다. 화면 한 곳에서만
 * 쓰는 값이라 context 로 묶는다.
 */
export interface ProfileSectionApi {
  data: ProfileData;
  savedData: ProfileData;
  defaults: ProfileData;
  save: (keys: ProfileKey[]) => Promise<unknown>;
  revert: (keys: ProfileKey[]) => void;
  reset: (keys: ProfileKey[]) => void;
  /** 지금 저장 중인 섹션의 키. 다른 섹션 버튼은 그동안 잠근다. */
  savingKeys: ProfileKey[] | null;
}

const ProfileSectionContext = createContext<ProfileSectionApi | null>(null);

export function ProfileSectionProvider({
  value, children,
}: {
  value: ProfileSectionApi;
  children: ReactNode;
}) {
  return <ProfileSectionContext.Provider value={value}>{children}</ProfileSectionContext.Provider>;
}

/**
 * 버튼 묶음.
 *
 * 설정 화면 밖(디자인 시스템 미리보기 등)에서 같은 편집기를 쓸 수도 있어, context 가 없으면
 * 아무것도 그리지 않는다 — 동작하지 않는 저장 버튼을 두면 안 된다.
 */
export default function ProfileSectionActions({ keys }: { keys: ProfileKey[] }) {
  const api = useContext(ProfileSectionContext);
  if (!api) return null;

  const { data, savedData, defaults, save, revert, reset, savingKeys } = api;

  const dirty = keys.some((k) => !deepEqual(data[k], savedData[k]));
  const atDefault = keys.every((k) => deepEqual(data[k], defaults[k]));
  const savingThis =
    savingKeys != null && savingKeys.length === keys.length && savingKeys.every((k) => keys.includes(k));
  const savingOther = savingKeys != null && !savingThis;

  return (
    <SectionActions
      dirty={dirty}
      atDefault={atDefault}
      saving={savingThis}
      savingOther={savingOther}
      onReset={() => reset(keys)}
      onRevert={() => revert(keys)}
      onSave={() => save(keys)}
    />
  );
}
