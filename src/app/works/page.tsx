"use client";

import { Suspense } from "react";
import WorksSection from "../WorksSection/WorksSection";

export default function WorksPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-primary, #f8f6f0)" }} />}>
      <WorksSection />
    </Suspense>
  );
}
