"use client";

import Link from "next/link";
import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import {
  EMPTY_LANDING, pruneLanding,
  type LandingChapter, type LandingFact, type LandingPoint, type WorkLanding as LandingData,
} from "@/types/workLanding";
import { formatWorkYear } from "@/utils/formatWorkYear";
import { WorkArticleBody } from "@/components/works/WorkArticleBody";
import { WorkArticleGallery } from "@/components/works/WorkArticleGallery";
import { WorkArticleTeam } from "@/components/works/WorkArticleTeam";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { LandingDemoFrame } from "./LandingDemo";
import { useCountUp, useReveal, useScrollProgress } from "./useReveal";
import styles from "./WorkLanding.module.css";

/**
 * 작업물 상세 — 랜딩 페이지 형태(설정의 works.detailStyle = "landing").
 *
 * 디자인은 andreasantonsson.dev 의 프로젝트 페이지를 따랐다 — 강조색 하나, 화면을 채우는 큰 세리프 제목, 그 아래 역할 · 기간 ·
 * 주소 한 줄, 화면 폭을 채우는 미디어, 끝에 '다음 작업물'을 크게. 내용 구성과 움직임은 MacFolio 의 프로젝트 소개 페이지
 * (safari/hyeoniverse)를 따랐다 — 숫자 세어 올리기, 띠 배경 챕터, 읽은 만큼 차오르는 진행 선, 직접 만져 보는 데모.
 *
 * 내용은 편집기의 '랜딩 페이지' 칸(project.landing)이고, 비어 있는 칸은 작업물의 다른 칸으로 채운다.
 * 기능 · 챕터가 하나도 없으면 본문(글)을 '소개' 챕터로 보인다. 항목에 데모를 고르면 미디어 자리에 데모 창을 띄운다.
 */
export function WorkLanding({ project, viewLang, next }: {
  project: Project;
  viewLang: "ko" | "en";
  /** 다음 작업물 — 맨 끝에 크게 */
  next?: { href: string; title: string } | null;
}) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLElement>(null);

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
  const eyebrow = (project.nature ? pickLocalized(project.nature, viewLang) : "") || pickLocalized(project.category, viewLang);
  /* 큰 문장 — 한 줄 소개, 없으면 부제목. 그 아래 설명 */
  const statement = landing.tagline || subtitle;
  const period = formatWorkYear(project.year, viewLang);
  const role = pickLocalized(project.role, viewLang);

  /* 숫자 — 적어 둔 게 없으면 기간 · 기술 수 · 팀원 수 */
  const facts = useMemo<LandingFact[]>(() => {
    if (landing.facts.length > 0) return landing.facts;
    const out: LandingFact[] = [];
    if (project.tech.length > 0) out.push({ value: String(project.tech.length), label: t("workDetail.landing.factTech") });
    const team = project.teamMembers?.length ?? 0;
    if (team > 0) out.push({ value: String(team), label: t("workDetail.landing.factTeam") });
    if (project.gallery.length > 0) out.push({ value: String(project.gallery.length), label: t("workDetail.landing.factScreens") });
    return out;
  }, [landing.facts, project.tech.length, project.teamMembers?.length, project.gallery.length, t]);

  /* 기술 사양 — 적어 둔 게 없으면 기술 설명(없으면 기술 이름만) */
  const specs = useMemo(() => {
    if (landing.specs.length > 0) return landing.specs;
    return project.tech.map((tech) => ({
      label: tech,
      value: project.tech_notes?.[tech] ? pickLocalized(project.tech_notes[tech], viewLang) : "",
    }));
  }, [landing.specs, project.tech, project.tech_notes, viewLang]);

  const contributions = Object.entries(project.contributions?.[viewLang] ?? project.contributions?.ko ?? {})
    .flatMap(([group, items]) => items.map((item) => ({ group, item })));
  const hasStory = landing.highlights.length > 0 || landing.chapters.length > 0;

  useReveal(rootRef, [viewLang, project.id]);
  useScrollProgress(rootRef, [viewLang, project.id]);

  /* 챕터 번호 — 주요 기능이 01, 그다음부터 차례로 */
  let chapterNo = 0;
  const nextNo = () => String(++chapterNo).padStart(2, "0");
  const demoLabel = (p: LandingPoint) => (p.demo ? t(`workDetail.landing.demo.${p.demo}`) : "");
  const liveLabel = t("workDetail.landing.live");

  return (
    <article ref={rootRef} className={styles.landing} lang={viewLang}>
      {/* ── 머리 — 분류 · 큰 제목 · 역할 / 기간 / 주소 ── */}
      <header className={styles.hero}>
        {eyebrow && <p className={styles.eyebrow} data-reveal="">{eyebrow}</p>}
        <h1 className={styles.title} aria-label={name}>
          <SplitLetters text={name} />
        </h1>
        <dl className={styles.meta} data-reveal="" style={delay(4)}>
          {role && <MetaItem label={t("workDetail.role")}>{role}</MetaItem>}
          {period && <MetaItem label={t("workDetail.landing.factPeriod")}>{period}</MetaItem>}
          {project.liveUrl && (
            <MetaItem label={t("workDetail.landing.site")}>
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                {hostOf(project.liveUrl)} <ArrowUpRight size={14} />
              </a>
            </MetaItem>
          )}
          {project.githubUrl && (
            <MetaItem label="GitHub">
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                <GithubIcon size={14} /> {repoOf(project.githubUrl)} <ArrowUpRight size={14} />
              </a>
            </MetaItem>
          )}
        </dl>
      </header>

      {/* ── 대표 화면 — 들어오면서 화면 폭까지 커진다 ── */}
      {project.image && (
        <div className={styles.cover} data-progress="enter">
          <div className={styles.coverFrame}>
            <ProgressiveImage src={project.image} alt={name} fill sizes="100vw" priority className={styles.coverImage} />
          </div>
        </div>
      )}

      {/* ── 큰 문장 — 읽는 만큼 글자가 진해진다 · 설명 · 숫자 ── */}
      {(statement || description || landing.context || facts.length > 0) && (
        <section className={styles.intro} aria-label={t("workDetail.landing.glance")}>
          {statement && (
            <p className={styles.statement} data-progress="through">
              <InkWords text={statement} />
            </p>
          )}
          {(description || landing.context) && (
            <div className={styles.introText}>
              {description && <p className={styles.lead} data-reveal="">{description}</p>}
              {landing.context && <p className={styles.context} data-reveal="" style={delay(1)}>{landing.context}</p>}
            </div>
          )}
          {facts.length > 0 && (
            <dl className={styles.facts}>
              {facts.map((f, i) => <Fact key={i} fact={f} index={i} />)}
            </dl>
          )}
        </section>
      )}

      {/* ── 주요 기능 — 글(제목 | 설명) 아래 미디어 · 데모를 크게 ── */}
      {landing.highlights.length > 0 && (
        <Chapter no={nextNo()} title={t("workDetail.landing.features")}>
          <ol className={styles.features}>
            {landing.highlights.map((p, i) => (
              <li key={i} className={styles.feature}>
                <div className={styles.featureText} data-reveal="">
                  <span className={styles.featureNo}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className={styles.featureTitle}>{p.title}</h3>
                  {p.body && <p className={styles.featureBody}>{p.body}</p>}
                </div>
                <PointMedia point={p} demoLabel={demoLabel(p)} liveLabel={liveLabel} wide />
              </li>
            ))}
          </ol>
        </Chapter>
      )}

      {/* ── 챕터들 ── */}
      {landing.chapters.map((c, i) => (
        <Chapter key={i} no={nextNo()} title={c.title} lead={c.lead} >
          <ChapterPoints chapter={c} demoLabel={demoLabel} liveLabel={liveLabel} />
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
        <Chapter no={nextNo()} title={t("workDetail.landing.gallery")} clip>
          <WorkArticleGallery project={project} viewLang={viewLang} />
        </Chapter>
      )}

      {/* ── 진행 과정 — 읽은 만큼 선이 차오른다 ── */}
      {landing.timeline.length > 0 && (
        <Chapter no={nextNo()} title={t("workDetail.landing.timeline")} >
          <ol className={styles.timeline} data-progress="through">
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
      {(contributions.length > 0 || (project.teamMembers?.length ?? 0) > 0) && (
        <Chapter no={nextNo()} title={t("workDetail.landing.role")} lead={role || undefined}>
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
        <Chapter no={nextNo()} title={t("workDetail.landing.specs")} >
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

      {/* ── 다음 작업물 — 크게 ── */}
      {next && (
        <footer className={styles.next}>
          <p className={styles.nextLabel} data-reveal="">{t("workDetail.landing.nextProject")}</p>
          <Link href={next.href} className={styles.nextLink} data-reveal="" style={delay(1)}>
            <span className={styles.nextTitle}>{next.title}</span>
            <span className={styles.nextArrow} aria-hidden><ArrowDown size={20} /></span>
          </Link>
        </footer>
      )}
    </article>
  );
}

/** 나타나는 순서 — 90ms 씩 늦춘다 */
function delay(n: number): CSSProperties {
  return { ["--d" as string]: n } as CSSProperties;
}

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

function repoOf(url: string): string {
  try { return new URL(url).pathname.replace(/^\/+|\/+$/g, "") || "GitHub"; } catch { return "GitHub"; }
}

/** 큰 제목 — 글자마다 아래에서 올라온다(움직임 줄이기면 그대로). 읽는 이에게는 h1 의 aria-label 이 전한다 */
function SplitLetters({ text }: { text: string }) {
  return (
    <span className={styles.titleLetters} aria-hidden>
      {Array.from(text).map((ch, i) => (
        <span key={i} className={styles.letter} style={delay(i)}>{ch === " " ? " " : ch}</span>
      ))}
    </span>
  );
}

/** 큰 문장 — 낱말마다 --i 를 주고, 문단의 --p(읽은 만큼)가 지나가면 진해진다 */
function InkWords({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  let i = 0;
  const n = words.filter((w) => w.trim()).length;
  return (
    <span style={{ ["--n" as string]: n } as CSSProperties}>
      {words.map((w, k) => (w.trim()
        ? <span key={k} className={styles.inkWord} style={{ ["--i" as string]: i++ } as CSSProperties}>{w}</span>
        : w))}
    </span>
  );
}

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.metaItem}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={styles.metaValue}>{children}</dd>
    </div>
  );
}

function Fact({ fact, index }: { fact: LandingFact; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const shown = useCountUp(ref, fact.value);
  return (
    <div className={styles.fact} data-reveal="" style={delay(index)}>
      <dt className={styles.factLabel}>{fact.label}</dt>
      <dd ref={ref} className={styles.factValue}>{shown}</dd>
    </div>
  );
}

function Chapter({ no, title, lead, band, clip, children }: {
  no: string; title: string; lead?: string; band?: boolean; clip?: boolean; children?: ReactNode;
}) {
  return (
    /* 띠 배경은 번호가 짝수인 챕터에 — 이어지는 챕터끼리 번갈아 */
    <section className={`${styles.chapter}${band ?? Number(no) % 2 === 0 ? ` ${styles.chapterBand}` : ""}${clip ? ` ${styles.chapterClip}` : ""}`}>
      <div className={styles.chapterHead}>
        <span className={styles.chapterNo} data-reveal="">{no}</span>
        {title && <h2 className={styles.chapterTitle} data-reveal="" style={delay(1)}>{title}</h2>}
        {lead && <p className={styles.chapterLead} data-reveal="" style={delay(2)}>{lead}</p>}
      </div>
      {children}
    </section>
  );
}

/** 항목의 미디어 — 데모가 있으면 데모 창, 없으면 그림 · 영상. wide 면 들어오며 커지는 큰 자리 */
function PointMedia({ point, demoLabel, liveLabel, wide }: { point: LandingPoint; demoLabel: string; liveLabel: string; wide?: boolean }) {
  if (point.demo) {
    return (
      <div className={`${styles.media}${wide ? ` ${styles.mediaWide}` : ""}`} data-reveal="zoom">
        <LandingDemoFrame demo={point.demo} label={demoLabel} liveLabel={liveLabel} />
      </div>
    );
  }
  if (!point.image) return null;
  return (
    <div className={`${styles.media}${wide ? ` ${styles.mediaWide}` : ""}`} {...(wide ? { "data-progress": "enter" } : { "data-reveal": "zoom" })}>
      <div className={styles.mediaFrame}>
        <ProgressiveImage src={point.image} alt={point.title} fill sizes="(max-width: 1080px) 100vw, 1080px" className={styles.mediaImage} />
      </div>
    </div>
  );
}

/** 챕터 항목 — 모양(look)에 따라 두 칸 카드 · 크기가 다른 칸 · 큰 무대 */
function ChapterPoints({ chapter, demoLabel, liveLabel }: {
  chapter: LandingChapter; demoLabel: (p: LandingPoint) => string; liveLabel: string;
}) {
  if (chapter.points.length === 0) return null;
  const look = chapter.look ?? "list";
  if (look === "stage") {
    return (
      <div className={styles.stages}>
        {chapter.points.map((p, i) => (
          <div key={i} className={styles.stage}>
            <div className={styles.stageText} data-reveal="">
              <h3 className={styles.pointTitle}>{p.title}</h3>
              {p.body && <p className={styles.pointBody}>{p.body}</p>}
            </div>
            <PointMedia point={p} demoLabel={demoLabel(p)} liveLabel={liveLabel} wide />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={look === "bento" ? styles.bento : styles.points}>
      {chapter.points.map((p, i) => (
        <div key={i} className={`${styles.point}${p.image || p.demo ? ` ${styles.pointWithMedia}` : ""}`} data-reveal="" style={delay(i % 4)}>
          <PointMedia point={p} demoLabel={demoLabel(p)} liveLabel={liveLabel} />
          <h3 className={styles.pointTitle}>{p.title}</h3>
          {p.body && <p className={styles.pointBody}>{p.body}</p>}
        </div>
      ))}
    </div>
  );
}
