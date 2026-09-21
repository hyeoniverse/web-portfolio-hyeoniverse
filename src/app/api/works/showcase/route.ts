import { requireAuth } from "@/lib/api/requireAuth";
import { jsonOk } from "@/lib/api/response";
import { getRepoCandidates } from "@/lib/getWorksProjects";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { loginFromLinks } from "@/lib/githubShowcase";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";

/**
 * GET /api/works/showcase — 불러오기 창이 고를 GitHub 저장소 목록.
 *
 * 소유 계정과 조직의 저장소를 최근에 손댄 순으로 준다. 홈 화면 설정(고르기·숨기기)은 보지 않는다 —
 * 그건 홈의 원에 무엇을 띄울지의 문제다.
 *
 * 이미 들여 둔 것(휴지통 포함)도 함께 주고 imported 로 표시만 한다 — 창에서 "이미 불러옴" 이라고
 * 알려 주고, 그것을 다시 고르면 README 를 새로 가져올지 묻는다.
 */
export async function GET() {
  const { supabase, error } = await requireAuth();
  if (error) return error;

  const [repos, siteConfig] = await Promise.all([getRepoCandidates(), getSiteConfig()]);
  /* 내 계정인지 조직인지 가르려면 기준이 되는 계정을 알아야 한다 */
  const login = loginFromLinks(findOwnerAuthor((siteConfig.authors as Author[] | undefined) ?? [])?.links);
  /* 주소로 쓸 slug 는 저장소 이름을 소문자로 굳힌 값이다(들일 때와 같은 규칙) */
  const slugs = repos.map((r) => r.name.toLowerCase());

  const { data: rows } = await supabase
    .from("works")
    .select("slug")
    .in("slug", slugs);
  const taken = new Set((rows ?? []).map((r) => r.slug));

  return jsonOk({
    login,
    works: repos.map((repo) => {
      const slug = repo.name.toLowerCase();
      return {
        id: `gh-${repo.owner}-${repo.name}`,
        slug,
        title: { ko: repo.name, en: repo.name },
        image: "",
        year: repo.pushedAt ? repo.pushedAt.slice(0, 4) : "",
        githubUrl: repo.url,
        owner: repo.owner,
        /* 내 계정이 아니면 조직 저장소 — 창에서 따로 묶어 보여 준다 */
        isOrg: !!login && repo.owner.toLowerCase() !== login.toLowerCase(),
        imported: taken.has(slug),
      };
    }),
  });
}
