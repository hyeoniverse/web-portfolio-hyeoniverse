import type { Metadata } from "next";
import DesignSystemClient from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Design System",
  description: "Design tokens, components, and visual language reference.",
};

export default function DesignSystemPage() {
  return <DesignSystemClient />;
}
