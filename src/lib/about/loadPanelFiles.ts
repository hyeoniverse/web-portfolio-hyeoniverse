import { parseDecisionMarkdown, mergeDecisionPair } from "./decisionsMarkdown";
import {
  parseSimpleMarkdown, securityPanel, featuresPanel, processPanel,
  overviewPanel, creditsPanel, type SimpleDoc,
} from "./panelMarkdown";
import { MARKDOWN_PANELS } from "./contentSources";

/**
 * 고른 .md 파일들 → 패널 값.
 *
 * 설정 화면에서 파일을 끌어다 놓고 바로 채우기 위한 것이다. 동기화 스크립트와 같은 파서를
 * 쓰지만 파일시스템을 모른다 — 브라우저는 이름과 내용만 넘긴다.
 *
 * 결과는 **저장하지 않은 편집**으로 들어간다. 눈으로 확인하고 섹션저장을 누르는 흐름이라,
 * 파일을 잘못 골라도 되돌리기로 물릴 수 있다.
 *
 * 상대 경로 이미지(`./x/y.png`)는 서빙 경로로 바꾸지만 **파일이 있는지는 확인하지 못한다** —
 * 브라우저에 repo 가 없다. 링크가 깨졌는지는 동기화(`npm run sync-about`)가 잡는다.
 */

export interface UploadedFile {
  name: string;
  text: string;
}

export interface LoadResult {
  /** config 경로(`about.security`) → 값. 그대로 setAny 로 넣으면 된다. */
  values: Record<string, unknown>;
  /** 읽은 항목 수. 파일 하나짜리 패널은 1. */
  count: number;
  warnings: string[];
}

interface Pair { base: string; ko: string; en?: string }

/** `x.md` 와 `x.en.md` 를 한 항목으로 묶는다. 표시 순서는 파일명 순. */
function pairUp(files: UploadedFile[]): Pair[] {
  const byBase = new Map<string, { ko?: string; en?: string }>();
  for (const file of files) {
    if (!file.name.endsWith(".md")) continue;
    const isEn = file.name.endsWith(".en.md");
    const base = file.name.slice(0, isEn ? -6 : -3);
    const slot = byBase.get(base) ?? {};
    if (isEn) slot.en = file.text;
    else slot.ko = file.text;
    byBase.set(base, slot);
  }
  return [...byBase.entries()]
    .filter(([, v]) => v.ko !== undefined)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([base, v]) => ({ base, ko: v.ko!, en: v.en }));
}

function rewriteAssets(raw: string, dir: string): string {
  return raw.replace(/!\[([^\]]*)\]\((\.\/[^)]+)\)/g, (_a, alt: string, rel: string) =>
    `![${alt}](/content/about/${dir}/${rel.replace(/^\.\//, "")})`);
}

export function loadPanelFiles(panelKey: string, files: UploadedFile[]): LoadResult | null {
  const def = MARKDOWN_PANELS[panelKey];
  if (!def) return null;

  const warnings: string[] = [];
  const collect = (base: string, lang: string, list: string[]) => {
    for (const w of list) warnings.push(`${base}${lang} — ${w}`);
  };

  const pairs = pairUp(files).map((p) => ({
    ...p,
    ko: rewriteAssets(p.ko, def.dir),
    en: p.en ? rewriteAssets(p.en, def.dir) : undefined,
  }));
  if (pairs.length === 0) return { values: {}, count: 0, warnings: ["읽을 수 있는 .md 파일이 없습니다."] };

  if (panelKey === "troubleshooting") {
    const seen = new Set<string>();
    const items = [];
    for (const p of pairs) {
      const id = p.base.replace(/^\d+[-_]/, "");
      const ko = parseDecisionMarkdown(p.ko, id);
      const en = p.en ? parseDecisionMarkdown(p.en, id) : undefined;
      collect(p.base, ".md", ko.warnings);
      collect(p.base, ".en.md", en?.warnings ?? []);
      if (seen.has(ko.id)) { warnings.push(`id 가 겹칩니다 — "${ko.id}" (${p.base})`); continue; }
      seen.add(ko.id);
      items.push(mergeDecisionPair(ko, en));
    }
    return { values: { "about.troubleshooting": items }, count: items.length, warnings };
  }

  const readList = <T,>(read: (ko: SimpleDoc, en?: SimpleDoc) => T): T[] =>
    pairs.map((p) => {
      const ko = parseSimpleMarkdown(p.ko);
      const en = p.en ? parseSimpleMarkdown(p.en) : undefined;
      collect(p.base, ".md", ko.warnings);
      collect(p.base, ".en.md", en?.warnings ?? []);
      return read(ko, en);
    });

  if (panelKey === "security") {
    const v = readList(securityPanel.read);
    return { values: { "about.security": v }, count: v.length, warnings };
  }
  if (panelKey === "features") {
    const v = readList(featuresPanel.read);
    return { values: { "about.features": v }, count: v.length, warnings };
  }
  if (panelKey === "process") {
    const v = readList(processPanel.read);
    return { values: { "about.process": v }, count: v.length, warnings };
  }

  /* 파일 하나짜리 패널 — 여러 개를 골라도 첫 짝만 쓴다. */
  const first = pairs[0];
  const opts = { optionalBody: panelKey === "credits" };
  const ko = parseSimpleMarkdown(first.ko, opts);
  const en = first.en ? parseSimpleMarkdown(first.en, opts) : undefined;
  collect(first.base, ".md", ko.warnings);

  if (panelKey === "overview") {
    const v = overviewPanel.read(ko, en);
    return {
      values: {
        "about.overview_description_ko": v.overview_description_ko,
        "about.overview_description_en": v.overview_description_en,
        "about.overview_highlights": v.overview_highlights,
        "about.overview_stats": v.overview_stats,
      },
      count: 1,
      warnings,
    };
  }
  if (panelKey === "credits") {
    const v = creditsPanel.read(ko, en);
    return {
      values: {
        "about.creditsNames": v.creditsNames,
        "about.creditsNote": v.creditsNote,
        "about.creditsNote_ko": v.creditsNote_ko,
      },
      count: 1,
      warnings,
    };
  }
  return null;
}
