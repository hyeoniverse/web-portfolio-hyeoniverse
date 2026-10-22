"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import { formatWorkYear } from "@/utils/formatWorkYear";
import { LandingDemoFrame, type DemoKey } from "../LandingDemo";
import { useCountUp, useReveal, useScrollProgress } from "../useReveal";
import styles from "./LandingKit.module.css";

/**
 * 작업물 랜딩 페이지 부품 — 전용 페이지(pages/*)가 이것들로 짠다.
 * 디자인은 andreasantonsson.dev 의 프로젝트 페이지를 따랐다: 강조색 하나로 쓴 큰 세리프 제목 · 정보 한 줄 · 큰 문장과 큰 화면을
 * 번갈아 · 넓은 여백 · 끝에 '다음 작업물'. 화면은 기존 캡처가 아니라 페이지마다 코드로 그린 장면과 직접 만져 보는 데모다.
 */

export type Lang = "ko" | "en";
export type L10n = { ko: string; en: string };

/** 나타나는 순서 — 하나에 90ms */
export function delay(n: number): CSSProperties {
  return { ["--d" as string]: n } as CSSProperties;
}

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

function repoOf(url: string): string {
  try { return new URL(url).pathname.replace(/^\/+|\/+$/g, "") || "GitHub"; } catch { return "GitHub"; }
}

/** 페이지 틀 — 머리(분류 · 큰 제목 · 역할 / 기간 / 사이트 / GitHub), 가운데(children), 끝의 다음 작업물. 나타나기 · 스크롤 진행을 건다 */
export function LandingShell({ project, viewLang, next, eyebrow, children }: {
  project: Project;
  viewLang: Lang;
  next?: { href: string; title: string } | null;
  eyebrow: L10n;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLElement>(null);
  const name = pickLocalized(project.title, viewLang);
  const period = formatWorkYear(project.year, viewLang);
  const role = pickLocalized(project.role, viewLang);
  useReveal(rootRef, [viewLang, project.id]);
  useScrollProgress(rootRef, [viewLang, project.id]);

  return (
    <article ref={rootRef} className={styles.landing} lang={viewLang}>
      <header className={styles.hero}>
        <p className={styles.eyebrow} data-reveal="">{eyebrow[viewLang]}</p>
        <h1 className={styles.title} aria-label={name}>
          <span className={styles.titleLetters} aria-hidden>
            {Array.from(name).map((ch, i) => (
              <span key={i} className={styles.letter} style={delay(i)}>{ch === " " ? " " : ch}</span>
            ))}
          </span>
        </h1>
        <dl className={styles.meta} data-reveal="" style={delay(4)}>
          {role && <Meta label={t("workDetail.role")}>{role}</Meta>}
          {period && <Meta label={t("workDetail.landing.period")}>{period}</Meta>}
          {project.liveUrl && (
            <Meta label={t("workDetail.landing.site")}>
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                {hostOf(project.liveUrl)} <ArrowUpRight size={14} />
              </a>
            </Meta>
          )}
          {project.githubUrl && (
            <Meta label="GitHub">
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                <GithubIcon size={14} /> {repoOf(project.githubUrl)} <ArrowUpRight size={14} />
              </a>
            </Meta>
          )}
        </dl>
      </header>

      {children}

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

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.metaItem}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={styles.metaValue}>{children}</dd>
    </div>
  );
}

/** 큰 문장 — 작은 번호 · 큰 세리프 한두 줄 · 짧은 설명(선택). 화면 사이의 쉼표 */
export function Statement({ no, title, body, viewLang }: { no?: string; title: L10n; body?: L10n; viewLang: Lang }) {
  return (
    <section className={styles.statement}>
      {no && <span className={styles.statementNo} data-reveal="">{no}</span>}
      <h2 className={styles.statementTitle} data-reveal="" style={delay(1)}>{title[viewLang]}</h2>
      {body && <p className={styles.statementBody} data-reveal="" style={delay(2)}>{body[viewLang]}</p>}
    </section>
  );
}

/** 데모 무대 — 칼럼 폭에 데모 창 하나 */
export function DemoStage({ demo }: { demo: DemoKey }) {
  const { t } = useLanguage();
  return (
    <div className={styles.demoStage} data-reveal="zoom">
      <LandingDemoFrame demo={demo} label={t(`workDetail.landing.demo.${demo}`)} liveLabel={t("workDetail.landing.live")} />
    </div>
  );
}

/** 숫자 띠 — 큰 숫자가 0 에서 세어 올라간다 */
export function Numbers({ items, viewLang }: { items: { value: string; label: L10n }[]; viewLang: Lang }) {
  return (
    <dl className={styles.numbers}>
      {items.map((it, i) => <NumberItem key={i} value={it.value} label={it.label[viewLang]} index={i} />)}
    </dl>
  );
}

function NumberItem({ value, label, index }: { value: string; label: string; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const shown = useCountUp(ref, value);
  return (
    <div className={styles.number} data-reveal="" style={delay(index)}>
      <dt className={styles.numberLabel}>{label}</dt>
      <dd ref={ref} className={styles.numberValue}>{shown}</dd>
    </div>
  );
}

/**
 * 섹션 — 화면 폭 전체를 쓰는 한 덩어리. secret-level 처럼 섹션마다 바탕(tone)이 바뀌고, 안에 문장 · 화면 · 데모를 둔다.
 * tone: base(사이트 바탕) · tint(강조색이 옅게 비친 바탕) · dark(검정) · bleed(여백 없이 화면만)
 */
export function Section({ tone = "base", children }: { tone?: "base" | "tint" | "dark" | "bleed"; children: ReactNode }) {
  return <section className={`${styles.section} ${styles[`section_${tone}`]}`}>{children}</section>;
}

/** 섹션 머리 — 번호 · 제목 · 한 줄(선택). 섹션 안에서 화면 위에 */
export function SectionHead({ no, title, body, viewLang }: { no?: string; title: L10n; body?: L10n; viewLang: Lang }) {
  return (
    <header className={styles.sectionHead}>
      {no && <span className={styles.statementNo} data-reveal="">{no}</span>}
      <h2 className={styles.sectionTitle} data-reveal="" style={delay(1)}>{title[viewLang]}</h2>
      {body && <p className={styles.statementBody} data-reveal="" style={delay(2)}>{body[viewLang]}</p>}
    </header>
  );
}

/**
 * 화면 한 장 — 이 페이지를 위해 2배 해상도로 새로 찍은 캡처(content/works/<slug>/landing, WebP 2880px).
 * 그림을 줄이지 않고 원본 그대로 낸다(unoptimized — 사이트의 이미지 최적화는 1536px 까지라 화면 폭에서 흐려졌다).
 * size: bleed 는 화면 폭 전체(캡처 비율 그대로라 잘리지 않는다), wide 는 섹션 여백 안에서 최대 1600px
 */
export function Shot({ src, alt, size = "bleed", ratio = "16 / 10", priority, caption }: {
  src: string; alt: string; size?: "bleed" | "wide"; ratio?: string; priority?: boolean; caption?: string;
}) {
  return (
    <figure className={`${styles.shot} ${styles[`shot_${size}`]}`} data-reveal="rise">
      <div className={styles.shotFrame} style={{ ["--ratio" as string]: ratio } as CSSProperties}>
        <Image src={src} alt={alt} fill unoptimized priority={priority} className={styles.shotImage} />
      </div>
      {caption && <figcaption className={styles.shotCaption}>{caption}</figcaption>}
    </figure>
  );
}

/** 녹화 — 화면 폭 전체, 보일 때만 소리 없이 되풀이 재생(움직임 줄이기면 첫 장면에서 멈춤) */
export function Recording({ src, label, poster, size = "bleed" }: { src: string; label: string; poster?: string; size?: "bleed" | "wide" }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure className={`${styles.shot} ${styles[`shot_${size}`]}`} data-reveal="rise">
      <div className={styles.shotFrame}>
        <video ref={ref} className={styles.shotVideo} src={src} poster={poster} muted loop playsInline preload="metadata" aria-label={label} />
      </div>
    </figure>
  );
}

/** 나란히 — 휴대폰 화면 여럿(폰에서는 가로로 넘긴다) */
export function Phones({ items }: { items: { src: string; alt: string }[] }) {
  return (
    <div className={styles.phones}>
      {items.map((it, i) => (
        <div key={it.src} className={styles.phone} data-reveal="rise" style={delay(i)}>
          <Image src={it.src} alt={it.alt} fill unoptimized className={styles.shotImage} />
        </div>
      ))}
    </div>
  );
}

/** 셋씩 — 화면이 많을 때 작게 여러 장(태블릿은 둘, 폰은 하나). 이름을 캡션으로 단다 */
export function Gallery({ items }: { items: { src: string; alt: string }[] }) {
  return (
    <div className={styles.grid}>
      {items.map((it) => <Shot key={it.src} size="wide" src={it.src} alt={it.alt} caption={it.alt} />)}
    </div>
  );
}

/** 긴 설명 — 작은 제목과 문단 몇 개. 섹션 머리만으로 모자란 이야기를 적는다 */
export function Prose({ items, viewLang }: { items: { label: L10n; body: L10n }[]; viewLang: Lang }) {
  return (
    <div className={styles.prose}>
      {items.map((it, i) => (
        <div key={i} className={styles.proseItem} data-reveal="" style={delay(i)}>
          <h3 className={styles.proseLabel}>{it.label[viewLang]}</h3>
          <p className={styles.proseBody}>{it.body[viewLang]}</p>
        </div>
      ))}
    </div>
  );
}

/** 둘을 나란히 — 화면 두 장(태블릿 이하는 위아래) */
export function Pair({ children }: { children: ReactNode }) {
  return <div className={styles.pair}>{children}</div>;
}
