import { createHash } from "crypto";
import { isContentMissing } from "@/lib/contentLang";

/**
 * 상세 화면 "다른 언어로 읽기"(/api/content-translate)의 순수한 부분 — 원문 고르기 · 해시 · 요청 상한.
 * 라우트에서 떼어 둔 것은 테스트하려고다(DB · 공급자 없이).
 */

export type ContentSourceType = "post" | "work";
/** 번역하는 칸 — 글: title · excerpt · content, 작업물: title · subtitle · description · content */
export type ContentField = "title" | "excerpt" | "subtitle" | "description" | "content";
export type ContentFields = Partial<Record<ContentField, string>>;

export interface ContentSource {
  /** 원문 언어 — 한국어 본문이 있으면 ko, 없으면 en */
  lang: "ko" | "en";
  fields: ContentFields;
  /** 본문이 HTML(richtext)인가 — 공급자에 HTML 로 보낸다 */
  html: boolean;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** 글 — 한국어 본문(content)이 있으면 한국어 칸들, 없으면 영어 칸들. 제목은 그 언어 칸이 비면 다른 쪽 */
export function postSource(row: Row): ContentSource | null {
  const ko = str(row.content);
  const en = str(row.content_en);
  if (!ko && !en) return null;
  const useKo = !!ko;
  return {
    lang: useKo ? "ko" : "en",
    html: row.content_type === "richtext",
    fields: {
      title: (useKo ? str(row.title) : str(row.title_en)) || str(row.title) || str(row.title_en),
      excerpt: useKo ? str(row.excerpt) : str(row.excerpt_en),
      content: useKo ? ko : en,
    },
  };
}

/** 작업물 — 한국어 본문이 있으면(contentLang 판정 — 복사된 README 는 없는 것으로 친다) 한국어 칸들, 아니면 영어 칸들 */
export function workSource(row: Row): ContentSource | null {
  const ko = str(row.content_ko);
  const en = str(row.content_en);
  const koMissing = isContentMissing(ko, en, "ko");
  const enMissing = isContentMissing(en, ko, "en");
  if (koMissing && enMissing) return null;
  const useKo = !koMissing;
  return {
    lang: useKo ? "ko" : "en",
    html: row.content_type === "richtext",
    fields: {
      title: (useKo ? str(row.title) : str(row.title_en)) || str(row.title) || str(row.title_en),
      subtitle: useKo ? str(row.subtitle_ko) : str(row.subtitle_en),
      description: useKo ? str(row.description_ko) : str(row.description_en),
      content: useKo ? ko : en,
    },
  };
}

/** 원문 해시 — 칸 이름 순서를 고정해 같은 원문이면 늘 같은 값. 원문이 바뀌면 캐시가 무효가 된다 */
export function sourceHash(src: ContentSource): string {
  const keys = (Object.keys(src.fields) as ContentField[]).sort();
  const payload = JSON.stringify([src.lang, src.html, keys.map((k) => [k, src.fields[k] ?? ""])]);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/**
 * 캐시에 없어 공급자를 부르는 요청의 상한 — 메모리 안(인스턴스마다), aiSummaryRoute 의 방식과 같다.
 * 캐시에 있는 번역은 세지 않는다 — 공급자 비용이 들지 않는다.
 *   IP 당     10분에 5번 — 한 사람이 언어를 몇 개 바꿔 보는 정도는 된다
 *   전체      10분에 60번 — 여러 IP 로 돌려도 비용이 묶이게
 */
export const MISS_WINDOW_MS = 10 * 60 * 1000;
export const MISS_LIMIT_PER_IP = 5;
export const MISS_LIMIT_GLOBAL = 60;

export function createMissLimiter(perIp = MISS_LIMIT_PER_IP, global = MISS_LIMIT_GLOBAL, windowMs = MISS_WINDOW_MS) {
  const hits = new Map<string, number[]>();
  let all: number[] = [];
  /** 하나 더 불러도 되면 세고 true, 넘었으면 세지 않고 false */
  return function take(ip: string, now = Date.now()): boolean {
    const fresh = (ts: number[]) => ts.filter((t) => now - t < windowMs);
    all = fresh(all);
    for (const [k, ts] of hits) {
      const f = fresh(ts);
      if (f.length) hits.set(k, f);
      else hits.delete(k);
    }
    const mine = hits.get(ip) ?? [];
    if (mine.length >= perIp || all.length >= global) return false;
    mine.push(now);
    hits.set(ip, mine);
    all.push(now);
    return true;
  };
}
