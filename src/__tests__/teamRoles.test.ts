import { describe, expect, it } from "vitest";
import { cleanContributions, pairContributionGroups, splitRoleList } from "@/utils/teamRoles";

describe("splitRoleList", () => {
  it("쉼표와 가운뎃점 둘 다로 나눈다", () => {
    expect(splitRoleList("기획, 디자인")).toEqual(["기획", "디자인"]);
    expect(splitRoleList("1인 개발 · 기획 · 인프라 · CI/CD")).toEqual(["1인 개발", "기획", "인프라", "CI/CD"]);
  });

  it("빈 값과 빈 조각은 버린다", () => {
    expect(splitRoleList("")).toEqual([]);
    expect(splitRoleList(undefined)).toEqual([]);
    expect(splitRoleList(" , 기획 ,, ")).toEqual(["기획"]);
  });
});

describe("cleanContributions", () => {
  it("빈 줄 · 빈 묶음은 빼고, 역할 목록에 없는 묶음은 남긴다", () => {
    expect(cleanContributions({ "품질 · 보안": ["테스트", " ", ""], 기획: [""], 인프라: [] })).toEqual({ "품질 · 보안": ["테스트"] });
  });
});

describe("pairContributionGroups", () => {
  it("역할 자리 · 영문 낱말 · 남은 순서로 KO · EN 묶음을 짝짓는다", () => {
    const pairs = pairContributionGroups(
      ["백엔드", "프론트엔드", "품질 · 보안", "인프라 · CI/CD"],
      ["Backend", "Frontend", "Infra · CI/CD", "Quality · Security"],
      ["1인 개발", "기획", "디자인", "프론트엔드", "백엔드", "인프라", "CI/CD"],
      ["Solo", "Planning", "Design", "Frontend", "Backend", "Infrastructure", "CI/CD"],
    );
    expect(pairs).toEqual([
      { ko: "백엔드", en: "Backend" },
      { ko: "프론트엔드", en: "Frontend" },
      { ko: "품질 · 보안", en: "Quality · Security" },
      { ko: "인프라 · CI/CD", en: "Infra · CI/CD" },
    ]);
  });

  it("짝이 없으면 한쪽만 있는 줄로 남긴다", () => {
    expect(pairContributionGroups(["기획"], [], ["기획"], [])).toEqual([{ ko: "기획", en: undefined }]);
    expect(pairContributionGroups([], ["Design"], [], ["Design"])).toEqual([{ en: "Design" }]);
  });
});
