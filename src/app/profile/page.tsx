import type { Metadata } from "next";
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

  /* ProfileMeSection 을 <Suspense> 로 감싸지 않는다.
   *
   * suspend 하는 게 없어서(useSearchParams 도 lazy 도 없고 데이터는 위에서 이미 await 했다)
   * 경계가 하는 일이 없는데, React 는 Suspense 경계를 본체와 분리해 나중에 hydration 한다.
   * 그 늦은 패스에서는 클라이언트 값을 읽는다 — 언어는 서버가 `ko` 로 그리고 클라이언트가
   * 브라우저 언어로 바꾸는 값이라, 경계 안의 번역 텍스트가 전부 어긋나서 React 가 이 트리를
   * 통째로 다시 그렸다. 24회 중 13회. 경계를 빼면 0회.
   *
   * 다른 페이지의 <Suspense> 는 useSearchParams 때문에 필요한 것이라 그대로 둔다. */
  return (
    <BreakpointGuard>
      <div className="content">
        <ProfileMeSection profileData={profileData} showcase={showcase} />
        <FloatingObject />
      </div>
    </BreakpointGuard>
  );
}
