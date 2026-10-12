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
 * 묶음의 원문 — 겹침 없이 정렬. rows 는 DB 에서 읽은 공개 글의 태그 · 공개 작업물의 영어 카테고리
 */
export function siteContentSource(config: Config, rows: { tags: string[]; workCategories: string[] }): string[] {
  const posts = obj(config.posts);
  const works = obj(config.works);
  const all = [
    ...homeTexts(config),
    ...categoryTexts(posts.categories),
    ...categoryTexts(works.categories),
    ...rows.workCategories.flatMap(str),
    ...rows.tags.flatMap(str),
  ];
  return [...new Set(all)].sort();
}

/** 원문의 언어 — 한글이 들어 있으면 한국어, 아니면 영어(공급자에 원문 언어로 넘긴다) */
export const sourceLangOf = (text: string) => (/[가-힣]/.test(text) ? "ko" : "en");

/* 홈 소개 글의 강조 자리({aesthetics})는 번역 뒤에도 같은 수여야 한다 — 빠지거나 늘면 강조가 깨진다 */
const braces = (s: string) => (s.match(/[{}]/g) ?? []).length;

/** 받을 수 있는 번역인가 — 비었거나 강조 자리가 어긋나면 버린다(화면은 원문) */
export function acceptContentString(source: string, v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  if (braces(v) !== braces(source)) return null;
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
