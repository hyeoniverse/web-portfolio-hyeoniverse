"use client";

import { Suspense } from "react";
import BreakpointGuard from "@/components/common/BreakpointGuard";
import AboutMeSection from "./_components/AboutMeSection";

export default function AboutPage() {
  return (
    <BreakpointGuard>
      <div className="content">
        <Suspense fallback={<div className="min-h-screen" />}>
          <AboutMeSection />
        </Suspense>
      </div>
    </BreakpointGuard>
  );
}
