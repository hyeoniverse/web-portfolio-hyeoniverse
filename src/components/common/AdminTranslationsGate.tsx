"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * admin 번역(`admin.*`)을 지연 로드하고, 준비되기 전에는 children 을 렌더하지 않는다.
 *
 * `admin.*` 은 사전의 66%(ko 32.8 / en 41.6 kB)를 차지하는데 공개 방문자는 쓰지 않는다.
 * 정적 import 를 끊어 공개 라우트 번들에서 빼고, admin 영역에서만 별도 chunk 로 받는다.
 *
 * **ko/en 을 모두 불러온다.** admin 에디터가 `tLang(key, "ko")` / `tLang(key, "en")` 로
 * 양쪽을 동시에 쓰고(WorkEditor·PostEditor 의 이중 언어 저작), `T` 컴포넌트도 반대 언어를
 * 툴팁에 띄우기 때문이다.
 *
 * 로드 전에 렌더하면 `getNestedValue` 가 키를 그대로 반환해 화면에 `admin.posts.title`
 * 같은 문자열이 잠깐 노출된다. 그래서 준비될 때까지 막는다 — admin 은 이미 인증 확인으로
 * 한 박자 늦게 뜨는 영역이라 체감 차이가 없다.
 */
export default function AdminTranslationsGate({ children }: { children: React.ReactNode }) {
  const { addTranslations } = useLanguage();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    Promise.all([
      import("@/locales/ko.admin.json"),
      import("@/locales/en.admin.json"),
    ])
      .then(([koMod, enMod]) => {
        if (!alive) return;
        addTranslations({ ko: koMod.default, en: enMod.default });
        setReady(true);
      })
      .catch(() => {
        // 사전을 못 받아도 화면 자체는 띄운다 — 번역 키가 노출되지만 admin 이 잠기는 것보다 낫다
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, [addTranslations]);

  if (!ready) return null;
  return <>{children}</>;
}
