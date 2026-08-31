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
  /** 왼쪽 데모 칸 — "media"(업로드) / "sandbox"(실행 코드). 미설정이면 표시 안 함 */
  demoMode?: "media" | "sandbox";
  /** demoMode="media" 일 때 GIF/영상/이미지 URL */
  demoMedia?: string;
  /** demoMode="sandbox" 일 때 실행용 파일 맵(경로 → 코드). 좌측 표시용 code 와 별개.
   *  /styles.css 를 넣으면 템플릿 index.tsx 가 import 하므로 스타일이 그대로 적용된다. */
  demoFiles?: Record<string, string>;
  /** sandbox 템플릿 (기본 react-ts) */
  demoTemplate?: string;
  /** 데모 칸 배경색. 미설정이면 투명(패널 배경이 비침) */
  demoBg?: string;
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
  /** 안정 식별자. 메타 매핑·노출 목록이 전부 이 값으로만 항목을 가리킨다. */
  id: string;
  section?: LocalizedText;
  /** 내부 키 겸 증상 요약. 화면 제목은 title 이 있으면 그걸 우선 표시. */
  problem: LocalizedText;
  /** 화면 표시용 제목 — 증상 부연이 아니라 "해결에 쓰인 핵심 개념". 없으면 problem 사용. */
  title?: LocalizedText;
  definition: LocalizedText;
  cause: LocalizedText;
  solution: LocalizedText;
  keyInsight: LocalizedText;
  comparisons?: ComparisonTable[];
  diagrams?: TroubleshootingDiagram[];
  /** 전용 시각화 컴포넌트 키 — 패널이 이 키로 리치 비주얼(예: 교차 기기 로딩)을 렌더. */
  vizKey?: string;
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

/** Security 패널 항목. 값은 md(content/about/security/)에서 구워진다. */
export interface SecurityItem {
  layer: string;
  title: LocalizedText;
  description: LocalizedText;
  scope: LocalizedText;
  icon: string;
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

/* 아래 선택 필드들은 SQL 가져오기가 채운다.
   전부 optional 이라 기존에 저장된 ERD 는 그대로 유효하다 — 마이그레이션이 필요 없다. */
interface ErdColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string; // e.g. "series.id"
  /** NOT NULL */
  required?: boolean;
  /** UNIQUE 제약 또는 UNIQUE 인덱스 */
  unique?: boolean;
  /** 인덱스가 걸린 컬럼 */
  indexed?: boolean;
  /** DEFAULT 식 — 값이 아니라 원문 그대로 보여준다 (now(), 'draft' 등) */
  defaultValue?: string;
  /** COMMENT ON COLUMN */
  comment?: string;
  /** 타입이 ENUM 이면 그 값들 — 타입 이름만으로는 무엇이 들어가는지 알 수 없다 */
  enumValues?: string[];
}

export interface ErdTable {
  name: string;
  columns: ErdColumn[];
  /** 뷰는 실체 테이블과 구분해 표시한다 (기본은 테이블) */
  kind?: "view";
  /** COMMENT ON TABLE */
  comment?: string;
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
