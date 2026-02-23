import type { Metadata } from "next";
import { Suspense } from "react";
import { getProfileData } from "@/lib/getProfileData";
import BreakpointGuard from "@/components/common/BreakpointGuard";

export const metadata: Metadata = { title: "Profile" };
import ProfileMeSection from "./_components/ProfileMeSection";
import FloatingObject from "./_components/FloatingObject/FloatingObject";

export default async function ProfilePage() {
  const profileData = await getProfileData();

  return (
    <BreakpointGuard>
      <div className="content">
        <Suspense fallback={<div className="min-h-screen" />}>
          <ProfileMeSection profileData={profileData} />
        </Suspense>
        <FloatingObject />
      </div>
    </BreakpointGuard>
  );
}
