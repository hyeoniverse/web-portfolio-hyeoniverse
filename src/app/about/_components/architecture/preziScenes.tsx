"use client";

/* 프레지 장면 — 구조 장. DB 설계는 탐색기(erd)와 설계 메모(erd-notes) 두 프레임으로 나눴다 */
import { SceneStack, SceneFlows, SceneErd, SceneErdNotes } from "./ArchitectureChapter";
import SceneApi from "./SceneApi";
import { k, type SceneDef } from "../prezi/types";

export const architectureScenes: SceneDef[] = [
  /* 차례 — 무엇으로 만들었나 → 어떤 길로 부르나 → 무엇에 담나 → 왜 그렇게 담았나 → 사람은 어떻게 오가나 */
  { id: "stack", label: k("기술 그래프", "Tech graph"), render: () => <SceneStack /> },
  /* API 는 화면 전체가 지도 — 여백 없이 프레임을 다 쓴다 */
  { id: "api", label: k("API", "API"), render: () => <SceneApi />, ownPad: true, heavy: true },
  { id: "erd", label: k("DB 설계", "Database"), render: () => <SceneErd />, heavy: true },
  { id: "erd-notes", label: k("설계 메모", "Design notes"), render: () => <SceneErdNotes /> },
  { id: "flows", label: k("사용자 흐름", "User flows"), render: () => <SceneFlows /> },
];
