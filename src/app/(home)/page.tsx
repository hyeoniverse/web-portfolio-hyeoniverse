import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { pageMetadata, jsonLd, SITE_ORIGIN } from "@/lib/seo";
import { getHomeWorks } from "@/lib/getHomeWorks";
import HomeClient from "./HomeClient";

// 홈 Selected Works 랭킹(핀·인기·최신)을 주기적으로 반영 — ISR
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  // 탭은 다른 페이지처럼 "HYEONIVERSE | Home" 으로 — 비우면 루트의 default 만 떠서 사이트 이름뿐이다. 공유 카드는 사이트 이름만
  return pageMetadata({ title: "Home", shareTitle: cfg.metadata.title, path: "/" });
}

export default async function HomePage() {
  const [homeWorks, cfg] = await Promise.all([getHomeWorks(), getSiteConfig()]);
  /* 검색 결과의 사이트 이름 · 사람 정보 — WebSite + Person */
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: cfg.metadata.title, url: SITE_ORIGIN, description: cfg.metadata.description },
      {
        "@type": "Person",
        name: cfg.metadata.author,
        url: SITE_ORIGIN,
        sameAs: (cfg.socialLinks ?? []).map((l) => l.url).filter(Boolean),
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <HomeClient homeWorks={homeWorks} />
    </>
  );
}
