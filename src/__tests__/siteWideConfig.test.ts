import { describe, it, expect } from "vitest";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { toSiteWideConfig } from "@/config/siteWideConfig";

/* 모든 페이지에 싣는 사이트 설정(#944). 루트 레이아웃이 넘기는 설정은 RSC 페이로드에 통째로 들어가 어느 페이지든 받는다.
   /about 패널 내용과 태그 설명은 한 곳에서만 쓰여 뺀다. 크레딧(CreditsFooter)이 쓰는 about 필드는 남긴다. */

const full = structuredClone(siteConfig) as unknown as SiteConfigData;

describe("toSiteWideConfig", () => {
  it("태그 설명과 /about 패널 내용을 뺀다", () => {
    const wide = toSiteWideConfig(full) as Record<string, unknown>;
    expect(wide).not.toHaveProperty("tagDescriptions");
    const about = wide.about as Record<string, unknown>;
    for (const key of ["features", "security", "architectureItems", "process", "techStack", "panelOrder", "hiddenPanels"]) {
      expect(about, key).not.toHaveProperty(key);
    }
  });

  it("크레딧 필드와 다른 사이트 설정은 그대로 둔다", () => {
    const wide = toSiteWideConfig({
      ...full,
      about: { ...full.about, creditsNames: ["몽이"], creditsNote: "note", creditsNote_ko: "메모", creditsNoteAlign: "center" },
    });
    expect(wide.about).toMatchObject({ creditsNames: ["몽이"], creditsNote: "note", creditsNote_ko: "메모", creditsNoteAlign: "center" });
    expect(wide.posts).toEqual(full.posts);
    expect(wide.personal).toEqual(full.personal);
  });

  it("원본 설정을 바꾸지 않는다", () => {
    const before = JSON.stringify(full);
    toSiteWideConfig(full);
    expect(JSON.stringify(full)).toBe(before);
  });
});
