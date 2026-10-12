/* About 글의 관리자 덮어쓰기 — 장마다의 글(_data/*)은 코드 기본값이고, 관리자 About 편집기에서 고친 장면은
   about.texts[장][장면] 에 장면째(목록 포함) 저장된다. 페이지는 장면마다 저장된 값이 있으면 그것을 쓴다.
   저장된 값은 기본값의 모양에 맞춰 걸러 쓴다(conform) — 모르는 칸은 버리고, 빠진 칸 · 글자가 아닌 칸은
   기본값으로 채운다. 목록은 항목을 늘리고 줄이고 옮길 수 있지만, 그림 · 좌표와 순서로 묶인 목록(FIXED_LISTS)은
   길이를 기본값에 고정한다. */
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
/** 장 → 장면 → 고친 장면 값 */
export type AboutTextOverrides = Partial<Record<string, Record<string, unknown>>>;

/**
 * 항목 수 · 순서를 바꾸면 안 되는 목록 — "장.장면.경로"(배열 칸의 번호는 *).
 * locked: 늘리기 · 줄이기 · 옮기기 모두 안 됨(그림이 번호로 짝을 짓는다)
 * fixed: 옮기기만 됨(항목마다 정해진 그림 · 동작이 있어 새 항목을 그릴 수 없다)
 */
const FIXED_LISTS: Record<string, "locked" | "fixed"> = {
  "showcase.toc": "fixed",
  "showcase.hero.shots": "locked",
  "making.processLayers": "locked",
  "architecture.journeyLayers": "locked",
  "architecture.stackScene.groups": "fixed",
  "architecture.stackKey": "fixed",
  "architecture.apiScene.key": "fixed",
  "decisions.securityLayers": "locked",
  "decisions.securityLayers.*.items": "locked",
  "ai.fallbackPanel.features": "locked",
  "ai.fallbackPanel.features.*.providers": "locked",
  "design.contrastRows": "locked",
  "design.guardRows": "locked",
  "features.mascotScene.acts": "fixed",
  "features.layoutsScene.layouts": "fixed",
};

/** 목록 경로("ai.fallbackPanel.features.2.providers")의 고정 정도 */
export function listRule(path: string): "locked" | "fixed" | "free" {
  return FIXED_LISTS[path.replace(/\.\d+(?=\.|$)/g, ".*")] ?? "free";
}

/** 저장값을 받는 글자 칸 — 언어 칸(ko/en 아래), 숫자 · 단위, 그리고 새 항목이 겹치지 않게 받는 key · id */
const OVERRIDABLE = new Set(["value", "unit", "wordmark", "key", "id"]);

/** 저장된 값을 기본값의 모양에 맞춘다 — 글자 칸만 저장값을, 이미지 경로 · 링크 · 숫자는 기본값을 쓴다 */
function conform(base: unknown, over: unknown, path: string, underLang = false): unknown {
  const key = path.slice(path.lastIndexOf(".") + 1);
  if (typeof base === "string") return typeof over === "string" && (underLang || OVERRIDABLE.has(key)) ? over : base;
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    const rule = listRule(path);
    if (rule === "locked") return base.map((b, i) => conform(b, over[i], `${path}.${i}`, underLang));
    const tpl = base[base.length - 1];
    const items = over.map((o, i) => {
      /* 옮기기만 되는 목록 — 항목의 정체(key · href)로 기본 항목을 찾는다 */
      const id = o && typeof o === "object" ? ((o as Record<string, unknown>).key ?? (o as Record<string, unknown>).href) : undefined;
      const match = id !== undefined ? base.find((b) => b && typeof b === "object" && ((b as Record<string, unknown>).key ?? (b as Record<string, unknown>).href) === id) : undefined;
      return conform(match ?? base[i] ?? tpl, o, `${path}.${i}`, underLang);
    });
    return rule === "fixed" && items.length !== base.length ? base : items;
  }
  if (base && typeof base === "object") {
    if (!over || typeof over !== "object" || Array.isArray(over)) return base;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(base)) out[k] = conform(v, (over as Record<string, unknown>)[k], `${path}.${k}`, underLang || k === "ko" || k === "en");
    return out;
  }
  return base;
}

export function applyAboutTexts(overrides: AboutTextOverrides | undefined): AboutTexts {
  if (!overrides) return ABOUT_TEXT_DEFAULTS;
  let changed = false;
  const out: Record<string, Record<string, unknown>> = { ...ABOUT_TEXT_DEFAULTS };
  for (const [ch, scenes] of Object.entries(overrides)) {
    const base = (ABOUT_TEXT_DEFAULTS as Record<string, Record<string, unknown>>)[ch];
    if (!base || !scenes || typeof scenes !== "object") continue;
    const next = { ...base };
    for (const [scene, value] of Object.entries(scenes)) {
      if (!(scene in base) || value == null) continue;
      next[scene] = conform(base[scene], value, `${ch}.${scene}`);
      changed = true;
    }
    out[ch] = next;
  }
  return (changed ? out : ABOUT_TEXT_DEFAULTS) as AboutTexts;
}
