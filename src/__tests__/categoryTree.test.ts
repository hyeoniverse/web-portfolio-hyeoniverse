import { describe, it, expect } from "vitest";
import type { BilingualCategory } from "@/types/common";
import {
  resolveCategory,
  findCategoryNode,
  categoryValue,
  canonicalCategory,
  expandCategoryValues,
  toCategoryOptions,
  categoryLabel,
} from "@/lib/categoryTree";

/* 지금 기본 트리 모양 — 소분류 이름이 모두 하나뿐 */
const unique: BilingualCategory[] = [
  {
    ko: "개발",
    en: "Development",
    children: [
      { ko: "프론트엔드", en: "Frontend" },
      { ko: "백엔드", en: "Backend" },
    ],
  },
  { ko: "학습", en: "Learning", children: [{ ko: "CS", en: "CS" }] },
  { ko: "회고", en: "Retro" },
];

/* 같은 이름 소분류가 두 대분류에 있는 트리 */
const dup: BilingualCategory[] = [
  { ko: "작업물", en: "Works", children: [{ ko: "기타", en: "Etc" }, { ko: "프론트엔드", en: "Frontend" }] },
  { ko: "글", en: "Writing", children: [{ ko: "기타", en: "Etc" }, { ko: "에세이", en: "Essay" }] },
  { ko: "개발", en: "Development", children: [{ ko: "프론트엔드", en: "Frontend" }] },
  { ko: "CI/CD", en: "CI/CD" },
];

const works = dup[0];
const writing = dup[1];
const dev = dup[2];

describe("resolveCategory — 이름만 있는 옛 값", () => {
  it("이름이 하나뿐이면 예전처럼 그 노드(ko · en 모두)", () => {
    expect(findCategoryNode(unique, "프론트엔드")?.en).toBe("Frontend");
    expect(findCategoryNode(unique, "Frontend")?.ko).toBe("프론트엔드");
    expect(resolveCategory(unique, "백엔드")?.parent?.ko).toBe("개발");
    expect(resolveCategory(unique, "회고")?.parent).toBeNull();
  });

  it("없는 값 · 빈 값은 null", () => {
    expect(resolveCategory(unique, "없음")).toBeNull();
    expect(resolveCategory(unique, "  ")).toBeNull();
  });

  it("같은 이름이 여럿이면 트리 순서상 첫 소분류로 해석한다", () => {
    expect(resolveCategory(dup, "기타")?.parent).toBe(works);
  });

  it("대분류와 소분류 이름이 겹치면 대분류가 먼저", () => {
    const cats: BilingualCategory[] = [
      { ko: "학습", en: "Learning", children: [{ ko: "기타", en: "Etc" }] },
      { ko: "기타", en: "Misc" },
    ];
    expect(resolveCategory(cats, "기타")).toEqual({ node: cats[1], parent: null });
  });
});

describe("resolveCategory — 경로", () => {
  it("ko · en 경로로 대분류마다 다른 노드를 찾는다", () => {
    expect(findCategoryNode(dup, "작업물/기타")).toBe(works.children![0]);
    expect(findCategoryNode(dup, "글/기타")).toBe(writing.children![0]);
    expect(findCategoryNode(dup, "Writing/Etc")).toBe(writing.children![0]);
    expect(findCategoryNode(dup, "개발/프론트엔드")).toBe(dev.children![0]);
  });

  it("경로 앞뒤 공백을 무시한다", () => {
    expect(findCategoryNode(dup, " 글 / 기타 ")).toBe(writing.children![0]);
  });

  it("없는 쌍은 null", () => {
    expect(resolveCategory(dup, "글/프론트엔드")).toBeNull();
  });

  it("이름에 / 가 든 카테고리는 이름 그대로 찾는다", () => {
    expect(findCategoryNode(dup, "CI/CD")).toBe(dup[3]);
  });

  it("소분류 이름에 / 가 있어도 경로로 찾는다", () => {
    const cats: BilingualCategory[] = [
      { ko: "개발", en: "Dev", children: [{ ko: "CI/CD", en: "CI/CD" }] },
      { ko: "운영", en: "Ops", children: [{ ko: "CI/CD", en: "CI/CD" }] },
    ];
    expect(resolveCategory(cats, "운영/CI/CD")?.parent).toBe(cats[1]);
  });
});

describe("categoryValue · canonicalCategory — 저장값", () => {
  it("이름이 하나뿐인 소분류는 이름 그대로(기존 데이터와 같은 모양)", () => {
    expect(categoryValue(unique, unique[0].children![0], unique[0])).toBe("프론트엔드");
    expect(canonicalCategory(unique, "Frontend")).toBe("프론트엔드");
    expect(canonicalCategory(unique, "개발/프론트엔드")).toBe("프론트엔드");
    expect(canonicalCategory(unique, "회고")).toBe("회고");
  });

  it("같은 이름이 다른 대분류에 있으면 ko 경로", () => {
    expect(categoryValue(dup, writing.children![0], writing)).toBe("글/기타");
    expect(canonicalCategory(dup, "Writing/Etc")).toBe("글/기타");
    expect(canonicalCategory(dup, "에세이")).toBe("에세이");
  });

  it("트리에 없는 값은 다듬기만 한다", () => {
    expect(canonicalCategory(dup, "  새 카테고리 ")).toBe("새 카테고리");
  });
});

describe("expandCategoryValues — 필터", () => {
  it("이름이 하나뿐이면 예전 값(이름)과 경로 모두 매칭", () => {
    const v = expandCategoryValues(unique, "프론트엔드");
    expect(v).toEqual(expect.arrayContaining(["프론트엔드", "Frontend", "개발/프론트엔드", "Development/Frontend"]));
  });

  it("대분류는 자식까지 포함", () => {
    const v = expandCategoryValues(unique, "개발");
    expect(v).toEqual(expect.arrayContaining(["개발", "Development", "프론트엔드", "백엔드", "개발/백엔드"]));
  });

  it("같은 이름 소분류는 자기 경로만 — 다른 대분류의 같은 이름 글이 섞이지 않는다", () => {
    const writingEtc = expandCategoryValues(dup, "글/기타");
    expect(writingEtc).toContain("글/기타");
    expect(writingEtc).toContain("Writing/Etc");
    expect(writingEtc).not.toContain("기타");
    expect(writingEtc).not.toContain("작업물/기타");

    const writingAll = expandCategoryValues(dup, "글");
    expect(writingAll).toContain("글/기타");
    expect(writingAll).toContain("에세이");
    expect(writingAll).not.toContain("기타");
    expect(writingAll).not.toContain("작업물/기타");
  });

  it("이름만 저장된 옛 값은 그 이름이 해석되는 노드 쪽에 묶인다", () => {
    expect(expandCategoryValues(dup, "작업물/기타")).toContain("기타");
    expect(expandCategoryValues(dup, "작업물")).toContain("기타");
  });

  it("트리에 없는 값은 그대로", () => {
    expect(expandCategoryValues(dup, "없음")).toEqual(["없음"]);
  });
});

describe("toCategoryOptions", () => {
  it("이름이 하나뿐인 트리는 예전처럼 ko 이름이 value", () => {
    expect(toCategoryOptions(unique, "ko").map((o) => o.value)).toEqual(["프론트엔드", "백엔드", "CS", "회고"]);
  });

  it("같은 이름 소분류는 경로 value 로 구분된다", () => {
    const opts = toCategoryOptions(dup, "en");
    expect(opts.map((o) => o.value)).toEqual(["작업물/기타", "작업물/프론트엔드", "글/기타", "에세이", "개발/프론트엔드", "CI/CD"]);
    expect(opts[2]).toEqual({ value: "글/기타", label: "Etc", group: "Writing" });
  });
});

describe("categoryLabel", () => {
  it("이름이 하나뿐이면 소분류 이름만(예전과 같다)", () => {
    expect(categoryLabel(unique, "프론트엔드", "en")).toBe("Frontend");
    expect(categoryLabel(unique, "개발/프론트엔드", "ko")).toBe("프론트엔드");
  });

  it("같은 이름 소분류는 대분류를 앞에 붙여 구분한다", () => {
    expect(categoryLabel(dup, "글/기타", "ko")).toBe("글 › 기타");
    expect(categoryLabel(dup, "작업물/기타", "en")).toBe("Works › Etc");
  });

  it("트리에 없는 값은 그대로", () => {
    expect(categoryLabel(dup, "없음", "ko")).toBe("없음");
  });
});
