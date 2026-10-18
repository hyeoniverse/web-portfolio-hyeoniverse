import { beforeEach, describe, expect, it, vi } from "vitest";
import { siteUiSrcOf } from "@/lib/siteTranslation";

/* 공급자는 앞에 [de] 를 붙이는 가짜 — 무엇을 보냈는지 센다 */
const sent: string[][] = [];
vi.mock("@/lib/api/translationProviders", () => ({
  buildProviderList: () => ["claude"],
  translationFailure: () => ({ status: 502 }),
  translateWithFallback: async (_p: unknown, texts: string[]) => {
    sent.push(texts);
    return { translations: texts.map((t) => (t === "Broken {{n}}" ? "Kaputt" : `[de]${t}`)), failedIndices: [], failures: [] };
  },
}));

/* content_translations 한 줄 — 읽기 · 쓰기를 받아 둔다 */
const db: { row: unknown; writes: number } = { row: null, writes: 0 };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row ? { fields: db.row } : null }) }) }) }) }),
      upsert: async (row: { fields: unknown }) => { db.row = row.fields; db.writes++; return { error: null }; },
    }),
  }),
}));

import { translateSiteUiKeys } from "@/lib/api/siteUiTranslate";

const texts = new Map([["a", "Home"], ["b", "About"], ["c", "Broken {{n}}"], ["d", "Works"]]);
const base = { texts, sourceId: "s", lang: "de", config: {} as never, tag: "[t]" };

beforeEach(() => {
  sent.length = 0;
  db.row = null;
  db.writes = 0;
});

describe("화면 글 열쇠 번역(서버)", () => {
  it("캐시에 있는 문장은 보내지 않고, 없는 것만 번역해 캐시에 더한다 — 깨진 번역은 failed", async () => {
    db.row = { strings: { a: "Startseite" }, src: siteUiSrcOf(texts, ["a"]) };
    const res = await translateSiteUiKeys({ ...base, keys: ["a", "b", "c", "zzz"] });
    expect(sent).toEqual([["About", "Broken {{n}}"]]);
    expect(res).toMatchObject({ strings: { a: "Startseite", b: "[de]About" }, failed: ["c"] });
    expect(db.row).toEqual({ strings: { a: "Startseite", b: "[de]About" }, src: siteUiSrcOf(texts, ["a", "b"]) });
  });

  it("모두 캐시에 있으면 공급자도 상한도 부르지 않는다", async () => {
    db.row = { strings: { a: "Startseite" }, src: siteUiSrcOf(texts, ["a"]) };
    const onMiss = vi.fn(() => false);
    const res = await translateSiteUiKeys({ ...base, keys: ["a"], onMiss });
    expect(res).toMatchObject({ strings: { a: "Startseite" }, failed: [] });
    expect(sent).toEqual([]);
    expect(onMiss).not.toHaveBeenCalled();
    expect(db.writes).toBe(0);
  });

  it("원문이 바뀐 문장만 다시 번역한다", async () => {
    db.row = { strings: { a: "Alt", d: "Arbeiten" }, src: { ...siteUiSrcOf(texts, ["d"]), a: "old" } };
    await translateSiteUiKeys({ ...base, keys: ["a", "d"] });
    expect(sent).toEqual([["Home"]]);
  });

  it("공급자를 불러야 하는데 상한에 걸리면 429", async () => {
    const res = await translateSiteUiKeys({ ...base, keys: ["b"], onMiss: () => false });
    expect(res).toEqual({ error: { status: 429, message: "Too many requests" } });
  });
});
