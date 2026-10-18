"use client";

import { useSyncExternalStore } from "react";
import { isBlogHost } from "@/lib/siteHosts";

const noop = () => () => {};

/** 지금 블로그 주소(blog.hyeoniverse.com)로 보고 있는가 — 서버에서 미리 그릴 땐 false(메인 기준)로 두고 브라우저에서 고친다 */
export function useIsBlogHost(): boolean {
  return useSyncExternalStore(noop, () => isBlogHost(window.location.host), () => false);
}
