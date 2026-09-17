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

/**
 * 프로필의 Pinned 영역에 실제로 그려지는 개수.
 *
 * 화면(ProfileGithub)과 고르는 화면(ProfileGithubEditor)이 같은 값을 봐야 한다 —
 * 예전엔 화면에서만 잘라내서, 관리자에서 일곱 개째를 골라도 아무 말 없이 사라졌다.
 */
export const PINNED_REPO_LIMIT = 6;

export interface GithubRepoCard {
  name: string;
  /** 소유 계정 — 개인 계정이거나 조직 이름 */
  owner: string;
  /** `owner/name`. 조직 저장소는 이름이 겹칠 수 있어 고를 때는 이 값으로 가리킨다 */
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  pushedAt: string;
}

/** 하루치 잔디 한 칸. level 은 GitHub 이 매기는 0~4 단계. */
interface ContributionDay {
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
  /** 고른 게 없을 때 대신 쓸 목록 — 소유 저장소를 스타 많은 순, 같으면 최근에 손댄 순으로.
      홈이 보여줄 게 하나도 없을 때 여기를 쓴다. 고르는 화면(프로필)은 위 repos 만 본다. */
  topRepos: GithubRepoCard[];
  /** 최근 1년 잔디 — GraphQL 전용이라 GITHUB_TOKEN 이 있을 때만 채워진다. 없으면 null. */
  contributions: { total: number; weeks: ContributionDay[][] } | null;
}

/** ISR — 한 시간에 한 번만 실제로 GitHub 에 나간다. */
const REVALIDATE_SECONDS = 3600;

const str = (v: unknown): string => (typeof v === "string" && v ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

interface RawRepo {
  name?: unknown; full_name?: unknown; owner?: unknown; html_url?: unknown;
  description?: unknown; language?: unknown;
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

/** `owner/name` — full_name 이 없으면(응답 모양이 달라지면) owner 객체와 이름으로 짓는다 */
function ownerOf(r: RawRepo): string {
  const login = str((r.owner as Record<string, unknown> | undefined)?.login);
  if (login) return login;
  const full = str(r.full_name);
  return full.includes("/") ? full.split("/")[0] : "";
}

function toCard(r: RawRepo): GithubRepoCard {
  const owner = ownerOf(r);
  const name = str(r.name);
  return {
    name,
    owner,
    fullName: str(r.full_name) || (owner ? `${owner}/${name}` : name),
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

  /* 고른 것에 조직 저장소(`owner/name`)가 섞여 있으면 그 조직 목록도 받아 온다.
     지표(own)는 개인 저장소만 센다 — 조직 저장소는 내가 쓴 코드인지 여기서 알 수 없다. */
  const wantedOrgs = [...new Set(
    selected
      .filter((s) => s.includes("/"))
      .map((s) => s.split("/")[0])
      .filter((o) => o && o.toLowerCase() !== login.toLowerCase()),
  )];
  const orgLists = await Promise.all(
    wantedOrgs.map((org) => gh(`/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=pushed`, token)),
  );

  /* 예전 설정은 개인 저장소를 이름만으로 적어 뒀다 — 그 표기도 계속 찾아지게 둘 다 넣는다 */
  const byKey = new Map<string, RawRepo>();
  for (const r of list) byKey.set(str(r.name), r);
  for (const raw of [list, ...orgLists]) {
    if (!Array.isArray(raw)) continue;
    for (const r of raw as RawRepo[]) byKey.set(toCard(r).fullName, r);
  }

  const repos = selected
    .map((name) => byKey.get(name))
    .filter((r): r is RawRepo => Boolean(r))
    .map(toCard);

  const topRepos = [...own]
    .sort((a, b) => num(b.stargazers_count) - num(a.stargazers_count) || str(b.pushed_at).localeCompare(str(a.pushed_at)))
    .slice(0, PINNED_REPO_LIMIT)
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
    topRepos,
    contributions,
  };
}

/**
 * 고를 수 있는 저장소 — 개인 계정의 것과 조직의 것을 합쳐 최근 push 순으로 돌려준다.
 *
 * 조직은 두 갈래로 모은다. 기본은 그 계정이 공개적으로 속한 조직이고(`/users/{login}/orgs`),
 * 설정에 조직 이름을 적어 두면 거기에 더한다 — 소속을 비공개로 둔 조직은 목록에 안 잡히기 때문이다.
 * 이름이 겹칠 수 있으므로(`content` 가 개인에도 조직에도 있을 수 있다) `owner/name` 으로 구분한다.
 */
export async function listOwnedRepos(login: string, extraOrgs: readonly string[] = []): Promise<GithubRepoCard[]> {
  if (!login) return [];
  const token = await getSecret("GITHUB_TOKEN").catch(() => null);
  const orgs = await resolveOrgs(login, extraOrgs, token);

  const lists = await Promise.all([
    gh(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&type=owner`, token),
    ...orgs.map((org) => gh(`/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=pushed`, token)),
  ]);

  const byFullName = new Map<string, GithubRepoCard>();
  for (const raw of lists) {
    if (!Array.isArray(raw)) continue;
    for (const r of raw as RawRepo[]) {
      if (r.archived === true) continue;
      const card = toCard(r);
      if (card.name) byFullName.set(card.fullName, card);
    }
  }
  return [...byFullName.values()].sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
}

/** 소속 조직(공개) + 설정에 적어 둔 조직. 대소문자만 다른 중복은 하나로 본다 */
async function resolveOrgs(login: string, extraOrgs: readonly string[], token: string | null): Promise<string[]> {
  const raw = await gh(`/users/${encodeURIComponent(login)}/orgs?per_page=100`, token);
  const memberOf = Array.isArray(raw)
    ? (raw as Array<Record<string, unknown>>).map((o) => str(o.login)).filter(Boolean)
    : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...memberOf, ...extraOrgs.map((o) => o.trim()).filter(Boolean)]) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export { githubLoginFromLinks as loginFromLinks } from "@/utils/githubLogin";

/**
 * 홈 설정에서 아무것도 고르지 않았을 때 실제로 나갈 저장소 키(#1057).
 *
 * 홈이 쓰는 규칙(프로필에서 고른 것 → 없으면 스타 많은 순 소유 저장소)을 여기 한 번만 적어 두고,
 * 공개 화면과 설정 화면이 같이 부른다. 각자 계산하면 설정에 보이는 것과 실제로 나가는 것이 갈린다.
 * 키 표기는 저장소를 고를 때와 같다 — 개인 저장소는 이름만, 조직 저장소는 `owner/name`.
 */
export async function dueRepoKeys(login: string, profilePicks: readonly string[]): Promise<string[]> {
  const showcase = await getGithubShowcase(login, profilePicks);
  if (!showcase) return [];
  const cards = showcase.repos.length > 0 ? showcase.repos : showcase.topRepos;
  return cards.map((r) =>
    r.owner && login && r.owner.toLowerCase() !== login.toLowerCase() ? r.fullName : r.name,
  );
}
