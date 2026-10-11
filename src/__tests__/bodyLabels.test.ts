import { describe, it, expect } from "vitest";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";
import {
  BODY_LABEL_KEYS,
  assembleBodyLabels,
  bodyLabelSource,
  escapeLabelHtml,
  fillLabel,
  mergeBodyLabels,
  uiBodyLabels,
} from "@/lib/bodyLabels";
import { uiLabelsHash } from "@/lib/api/contentTranslate";
import { processRichtextHtml } from "@/utils/processRichtextHtml";

/* 본문 안 라벨 — 화면 언어(ko/en)는 예전 글 그대로, 번역 라벨은 자리표시가 맞을 때만 덮는다 */
describe("bodyLabels — 라벨 묶음", () => {
  it("코드 블록 · mermaid 라벨은 locales 와 같다(ko/en 화면은 예전 그대로)", () => {
    expect(uiBodyLabels("ko").codeCopy).toBe(ko.common.codeCopy);
    expect(uiBodyLabels("en").codeExpand).toBe(en.common.codeExpand);
    expect(uiBodyLabels("en").mermaidSplit).toBe(en.common.mermaidSplit);
    expect(uiBodyLabels("ja")).toEqual(uiBodyLabels("ko"));
  });

  it("번역 원문은 열쇠 순서의 영어 — 숫자만인 영어 라벨은 따로 둔 원문(src)", () => {
    const src = bodyLabelSource();
    expect(src.map(([k]) => k)).toEqual([...BODY_LABEL_KEYS].sort());
    const map = Object.fromEntries(src);
    expect(map.codeCopy).toBe(en.common.codeCopy);
    expect(map.pollCount).toBe("{{n}} votes");
    expect(src.every(([, t]) => t.trim().length > 0)).toBe(true);
  });

  it("해시 — 같은 원문이면 같고, 라벨 하나만 바뀌어도 달라진다", () => {
    const src = bodyLabelSource();
    expect(uiLabelsHash(src)).toBe(uiLabelsHash(bodyLabelSource()));
    const edited = src.map(([k, t]) => [k, k === "codeCopy" ? `${t}!` : t] as [string, string]);
    expect(uiLabelsHash(edited)).not.toBe(uiLabelsHash(src));
  });
});

describe("bodyLabels — 다시 모으기", () => {
  const source = bodyLabelSource();
  const fake = source.map(([, t]) => `JA:${t}`);

  it("모든 자리가 쓸 만하면 complete", () => {
    const { ui, complete } = assembleBodyLabels(fake);
    expect(complete).toBe(true);
    expect(ui.codeCopy).toBe(`JA:${en.common.codeCopy}`);
    expect(ui.codeExpand).toContain("{{n}}");
  });

  it("실패한 자리 · 자리표시가 깨진 번역은 빼고 complete 가 아니다", () => {
    const at = (k: string) => source.findIndex(([key]) => key === k);
    const broken = [...fake];
    broken[at("codeExpand")] = "展開 · {{数}} 行"; // 자리표시 이름이 바뀜
    broken[at("pollTotal")] = "{{ n }} 票";       // 띄어 쓴 자리표시는 받아 붙인다
    const { ui, complete } = assembleBodyLabels(broken, [at("codeCopy")]);
    expect(complete).toBe(false);
    expect(ui.codeCopy).toBeUndefined();
    expect(ui.codeExpand).toBeUndefined();
    expect(ui.pollTotal).toBe("{{n}} 票");
  });

  it("merge — 번역이 없거나 못 쓰는 열쇠는 화면 언어 라벨", () => {
    const base = uiBodyLabels("ko");
    expect(mergeBodyLabels(base, null)).toBe(base);
    const m = mergeBodyLabels(base, { codeCopy: "コピー", codeExpand: "展開", unknown: "x", pollCount: 3 });
    expect(m.codeCopy).toBe("コピー");
    expect(m.codeExpand).toBe(base.codeExpand);
    expect(m.pollCount).toBe(base.pollCount);
    expect("unknown" in m).toBe(false);
  });

  it("fillLabel · escape", () => {
    expect(fillLabel("{{n}}명 참여", { n: 3 })).toBe("3명 참여");
    expect(fillLabel("{{x}}", {})).toBe("{{x}}");
    expect(escapeLabelHtml(`<b>&"`)).toBe("&lt;b&gt;&amp;&quot;");
  });

  it("processRichtextHtml — 번역 라벨을 HTML 로 굽기 전에 이스케이프", () => {
    const html = processRichtextHtml("<pre><code>x</code></pre><button data-wrap-btn></button>", {
      codeScroll: "<img onerror=x>", codeWrap: "A&B",
    });
    expect(html).toContain("↔ &lt;img onerror=x&gt;");
    expect(html).toContain("↩ A&amp;B");
    expect(html).not.toContain("<img onerror");
  });
});

describe("bodyLabels — 정보 칸 라벨 · 영어 이름", () => {
  it("정보 칸 라벨은 locales/예전 글 그대로", () => {
    expect(uiBodyLabels("ko").workCategory).toBe(ko.workDetail.category);
    expect(uiBodyLabels("en").workTech).toBe(en.workDetail.tech);
    expect(fillLabel(uiBodyLabels("ko").workTeamCount, { n: 3 })).toBe("팀 · 3");
    expect(uiBodyLabels("en").workSolo).toBe("Solo");
    expect(uiBodyLabels("en").aiSummaryLabel).toBe(en.aiSummary.label);
  });

  it("withEnglishName — 번역해 볼 때만 name_en(없으면 name)", async () => {
    const { withEnglishName } = await import("@/utils/localizeAuthor");
    const raw = { id: "a", name: "김정현", name_en: "Jeonghyeon Kim" } as Parameters<typeof withEnglishName>[1];
    expect(withEnglishName(raw, raw, false).name).toBe("김정현");
    expect(withEnglishName(raw, raw, true).name).toBe("Jeonghyeon Kim");
    expect(withEnglishName(raw, { ...raw, name_en: "" }, true).name).toBe("김정현");
  });
});
