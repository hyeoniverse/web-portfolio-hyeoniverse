import type { Metadata } from "next";
import { Suspense } from "react";
import BreakpointGuard from "@/components/common/BreakpointGuard";
import AboutSection from "./_components/AboutSection";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <BreakpointGuard>
      <div className="content">
        <Suspense fallback={<div className="min-h-screen" />}>
          <AboutSection />
        </Suspense>
      </div>
    </BreakpointGuard>
  );
}
