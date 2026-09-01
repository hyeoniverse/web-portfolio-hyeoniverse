import { describe, it, expect } from "vitest";
import { ABOUT_PANELS, aboutPanelTitle, aboutPanelLabel } from "@/data/about/panels";

/**
 * 관리자 칩은 마침표를 뗀 이름을 보여 주고 거기서 이름을 고치게 한다. 그래서 저장된 값을
 * 날것으로 찍으면 이름을 바꾼 패널만 마침표 없이 나온다 — 실제로 그렇게 나갔다.
 * 마침표를 붙일지는 패널마다 다르다(Overview. / Intro). 기본 제목이 어떻게 끝나는지를
 * 그대로 따라가는 것이 이 함수의 계약이다.
 */
describe("aboutPanelTitle", () => {
  it("지정한 제목이 없으면 기본 제목", () => {
    expect(aboutPanelTitle("overview")).toBe("Overview.");
    expect(aboutPanelTitle("hero")).toBe("Intro");
  });

  it("기본이 마침표로 끝나는 패널은 지정한 제목에도 붙인다", () => {
    expect(aboutPanelTitle("overview", "개요")).toBe("개요.");
    expect(aboutPanelTitle("troubleshooting", "설계 결정")).toBe("설계 결정.");
  });

  it("기본이 마침표로 끝나지 않는 패널은 붙이지 않는다", () => {
    expect(aboutPanelTitle("hero", "인트로")).toBe("인트로");
    expect(aboutPanelTitle("credits", "만든 사람")).toBe("만든 사람");
  });

  it("이미 문장부호로 끝나면 덧붙이지 않는다", () => {
    expect(aboutPanelTitle("overview", "개요.")).toBe("개요.");
    expect(aboutPanelTitle("overview", "왜 이렇게 했나?")).toBe("왜 이렇게 했나?");
  });

  it("빈 값·공백은 지정하지 않은 것으로 본다", () => {
    expect(aboutPanelTitle("overview", "")).toBe("Overview.");
    expect(aboutPanelTitle("overview", "   ")).toBe("Overview.");
  });

  it("모르는 키는 키를 그대로 — 화면이 비는 것보다 낫다", () => {
    expect(aboutPanelTitle("nope")).toBe("nope");
  });
});

describe("aboutPanelLabel", () => {
  it("제목 표기의 마침표만 뗀다", () => {
    expect(aboutPanelLabel("overview")).toBe("Overview");
    expect(aboutPanelLabel("hero")).toBe("Intro");
  });

  /* 칩에 보이는 이름이 곧 다시 저장될 값이다. 마침표가 붙은 채 보이면
     고칠 때마다 하나씩 더 붙는다. */
  it("칩 → 이름 변경 → 칩 을 반복해도 마침표가 늘지 않는다", () => {
    let shown = aboutPanelLabel("overview");
    for (let i = 0; i < 3; i++) shown = aboutPanelLabel("overview", shown);
    expect(shown).toBe("Overview");
    expect(aboutPanelTitle("overview", shown)).toBe("Overview.");
  });
});

describe("ABOUT_PANELS", () => {
  it("키가 겹치지 않는다 — 설정·순서·표시가 이 키로 이어진다", () => {
    const keys = ABOUT_PANELS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
