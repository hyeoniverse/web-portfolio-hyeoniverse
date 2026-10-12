/* About 글의 관리자 덮어쓰기 — 장마다의 글(_data/*)은 코드 기본값이고, 관리자 About 편집기에서 고친 글이
   about.texts[장] 에 "이름.경로" → 글자 로 쌓인다(예: texts.landing["faq.items.0.q.ko"]). 페이지는 둘을 겹쳐 그린다.
   장마다 나눠 두는 것은 편집기가 장 단위로 저장 · 되돌리기 하도록(about.texts.landing 같은 설정 경로).
   배열은 길이를 그대로 두고 글자만 바꾼다 — 항목을 늘리고 줄이는 일은 코드에서 한다. */
import { hero, toc, live, facts } from "./showcase";
import { featuresChapter, publicScene, layoutsScene, mascotScene, adminScene, adminItems, cmsScene, voiceScene, themeScene } from "./features";
import { aiChapter, summaryPanel, fallbackPanel, translatePanel, coverPanel, voicePanel } from "./ai";
import { architectureChapter, stackScene, stackKey, flowScene, apiScene, erdScene, erdGroups, erdOtherGroup, journeyLayers, journeyScene, keyNotes } from "./architecture";
import { groupJourneys } from "./groupJourneys";
import { decisionsText, securityText, makingChapter, processText, processLayers } from "./making";
import { decisionExtras } from "./decisionOptions";
import { securityLayers, securityRingsText } from "./security";
import { designChapter, designSteps, contrastRows, guardRows } from "./design";
import { codeChapter, codeSources } from "./code";
import { heroCta, trust, faq, finalCta, credits } from "./landing";

/** 장 순서 = 페이지 순서. 편집기도 이 순서로 보인다 */
export const ABOUT_TEXT_DEFAULTS = {
  showcase: { hero, toc, live, facts },
  landing: { heroCta, trust, faq, finalCta, credits },
  features: { featuresChapter, publicScene, layoutsScene, mascotScene, adminScene, adminItems, cmsScene, voiceScene, themeScene },
  ai: { aiChapter, summaryPanel, fallbackPanel, translatePanel, coverPanel, voicePanel },
  architecture: { architectureChapter, stackScene, stackKey, flowScene, apiScene, erdScene, erdGroups, erdOtherGroup, journeyLayers, journeyScene, keyNotes },
  journeys: { groupJourneys },
  decisions: { decisionsText, decisionExtras, securityText, securityLayers, securityRingsText },
  design: { designChapter, designSteps, contrastRows, guardRows },
  code: { codeChapter, codeSources },
  making: { makingChapter, processText, processLayers },
};

export type AboutTexts = typeof ABOUT_TEXT_DEFAULTS;
export type AboutChapterKey = keyof AboutTexts;
export type AboutTextOverrides = Partial<Record<string, Record<string, string>>>;

/** 고칠 수 있는 글자 — ko/en 칸, 그리고 숫자 · 단위처럼 언어 없이 보이는 몇 칸 */
const PLAIN_KEYS = new Set(["value", "unit", "wordmark"]);

export interface TextLeaf {
  /** 장 안의 경로 — "faq.items.0.q.ko" */
  path: string;
  value: string;
}

/** 한 장의 기본값에서 고칠 수 있는 글자를 모두 뽑는다(편집기 목록) */
export function collectTextLeaves(root: unknown): TextLeaf[] {
  const out: TextLeaf[] = [];
  const walk = (v: unknown, path: string[], underLang: boolean) => {
    if (typeof v === "string") {
      const key = path[path.length - 1];
      if (underLang || PLAIN_KEYS.has(key)) out.push({ path: path.join("."), value: v });
      return;
    }
    if (!v || typeof v !== "object") return;
    for (const [k, child] of Object.entries(v)) walk(child, [...path, k], underLang || k === "ko" || k === "en");
  };
  walk(root, [], false);
  return out;
}

/** 경로의 글자만 바꾼 사본 — 지나가는 객체 · 배열만 새로 만들고 나머지는 그대로 둔다 */
function setAt(root: unknown, segs: string[], value: string): unknown {
  if (!segs.length) return typeof root === "string" ? value : root;
  if (!root || typeof root !== "object") return root;
  const [head, ...rest] = segs;
  if (!(head in root)) return root;
  const prev = (root as Record<string, unknown>)[head];
  const next = setAt(prev, rest, value);
  if (next === prev) return root;
  if (Array.isArray(root)) {
    const copy = [...root];
    copy[Number(head)] = next;
    return copy;
  }
  return { ...(root as Record<string, unknown>), [head]: next };
}

export function applyAboutTexts(overrides: AboutTextOverrides | undefined): AboutTexts {
  let out: unknown = ABOUT_TEXT_DEFAULTS;
  for (const [chapter, map] of Object.entries(overrides ?? {})) {
    if (!map || typeof map !== "object") continue;
    for (const [path, value] of Object.entries(map)) {
      if (typeof value !== "string" || !value.trim()) continue;
      out = setAt(out, [chapter, ...path.split(".")], value);
    }
  }
  return out as AboutTexts;
}
