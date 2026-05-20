import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/getSiteConfig";
import HomeClient from "./HomeClient";

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

export default function HomePage() {
  return <HomeClient />;
}
