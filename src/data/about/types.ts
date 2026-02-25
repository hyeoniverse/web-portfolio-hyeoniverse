import type { Language } from "@/providers/LanguageProvider";

export type LocalizedText = Record<Language, string>;

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

export interface TroubleShootingItem {
  problem: LocalizedText;
  cause: LocalizedText;
  solution: LocalizedText;
  keyInsight: LocalizedText;
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
  image: string;
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

export interface UserFlowStep {
  label: LocalizedText;
  description?: LocalizedText;
}

export interface UserFlow {
  title: string;
  description: LocalizedText;
  steps: UserFlowStep[];
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
  description: LocalizedText;
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
