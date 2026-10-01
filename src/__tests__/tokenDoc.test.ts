// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildTokenDoc, parseTokens } from "../../scripts/lib/tokenDoc";

const root = path.resolve(__dirname, "../..");

describe("tokenDoc", () => {
  it("선언과 자리를 읽고, 주석·지역 변수는 건너뛴다", () => {
    const css = `
      /* --fake: 1px; */
      :root { --a: 1px; --b: var(--a); }
      [data-theme="dark"] { --a: 2px; }
      @media (max-width: 480px) { :root { --a: 3px; } }
      .x { --_local: 4px; }
    `;
    expect(parseTokens(css)).toEqual([
      { name: "--a", value: "1px", context: "" },
      { name: "--b", value: "var(--a)", context: "" },
      { name: "--a", value: "2px", context: '[data-theme="dark"]' },
      { name: "--a", value: "3px", context: "@media (max-width: 480px)" },
    ]);
  });

  it("docs/tokens.md 가 CSS 토큰과 같다 — 다르면 `npm run tokens:doc`", () => {
    const current = fs.readFileSync(path.join(root, "docs/tokens.md"), "utf8");
    expect(current).toBe(buildTokenDoc(root));
  });
});
