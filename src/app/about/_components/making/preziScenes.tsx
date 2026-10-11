"use client";

/* 프레지 장면 — 설계 결정 · 보안 장(왜 이렇게 만들었나, 무엇을 막나)과 만든 과정 장(시기별 작업) */
import { Process, Decisions } from "./MakingChapter";
import SecurityRings from "./SecurityRings";
import { k, type SceneDef } from "../prezi/types";

export const decisionsScenes: SceneDef[] = [
  { id: "decisions", label: k("설계 결정", "Decisions"), render: () => <Decisions /> },
  { id: "security", label: k("보안", "Security"), render: () => <SecurityRings /> },
];

export const makingScenes: SceneDef[] = [{ id: "process", label: k("작업 과정", "Process"), render: () => <Process /> }];
