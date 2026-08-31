import type { CfgSecurity, CfgFeature, CfgProcess } from "@/lib/about/panelMarkdown";
import type { SecurityItem, DesignFeature, ProcessStep } from "@/data/about/types";

/**
 * 설정 모양(평평한 `title_ko` / `title_en`) → 화면 모양(`title: { ko, en }`).
 *
 * 원래 세 패널이 각자 안에 같은 함수를 하나씩 들고 있었다. 설정에서 온 값만 변환하면
 * 됐기 때문인데, 이제 폴백도 같은 평평한 모양(md 에서 구운 것)이라 패널 밖에서도 필요하다.
 * 세 벌이 흩어져 있으면 필드 하나 늘 때 한 곳만 고치고 지나가기 쉬워 여기로 모은다.
 */

export function adaptSecurity(list: CfgSecurity[]): SecurityItem[] {
  return list.map((s) => ({
    layer: s.layer,
    icon: s.icon,
    title: { ko: s.title_ko, en: s.title_en },
    description: { ko: s.description_ko, en: s.description_en },
    scope: { ko: s.scope_ko, en: s.scope_en },
  }));
}

export function adaptFeatures(list: CfgFeature[]): DesignFeature[] {
  return list.map((f) => ({
    icon: f.icon,
    title: f.title,
    description: { ko: f.description_ko, en: f.description_en },
    /* config 에서는 쉼표로 이은 한 줄이고 화면은 칩 배열로 그린다. */
    tech: (f.tech || "").split(",").map((s) => s.trim()).filter(Boolean),
    image: f.image,
  }));
}

export function adaptProcess(list: CfgProcess[]): ProcessStep[] {
  return list.map((p) => ({
    step: p.step,
    title: { ko: p.title_ko, en: p.title_en },
    description: { ko: p.description_ko, en: p.description_en },
  }));
}
