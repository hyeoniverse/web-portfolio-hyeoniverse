"use client";

/* 프레지 장면 — 디자인 · AI · 코드. 장마다 첫 프레임은 장 표지(장 머리 + 목차), 다음 프레임은 단계로 넘기는 본문 */
import { DesignCover, DesignTokens } from "../../design/DesignChapter";
import { AiChapter } from "../../ai/AiChapter";
import { CodeCover, CodeEditor } from "../../code/CodeChapter";
import { k, type SceneDef } from "../types";

export const designScenes: SceneDef[] = [
  { id: "design", label: k("디자인", "Design"), render: () => <DesignCover />, ownPad: true },
  { id: "design-tokens", label: k("토큰 다섯 칸", "Tokens in five steps"), render: () => <DesignTokens />, ownPad: true },
];
export const aiScenes: SceneDef[] = [
  /* AI 는 프레임 하나 — 표지 별자리에서 고른 별로 확대해 들어가 기능 다섯을 단계로 넘긴다.
     실제 데모는 이 프레임이 지금 프레임이고 열려 있을 때만 마운트하므로 heavy 로 두지 않는다(멀리서 보면 표지가 보이게) */
  { id: "ai", label: k("AI", "AI"), render: () => <AiChapter />, ownPad: true },
];
export const codeScenes: SceneDef[] = [
  { id: "code", label: k("코드", "Code"), render: () => <CodeCover />, ownPad: true },
  { id: "code-editor", label: k("편집기", "Editor"), render: () => <CodeEditor />, ownPad: true, heavy: true },
];
