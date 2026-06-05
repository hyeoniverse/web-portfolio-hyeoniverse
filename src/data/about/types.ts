import type { LocalizedText } from "@/types/common";
export type { LocalizedText };

export type DcTransitionMode = "strip" | "stack";

export interface DesignFeature {
  icon: string;
  title: string;
  description: LocalizedText;
  tech: string[];
  image?: string;
}

export interface ProcessStep {
  step: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface CodeExample {
  title: string;
  description: LocalizedText;
  code: string;
  language: string;
  media?: string;
}

export interface TroubleshootingDiagram {
  title?: LocalizedText;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface ComparisonRow {
  cells: LocalizedText[];
  highlight?: boolean;
}

export interface ComparisonTable {
  label?: LocalizedText;
  headers: LocalizedText[];
  rows: ComparisonRow[];
  description?: LocalizedText;
}

/** 1 = 기초/표면적 / 2 = 중급/원인 분석 / 3 = 고급/근본 이해 */
export type TroubleshootingDifficulty = 1 | 2 | 3;

/** Troubleshooting 항목에 첨부할 이미지/스크린샷 */
export interface TroubleshootingImage {
  /** 실제 이미지 src — 없으면 placeholder UI 표시 */
  src?: string;
  /** 이미지 설명 (alt) */
  alt: LocalizedText;
  /** 이미지 아래 캡션 */
  caption?: LocalizedText;
  /** placeholder 모드일 때 사용자가 찍을 스크린샷 키워드 (e.g., "Network tab error response") */
  placeholderKeyword?: string;
  /** 어느 섹션 직후에 배치할지 — 기본값 "solution" (가장 자연스러운 위치) */
  position?: "definition" | "cause" | "solution" | "insight";
}

export interface TroubleShootingItem {
  section?: LocalizedText;
  problem: LocalizedText;
  definition: LocalizedText;
  cause: LocalizedText;
  solution: LocalizedText;
  keyInsight: LocalizedText;
  comparisons?: ComparisonTable[];
  diagrams?: TroubleshootingDiagram[];
  /** 첨부 이미지 — 스크린샷, before/after, error 화면 등 */
  images?: TroubleshootingImage[];
  tags?: string[];
  /** 난이도 — 섹션 내 정렬 + 뱃지 표시용 */
  difficulty?: TroubleshootingDifficulty;
  /** 핵심 추천 항목 — 별표 뱃지 표시 */
  recommended?: boolean;
  /** 왜 추천하는지 — IDE 에디터의 @recommended 라인에 표시 */
  recommendReason?: LocalizedText;
}

export interface TechStackItem {
  name: string;
  category: string;
  /** simple-icons slug (예 "react") 또는 업로드/링크된 이미지 URL. 없으면 name 기반 inline 아이콘 fallback. */
  icon?: string;
}

export interface OverviewStat {
  value: string;
  label: LocalizedText;
}

export interface StructureItem {
  path: string;
  description: LocalizedText;
  indent: number;
}

export interface DesignConceptItem {
  id: string;
  title: string;
  subtitle: LocalizedText;
  description: LocalizedText;
  image?: string;
  examples?: string[];
}

interface DbColumn {
  name: string;
  type: string;
  constraint?: string;
  description: LocalizedText;
}

type FlowNodeType = "start" | "action" | "decision" | "end";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: LocalizedText;
  row: number;
  col: number; // 0 = main path, 1 = branch
  y?: number; // optional Y override
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string; // "Yes", "No"
  noArrow?: boolean;
}

export interface UserFlow {
  title: string;
  persona: LocalizedText;
  description: LocalizedText;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/* ── ERD (Entity Relationship Diagram) ── */

interface ErdColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string; // e.g. "series.id"
}

export interface ErdTable {
  name: string;
  columns: ErdColumn[];
}

export interface ErdRelation {
  from: string;
  fromField: string;
  to: string;
  toField: string;
  label: string;
}

export interface ErdDesignNote {
  title: LocalizedText;
  tag: string;
  description: LocalizedText;
  relatedTable: string;
}

interface ApiEndpoint {
  method: string;
  path: string;
  description: LocalizedText;
}

export interface BackendItem {
  name: string;
  kind: "api" | "table";
  description: LocalizedText;
  designNote?: LocalizedText;
  endpoints?: ApiEndpoint[];
  columns?: DbColumn[];
  exampleQuery?: {
    title: string;
    code: string;
    language: string;
  };
}
