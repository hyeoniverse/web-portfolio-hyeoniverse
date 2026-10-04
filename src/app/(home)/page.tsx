import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getHomeWorks } from "@/lib/getHomeWorks";
import HomeClient from "./HomeClient";

// 홈 Selected Works 랭킹(핀·인기·최신)을 주기적으로 반영 — ISR
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  return {
    title: "Home", // 다른 페이지처럼 "HYEONIVERSE | Home" 으로 — 비우면 루트의 default 만 떠서 사이트 이름뿐이다
    description: cfg.metadata.description,
    openGraph: {
      title: cfg.metadata.title,
      description: cfg.metadata.description,
      type: "website",
    },
  };
}

export default async function HomePage() {
  const homeWorks = await getHomeWorks();
  return <HomeClient homeWorks={homeWorks} />;
}
