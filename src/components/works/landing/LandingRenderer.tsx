"use client";

import type { Project } from "@/data/projects";
import type { LandingItem, WorkLanding } from "@/lib/workLanding";
import { sectionNo } from "@/lib/workLanding";
import { Flow, Frame, LandingShell, Marquee, Note, Numbers, PhoneFlip, Sequence, type Lang } from "./kit/LandingKit";

/** 항목 하나를 랜딩 부품으로 — 글은 보는 언어로, 그 언어가 비었으면 다른 언어로 */
function Item({ item, viewLang, priority }: { item: LandingItem; viewLang: Lang; priority?: boolean }) {
  const t = (v: { ko: string; en: string }) => v[viewLang] || v[viewLang === "ko" ? "en" : "ko"];
  switch (item.kind) {
    case "frame":
      return <Frame at={item.at} src={item.src} video={item.video} alt={t(item.alt)} width={item.width} height={item.height} priority={priority} />;
    case "marquee":
      return <Marquee rows={item.rows.map((row) => row.map((m) => ({ src: m.src, alt: t(m.alt) })))} />;
    case "sequence":
      return <Sequence items={item.items.map((m) => ({ src: m.src, alt: t(m.alt) }))} />;
    case "phones":
      return <PhoneFlip items={item.items.map((m) => ({ src: m.src, video: m.video, alt: t(m.alt), route: t(m.route) }))} />;
    case "numbers":
      return <Numbers viewLang={viewLang} items={item.items} />;
  }
}

/**
 * 데이터로 그리는 작업물 랜딩 — 머리(분류 · 제목 · 역할 · 기간 · 링크)는 작업물 카드 정보로, 그 아래는 랜딩 데이터(lib/workLanding)로.
 * 첫 번호 앞의 장면들(hero) → 섹션마다 번호 · 제목 · 설명과 그 장면들 → 끝의 다음 작업물.
 */
export function LandingRenderer({ project, data, viewLang, next, nav }: {
  project: Project; data: WorkLanding; viewLang: Lang; next?: { href: string; title: string } | null; nav?: boolean;
}) {
  return (
    <LandingShell project={project} viewLang={viewLang} next={next} eyebrow={data.eyebrow} nav={nav}>
      <Flow>
        {data.hero.map((item, i) => <Item key={`h${i}`} item={item} viewLang={viewLang} priority={i === 0} />)}
        {data.sections.map((s, si) => [
          <Note key={s.id} viewLang={viewLang} no={sectionNo(si)} title={s.title} body={s.body && (s.body.ko || s.body.en) ? s.body : undefined} />,
          ...s.items.map((item, i) => <Item key={`${s.id}-${i}`} item={item} viewLang={viewLang} />),
        ])}
      </Flow>
    </LandingShell>
  );
}
