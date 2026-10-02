// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BASELINE_PATH, METRICS, compare, measure, readSources, type Baseline } from "../../scripts/lib/styleRatchet";

/* 디자인 시스템 이행 감시 — docs/design-system.md 의 "목표(N)" 가 늘지도, 줄어든 채 잠기지 않은 채로 있지도 않게 한다.
   세는 법은 scripts/lib/styleRatchet.ts, 기준선은 scripts/style-ratchet.baseline.json. */

const root = path.resolve(__dirname, "../..");

describe("styleRatchet", () => {
  it("세는 법 — 주석 · 토큰 정의 파일 · 문자열 속 HTML 은 세지 않는다", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-ratchet-"));
    try {
      const w = (rel: string, text: string) => {
        fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
        fs.writeFileSync(path.join(tmp, rel), text);
      };
      w("src/a.module.css", "/* var(--spacing-md) */ .a { padding: var(--spacing-md); transition: opacity 0.3s; }\n.b:disabled { opacity: 0.5; }");
      w("src/styles/tokens/_spacing.css", ":root { --spacing-md: 1rem; } .x { padding: var(--spacing-md); }");
      w("src/b.tsx", 'export const A = () => <button type="button" />;\nconst html = "<button>x</button>";');
      const m = measure(tmp);
      expect(m["name-spacing"]).toEqual({ "src/a.module.css": 1 });
      expect(m["motion-duration-literal"]).toEqual({ "src/a.module.css": 1 });
      expect(m["opacity-disabled"]).toEqual({ "src/a.module.css": 1 });
      expect(m["component-raw-button"]).toEqual({ "src/b.tsx": 1 });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("비교 — 합계로 판정한다(파일 사이에 옮기기만 한 건 통과)", () => {
    const id = METRICS[0].id;
    const before: Baseline = { [id]: { "a.css": 2, "b.css": 1 } };
    expect(compare(before, { [id]: { "a.css": 1, "b.css": 2 } })).toEqual({ grew: [], shrank: [] });
    expect(compare(before, { [id]: { "a.css": 2, "b.css": 2 } }).grew[0]).toContain("b.css: 1 → 2");
    expect(compare(before, { [id]: { "a.css": 2 } }).shrank).toHaveLength(1);
  });

  it("목표 숫자가 기준선과 같다 — 늘면 규칙 위반, 줄면 `npm run style:ratchet` 으로 잠근다", () => {
    const baseline: Baseline = JSON.parse(fs.readFileSync(path.join(root, BASELINE_PATH), "utf8"));
    const { grew, shrank } = compare(baseline, measure(root));
    expect(
      grew,
      `디자인 시스템 규칙을 어긴 코드가 늘었다(docs/design-system.md 의 규칙 번호를 보라):\n${grew.join("\n")}`,
    ).toEqual([]);
    expect(
      shrank,
      `옮긴 만큼 줄었다 — \`npm run style:ratchet\` 으로 기준선을 내려 잠근다:\n${shrank.join("\n")}`,
    ).toEqual([]);
  });

  it("기준선에 모든 항목이 있다", () => {
    const baseline: Baseline = JSON.parse(fs.readFileSync(path.join(root, BASELINE_PATH), "utf8"));
    expect(Object.keys(baseline).sort()).toEqual(METRICS.map((m) => m.id).sort());
    expect(readSources(root).files.size).toBeGreaterThan(0);
  });
});
