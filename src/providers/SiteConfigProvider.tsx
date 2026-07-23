"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteConfigData } from "@/config/site.config";

interface SiteConfigContextValue extends SiteConfigData {
  publicKeys: Record<string, string>;
}

/**
 * 기본값을 두지 않는다.
 *
 * 예전에는 `siteConfig` 원본을 통째로 기본값으로 넣었는데, 이 파일이 "use client" 라
 * **site.config.ts(1,637줄, gzip 26 kB)가 전 라우트 공통 번들에 실렸다.**
 * 실제로는 루트 layout 이 `<body>` 전체를 이 Provider 로 감싸고 서버에서 `initialConfig` 를
 * 주입하므로 그 기본값은 한 번도 쓰이지 않았다.
 *
 * null 로 두고 `useSiteConfig` 에서 걸러내면, Provider 밖 사용은 조용히 빈 config 로
 * 동작하는 대신 즉시 드러난다.
 */
const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({
  initialConfig,
  publicKeys,
  children,
}: {
  initialConfig: SiteConfigData;
  publicKeys?: Record<string, string>;
  children: ReactNode;
}) {
  const value: SiteConfigContextValue = { ...initialConfig, publicKeys: publicKeys ?? {} };
  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfigContextValue {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error("useSiteConfig must be used within a SiteConfigProvider");
  }
  return context;
}
