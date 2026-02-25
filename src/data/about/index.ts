// Types
export type {
  DesignFeature,
  ProcessStep,
  CodeExample,
  TroubleShootingItem,
  TechStackItem,
  OverviewStat,
  StructureItem,
  DesignConceptItem,
  DbColumn,
  DbTable,
  BackendItem,
  UserFlow,
  ErdTable,
  ErdRelation,
  ErdDesignNote,
} from "./types";

// Data
export { designConcepts } from "./concepts";
export { projectOverview, projectStructure, userFlows } from "./architecture";
export { designFeatures } from "./features";
export { techStack } from "./stack";
export { designProcess } from "./process";
export { codeExamples } from "./codeExamples";
export { troubleShootingItems } from "./troubleshooting";
export { backendItems } from "./backend";
export { erdTables, erdRelations, erdDesignNotes } from "./erd";
