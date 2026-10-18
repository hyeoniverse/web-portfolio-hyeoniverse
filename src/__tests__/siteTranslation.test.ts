import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import ko from "@/locales/ko.json";
import {
  LIST_BATCH_MAX,
  acceptSiteString,
  chunkIndices,
  listItemKey,
  parseListItems,
  parseSiteUiKeys,
  selectListBatch,
  siteUiEntryHash,
  siteUiSource,
  siteUiSrcOf,
  validSiteUi,
} from "@/lib/siteTranslation";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("화면 글 묶음(siteUiSource)", () => {
  it("방문자 영어 사전 전체를 점 열쇠로 펼치고 열쇠 순서로 둔다 — 관리자 사전은 없다", () => {
    const src = siteUiSource(en);
    expect(src.length).toBeGreaterThan(800);
    expect(src.map(([k]) => k)).toEqual([...src.map(([k]) => k)].sort());
    expect(src.find(([k]) => k === "nav.home")?.[1]).toBe(en.nav.home);
    expect(src.some(([k]) => k.startsWith("admin."))).toBe(false);
  });

  it("빈 글은 빼고 중첩을 따라간다", () => {
    expect(siteUiSource({ a: { b: "x", c: "" }, d: "y" })).toEqual([["a.b", "x"], ["d", "y"]]);
  });

  it("문장 해시는 같은 원문이면 같고, 글이 바뀌면 달라진다 — 한국어 사전과는 무관", () => {
    expect(siteUiEntryHash(en.nav.home)).toBe(siteUiEntryHash(String(en.nav.home)));
    expect(siteUiEntryHash("Home!")).not.toBe(siteUiEntryHash(en.nav.home));
    expect(siteUiEntryHash(en.nav.home)).toMatch(/^[0-9a-f]{16}$/);
    void ko;
  });

  it("요청 열쇠 — 사전에 있는 것만, 겹친 것은 하나로, 상한까지", () => {
    const texts = new Map(siteUiSource(en));
    expect(parseSiteUiKeys(["nav.home", "nope", "nav.home", 3, "nav.works"], texts)).toEqual(["nav.home", "nav.works"]);
    expect(parseSiteUiKeys([...texts.keys()], texts, 5)).toHaveLength(5);
    expect(parseSiteUiKeys("nav.home", texts)).toEqual([]);
  });
});

describe("받을 수 있는 번역(acceptSiteString)", () => {
  it("자리표시가 원문과 같아야 한다 — 띄어 온 것은 붙인다", () => {
    expect(acceptSiteString("{{n}} posts", "{{ n }} Beiträge")).toBe("{{n}} Beiträge");
    expect(acceptSiteString("{{n}} posts", "Beiträge")).toBeNull();
    expect(acceptSiteString("{{n}} posts", "{{count}} Beiträge")).toBeNull();
    expect(acceptSiteString("{{a}} / {{b}}", "{{b}} / {{a}}")).toBe("{{b}} / {{a}}");
  });

  it("태그가 원문과 같아야 한다 — 늘거나 바뀌면 버린다", () => {
    expect(acceptSiteString("<b>{{n}}</b> posts", "<b>{{n}}</b> 件")).toBe("<b>{{n}}</b> 件");
    expect(acceptSiteString("<b>{{n}}</b> posts", "<b>{{n}}</b> <img src=x onerror=alert(1)>")).toBeNull();
    expect(acceptSiteString("<b>{{n}}</b> posts", "<i>{{n}}</i> posts")).toBeNull();
    expect(acceptSiteString("Posts", "<script>x</script>")).toBeNull();
    expect(acceptSiteString("a", "a < b")).toBeNull();
  });

  it("빈 글 · 문자열이 아닌 값은 버린다", () => {
    expect(acceptSiteString("Home", "  ")).toBeNull();
    expect(acceptSiteString("Home", 3)).toBeNull();
  });

  it("캐시를 문장마다 거른다 — 모르는 열쇠 · 원문이 바뀐 문장 · 깨진 글은 버린다", () => {
    const texts = new Map<string, string>([["a", "{{n}} posts"], ["b", "Home"], ["c", "About"]]);
    const src = siteUiSrcOf(texts, ["a", "b", "c"]);
    expect(validSiteUi(texts, { strings: { a: "x", b: "Start", c: "Über", z: "zzz" }, src: { ...src, c: "old" } })).toEqual({ b: "Start" });
    expect(validSiteUi(texts, { strings: { a: "{{ n }} Beiträge" }, src })).toEqual({ a: "{{n}} Beiträge" });
    expect(validSiteUi(texts, null)).toEqual({});
    /* 예전 모양(사전 통째 해시)은 쓰지 않는다 */
    expect(validSiteUi(texts, { h: "x", s: { b: "Start" } })).toEqual({});
  });

  it("나눠 보내기 — 개수 · 글자 상한, 순서 그대로", () => {
    const texts = Array.from({ length: 250 }, (_, i) => `t${i}`);
    const chunks = chunkIndices(texts, 100, 1e9);
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunks.flat()).toEqual(texts.map((_, i) => i));
    expect(chunkIndices(["aaaa", "bbbb", "cc"], 100, 6)).toEqual([[0], [1, 2]]);
  });
});

describe("목록 묶음", () => {
  it("요청 본문 — 모르는 종류 · uuid 아님은 빼고, 겹친 것은 하나로, 상한까지", () => {
    const raw = [
      { type: "post", id: ID(1) },
      { type: "post", id: ID(1).toUpperCase() },
      { type: "work", id: "repo-123" },
      { type: "user", id: ID(2) },
      { type: "series", id: ID(3) },
      null,
    ];
    expect(parseListItems(raw)).toEqual([{ type: "post", id: ID(1) }, { type: "series", id: ID(3) }]);
    expect(parseListItems("x")).toEqual([]);
    const many = Array.from({ length: 100 }, (_, i) => ({ type: "post", id: ID(i) }));
    expect(parseListItems(many)).toHaveLength(LIST_BATCH_MAX);
  });

  it("이번에 물을 것 — 아는 것 · 묻는 중인 것 · 겹친 것은 빼고, 넘친 것은 다음 차례", () => {
    const refs = [1, 2, 2, 3, 4, 5].map((n) => ({ type: "post" as const, id: ID(n) }));
    const known = new Set([listItemKey(refs[0])]);
    const inflight = new Set([listItemKey(refs[3])]);
    const { batch, rest } = selectListBatch(refs, (k) => known.has(k), inflight, 2);
    expect(batch.map((r) => r.id)).toEqual([ID(2), ID(4)]);
    expect(rest.map((r) => r.id)).toEqual([ID(5)]);
  });

  it("uuid 가 아닌 항목(GitHub 저장소 칸)은 묻지 않는다", () => {
    const { batch, rest } = selectListBatch([{ type: "work", id: "gh-1" }], () => false, new Set());
    expect(batch).toEqual([]);
    expect(rest).toEqual([]);
  });
});

describe("목록 칸 원문(서버)", async () => {
  const { listMetaSource, listMetaHash } = await import("@/lib/api/siteTranslate");
  it("글 — 한국어 본문이 있으면 한국어 칸, 없으면 영어 칸. 빈 칸은 뺀다", () => {
    expect(listMetaSource("post", { title: "제목", excerpt: "", content: "본문", title_en: "T" }))
      .toEqual({ lang: "ko", fields: { title: "제목" } });
    expect(listMetaSource("post", { title: "제목", title_en: "Title", excerpt_en: "Ex", content: "", content_en: "Body" }))
      .toEqual({ lang: "en", fields: { title: "Title", excerpt: "Ex" } });
  });
  it("시리즈 · 작업물, 번역할 칸이 없으면 null", () => {
    expect(listMetaSource("series", { title: "", title_en: "S", description_en: "D" })).toEqual({ lang: "en", fields: { title: "S", description: "D" } });
    expect(listMetaSource("work", { title: "", content_ko: "", content_en: "" })).toBeNull();
  });
  it("해시는 칸 순서와 무관하고 글이 바뀌면 달라진다", () => {
    const a = listMetaHash({ lang: "ko", fields: { title: "a", excerpt: "b" } });
    expect(listMetaHash({ lang: "ko", fields: { excerpt: "b", title: "a" } })).toBe(a);
    expect(listMetaHash({ lang: "ko", fields: { title: "a", excerpt: "c" } })).not.toBe(a);
  });
});
