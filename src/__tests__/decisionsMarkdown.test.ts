import { describe, it, expect } from "vitest";
import {
  itemToMarkdown,
  itemFileName,
  parseDecisionMarkdown,
  mergeDecisionPair,
} from "@/lib/about/decisionsMarkdown";
import { aboutDecisions } from "@/data/generated/aboutContent";
import type { TroubleShootingItem } from "@/data/about/types";

/**
 * 왕복이 이 기능의 전제다. 화면에서 뽑은 md 를 content/about/decisions/ 에 넣고
 * 동기화하면 같은 항목이 돌아와야 한다. 한쪽만 고쳐도 조용히 깨지는 자리라 실제
 * 노출 중인 9개 항목을 그대로 통과시킨다.
 */
function roundTrip(item: TroubleShootingItem, index: number): TroubleShootingItem {
  const ko = parseDecisionMarkdown(itemToMarkdown(item, "ko"), item.id);
  const en = parseDecisionMarkdown(itemToMarkdown(item, "en"), item.id);
  expect(ko.warnings, `${item.id} (ko) 경고: ${ko.warnings.join(" / ")}`).toEqual([]);
  expect(en.warnings, `${item.id} (en) 경고: ${en.warnings.join(" / ")}`).toEqual([]);
  expect(itemFileName(item, index)).toBe(`${String(index + 1).padStart(2, "0")}-${item.id}.md`);
  return mergeDecisionPair(ko, en);
}

describe("Design Decisions md 왕복", () => {
  /* 개수를 못 박지 않는다 — 결정이 늘 때마다 깨지는 검사는 값을 못 한다.
     대신 항목이 있고 id 가 겹치지 않는지를 본다. id 가 겹치면 파일명이 충돌하고
     화면에서도 한 항목이 다른 항목을 가린다. */
  it("항목이 있고 id 가 겹치지 않는다", () => {
    expect(aboutDecisions.length).toBeGreaterThan(0);
    const ids = aboutDecisions.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(aboutDecisions.map((item, i) => [item.id, item, i] as const))(
    "%s — 내보낸 md 를 되읽으면 같은 항목이 된다",
    (_id, item, index) => {
      const back = roundTrip(item, index);

      expect(back.id).toBe(item.id);
      expect(back.title).toEqual(item.title ?? item.problem);
      expect(back.problem).toEqual(item.problem);
      expect(back.section).toEqual(item.section);
      expect(back.difficulty).toBe(item.difficulty);
      /* vizKey 를 흘리면 항목마다 붙은 도형이 통째로 사라진다. */
      expect(back.vizKey).toBe(item.vizKey);
      expect(back.tags ?? []).toEqual(item.tags ?? []);
    },
  );

  it.each(aboutDecisions.map((item, i) => [item.id, item, i] as const))(
    "%s — 본문 네 단이 글자 그대로 남는다",
    (_id, item, index) => {
      const back = roundTrip(item, index);
      for (const field of ["definition", "cause", "solution", "keyInsight"] as const) {
        for (const lang of ["ko", "en"] as const) {
          expect(back[field][lang], `${item.id}.${field}.${lang}`).toBe(item[field][lang]);
        }
      }
    },
  );
});

describe("파서 방어", () => {
  const base = [
    "---",
    "id: sample",
    "section: 인증 / 인가",
    "difficulty: 2",
    "---",
    "# 제목",
    "",
    "> 증상 한 줄",
    "",
    "## Context",
    "본문",
    "",
    "## Considerations",
    "원인",
    "",
    "## Decision",
    "해결",
    "",
    "## Key Insight",
    "교훈",
    "",
  ].join("\n");

  it("머리말이 없으면 파일명이 id 가 된다", () => {
    const parsed = parseDecisionMarkdown(base.replace(/^---\n[\s\S]*?\n---\n/, ""), "from-filename");
    expect(parsed.id).toBe("from-filename");
  });

  it("difficulty 가 범위를 벗어나면 버리고 경고한다", () => {
    const parsed = parseDecisionMarkdown(base.replace("difficulty: 2", "difficulty: 9"), "x");
    expect(parsed.difficulty).toBeUndefined();
    expect(parsed.warnings.join()).toContain("difficulty");
  });

  it("모르는 소제목은 경고하고 본문에서 뺀다", () => {
    const parsed = parseDecisionMarkdown(base.replace("## Decision", "## Solution"), "x");
    expect(parsed.warnings.join()).toContain("Solution");
    expect(parsed.body.solution).toBe("");
  });

  /* 인용 한 줄이 없으면 제목이 곧 증상이다 — 화면 동작(title ?? problem)과 같게. */
  it("인용 줄이 없으면 problem 이 제목이 된다", () => {
    const parsed = parseDecisionMarkdown(base.replace("> 증상 한 줄\n\n", ""), "x");
    expect(parsed.problem).toBe("제목");
  });

  /* 본문에 손으로 쓴 표는 그냥 본문이다. 실제 항목 하나가 그렇게 쓰여 있어서,
     `|` 로 시작하는 줄을 잡아 경고하던 초기 구현이 오탐을 냈다. */
  it("본문의 표를 글자 그대로 둔다", () => {
    const parsed = parseDecisionMarkdown(base.replace("해결", "| a | b |\n| --- | --- |"), "x");
    expect(parsed.warnings).toEqual([]);
    expect(parsed.body.solution).toBe("| a | b |\n| --- | --- |");
  });

  it("en 이 없으면 ko 를 그대로 쓴다", () => {
    const ko = parseDecisionMarkdown(base, "x");
    const merged = mergeDecisionPair(ko);
    expect(merged.definition.en).toBe("본문");
  });

  it("섹션 안 이미지가 그 섹션의 position 으로 복원된다", () => {
    const withImage = base.replace("해결", "해결\n\n![흐름도](/content/about/decisions/x/flow.svg)\n\n*그림 1*");
    const parsed = parseDecisionMarkdown(withImage, "x");
    expect(parsed.images).toHaveLength(1);
    expect(parsed.images[0]).toMatchObject({
      src: "/content/about/decisions/x/flow.svg",
      alt: "흐름도",
      position: "solution",
    });
    expect(parsed.images[0].caption).toBe("그림 1");
  });
});
