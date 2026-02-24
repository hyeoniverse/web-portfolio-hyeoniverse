"use client";

import { createContext, useContext, type ReactNode } from "react";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";

interface SiteConfigContextValue extends SiteConfigData {
  publicKeys: Record<string, string>;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  ...(siteConfig as unknown as SiteConfigData),
  publicKeys: {},
});

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
  return useContext(SiteConfigContext);
}
