import type { SiteConfigData } from "./site.config";

/* 모든 페이지의 HTML 에 싣는 사이트 설정(#944).
   루트 레이아웃이 SiteConfigProvider 로 넘기는 값은 RSC 페이로드에 통째로 들어가, 어느 페이지를 열든 받는다. 그 가운데
   /about 패널 내용(about)과 태그 설명(tagDescriptions)이 압축 기준 70% 남짓이었는데, 둘 다 한 곳에서만 쓴다. 모바일 /posts
   에서는 이 바이트가 LCP 배너 이미지와 회선을 나눴다.
   about 에서는 여러 페이지 아래의 크레딧(CreditsFooter)이 쓰는 필드만 남긴다. /about 은 AboutConfigProvider 로, 관리자
   글 편집기는 /api/admin/tags 응답으로 따로 받는다. 서버 레이아웃이 부르므로 "use client" 파일에 두지 않는다 */
const CREDITS_KEYS = [
  "creditsNames",
  "creditsNote",
  "creditsNote_ko",
  "creditsNoteFontSize",
  "creditsNoteFontFamily",
  "creditsNoteLineHeight",
  "creditsNoteAlign",
] as const;

export type SiteWideConfig = Omit<SiteConfigData, "about" | "tagDescriptions"> & {
  about: Pick<SiteConfigData["about"], (typeof CREDITS_KEYS)[number]>;
};

export function toSiteWideConfig(config: SiteConfigData): SiteWideConfig {
  const { about, tagDescriptions, ...rest } = config;
  void tagDescriptions;
  const credits = Object.fromEntries(CREDITS_KEYS.map((key) => [key, about[key]])) as SiteWideConfig["about"];
  return { ...rest, about: credits };
}
