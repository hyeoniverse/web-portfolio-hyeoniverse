/* About 편집기 ↔ 미리보기(/about?preview=1 iframe) 사이의 메시지.
   같은 출처에서 부모 창이 보낸 것만 받는다 — 미리보기는 저장하지 않은 설정을 그 탭 안에서만 그린다. */
import type { SiteConfigData } from "@/config/site.config";

export const ABOUT_PREVIEW_PARAM = "preview";

export type AboutPreviewMessage =
  /** 미리보기가 준비됐다 — 편집기는 지금 설정과 볼 곳을 보낸다 */
  | { type: "about-preview:ready" }
  /** 저장하지 않은 About 설정 */
  | { type: "about-preview:config"; about: SiteConfigData["about"] }
  /** 이 장(#features 같은 목차 앵커)으로 카메라를 옮긴다 */
  | { type: "about-preview:goto"; anchor: string };

export function isAboutPreviewMessage(e: MessageEvent): e is MessageEvent<AboutPreviewMessage> {
  return e.origin === window.location.origin && typeof e.data?.type === "string" && e.data.type.startsWith("about-preview:");
}

/** 지금 창이 편집기 안의 미리보기인가 */
export function inAboutPreview(): boolean {
  if (typeof window === "undefined" || window.parent === window) return false;
  return new URLSearchParams(window.location.search).has(ABOUT_PREVIEW_PARAM);
}
