"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import { EMPTY_LANDING, pruneLanding, type LandingFact, type LandingPoint, type WorkLanding as LandingData } from "@/types/workLanding";
import { formatWorkYear } from "@/utils/formatWorkYear";
import { WorkArticleBody } from "@/components/works/WorkArticleBody";
import { WorkArticleGallery } from "@/components/works/WorkArticleGallery";
import { WorkArticleTeam } from "@/components/works/WorkArticleTeam";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useReveal, useReadProgress } from "./useReveal";
import styles from "./WorkLanding.module.css";

/**
 * 작업물 상세 — 랜딩 페이지 형태(설정의 works.detailStyle = "landing").
 * 구성은 MacFolio 의 프로젝트 소개 페이지(safari/hyeoniverse)를 따랐다:
 * 머리(이름 · 한 줄 소개 · 설명 · 링크) → 대표 화면 → 한눈에 보기(숫자) → 주요 기능 → 챕터들(띠 배경을 번갈아) →
 * 화면(갤러리) → 진행 과정 → 맡은 일 · 팀 → 기술 사양 → 꼬리(한 줄 소개 · 링크).
 * 내용은 편집기의 '랜딩 페이지' 칸(project.landing)이고, 비어 있는 칸은 작업물의 다른 칸으로 채운다.
 * 기능 · 챕터가 하나도 없으면 본문(글)을 '소개' 챕터로 보인다.
 * 마스코트 · 아키텍처 그림 · 라이브 데모는 HYEONIVERSE 전용이라 옮기지 않았다.
 */
export function WorkLanding({ project, viewLang }: { project: Project; viewLang: "ko" | "en" }) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLOListElement>(null);

  /* 보는 언어 칸이 비어 있으면 다른 언어 칸으로 */
  const landing = useMemo<LandingData>(() => {
    const mine = pruneLanding(project.landing?.[viewLang] ?? EMPTY_LANDING);
    const other = pruneLanding(project.landing?.[viewLang === "ko" ? "en" : "ko"] ?? EMPTY_LANDING);
    const pick = <K extends keyof LandingData>(k: K): LandingData[K] => {
      const v = mine[k];
      const empty = Array.isArray(v) ? v.length === 0 : !String(v).trim();
      return empty ? other[k] : v;
    };
    return {
      tagline: pick("tagline"), context: pick("context"), facts: pick("facts"), highlights: pick("highlights"),
      chapters: pick("chapters"), timeline: pick("timeline"), specs: pick("specs"),
    };
  }, [project.landing, viewLang]);

  const name = pickLocalized(project.title, viewLang);
  const subtitle = pickLocalized(project.subtitle, viewLang);
  const description = pickLocalized(project.description, viewLang);
  const tagline = landing.tagline || subtitle || name;
  /* 한 줄 소개를 따로 적었으면 부제목이 설명 자리로 내려온다 */
  const lead = description || (landing.tagline ? subtitle : "");

  /* 숫자 — 적어 둔 게 없으면 기간 · 기술 수 · 팀원 수 */
  const facts = useMemo<LandingFact[]>(() => {
    if (landing.facts.length > 0) return landing.facts;
    const out: LandingFact[] = [];
    const period = formatWorkYear(project.year, viewLang);
    if (period) out.push({ value: period, label: t("workDetail.landing.factPeriod") });
    if (project.tech.length > 0) out.push({ value: String(project.tech.length), label: t("workDetail.landing.factTech") });
    const team = project.teamMembers?.length ?? 0;
    if (team > 0) out.push({ value: String(team), label: t("workDetail.landing.factTeam") });
    return out;
  }, [landing.facts, project.year, project.tech.length, project.teamMembers?.length, viewLang, t]);

  /* 기술 사양 — 적어 둔 게 없으면 기술 설명(없으면 기술 이름만) */
  const specs = useMemo(() => {
    if (landing.specs.length > 0) return landing.specs;
    return project.tech.map((tech) => ({
      label: tech,
      value: project.tech_notes?.[tech] ? pickLocalized(project.tech_notes[tech], viewLang) : "",
    }));
  }, [landing.specs, project.tech, project.tech_notes, viewLang]);

  const role = pickLocalized(project.role, viewLang);
  const contributions = Object.entries(project.contributions?.[viewLang] ?? project.contributions?.ko ?? {})
    .flatMap(([group, items]) => items.map((item) => ({ group, item })));
  const hasStory = landing.highlights.length > 0 || landing.chapters.length > 0;

  useReveal(rootRef, [viewLang, project.id]);
  useReadProgress(timelineRef);

  /* 챕터 번호 — 주요 기능이 01, 그다음부터 차례로 */
  let chapterNo = 0;
  const nextNo = () => String(++chapterNo).padStart(2, "0");

  return (
    <article ref={rootRef} className={styles.landing} lang={viewLang}>
      {/* ── 머리 ── */}
      <header className={styles.hero}>
        <p className={styles.eyebrow} data-reveal="">{name}</p>
        <h1 className={styles.tagline} data-reveal="" style={delay(1)}>{tagline}</h1>
        {lead && <p className={styles.lead} data-reveal="" style={delay(2)}>{lead}</p>}
        <Links project={project} t={t} reveal={3} />
      </header>

      {/* ── 대표 화면 ── */}
      {project.image && (
        <div className={styles.shot} data-reveal="zoom">
          <ProgressiveImage src={project.image} alt={name} fill sizes="(max-width: 1080px) 100vw, 1080px" priority className={styles.shotImage} />
        </div>
      )}

      {/* ── 한눈에 보기 ── */}
      {(landing.context || facts.length > 0) && (
        <section className={styles.glance} aria-label={t("workDetail.landing.glance")}>
          {landing.context && <p className={styles.context} data-reveal="">{landing.context}</p>}
          {facts.length > 0 && (
            <dl className={styles.facts}>
              {facts.map((f, i) => (
                <div key={i} className={styles.fact} data-reveal="" style={delay(i)}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {/* ── 주요 기능 ── */}
      {landing.highlights.length > 0 && (
        <Chapter no={nextNo()} title={t("workDetail.landing.features")}>
          <ol className={styles.features}>
            {landing.highlights.map((p, i) => <Feature key={i} point={p} />)}
          </ol>
        </Chapter>
      )}

      {/* ── 챕터들 ── */}
      {landing.chapters.map((c, i) => (
        <Chapter key={i} no={nextNo()} title={c.title} lead={c.lead}>
          {c.points.length > 0 && (
            <div className={styles.points}>
              {c.points.map((p, j) => <PointCard key={j} point={p} index={j} />)}
            </div>
          )}
        </Chapter>
      ))}

      {/* ── 기능 · 챕터가 없으면 본문을 소개 챕터로 ── */}
      {!hasStory && pickLocalized(project.content, viewLang).trim() && (
        <Chapter no={nextNo()} title={t("workDetail.landing.about")}>
          <div className={styles.article}>
            <WorkArticleBody project={project} viewLang={viewLang} />
          </div>
        </Chapter>
      )}

      {/* ── 화면(갤러리) ── */}
      {project.gallery.length > 0 && (
        <Chapter no={nextNo()} title={t("workDetail.landing.gallery")} wide>
          <WorkArticleGallery project={project} viewLang={viewLang} />
        </Chapter>
      )}

      {/* ── 진행 과정 ── */}
      {landing.timeline.length > 0 && (
        <Chapter no={nextNo()} title={t("workDetail.landing.timeline")}>
          <ol ref={timelineRef} className={styles.timeline}>
            {landing.timeline.map((item, i) => (
              <li key={i} className={styles.timelineItem} data-reveal="left" style={delay(i)}>
                <span className={styles.timelineDate}>{item.date}</span>
                <span className={styles.timelineLabel}>{item.label}</span>
              </li>
            ))}
          </ol>
        </Chapter>
      )}

      {/* ── 맡은 일 · 팀 ── */}
      {(role || contributions.length > 0 || (project.teamMembers?.length ?? 0) > 0) && (
        <Chapter no={nextNo()} title={t("workDetail.landing.role")}>
          {role && <p className={styles.role} data-reveal="">{role}</p>}
          {contributions.length > 0 && (
            <ul className={styles.contributions}>
              {contributions.map((c, i) => (
                <li key={i} className={styles.contribution} data-reveal="" style={delay(i % 6)}>
                  <span className={styles.contributionGroup}>{c.group}</span>
                  <span>{c.item}</span>
                </li>
              ))}
            </ul>
          )}
          {(project.teamMembers?.length ?? 0) > 0 && <WorkArticleTeam project={project} viewLang={viewLang} />}
        </Chapter>
      )}

      {/* ── 기술 사양 ── */}
      {specs.length > 0 && (
        <Chapter no={nextNo()} title={t("workDetail.landing.specs")}>
          <dl className={styles.specs}>
            {specs.map((s, i) => (
              <div key={i} className={styles.spec} data-reveal="" style={delay(i % 6)}>
                <dt className={styles.specLabel}>{s.label}</dt>
                <dd className={styles.specValue}>{s.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </Chapter>
      )}

      {/* ── 꼬리 ── */}
      <footer className={styles.foot}>
        <p className={styles.footLine} data-reveal="ink">{tagline}</p>
        <Links project={project} t={t} reveal={1} />
      </footer>
    </article>
  );
}

/** 나타나는 순서 — 90ms 씩 늦춘다 */
function delay(n: number): CSSProperties {
  return { ["--d" as string]: n } as CSSProperties;
}

function Links({ project, t, reveal }: { project: Project; t: (k: string) => string; reveal: number }) {
  if (!project.liveUrl && !project.githubUrl) return null;
  return (
    <div className={styles.links} data-reveal="" style={delay(reveal)}>
      {project.liveUrl && (
        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className={`${styles.link} ${styles.linkPrimary}`}>
          {t("workDetail.landing.visit")} <ArrowUpRight size={16} />
        </a>
      )}
      {project.githubUrl && (
        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
          <GithubIcon size={16} /> {t("workDetail.landing.github")}
        </a>
      )}
    </div>
  );
}

function Chapter({ no, title, lead, wide, children }: { no: string; title: string; lead?: string; wide?: boolean; children?: ReactNode }) {
  return (
    <section className={`${styles.chapter}${wide ? ` ${styles.chapterWide}` : ""}`}>
      <div className={styles.chapterHead}>
        <span className={styles.chapterNo} data-reveal="">{no}</span>
        {title && <h2 className={styles.chapterTitle} data-reveal="" style={delay(1)}>{title}</h2>}
        {lead && <p className={styles.chapterLead} data-reveal="" style={delay(2)}>{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function Feature({ point }: { point: LandingPoint }) {
  return (
    <li className={styles.feature}>
      <div className={styles.featureText} data-reveal="">
        <h3 className={styles.featureTitle}>{point.title}</h3>
        {point.body && <p className={styles.featureBody}>{point.body}</p>}
      </div>
      {point.image && (
        <div className={styles.featureMedia} data-reveal="zoom">
          <ProgressiveImage src={point.image} alt={point.title} fill sizes="(max-width: 1080px) 100vw, 560px" className={styles.mediaImage} />
        </div>
      )}
    </li>
  );
}

function PointCard({ point, index }: { point: LandingPoint; index: number }) {
  return (
    <div className={`${styles.point}${point.image ? ` ${styles.pointWithImage}` : ""}`} data-reveal="" style={delay(index % 4)}>
      {point.image && (
        <div className={styles.pointMedia}>
          <ProgressiveImage src={point.image} alt={point.title} fill sizes="(max-width: 1080px) 100vw, 540px" className={styles.mediaImage} />
        </div>
      )}
      <h3 className={styles.pointTitle}>{point.title}</h3>
      {point.body && <p className={styles.pointBody}>{point.body}</p>}
    </div>
  );
}
