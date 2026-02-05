"use client";

import { Suspense } from "react";
import AboutMeSection from "../AboutMeSection/AboutMeSection";

export default function AboutPage() {
  return (
    <div className="content">
      <Suspense fallback={<div className="min-h-screen" />}>
        <AboutMeSection />
      </Suspense>
    </div>
  );
}
