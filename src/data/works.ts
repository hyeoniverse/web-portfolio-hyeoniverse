import { projects } from "./projects";
import type { LocalizedText, Project } from "./projects";
import type { GithubRepoCard } from "@/lib/githubShowcase";
import type { Post } from "@/types/post";

/** 홈 그리드 한 칸이 무엇에서 왔는지. 표지 유무와 머리글이 이 값을 따른다 */
export type WorkItemKind = "work" | "post" | "repo";

export interface WorkItem {
  id: string;        // 그리드 내 고유 식별자 (인터랙션용)
  projectId: string; // 실제 프로젝트 ID (admin/내부 참조용)
  projectSlug?: string; // 공개 URL 라우팅용 slug (없으면 projectId fallback)
  title: LocalizedText;
  category: LocalizedText;
  main: string;
  hover: string;
  /** 눌렀을 때 갈 곳. 작업물·글은 사이트 안, 저장소는 GitHub */
  href: string;
  kind: WorkItemKind;
  /** 표지가 없는 칸(저장소)이 원을 채울 색. 주 언어에서 고른다 */
  accent?: string;
  /** 그 색 위에서 읽히는 글자색 — 밝은 언어색(JavaScript 노랑) 위의 흰 글자는 안 읽힌다 */
  accentInk?: string;
}

/** 홈 그리드가 채우는 칸 수 — 소스가 모자라면 순환해서 항상 다 채운다.
    소스가 이보다 많으면 앞에서부터 이 수만큼만 쓰인다 */
export const HOME_SLOT_COUNT = 11;

function fillSlots<T>(source: readonly T[], make: (item: T) => Omit<WorkItem, "id">): WorkItem[] {
  if (source.length === 0) return [];
  return Array.from({ length: HOME_SLOT_COUNT }, (_, i) => ({
    id: `work-${i}`,
    ...make(source[i % source.length]),
  }));
}

/** 프로젝트 목록 → 홈 그리드용 슬롯.
 *  홈 Selected Works 는 이 함수로 정적(projects)·동적(랭킹된 works) 소스를 같은 shape 로 만든다. */
export function toWorkItems(source: Project[]): WorkItem[] {
  return fillSlots(source, (project) => ({
    projectId: project.id,
    projectSlug: project.slug,
    title: project.title,
    category: project.category,
    main: project.image,
    hover: project.gallery[0] ?? project.image,
    href: `/works/${project.slug || project.id}`,
    kind: "work",
  }));
}

/** 글 목록 → 홈 그리드용 슬롯. 표지가 있는 글만 넘겨야 원이 빈 채로 남지 않는다 */
export function toPostItems(source: Post[]): WorkItem[] {
  return fillSlots(source, (post) => {
    const cover = post.cover_image ?? "";
    const category = post.category ?? "Post";
    return {
      projectId: post.id,
      projectSlug: post.slug,
      title: { ko: post.title, en: post.title_en || post.title },
      category: { ko: category, en: category },
      main: cover,
      hover: cover,
      href: `/posts/${post.slug}`,
      kind: "post",
    };
  });
}

/* 저장소 원을 채울 색 — 언어별로 다르게만 보이면 되므로 GitHub 이 쓰는 대표색 몇 개만 둔다.
   목록에 없는 언어와 언어가 안 잡힌 저장소는 마지막 기본색으로 간다. */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Go: "#00add8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Dart: "#00b4ab",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};
const DEFAULT_REPO_COLOR = "#6e7681";

/* 위 색들은 GitHub 이 언어마다 쓰는 색이라 디자인 토큰이 아니다. 그 위에 얹을 글자색도 마찬가지로
   여기서 정한다 — 테마를 따라 뒤집히는 토큰을 쓰면 배경(언어 색)은 그대로인데 글자만 뒤집힌다. */
const INK_ON_DARK = "#ffffff";
const INK_ON_LIGHT = "#161b22";

/** 배경 밝기(WCAG 상대 휘도)로 고른 글자색. 노랑 계열 위에서는 어두운 글자로 간다 */
function inkFor(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.35 ? INK_ON_LIGHT : INK_ON_DARK;
}

/** 설정에서 저장소마다 덮어쓴 값. 비운 칸은 GitHub 이 주는 값으로 돌아간다 */
export interface RepoOverride {
  /** 개인 저장소는 이름만, 조직 저장소는 `owner/name` — 조직에는 같은 이름이 또 있을 수 있다 */
  name: string;
  /** 직접 고른 것인가. false 면 자동으로 나가는 저장소의 내용만 덮어쓴 것이라 선택에는 안 넣는다.
      없으면 고른 것으로 본다 — 이 값이 생기기 전의 설정이 그런 모양이다 */
  picked?: boolean;
  cover?: string;
  title?: string;
  title_ko?: string;
  description?: string;
  description_ko?: string;
}

/** GitHub 저장소 → 홈 그리드용 슬롯.
 *  표지를 올려 두면 다른 소스와 똑같이 그 그림이 원을 채우고, 없으면 주 언어 색과 이름으로 채운다. */
export function toRepoItems(
  source: readonly GithubRepoCard[],
  overrides: readonly RepoOverride[] = [],
): WorkItem[] {
  const byName = new Map(overrides.map((o) => [o.name, o]));
  return fillSlots(source, (repo) => {
    // 조직 저장소는 `owner/name` 으로, 개인 저장소는 이름만으로 적혀 있다
    const set = byName.get(repo.fullName) ?? byName.get(repo.name);
    const language = repo.language || "GitHub";
    const accent = LANGUAGE_COLORS[repo.language] ?? DEFAULT_REPO_COLOR;
    const cover = set?.cover ?? "";
    /* 설명을 안 적었으면 두 번째 줄은 GitHub 의 저장소 소개로, 그것도 없으면 주 언어로 간다 */
    const subtitle = { ko: set?.description_ko || repo.description || language, en: set?.description || repo.description || language };
    return {
      projectId: repo.name,
      title: { ko: set?.title_ko || repo.name, en: set?.title || repo.name },
      category: subtitle,
      main: cover,
      hover: cover,
      href: repo.url,
      kind: "repo",
      accent,
      accentInk: inkFor(accent),
    };
  });
}

// 정적 fallback — projects.ts 순서 (DB 미접근 시)
export const worksData: WorkItem[] = toWorkItems(projects);
