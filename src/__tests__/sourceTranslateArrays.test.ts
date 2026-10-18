import { beforeEach, describe, expect, it, vi } from "vitest";

/* 번역은 앞에 [ja] 를 붙이는 가짜로 — 실제 공급자를 부르지 않는다 */
vi.mock("@/lib/api/translationProviders", () => ({
  buildProviderList: () => ["claude"],
  translateWithFallback: async (_p: unknown, texts: string[]) => ({
    translations: texts.map((t) => `[ja]${t}`), failedIndices: [], failures: [],
  }),
}));

/* 백업 · 프로필 행 읽기 · 쓰기를 받아 두는 가짜 관리자 클라이언트 */
const db: { profile: unknown; saved: unknown } = { profile: null, saved: null };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      upsert: async (row: { config?: unknown }) => {
        if (table === "site_settings") db.saved = row.config;
        return { error: null };
      },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { config: db.profile } }) }) }),
    }),
  }),
}));

import { translateConfigSource, prepareProfileSource } from "@/lib/api/sourceTranslate";

type Config = Parameters<typeof translateConfigSource>[4];
const config = {} as Config;

beforeEach(() => {
  db.profile = null;
  db.saved = null;
});

describe("원문 칸 번역은 배열을 배열로 둔다", () => {
  it("설정 — 글 배열과 객체 배열이 배열로 남고 항목의 다른 칸이 지켜진다", async () => {
    const full = {
      hero: { headline: ["Creative"], headline_ko: ["크리에이티브", "개발자"], scrollLabel_ko: "아래로" },
      posts: { categories: [{ ko: "개발", en: "Dev", slug: "dev", children: [{ ko: "프론트", en: "Front" }] }] },
    };
    const delta: Record<string, unknown> = { hero: { scrollLabel: "Scroll" } };

    expect(await translateConfigSource(full, delta, "ko", "ja", config)).toBe(true);
    expect(delta).toEqual({
      hero: { scrollLabel: "Scroll", headline_ko: ["[ja]크리에이티브", "[ja]개발자"], scrollLabel_ko: "[ja]아래로" },
      posts: { categories: [{ ko: "[ja]개발", en: "Dev", slug: "dev", children: [{ ko: "[ja]프론트", en: "Front" }] }] },
    });
  });

  it("설정 — 화면에 안 나오는 about 글은 번역하지 않고 크레딧 문구만 번역한다", async () => {
    const full = {
      about: { creditsNote_ko: "고마운 분들", heroLine1_ko: "소개", process: [{ title_ko: "골격", title: "Frame" }] },
    };
    const delta: Record<string, unknown> = {};

    expect(await translateConfigSource(full, delta, "ko", "ja", config)).toBe(true);
    expect(delta).toEqual({ about: { creditsNote_ko: "[ja]고마운 분들" } });
  });

  it("프로필 — 저장된 배열 항목의 영어 · 날짜가 남는다", async () => {
    db.profile = {
      data: {
        awards: [{ name: { ko: "동상", en: "Bronze" }, period: { start: "2023-01-01" } }],
        bunny: { name: { ko: "몽이", en: "Mongi" }, stories: [{ ko: "작은 토끼", en: "A little rabbit" }] },
      },
      savedDefaults: {},
    };

    const prepared = await prepareProfileSource("ko", "ja", config);
    expect(db.saved, "번역만 하고 저장은 save() 가").toBeNull();
    expect(await prepared!.save()).toBe(true);
    expect(db.saved).toEqual({
      data: {
        awards: [{ name: { ko: "[ja]동상", en: "Bronze" }, period: { start: "2023-01-01" } }],
        bunny: { name: { ko: "[ja]몽이", en: "Mongi" }, stories: [{ ko: "[ja]작은 토끼", en: "A little rabbit" }] },
      },
      savedDefaults: {},
    });
  });
});
