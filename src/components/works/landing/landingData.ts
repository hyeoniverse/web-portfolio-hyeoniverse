import type { Project } from "@/data/projects";
import { normalizeWorkLanding, type LandingItem, type LandingFrameAt, type WorkLanding } from "@/lib/workLanding";
import { isOfficeDocUrl } from "@/lib/officeViewer";
import { isVideoUrl } from "@/lib/isVideoUrl";
import hyeoniverse from "@/data/workLandings/hyeoniverse.json";
import macfolio from "@/data/workLandings/macfolio.json";

/** 저장소에 둔 기본 랜딩 — DB(works.landing)가 비었을 때. 예전에 코드로 만들던 두 랜딩을 그대로 옮긴 데이터 */
const SEEDS: Record<string, unknown> = { hyeoniverse, macfolio };

/** 랜딩 데이터가 하나도 없는 작업물 — 카드 정보로 만든 기본 랜딩: 표지 → 소개(설명)와 갤러리의 그림 · 영상 */
export function defaultLanding(project: Project): WorkLanding {
  const hero: LandingItem[] = project.image
    ? [isVideoUrl(project.image)
      ? { kind: "frame", at: "bleed", video: project.image, alt: project.title }
      : { kind: "frame", at: "bleed", src: project.image, alt: project.title }]
    : [];
  const POS: LandingFrameAt[] = ["wide", "left", "right", "center"];
  const shots = project.gallery.filter((url) => url !== project.image && !isOfficeDocUrl(url));
  const items: LandingItem[] = shots.map((url, i) => (isVideoUrl(url)
    ? { kind: "frame", at: POS[i % POS.length], video: url, alt: project.title }
    : { kind: "frame", at: POS[i % POS.length], src: url, alt: project.title }));
  const body = project.description;
  return {
    eyebrow: project.subtitle,
    hero,
    sections: body.ko || body.en || items.length ? [{ id: "intro", title: { ko: "소개", en: "Overview" }, body, items }] : [],
  };
}

/** 작업물의 랜딩 — DB 값 › 저장소 기본 데이터 › 카드 정보로 만든 기본 랜딩 */
export function landingOf(project: Project): WorkLanding {
  return normalizeWorkLanding(project.landing)
    ?? (project.slug ? normalizeWorkLanding(SEEDS[project.slug]) : null)
    ?? defaultLanding(project);
}
