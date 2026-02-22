"use client";

import { createContext, useContext, type ReactNode } from "react";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";

const SiteConfigContext = createContext<SiteConfigData>(
  siteConfig as unknown as SiteConfigData
);

export function SiteConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig: SiteConfigData;
  children: ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={initialConfig}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfigData {
  return useContext(SiteConfigContext);
}
