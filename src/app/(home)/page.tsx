import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getHomeWorks } from "@/lib/getHomeWorks";
import HomeClient from "./HomeClient";

// 홈 Selected Works 랭킹(핀·인기·최신)을 주기적으로 반영 — ISR
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  return {
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
