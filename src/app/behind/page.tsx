import { Suspense } from "react";
import BreakpointGuard from "@/components/common/BreakpointGuard";
import BehindSection from "./_components/BehindSection";

export default function BehindPage() {
  return (
    <BreakpointGuard>
      <div className="content">
        <Suspense fallback={<div className="min-h-screen" />}>
          <BehindSection />
        </Suspense>
      </div>
    </BreakpointGuard>
  );
}
