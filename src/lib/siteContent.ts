/**
 * 사이트 내용 글 — "다른 언어로 보기"가 화면 글 사전(locales) 밖에서 번역해야 하는 짧은 글 묶음.
 *
 * 사이트 설정에서 오는 홈 글(첫 화면 · 소개 · 하는 일 · 흘러가는 글 · 연락), 글 카테고리 이름, 작업물 카테고리 이름,
 * 공개된 글의 태그 이름. 화면은 이 글을 원문 그대로 열쇠로 써서 번역을 찾는다(useLanguage 의 tx) —
 * 다른 언어가 걸리면 화면 언어가 영어라 영어 칸이 열쇠다. 한국어로만 적힌 글(태그 등)은 한국어가 열쇠.
 *
 * 서버는 /api/site-translate/content 가 이 묶음을 언어마다 한 줄로 캐시한다.
 */
import type { BilingualCategory } from "@/types/common";

type Config = Record<string, unknown>;
const str = (v: unknown): string[] => (typeof v === "string" && v.trim() ? [v.trim()] : []);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap(str) : []);
const obj = (v: unknown): Config => (v && typeof v === "object" ? (v as Config) : {});

/** 홈 글 — 다른 언어로 볼 때 화면이 고르는 영어 칸 */
function homeTexts(config: Config): string[] {
  const hero = obj(config.hero);
  const intro = obj(config.homeIntro);
  const services = obj(config.services);
  const marquee = obj(config.marquee);
  const cta = obj(config.cta);
  return [
    ...strs(hero.headline), ...strs(hero.subtext), ...str(hero.scrollLabel),
    ...str(intro.tagline), ...str(intro.description),
    ...str(services.label),
    ...(Array.isArray(services.items) ? services.items.flatMap((it) => [...str(obj(it).title), ...str(obj(it).desc)]) : []),
    ...strs(marquee.words),
    ...str(cta.label), ...strs(cta.title), ...str(cta.buttonText), ...str(cta.resumeButtonText),
  ];
}

/** 카테고리 이름 — 영어 칸(자식까지) */
function categoryTexts(cats: unknown): string[] {
  if (!Array.isArray(cats)) return [];
  return (cats as BilingualCategory[]).flatMap((c) => [...str(c?.en), ...categoryTexts(c?.children)]);
}

/**
 * 두 언어 쌍 글을 깊이 훑어 영어 쪽을 모은다 — { ko, en } 묶음(LocalizedText)과 x / x_ko 짝(사이트 설정).
 * 영어 칸이 비었으면 한국어. 프로필 데이터 · 작업물 화면 설정처럼 칸이 많은 곳을 하나하나 적지 않으려고.
 */
export function pairTexts(v: unknown, depth = 0): string[] {
  if (depth > 8 || !v || typeof v !== "object") return [];
  if (Array.isArray(v)) return v.flatMap((x) => pairTexts(x, depth + 1));
  const o = v as Config;
  const out: string[] = [];
  if (typeof o.ko === "string" && typeof o.en === "string") out.push(...str(o.en || o.ko));
  for (const [k, val] of Object.entries(o)) {
    if (k.endsWith("_ko")) continue;
    const ko = o[`${k}_ko`];
    if (typeof val === "string" && typeof ko === "string") out.push(...str(val || ko));
    else if (Array.isArray(val) && Array.isArray(ko)) out.push(...strs(val));
    else if (val && typeof val === "object") out.push(...pairTexts(val, depth + 1));
  }
  return out;
}

/** 정보 창 첫 칸의 라벨 — profileWindowConfig 의 ownerLines 와 같아야 한다 */
export const OWNER_LABELS = ["Name", "Role", "Location", "Email", "Status"];

/** 정보 창 값 중 번역하지 않는 것 — 메일 · 주소, 코드 한 줄(괄호 호출 · 따옴표로 감싼 인자 · 백틱) */
const isCodeLike = (v: string) => /@|https?:|\(\)|\(['"]|['"]\)|`|^[\w.-]+\.(webp|png|jpe?g)$/i.test(v);

/**
 * 프로필의 한 언어 칸 — 두 언어 쌍이 아니라 pairTexts 가 못 줍는 글. 경력 · 교육 · 활동의 기관 이름(한국어로만 적힌 경우가 많다),
 * 정보 창의 라벨 · 값(코드 · 메일은 뺀다). 기술 이름 · 묶음 이름 · 원칙 · 과정 제목은 한국어 화면에서도 영어로 두는 표기라 넣지 않는다
 */
function profilePlainTexts(profile: unknown): string[] {
  const p = obj(profile);
  const timeline = ["experiences", "education", "activities"].flatMap((k) => (Array.isArray(p[k]) ? (p[k] as unknown[]) : []));
  const blocks = Array.isArray(p.infoBlocks) ? (p.infoBlocks as unknown[]) : [];
  return [
    ...timeline.flatMap((it) => str(obj(it).company)),
    ...blocks.flatMap((b) => (Array.isArray(obj(b).lines) ? (obj(b).lines as unknown[]) : []).flatMap((l) => [
      ...str(obj(l).label),
      ...str(obj(l).value).filter((v) => !isCodeLike(v)),
    ])),
  ];
}

/**
 * 묶음의 원문 — 겹침 없이 정렬. rows 는 DB 에서 읽은 공개 글의 태그 · 공개 작업물의 영어 카테고리,
 * profile 은 프로필 화면 데이터(경력 · 기술 · 자격 …, getProfileData), repoDescriptions 는 프로필 GitHub 영역 저장소 설명
 */
export function siteContentSource(
  config: Config,
  rows: { tags: string[]; workCategories: string[]; repoDescriptions?: string[] },
  profile?: unknown,
): string[] {
  const posts = obj(config.posts);
  const works = obj(config.works);
  const all = [
    ...homeTexts(config),
    ...categoryTexts(posts.categories),
    ...categoryTexts(works.categories),
    /* 작업물 화면 첫 머리(introLabel · introTitle …) · 프로필 화면 글(title · intro · bio …) */
    ...pairTexts(works),
    ...pairTexts(config.profile),
    ...pairTexts(profile),
    ...profilePlainTexts(profile),
    /* 정보 창 첫 칸(소유자) — 고정 라벨과 사이트 설정의 직함 · 위치 · 상태(profileWindowConfig) */
    ...OWNER_LABELS,
    ...["role", "location", "status"].flatMap((k) => str(obj(config.personal)[k])),
    /* 프로필 GitHub 영역에 고른 저장소의 설명 */
    ...(rows.repoDescriptions ?? []).flatMap(str),
    ...rows.workCategories.flatMap(str),
    ...rows.tags.flatMap(str),
  ];
  return [...new Set(all)].sort();
}

/** 원문의 언어 — 한글이 들어 있으면 한국어, 아니면 영어(공급자에 원문 언어로 넘긴다) */
export const sourceLangOf = (text: string) => (/[가-힣]/.test(text) ? "ko" : "en");

/* 표시 기호는 번역 뒤에도 같은 수여야 한다 — 홈 소개 글의 강조 자리({aesthetics}), About 글의 굵게(**) · 코드(`) ·
   채움 자리({phases}). 빠지거나 늘면 강조 · 코드 조각이 깨진다 */
const marks = (s: string) => [(s.match(/[{}]/g) ?? []).length, (s.match(/\*\*/g) ?? []).length, (s.match(/`/g) ?? []).length].join(",");

/** 받을 수 있는 번역인가 — 비었거나 표시 기호가 어긋나면 버린다(화면은 원문) */
export function acceptContentString(source: string, v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  if (marks(v) !== marks(source)) return null;
  return v.trim();
}

/** 묶음 해시 — 원문 목록이 같으면 캐시를 그대로 쓴다 */
export function siteContentHash(source: string[]): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const s = JSON.stringify(["site-content", 1, source]);
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
