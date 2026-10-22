"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Project } from "@/data/projects";
import type { LandingPageSlug } from "./registry";

type PageProps = { project: Project; viewLang: "ko" | "en"; next?: { href: string; title: string } | null };

/** 작업물별 전용 랜딩 페이지 — 그 작업물을 볼 때만 받는다 */
const PAGES: Record<LandingPageSlug, ComponentType<PageProps>> = {
  hyeoniverse: dynamic(() => import("./pages/HyeoniverseLanding")),
  macfolio: dynamic(() => import("./pages/MacfolioLanding")),
};

export function LandingPage({ slug, ...props }: PageProps & { slug: LandingPageSlug }) {
  const Page = PAGES[slug];
  return <Page {...props} />;
}
