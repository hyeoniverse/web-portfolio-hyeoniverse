import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Privacy Policy", description: "Privacy policy and data handling practices.", path: "/privacy" });
}

export default function PrivacyPage() {
  return <PrivacyClient />;
}
