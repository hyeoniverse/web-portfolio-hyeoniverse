import type { ContentSubTab, TabId } from "../_data/settingsConstants";

/* 탭 편집기 청크를 미리 받는다. page.tsx 와 ContentTab 의 next/dynamic 이 같은 모듈을 불러오므로 청크는 한 번만 받는다.
   - 주소로 바로 연 탭은 설정값을 받는 동안 함께 받는다. dynamic 에만 맡기면 설정값이 온 뒤 탭을 그리려는 순간에야
     받기 시작해, 그만큼 늦게 그려졌다(Appearance 의 LCP 1.39 → 1.61초).
   - 탭 단추에 마우스를 올리거나 포커스하면 누르기 전에 받아 둔다.
   받지 못해도 여기서는 조용히 넘긴다 — 탭을 그릴 때 dynamic 이 다시 받는다. */
const TABS: Partial<Record<TabId, () => Promise<unknown>>> = {
  content: () => import("./ContentTab"),
  appearance: () => import("./AppearanceTab"),
  services: () => import("./ServicesTab"),
  account: () => Promise.all([import("./AccountTab"), import("./AuthorsEditor")]),
};

const CONTENT_SUBS: Partial<Record<ContentSubTab, () => Promise<unknown>>> = {
  about: () => Promise.all([import("./about/AboutStudio"), import("./AboutTechStackEditor")]),
  calendars: () => import("./CalendarManager"),
};

export function preloadSettingsTab(tab: TabId, sub?: ContentSubTab): void {
  TABS[tab]?.().catch(() => {});
  if (tab === "content" && sub) CONTENT_SUBS[sub]?.().catch(() => {});
}
