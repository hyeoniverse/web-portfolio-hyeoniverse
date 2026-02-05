"use client";

import { Suspense } from "react";
import WorksSection from "../WorksSection/WorksSection";

export default function WorksPage() {
  return (
    <div className="content">
      <Suspense fallback={<div className="min-h-screen" />}>
        <WorksSection />
      </Suspense>
    </div>
  );
}
