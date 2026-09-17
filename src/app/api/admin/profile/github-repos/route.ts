import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/api/requireRole";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getProfileData } from "@/lib/getProfileData";
import { listOwnedRepos, loginFromLinks, dueRepoKeys } from "@/lib/githubShowcase";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";

/**
 * GET /api/admin/profile/github-repos — 고를 수 있는 저장소 목록
 *
 * 계정은 소유자 저자 프로필의 GitHub 링크에서 뽑는다. 공개 페이지의 판정과 같은 규칙이고,
 * 요청으로 계정을 지정받지 않는다 — 어느 계정의 저장소를 보여줄지는 설정 화면이 아니라
 * 저자 프로필이 정한다.
 *
 * owner 전용. 프로필 페이지 설정을 다루는 화면에서만 쓰인다.
 */
export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const config = await getSiteConfig();
  const owner = findOwnerAuthor((config.authors as Author[] | undefined) ?? []);
  const login = loginFromLinks(owner?.links);

  if (!login) {
    return NextResponse.json(
      { error: "소유자 프로필에 GitHub 링크가 없습니다. 멤버 설정에서 링크를 추가해 주세요.", code: "GITHUB_OWNER_LINK_MISSING", repos: [] },
      { status: 400 },
    );
  }

  /* 조직 저장소도 같이 준다. 공개 소속 조직은 자동으로 잡히고, 여기 적힌 조직은 거기에 더해진다 */
  const gh = (await getProfileData()).github;
  const [repos, due] = await Promise.all([
    listOwnedRepos(login, gh?.orgs ?? []),
    /* 아무것도 고르지 않았을 때 홈에 나갈 저장소. 설정 화면이 그걸 보여줘야 표지·제목을
       미리 손볼 수 있다 — 안 그러면 자동으로 나가는 것들은 건드릴 방법이 없다(#1057).
       규칙은 홈이 쓰는 것과 같은 함수를 부른다. 여기서 따로 계산하면 둘이 어긋난다. */
    dueRepoKeys(login, gh?.repos ?? []),
  ]);
  return NextResponse.json({ login, repos, due });
}
