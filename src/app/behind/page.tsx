import { Suspense } from "react";
import BehindSection from "./_components/BehindSection";

export default function BehindPage() {
  return (
    <div className="content">
      <Suspense fallback={<div className="min-h-screen" />}>
        <BehindSection />
      </Suspense>
    </div>
  );
}
