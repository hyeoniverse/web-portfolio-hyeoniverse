"use client";

import * as React from "react";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * 편집 화면의 글(버튼·안내·placeholder·오류)을 관리자 화면 언어로 고른다. `L("한글", "English")`.
 *
 * 콘텐츠 편집 언어(`lang`, 화면 위 KO/EN 토글)와 다르다. `lang` 은 어느 언어의 값을 고칠지와,
 * 미리보기에 그 언어의 글을 보여 주는 데만 쓴다. 예전에는 버튼·안내까지 `lang` 으로 골라서,
 * 관리자 화면이 영어여도 KO 를 고치는 동안에는 "md 불러오기"·"테이블 추가" 가 한국어로 나와
 * 옆의 "Defaults"·"Save Section"(관리자 화면 언어)과 섞였다.
 * 새 항목의 기본값("새 기능"/"New")처럼 콘텐츠로 들어가는 글은 여전히 `lang` 을 따른다.
 * 설정의 다른 화면들이 쓰는 `const L = (ko, en) => ...` 와 같은 모양이다.
 */
export function useL() {
  const { language } = useLanguage();
  /* 효과·메모의 deps 에 넣을 수 있게 언어가 바뀔 때만 새로 만든다 */
  return React.useCallback((ko: string, en: string) => (language === "ko" ? ko : en), [language]);
}
