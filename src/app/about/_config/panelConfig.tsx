import dynamic from "next/dynamic";
import type { Language } from "@/providers/LanguageProvider";
import { projectOverview } from "@/data/about/architecture";
import { designConcepts } from "@/data/about/concepts";
import { designFeatures } from "@/data/about/features";
import { designProcess } from "@/data/about/process";
import { securityItems } from "@/data/about/security";
import { techStack } from "@/data/about/stack";
import {
  HeroPanel,
  OverviewPanel,
  FeaturesPanel,
  DesignSystemPanel,
  ProcessPanel,
  VisualBreakPanel,
  TechStackPanel,
  SecurityPanel,
  CreditsPanel,
} from "../_components/panels";
import styles from "../_components/AboutSection.module.css";

/* ── Context passed to each panel's props factory ── */

export interface PanelContext {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

/* ── Config shape ── */

export interface PanelConfig {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<any>;
  props: (ctx: PanelContext) => Record<string, unknown>;
}

/* ── Skeleton used by dynamic imports ── */

const PanelSkeleton = ({ className }: { className?: string }) => (
  <div
    className={`${styles.panel} ${className ?? styles.panelExtraWide}`}
    style={{ minHeight: "100vh" }}
  />
);

/* ── Heavy panels: dynamic import for code splitting ── */

const ArchitecturePanel = dynamic(
  () => import("../_components/panels/ArchitecturePanel"),
  { loading: () => <PanelSkeleton className={styles.panel} />, ssr: false },
);
const UserFlowPanel = dynamic(
  () => import("../_components/panels/UserFlowPanel"),
  { loading: () => <PanelSkeleton />, ssr: false },
);
const BackendPanel = dynamic(
  () => import("../_components/panels/BackendPanel"),
  { loading: () => <PanelSkeleton />, ssr: false },
);
const ErdPanel = dynamic(
  () => import("../_components/panels/ErdPanel"),
  { loading: () => <PanelSkeleton />, ssr: false },
);
const CodeHighlightsPanel = dynamic(
  () => import("../_components/panels/CodeHighlightsPanel"),
  { loading: () => <PanelSkeleton />, ssr: false },
);
const TroubleshootingPanel = dynamic(
  () => import("../_components/panels/TroubleshootingPanel"),
  { loading: () => <PanelSkeleton />, ssr: false },
);

/* ── Desktop: horizontal scroll order (16 panels) ── */

export const desktopPanels: PanelConfig[] = [
  {
    key: "hero",
    Component: HeroPanel,
    props: () => ({}),
  },
  {
    key: "overview",
    Component: OverviewPanel,
    props: (ctx) => ({ language: ctx.language, overview: projectOverview }),
  },
  {
    key: "architecture",
    Component: ArchitecturePanel,
    props: (ctx) => ({ language: ctx.language }),
  },
  {
    key: "userflow",
    Component: UserFlowPanel,
    props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
  },
  {
    key: "features",
    Component: FeaturesPanel,
    props: (ctx) => ({ language: ctx.language, features: designFeatures }),
  },
  {
    key: "designSystem",
    Component: DesignSystemPanel,
    props: (ctx) => ({
      language: ctx.language,
      concepts: designConcepts,
      mode: "strip",
      scrollBy: ctx.scrollBy,
    }),
  },
  {
    key: "process",
    Component: ProcessPanel,
    props: (ctx) => ({
      language: ctx.language,
      process: designProcess,
      scrollBy: ctx.scrollBy,
    }),
  },
  {
    key: "visualBreak",
    Component: VisualBreakPanel,
    props: () => ({}),
  },
  {
    key: "techStack",
    Component: TechStackPanel,
    props: () => ({ techStack }),
  },
  {
    key: "backend",
    Component: BackendPanel,
    props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
  },
  {
    key: "erd",
    Component: ErdPanel,
    props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
  },
  {
    key: "codeHighlights",
    Component: CodeHighlightsPanel,
    props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
  },
  {
    key: "troubleshooting",
    Component: TroubleshootingPanel,
    props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
  },
  {
    key: "security",
    Component: SecurityPanel,
    props: (ctx) => ({ language: ctx.language, items: securityItems }),
  },
  {
    key: "credits",
    Component: CreditsPanel,
    props: () => ({}),
  },
];

/* ── Mobile: panels grouped by tab ── */

export const mobileTabPanels: Record<string, PanelConfig[]> = {
  overview: [
    {
      key: "hero",
      Component: HeroPanel,
      props: () => ({}),
    },
    {
      key: "overview",
      Component: OverviewPanel,
      props: (ctx) => ({ language: ctx.language, overview: projectOverview }),
    },
    {
      key: "features",
      Component: FeaturesPanel,
      props: (ctx) => ({ language: ctx.language, features: designFeatures }),
    },
  ],
  design: [
    {
      key: "designSystem",
      Component: DesignSystemPanel,
      props: (ctx) => ({
        language: ctx.language,
        concepts: designConcepts,
        mode: "strip",
        scrollBy: ctx.scrollBy,
      }),
    },
    {
      key: "process",
      Component: ProcessPanel,
      props: (ctx) => ({
        language: ctx.language,
        process: designProcess,
        scrollBy: ctx.scrollBy,
      }),
    },
  ],
  tech: [
    {
      key: "architecture",
      Component: ArchitecturePanel,
      props: (ctx) => ({ language: ctx.language }),
    },
    {
      key: "userflow",
      Component: UserFlowPanel,
      props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
    },
    {
      key: "techStack",
      Component: TechStackPanel,
      props: () => ({ techStack }),
    },
    {
      key: "backend",
      Component: BackendPanel,
      props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
    },
    {
      key: "erd",
      Component: ErdPanel,
      props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
    },
  ],
  code: [
    {
      key: "codeHighlights",
      Component: CodeHighlightsPanel,
      props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
    },
    {
      key: "troubleshooting",
      Component: TroubleshootingPanel,
      props: (ctx) => ({ language: ctx.language, scrollBy: ctx.scrollBy }),
    },
    {
      key: "security",
      Component: SecurityPanel,
      props: (ctx) => ({ language: ctx.language, items: securityItems }),
    },
    {
      key: "credits",
      Component: CreditsPanel,
      props: () => ({}),
    },
  ],
};
