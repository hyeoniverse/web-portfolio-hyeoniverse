import { beforeEach, describe, expect, it, vi } from "vitest";

/* 번역은 앞에 [언어] 를 붙이는 가짜 — 무엇을 보냈는지 센다 */
const sent: string[] = [];
vi.mock("@/lib/api/translationProviders", () => ({
  buildProviderList: () => ["claude"],
  translateWithFallback: async (_p: unknown, texts: string[], _from: string, to: string) => {
    sent.push(...texts);
    return { translations: texts.map((t) => `[${to}]${t}`), failedIndices: [], failures: [] };
  },
}));

/* content_translations 백업 줄 — (source_type, source_id, lang) 로 읽고 쓴다 */
const rows = new Map<string, unknown>();
const keyOf = (f: Record<string, unknown>) => `${f.source_type}|${f.source_id}|${f.lang}`;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const filters: Record<string, unknown> = {};
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters[k] = v; return q; },
        maybeSingle: async () => ({ data: rows.has(keyOf(filters)) ? { fields: rows.get(keyOf(filters)) } : null }),
        upsert: async (row: Record<string, unknown>) => { rows.set(keyOf(row), row.fields); return { error: null }; },
      };
      return q;
    },
  }),
}));

import { translateConfigSource, translateRowSource } from "@/lib/api/sourceTranslate";

const config = {} as Parameters<typeof translateConfigSource>[4];

beforeEach(() => {
  sent.length = 0;
  rows.clear();
});

describe("되돌리면 백업의 원래 글로 되살린다(#1500)", () => {
  it("설정 — ko → ja → ko 로 돌아오면 고치지 않은 칸은 원래 글, 고친 칸만 번역", async () => {
    const ko = { hero: { headline_ko: ["크리에이티브", "개발자"], scrollLabel_ko: "아래로" } };
    const toJa: Record<string, unknown> = {};
    expect(await translateConfigSource(ko, toJa, "ko", "ja", config)).toBe(true);
    expect(toJa).toEqual({ hero: { headline_ko: ["[ja]크리에이티브", "[ja]개발자"], scrollLabel_ko: "[ja]아래로" } });

    /* 일본어일 때 한 칸만 손으로 고쳤다 */
    const ja = { hero: { headline_ko: ["[ja]크리에이티브", "デベロッパー"], scrollLabel_ko: "[ja]아래로" } };
    sent.length = 0;
    const toKo: Record<string, unknown> = {};
    expect(await translateConfigSource(ja, toKo, "ja", "ko", config)).toBe(true);
    expect(toKo).toEqual({ hero: { headline_ko: ["크리에이티브", "[ko]デベロッパー"], scrollLabel_ko: "아래로" } });
    expect(sent).toEqual(["デベロッパー"]);
  });

  it("예전 모양의 백업(원래 글만)은 되살리지 않고 번역한다", async () => {
    rows.set("settings_source|00000000-0000-0000-0000-000000000004|ko", { "hero.scrollLabel_ko": "아래로" });
    const toKo: Record<string, unknown> = {};
    await translateConfigSource({ hero: { scrollLabel_ko: "下へ" } }, toKo, "ja", "ko", config);
    expect(toKo).toEqual({ hero: { scrollLabel_ko: "[ko]下へ" } });
  });

  it("글 — 본문 · 목록 칸까지 되살리고 source_lang 을 되돌린다", async () => {
    let current: Record<string, unknown> = {
      id: "w1", source_lang: null, content_type: "markdown", version: 1,
      title: "작품", content_ko: "본문", categories_ko: ["웹", "앱"],
    };
    const supabase = {
      from: () => {
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({ data: current }),
          update: (patch: Record<string, unknown>) => { current = { ...current, ...patch }; return q; },
          single: async () => ({ data: current, error: null }),
        };
        return q;
      },
    } as unknown as Parameters<typeof translateRowSource>[0];

    await translateRowSource(supabase, "works", "w1", "ja", config);
    expect(current).toMatchObject({ source_lang: "ja", title: "[ja]작품", content_ko: "[ja]본문", categories_ko: ["[ja]웹", "[ja]앱"] });

    sent.length = 0;
    await translateRowSource(supabase, "works", "w1", "ko", config);
    expect(current).toMatchObject({ source_lang: "ko", title: "작품", content_ko: "본문", categories_ko: ["웹", "앱"] });
    expect(sent).toEqual([]);
  });
});
