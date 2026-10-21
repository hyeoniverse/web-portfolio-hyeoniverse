import { describe, expect, it } from "vitest";
import { parseCspReports, stripUrl } from "@/lib/cspReport";

describe("parseCspReports", () => {
  it("report-uri 형식(Safari · Firefox)", () => {
    const out = parseCspReports({
      "csp-report": {
        "document-uri": "https://hyeoniverse.com/posts/a?token=secret#x",
        "blocked-uri": "https://evil.example/x.js?q=1",
        "effective-directive": "script-src-elem",
        disposition: "report",
        "source-file": "https://hyeoniverse.com/_next/static/a.js",
        "line-number": 12,
      },
    });
    expect(out).toEqual([{
      document: "https://hyeoniverse.com/posts/a",
      blocked: "https://evil.example/x.js",
      directive: "script-src-elem",
      disposition: "report",
      source: "https://hyeoniverse.com/_next/static/a.js:12",
    }]);
  });

  it("report-to 형식(Chrome) — csp-violation 만", () => {
    const out = parseCspReports([
      { type: "csp-violation", body: { documentURL: "https://hyeoniverse.com/", blockedURL: "inline", effectiveDirective: "style-src-attr", disposition: "report" } },
      { type: "deprecation", body: { id: "x" } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ blocked: "inline", directive: "style-src-attr", source: "" });
  });

  it("모양이 다르면 빈 배열", () => {
    expect(parseCspReports(null)).toEqual([]);
    expect(parseCspReports({ foo: 1 })).toEqual([]);
    expect(parseCspReports([1, "a", { type: "csp-violation" }])).toEqual([]);
  });
});

describe("stripUrl", () => {
  it("쿼리 · 해시를 버리고 키워드는 그대로", () => {
    expect(stripUrl("https://a.com/p?x=1#h")).toBe("https://a.com/p");
    expect(stripUrl("eval")).toBe("eval");
    expect(stripUrl(undefined)).toBe("");
  });
});
