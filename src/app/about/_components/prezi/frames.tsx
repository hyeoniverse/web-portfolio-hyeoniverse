"use client";

/* 프레지 세계의 프레임 목록 — 가운데 큰 별자리 지도(허브)가 있고, 지도의 별마다 그 장의 무리(cluster)가 작게 들어 있다.
   별로 날아 들어가면 그 장의 장면(한 화면 = 프레임 하나)들이 나오고, 장이 끝나면 다시 지도로 물러났다 다음 별로 간다.
   여러 장면이 있는 장은 "장 머리" 프레임이 무리 전체를 덮는다. anchor 가 곧 지도의 별(_data/map.ts)이다.
   장면 목록은 장마다 그 장 폴더의 preziScenes(또는 prezi/scenes/*)가 내보낸다 */
import type { ReactNode } from "react";
import type { L10n } from "../../_data/showcase";
import { ChapterHead } from "../features/shared";
import { featuresChapter } from "../../_data/features";
import { architectureChapter } from "../../_data/architecture";
import { factsScenes } from "./scenes/intro";
import { trustScenes, faqScenes } from "./scenes/end";
import { designScenes, aiScenes, codeScenes } from "./scenes/singles";
import { featuresScenes } from "../features/preziScenes";
import { architectureScenes } from "../architecture/preziScenes";
import { decisionsScenes, makingScenes } from "../making/preziScenes";
import { k, type SceneDef } from "./types";

export interface ClusterDef {
  id: string;
  /** 장 앵커(#features) — 목차 · 링크가 이 무리로 날아온다 */
  anchor?: string;
  /** 장 머리 — 있으면 무리 전체를 덮는 큰 프레임으로 */
  head?: { label: L10n; render: () => ReactNode };
  scenes: SceneDef[];
}

export const CLUSTERS: ClusterDef[] = [
  /* 중요한 것부터 — 무엇인지(한눈에 보기) → 기능 → AI → 구조 → 설계 결정 · 보안 → 디자인 → 코드 → 만든 과정 → 신뢰 · 질문 */
  { id: "facts", anchor: "#facts", scenes: factsScenes },
  {
    id: "features",
    anchor: "#features",
    head: {
      label: k("기능", "Features"),
      render: () => <ChapterHead eyebrow={featuresChapter.eyebrow} title={featuresChapter.title} note={featuresChapter.note} />,
    },
    scenes: featuresScenes,
  },
  { id: "ai", anchor: "#ai", scenes: aiScenes },
  {
    id: "architecture",
    anchor: "#architecture",
    head: {
      label: k("구조", "Architecture"),
      render: () => <ChapterHead eyebrow={architectureChapter.eyebrow} title={architectureChapter.title} />,
    },
    scenes: architectureScenes,
  },
  { id: "decisions", anchor: "#decisions", scenes: decisionsScenes },
  { id: "design", anchor: "#design", scenes: designScenes },
  { id: "code", anchor: "#code", scenes: codeScenes },
  /* 만든 과정 — 장면이 하나라 장 머리 프레임 없이, 장 이름 · 제목은 작업 과정 장면 머리에(머리 프레임 안에 장면이 읽을 수 없게 작게만 보였다) */
  { id: "making", anchor: "#making", scenes: makingScenes },
  { id: "trust", anchor: "#trust", scenes: trustScenes },
  { id: "faq", anchor: "#faq", scenes: faqScenes },
];
