"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LandingDemo as DemoKey } from "@/types/workLanding";
import styles from "./WorkLanding.module.css";

/**
 * 랜딩 페이지 항목의 상호작용 데모 — 키 → 데모 화면. 화면에 쓰일 때만 받는다(dynamic, 서버에서 그리지 않음).
 * 대부분 About 의 라이브 데모를 그대로 쓴다(props 없이 그리고, 화면에 들어오면 짧은 대본을 돈다).
 * AI 넷(번역 · 요약 · 커버 · 음성)은 실제 API(/api/demo/*)를 부르고 IP 마다 하루 상한이 있다.
 * 테마 · 레이아웃 · 메일함 · 공급자 전환은 MacFolio 의 데모를 옮겼다(./demos).
 */
const load = (importer: () => Promise<{ default: ComponentType }>) =>
  dynamic(importer, { ssr: false, loading: () => <div className={styles.demoLoading} aria-hidden /> });

const DEMOS: Record<DemoKey, ComponentType> = {
  translate: load(() => import("@/app/about/_components/demos/ai/TranslateDemo")),
  summary: load(() => import("@/app/about/_components/demos/ai/SummaryDemo")),
  cover: load(() => import("@/app/about/_components/demos/ai/CoverDemo")),
  speech: load(() => import("@/app/about/_components/demos/ai/SpeechDemo")),
  slides: load(() => import("@/app/about/_components/demos/media/SlidesDemo")),
  wave: load(() => import("@/app/about/_components/demos/media/WaveDemo")),
  convert: load(() => import("@/app/about/_components/demos/media/ConvertDemo")),
  autosave: load(() => import("@/app/about/_components/demos/cms/AutosaveDemo")),
  lifecycle: load(() => import("@/app/about/_components/demos/cms/LifecycleDemo")),
  comments: load(() => import("@/app/about/_components/demos/cms/CommentsDemo")),
  invite: load(() => import("@/app/about/_components/demos/cms/InviteDemo")),
  roles: load(() => import("@/app/about/_components/demos/cms/RolesDemo")),
  kitchen: load(() => import("@/app/about/_components/demos/cms/KitchenDemo")),
  mailbox: load(() => import("./demos/MailboxDemo")),
  providers: load(() => import("./demos/ProvidersDemo")),
  themes: load(() => import("./demos/ThemesDemo")),
  layouts: load(() => import("./demos/LayoutsDemo")),
};

/** AI 를 부르는 데모 — 머리에 '실제 AI' 표시 */
const LIVE = new Set<DemoKey>(["translate", "summary", "cover", "speech"]);

/** 데모 창 — 위 막대(점 셋 · 이름 · 라이브 표시)와 데모 화면 */
export function LandingDemoFrame({ demo, label, liveLabel }: { demo: DemoKey; label: string; liveLabel: string }) {
  const Demo = DEMOS[demo];
  if (!Demo) return null;
  return (
    <div className={styles.demo} data-demo={demo}>
      <div className={styles.demoBar} aria-hidden>
        <span className={styles.demoDots}><i /><i /><i /></span>
        <span className={styles.demoName}>{label}</span>
        {LIVE.has(demo) && <span className={styles.demoLive}>{liveLabel}</span>}
      </div>
      <div className={styles.demoBody}>
        <Demo />
      </div>
    </div>
  );
}
