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
  /** 표지를 원 안에 어떻게 앉힐지 — 설정에서 맞춰 둔 자리와 배율. 없으면 가운데·꽉 채움 */
  mainFit?: CoverFit;
  /** 포인터를 올렸을 때 드러나는 표지의 앉히기. 다른 그림이면 맞출 자리도 다르다 */
  hoverFit?: CoverFit;
}

/** 표지를 원 안에 앉히는 값 — 가로·세로 자리(퍼센트)와 배율(1 = 원을 꽉 채움) */
export interface CoverFit {
  x: number;
  y: number;
  zoom: number;
}

/**
 * 표지를 원 안에 앉히는 CSS — 설정 화면의 미리보기와 홈이 이 함수를 같이 쓴다.
 * 각자 계산하면 맞춰 둔 자리가 홈에서 다른 곳으로 간다.
 *
 * 꽉 채우거나 키운 상태(zoom ≥ 1)에서는 잘려 나가는 쪽이 있으므로 그 안에서 보일 자리를 고른다.
 * 1 아래로 줄이면 잘릴 것이 없고 원이 비므로, 대신 그림 자체를 그 빈자리 안에서 움직인다 —
 * 그래야 줄인 상태에서도 위아래·좌우로 밀어 붙일 수 있다.
 */
export function coverFitStyle(fit: CoverFit): { objectPosition: string; transform?: string } {
  const { x, y, zoom } = fit;
  const free = Math.max(0, 1 - zoom);
  if (free === 0) {
    return {
      objectPosition: `${x}% ${y}%`,
      transform: zoom === 1 ? undefined : `scale(${zoom})`,
    };
  }
  /* translate 의 퍼센트는 요소 자기 크기 기준이고 요소는 원과 같은 크기다 —
     x 가 0 이면 왼쪽 끝, 100 이면 오른쪽 끝에 붙는다 */
  const shift = (v: number) => ((v - 50) / 100) * free * 100;
  return {
    objectPosition: "50% 50%",
    transform: `translate(${shift(x)}%, ${shift(y)}%) scale(${zoom})`,
  };
}

/** 홈 그리드가 쓸 수 있는 칸 수 — 소스가 이보다 많으면 앞에서부터 이 수만큼만 쓰인다 */
export const HOME_SLOT_COUNT = 11;

/** 그래도 이만큼은 채운다. 원 두세 개만 뜨면 다섯 줄 그리드가 뚫린 것처럼 보이므로,
    여기 못 미치는 만큼은 앞에서부터 다시 쓴다. 이 수를 넘기면 있는 것만 한 번씩 보여준다 */
const HOME_MIN_SLOT_COUNT = 6;

/** 자동 후보를 칸 수보다 몇 곳 더 모아 둘지. 설정에서 몇 곳을 빼도 그다음 후보가 자리를 채운다.
    모인 수만큼 README 요청이 나가므로 넉넉하되 무한정은 아니다 */
export const HOME_POOL_SPARE = 4;

function fillSlots<T>(source: readonly T[], make: (item: T) => Omit<WorkItem, "id">): WorkItem[] {
  if (source.length === 0) return [];
  /* 있는 만큼만 보여준다 — 여섯 곳을 열한 칸에 돌려 쓰면 같은 원이 두 번씩 나와,
     보는 사람은 작업물이 몇 개인지 알 수 없다. 최소 칸 수까지만 순환해서 메운다. */
  const count = source.length >= HOME_MIN_SLOT_COUNT
    ? Math.min(source.length, HOME_SLOT_COUNT)
    : HOME_MIN_SLOT_COUNT;
  return Array.from({ length: count }, (_, i) => ({
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

/** 저장소 원을 채울 언어 색 — 설정 화면도 같은 색을 보여줘야 미리보기가 맞는다 */
export function repoAccent(language: string | null | undefined): string {
  return (language && LANGUAGE_COLORS[language]) || DEFAULT_REPO_COLOR;
}

/* 위 색들은 GitHub 이 언어마다 쓰는 색이라 디자인 토큰이 아니다. 그 위에 얹을 글자색도 마찬가지로
   여기서 정한다 — 테마를 따라 뒤집히는 토큰을 쓰면 배경(언어 색)은 그대로인데 글자만 뒤집힌다. */
const INK_ON_DARK = "#ffffff";
const INK_ON_LIGHT = "#161b22";

/** 배경 밝기(WCAG 상대 휘도)로 고른 글자색. 노랑 계열 위에서는 어두운 글자로 간다 */
export function inkFor(hex: string): string {
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
  /** 자동 목록에서 빼 둔 것. 자동으로 뽑혔지만 홈에 내보내고 싶지 않은 저장소를 표시한다.
      직접 고를 때는 해제된다 — 골라 놓고 빼 둔 상태는 서로 어긋난다 */
  hidden?: boolean;
  cover?: string;
  /** 표지를 원 안에서 어디에 맞출지 — 가로·세로 퍼센트. 비우면 둘 다 50(가운데) */
  coverX?: number;
  coverY?: number;
  /** 표지 배율 — 1 이 원을 꽉 채우는 크기. 1 아래는 그림이 작게 앉고 그만큼 빈자리가 남는다 */
  coverZoom?: number;
  /** 포인터를 올렸을 때 드러나는 표지. 비우면 기본 표지를 그대로 쓴다 */
  coverHover?: string;
  hoverX?: number;
  hoverY?: number;
  hoverZoom?: number;
  title?: string;
  title_ko?: string;
  /** 대표 기술 한 마디. 원 아래 줄은 작업물·글의 분류가 들어가는 자리라 문장이 아니라 낱말이어야 한다.
      비우면 저장소의 주 언어로 간다. 예전 설정의 description 도 계속 읽는다 */
  tech?: string;
  description?: string;
  description_ko?: string;
}

/** 저장소 하나를 화면에 올릴 때 쓰는 값 — 홈의 원과 작업물 목록의 카드가 같은 값을 본다 */
export interface RepoView {
  /** 사이트 안에서 README 를 읽는 주소 */
  href: string;
  /** GitHub 주소 */
  repoUrl: string;
  title: LocalizedText;
  /** 원 아래 줄·카드 한 줄에 들어가는 낱말 — 적어 둔 대표 기술, 없으면 주 언어 */
  tech: string;
  cover: string;
  coverFit: CoverFit;
  hoverCover: string;
  hoverFit: CoverFit;
  /** 표지가 없을 때 채울 언어 색과 그 위에서 읽히는 글자색 */
  accent: string;
  accentInk: string;
}

/**
 * 저장소 + 설정에 적어 둔 것 → 화면에 올릴 값.
 *
 * 값을 고르는 순서는 언제나 같다 — 설정에 적은 것 → README 에서 뽑은 것 → GitHub 기본값(#1053).
 * 설정에서 지우면 한 단계씩 뒤로 돌아간다. README 는 안 읽었거나 못 찾았으면 비어 있다.
 *
 * 홈(원)과 작업물 목록(카드)이 같이 부른다 — 각자 고르면 같은 저장소가 화면마다 다르게 보인다.
 */
export function repoView(repo: GithubRepoCard, set?: RepoOverride): RepoView {
  const language = repo.language || "GitHub";
  const accent = repoAccent(repo.language);
  const cover = set?.cover || repo.readme?.image || "";
  /* 자리는 올린 표지에만 매기는 값이 아니다 — README 에서 끌어온 그림도 원 안에서 밀려난다 */
  const x = set?.coverX ?? 50;
  const y = set?.coverY ?? 50;
  const zoom = set?.coverZoom ?? 1;
  /* 올렸을 때 바뀔 표지. 따로 두지 않으면 기본 표지가 그대로 드러난다(전과 같은 모습) */
  const hoverCover = set?.coverHover || cover;
  const own = !!set?.coverHover;
  /* 아래 줄은 낱말 자리다(작업물은 분류, 글은 카테고리가 들어간다). 그래서 README 소개 문단은
     여기 쓰지 않는다 — 한 줄에 안 들어가고 대문자·자간 스타일과도 안 맞는다.
     적어 둔 대표 기술 → 주 언어 순. description 은 예전 설정 호환으로만 본다. */
  const tech = set?.tech || set?.description || set?.description_ko || language;
  const name = repo.readme?.title || repo.name;
  return {
    href: `/works/repos/${repo.owner}/${repo.name}`,
    repoUrl: repo.url,
    title: { ko: set?.title_ko || name, en: set?.title || name },
    tech,
    cover,
    coverFit: { x, y, zoom },
    hoverCover,
    hoverFit: {
      x: own ? set?.hoverX ?? 50 : x,
      y: own ? set?.hoverY ?? 50 : y,
      zoom: own ? set?.hoverZoom ?? 1 : zoom,
    },
    accent,
    accentInk: inkFor(accent),
  };
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
    const view = repoView(repo, byName.get(repo.fullName) ?? byName.get(repo.name));
    return {
      projectId: repo.name,
      title: view.title,
      category: { ko: view.tech, en: view.tech },
      main: view.cover,
      hover: view.hoverCover,
      mainFit: view.coverFit,
      hoverFit: view.hoverFit,
      /* 원을 누르면 GitHub 이 아니라 사이트 안에서 README 를 읽는다(#1062) */
      href: view.href,
      kind: "repo",
      accent: view.accent,
      accentInk: view.accentInk,
    };
  });
}

// 정적 fallback — projects.ts 순서 (DB 미접근 시)
export const worksData: WorkItem[] = toWorkItems(projects);
