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

export interface ComparisonRow {
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

export interface TroubleShootingItem {
  section?: LocalizedText;
  problem: LocalizedText;
  definition: LocalizedText;
  cause: LocalizedText;
  /** cause 섹션의 라벨 오버라이드 — 기본값은 i18n \"원인\".
   *  실제 사고가 아니라 \"설계 단계의 문제 의식\" 같은 항목에서 사용.
   */
  causeLabel?: LocalizedText;
  solution: LocalizedText;
  keyInsight: LocalizedText;
  comparisons?: ComparisonTable[];
  diagrams?: TroubleshootingDiagram[];
  tags?: string[];
  /** 난이도 — 섹션 내 정렬 + 뱃지 표시용 */
  difficulty?: TroubleshootingDifficulty;
  /** 핵심 추천 항목 — 별표 뱃지 표시 */
  recommended?: boolean;
}

export interface TechStackItem {
  name: string;
  category: string;
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

export interface DbColumn {
  name: string;
  type: string;
  constraint?: string;
  description: LocalizedText;
}

export interface DbTable {
  name: string;
  description: LocalizedText;
  designNote: LocalizedText;
  columns: DbColumn[];
  exampleQuery?: {
    title: string;
    code: string;
    language: string;
  };
}

export type FlowNodeType = "start" | "action" | "decision" | "end";

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

export interface ErdColumn {
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

export interface ApiEndpoint {
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
