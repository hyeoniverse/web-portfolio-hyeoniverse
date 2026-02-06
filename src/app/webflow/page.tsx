"use client";

import { Suspense } from "react";
import WebFlowSection from "./_components/WebFlowSection";

export default function WebFlowPage() {
  return (
    <div className="content">
      <Suspense fallback={<div className="min-h-screen" />}>
        <WebFlowSection />
      </Suspense>
    </div>
  );
}
