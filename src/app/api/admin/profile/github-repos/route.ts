import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/api/requireRole";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getProfileData } from "@/lib/getProfileData";
import { listOwnedRepos, loginFromLinks, dueRepoKeys, withReadmeMeta, repoKey } from "@/lib/githubShowcase";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";
import { HOME_SLOT_COUNT, HOME_POOL_SPARE } from "@/data/works";

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
  const [owned, due] = await Promise.all([
    listOwnedRepos(login, gh?.orgs ?? []),
    /* 아무것도 고르지 않았을 때 홈에 나갈 저장소 후보. 설정 화면이 그걸 보여줘야 표지·제목을
       미리 손볼 수 있다 — 안 그러면 자동으로 나가는 것들은 건드릴 방법이 없다(#1057).
       규칙은 홈이 쓰는 것과 같은 함수를 부른다. 여기서 따로 계산하면 둘이 어긋난다.
       칸 수보다 넉넉히 받는다. 화면이 빼 둔 것을 걸러낸 뒤에 칸 수만큼 줄인다. */
    dueRepoKeys(login, gh?.repos ?? [], HOME_SLOT_COUNT + HOME_POOL_SPARE),
  ]);
  /* 카드로 그려질 저장소만 README 를 읽는다(#1060). 설정 화면이 "비워 두면 무엇이 쓰이는지" 를
     보여줘야 하는데, 지금은 공개 화면에서만 README 를 읽어 설정에서는 저장소 이름만 보였다.
     고를 수 있는 전체 목록에 걸면 저장소마다 요청이 하나씩 더 나가 요청 수 제한을 그대로 쓴다. */
  const cardKeys = new Set([
    ...((config.homeWorks?.repos ?? []) as { name: string }[]).map((r) => r.name),
    ...due,
  ]);
  const cards = owned.repos.filter((r) => cardKeys.has(repoKey(r, login)));
  const readme: Record<string, unknown> = {};
  for (const card of await withReadmeMeta(cards)) {
    /* 화면이 쓰는 건 표지·제목·소개뿐이다 — README 원문까지 실으면 응답이 저장소마다 수십 KB 늘어난다 */
    if (card.readme) {
      const { title, summary, image } = card.readme;
      readme[repoKey(card, login)] = { title, summary, image };
    }
  }

  /* orgs·failedOrgs 도 같이 내려 화면이 "조직을 찾긴 했는지", "받다가 실패했는지" 를 말할 수 있게 한다.
     조용히 빼 버리면 조직이 왜 안 보이는지 알 방법이 없다(#1059) */
  return NextResponse.json({ login, repos: owned.repos, orgs: owned.orgs, failedOrgs: owned.failedOrgs, due, readme });
}
