"use client";

import type { ComponentType } from "react";
import type { Project } from "@/data/projects";
import type { LandingPageSlug } from "./registry";

type PageProps = { project: Project; viewLang: "ko" | "en"; next?: { href: string; title: string } | null };

import HyeoniverseLanding from "./pages/HyeoniverseLanding";
import MacfolioLanding from "./pages/MacfolioLanding";

/** 작업물별 전용 랜딩 페이지 — 나눠 받지 않는다. 판 전환은 새 페이지가 커밋되는 순간 찍는데, 나눠 받으면
    그때 아직 코드가 없어 빈 화면이 밀려 들어왔다(무거운 데모는 LandingDemo 가 따로 나눠 받는다) */
const PAGES: Record<LandingPageSlug, ComponentType<PageProps>> = {
  hyeoniverse: HyeoniverseLanding,
  macfolio: MacfolioLanding,
};

export function LandingPage({ slug, ...props }: PageProps & { slug: LandingPageSlug }) {
  const Page = PAGES[slug];
  return <Page {...props} />;
}
