// @vitest-environment node
import { describe, it, expect } from "vitest";
import { presetNameProblem } from "@/app/admin/(dashboard)/settings/_data/presetName";

/* 프리셋 이름 — 저장이 안 되는 이유를 정확히 돌려주는지 */

const builtIn = [{ name: "Ruby" }, { name: "Slate" }];
const saved = [{ name: "My Blue" }];

describe("presetNameProblem", () => {
  it("빈 이름·공백만 있는 이름은 empty", () => {
    expect(presetNameProblem("", builtIn, saved)).toEqual({ kind: "empty" });
    expect(presetNameProblem("   ", builtIn, saved)).toEqual({ kind: "empty" });
  });

  it("기본 프리셋과 같은 이름 — 대소문자·앞뒤 공백 무시, 원래 이름으로 알려 준다", () => {
    expect(presetNameProblem(" ruby ", builtIn, saved)).toEqual({ kind: "builtIn", name: "Ruby" });
  });

  it("직접 저장한 프리셋과 같은 이름", () => {
    expect(presetNameProblem("my blue", builtIn, saved)).toEqual({ kind: "saved", name: "My Blue" });
  });

  it("새 이름이면 문제없다", () => {
    expect(presetNameProblem("Ruby 2", builtIn, saved)).toBeNull();
  });
});
