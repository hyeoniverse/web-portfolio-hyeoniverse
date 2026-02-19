"use client";

import { Suspense } from "react";
import BreakpointGuard from "@/components/common/BreakpointGuard";
import ProfileMeSection from "./_components/ProfileMeSection";
import FloatingObject from "./_components/FloatingObject/FloatingObject";

export default function ProfilePage() {
  return (
    <BreakpointGuard>
      <div className="content">
        <Suspense fallback={<div className="min-h-screen" />}>
          <ProfileMeSection />
        </Suspense>
        <FloatingObject />
      </div>
    </BreakpointGuard>
  );
}
