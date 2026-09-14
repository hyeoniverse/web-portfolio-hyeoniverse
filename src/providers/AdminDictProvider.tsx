"use client";

import { useContext, useMemo, type ReactNode } from "react";
import { LanguageContext, type Language, type Translations } from "@/providers/LanguageProvider";

/**
 * admin 사전을 이미 로드한 상태로 대시보드 하위 트리에 제공한다.
 *
 * `AdminTranslationsGate` 는 admin 사전을 **클라이언트에서** 늦게 불러오느라 그때까지 화면을
 * 가렸다. 대신 서버 컴포넌트인 `(dashboard)/layout` 이 `*.admin.json` 을 정적 import 해
 * 이 provider 에 넘기면, 서버 렌더 시점부터 `t("admin.*")` 가 풀려 콘텐츠가 첫 HTML 에 실린다.
 *
 * 루트 `LanguageProvider` 의 값을 읽어 `dict` 만 admin 사전으로 덮어 다시 provide 한다.
 * 언어 스토어(subscribe/getLanguage/setLanguage 등)는 그대로 물려받으므로 언어 토글이
 * 루트와 어긋나지 않는다. dict 는 `{정적 + admin}` 이라 공개 키도 그대로 조회된다.
 */
export default function AdminDictProvider({
  dict,
  children,
}: {
  dict: Record<Language, Translations>;
  children: ReactNode;
}) {
  const parent = useContext(LanguageContext);
  const value = useMemo(
    () => ({
      ...parent,
      dict: {
        ko: { ...parent.dict.ko, ...dict.ko },
        en: { ...parent.dict.en, ...dict.en },
      },
    }),
    [parent, dict],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
