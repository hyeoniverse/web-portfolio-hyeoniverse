import { getSecret } from "@/lib/getSecret";

/**
 * 프로필 페이지의 GitHub 활동 영역 — 지표 + 고른 저장소.
 *
 * 저장소 목록을 한 번만 읽어 두 가지를 모두 만든다. 지표(주 사용 언어·최근 활동)는 목록을
 * 집계해서 얻고, 보여줄 저장소는 그 목록에서 골라낸다. 호출을 나누면 rate limit 만 두 배로 쓴다.
 *
 * 공개 API 라 토큰이 없어도 되지만(시간당 60회), 있으면 5000회가 된다. 어차피 ISR 로
 * 한 시간에 한 번만 실제 호출이 나가므로 토큰 없이도 여유가 있다.
 */

export interface GithubRepoCard {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  pushedAt: string;
}

/** 하루치 잔디 한 칸. level 은 GitHub 이 매기는 0~4 단계. */
export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GithubShowcase {
  login: string;
  profileUrl: string;
  /** 공개 저장소 수 — GitHub 이 세는 값을 그대로 쓴다(목록은 100개까지만 읽으므로). */
  publicRepos: number;
  followers: number;
  following: number;
  /** 계정 생성 시각(ISO) — "몇 년째" 를 계산한다. */
  createdAt: string;
  /** 소유 저장소의 스타·포크 합계. 포크·보관 저장소는 뺀다. */
  totalStars: number;
  totalForks: number;
  /** 주 사용 언어 — 소유한 저장소의 주 언어를 세어 많은 순. percent 는 합이 100 이 되게 반올림. */
  languages: { name: string; count: number; percent: number }[];
  /** 최근 몇 해의 활동 — 그 해에 손댄(push) 저장소 수. 오래된 해부터. */
  activity: { year: number; count: number }[];
  /** 가장 최근 push 시각(ISO). 없으면 빈 문자열. */
  lastPushedAt: string;
  /** 설정에서 고른 저장소. 고르지 않았으면 빈 배열. */
  repos: GithubRepoCard[];
  /** 최근 1년 잔디 — GraphQL 전용이라 GITHUB_TOKEN 이 있을 때만 채워진다. 없으면 null. */
  contributions: { total: number; weeks: ContributionDay[][] } | null;
}

/** ISR — 한 시간에 한 번만 실제로 GitHub 에 나간다. */
const REVALIDATE_SECONDS = 3600;

const str = (v: unknown): string => (typeof v === "string" && v ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

interface RawRepo {
  name?: unknown; html_url?: unknown; description?: unknown; language?: unknown;
  stargazers_count?: unknown; forks_count?: unknown; topics?: unknown;
  pushed_at?: unknown; fork?: unknown; archived?: unknown;
}

/** 최근 몇 해를 활동 막대로 보여줄지 — 더 늘리면 막대가 가늘어지기만 한다. */
const ACTIVITY_YEARS = 6;

async function gh(path: string, token: string | null): Promise<unknown | null> {
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toCard(r: RawRepo): GithubRepoCard {
  return {
    name: str(r.name),
    url: str(r.html_url),
    description: str(r.description),
    language: str(r.language),
    stars: num(r.stargazers_count),
    forks: num(r.forks_count),
    topics: Array.isArray(r.topics) ? (r.topics as unknown[]).map(str).filter(Boolean) : [],
    pushedAt: str(r.pushed_at),
  };
}

/**
 * 최근 1년 잔디.
 *
 * REST 에는 없는 데이터라 GraphQL 로만 가져올 수 있고, GraphQL 은 익명 호출을 받지 않는다.
 * 그래서 토큰이 없으면 null 을 돌려주고 화면은 그 자리에 연도별 활동 막대를 대신 그린다.
 * 토큰 유무로 화면이 깨지지 않게 하는 게 요점이다.
 */
async function fetchContributions(
  login: string,
  token: string | null,
): Promise<{ total: number; weeks: ContributionDay[][] } | null> {
  if (!token) return null;
  const query = `query($login:String!){
    user(login:$login){
      contributionsCollection{
        contributionCalendar{
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`;
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { login } }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { user?: { contributionsCollection?: { contributionCalendar?: {
        totalContributions?: unknown;
        weeks?: { contributionDays?: { date?: unknown; contributionCount?: unknown; contributionLevel?: unknown }[] }[];
      } } } };
    };
    const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal || !Array.isArray(cal.weeks)) return null;

    /* GraphQL 은 단계를 이름으로 준다 — 화면에서 쓰기 좋게 0~4 로 바꾼다. */
    const LEVELS: Record<string, 0 | 1 | 2 | 3 | 4> = {
      NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4,
    };
    const weeks = cal.weeks.map((w) =>
      (w.contributionDays ?? []).map((d) => ({
        date: str(d.date),
        count: num(d.contributionCount),
        level: LEVELS[str(d.contributionLevel)] ?? 0,
      })),
    );
    return { total: num(cal.totalContributions), weeks };
  } catch {
    return null;
  }
}

/**
 * @param login    GitHub 사용자명
 * @param selected 보여줄 저장소 이름 목록. 순서를 그대로 지킨다.
 */
export async function getGithubShowcase(
  login: string,
  selected: readonly string[] = [],
): Promise<GithubShowcase | null> {
  if (!login) return null;
  const token = await getSecret("GITHUB_TOKEN").catch(() => null);

  const [userRaw, reposRaw, contributions] = await Promise.all([
    gh(`/users/${encodeURIComponent(login)}`, token),
    gh(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&type=owner`, token),
    fetchContributions(login, token),
  ]);
  if (!userRaw) return null;

  const user = userRaw as Record<string, unknown>;
  const list = (Array.isArray(reposRaw) ? (reposRaw as RawRepo[]) : []);

  /* 포크와 보관된 저장소는 활동 지표에서 뺀다 — 직접 쓴 코드가 아니거나 더 이상 손대지 않는다. */
  const own = list.filter((r) => r.fork !== true && r.archived !== true);

  const langCount = new Map<string, number>();
  for (const r of own) {
    const lang = str(r.language);
    if (lang) langCount.set(lang, (langCount.get(lang) ?? 0) + 1);
  }

  const byName = new Map(list.map((r) => [str(r.name), r]));
  const repos = selected
    .map((name) => byName.get(name))
    .filter((r): r is RawRepo => Boolean(r))
    .map(toCard);

  const langTotal = [...langCount.values()].reduce((a, b) => a + b, 0);

  /* 연도별 활동 — 그 해에 마지막으로 손댄 저장소를 센다. 커밋 수가 아니라 "그 해에 뭘 굴렸나"
     의 근사치다. 정확한 커밋 잔디는 위의 contributions 가 있을 때 그쪽을 쓴다. */
  const thisYear = new Date(own.map((r) => str(r.pushed_at)).sort().reverse()[0] || Date.now()).getFullYear();
  const yearCount = new Map<number, number>();
  for (const r of own) {
    const y = new Date(str(r.pushed_at)).getFullYear();
    if (Number.isFinite(y)) yearCount.set(y, (yearCount.get(y) ?? 0) + 1);
  }
  const activity = Array.from({ length: ACTIVITY_YEARS }, (_, i) => {
    const year = thisYear - (ACTIVITY_YEARS - 1 - i);
    return { year, count: yearCount.get(year) ?? 0 };
  });

  return {
    login,
    profileUrl: str(user.html_url) || `https://github.com/${login}`,
    publicRepos: num(user.public_repos),
    followers: num(user.followers),
    following: num(user.following),
    createdAt: str(user.created_at),
    totalStars: own.reduce((sum, r) => sum + num(r.stargazers_count), 0),
    totalForks: own.reduce((sum, r) => sum + num(r.forks_count), 0),
    languages: [...langCount.entries()]
      .map(([name, count]) => ({ name, count, percent: langTotal ? (count / langTotal) * 100 : 0 }))
      .sort((a, b) => b.count - a.count),
    activity,
    lastPushedAt: own.map((r) => str(r.pushed_at)).sort().reverse()[0] ?? "",
    repos,
    contributions,
  };
}

/** 설정에서 고를 수 있도록 소유한 저장소 이름을 최근 push 순으로 돌려준다. */
export async function listOwnedRepos(login: string): Promise<GithubRepoCard[]> {
  if (!login) return [];
  const token = await getSecret("GITHUB_TOKEN").catch(() => null);
  const raw = await gh(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&type=owner`, token);
  if (!Array.isArray(raw)) return [];
  return (raw as RawRepo[]).filter((r) => r.archived !== true).map(toCard);
}

export { githubLoginFromLinks as loginFromLinks } from "@/utils/githubLogin";
