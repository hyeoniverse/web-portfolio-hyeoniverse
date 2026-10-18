import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { lang: string; ui: Record<string, string> | null } = { lang: "ko", ui: null };
vi.mock("@/lib/getSiteConfig", () => ({ getSiteConfig: async () => ({ metadata: { defaultLanguage: state.lang } }) }));
vi.mock("@/lib/api/defaultLangUi", () => ({ readDefaultLangUi: async () => state.ui }));

import { siteMetaText } from "@/lib/siteMetaText";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";

beforeEach(() => {
  state.lang = "ko";
  state.ui = null;
});

describe("서버 메타데이터 글은 사이트 기본 언어로(#1406)", () => {
  it("ko · en 은 사전 그대로, 자리표시를 채운다", async () => {
    expect(await siteMetaText("pageMeta.tagsIndex")).toBe(ko.pageMeta.tagsIndex);
    expect(await siteMetaText("pageMeta.tag", { tag: "React" })).toBe('"React" 태그가 달린 게시물 모음');
    state.lang = "en";
    expect(await siteMetaText("pageMeta.tagsIndex")).toBe(en.pageMeta.tagsIndex);
  });

  it("그 밖의 언어는 미리 번역해 둔 화면 글, 아직 없으면 영어", async () => {
    state.lang = "ja";
    state.ui = { "pageMeta.tagsIndex": "すべてのタグ" };
    expect(await siteMetaText("pageMeta.tagsIndex")).toBe("すべてのタグ");
    expect(await siteMetaText("pageMeta.seriesIndex")).toBe(en.pageMeta.seriesIndex);
    state.ui = null;
    expect(await siteMetaText("pageMeta.tag", { tag: "React" })).toBe('Posts tagged "React"');
  });
});
