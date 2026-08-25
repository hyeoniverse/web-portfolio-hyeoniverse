import type { Metadata } from "next";
import { Suspense } from "react";
import { getProfileData } from "@/lib/getProfileData";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getGithubShowcase, loginFromLinks } from "@/lib/githubShowcase";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";
import BreakpointGuard from "@/components/common/BreakpointGuard";

export const metadata: Metadata = { title: "Profile" };
import ProfileMeSection from "./_components/ProfileMeSection";
import FloatingObject from "./_components/FloatingObject/FloatingObject";

export default async function ProfilePage() {
  const [profileData, siteConfig] = await Promise.all([getProfileData(), getSiteConfig()]);

  /* GitHub 활동 영역 — 사용자명은 설정값이 우선이고, 없으면 소유자 프로필의 GitHub 링크에서 뽑는다.
     설정을 따로 채우지 않아도 동작하게 하려는 것이다. 실패하면 이 영역만 빠진다. */
  const gh = profileData.github;
  const ownerAuthor = findOwnerAuthor((siteConfig.authors as Author[] | undefined) ?? []);
  const ghLogin = loginFromLinks(ownerAuthor?.links);
  const showcase = gh?.enabled === false || !ghLogin
    ? null
    : await getGithubShowcase(ghLogin, gh?.repos ?? []);

  return (
    <BreakpointGuard>
      <div className="content">
        <Suspense fallback={<div className="min-h-screen" />}>
          <ProfileMeSection profileData={profileData} showcase={showcase} />
        </Suspense>
        <FloatingObject />
      </div>
    </BreakpointGuard>
  );
}
