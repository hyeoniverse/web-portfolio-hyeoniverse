import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy and data handling practices.",
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
