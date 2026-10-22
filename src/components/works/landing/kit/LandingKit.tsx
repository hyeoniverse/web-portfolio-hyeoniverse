"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { isPlainClick } from "@/utils/gestureUtils";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import { formatWorkYear } from "@/utils/formatWorkYear";
import { LandingDemoFrame, type DemoKey } from "../LandingDemo";
import { useCountUp, useReveal, useScrollProgress } from "../useReveal";
import LandingNav from "@/components/layout/Navigation/LandingNav";
import styles from "./LandingKit.module.css";

/**
 * 작업물 랜딩 페이지 부품 — 전용 페이지(pages/*)가 이것들로 짠다.
 * 디자인은 andreasantonsson.dev 의 프로젝트 페이지를 따랐다: 강조색 하나로 쓴 큰 세리프 제목 · 정보 한 줄 · 화면 폭 전체 컷 ·
 * 위치를 엇갈린 큰 화면들 · 짧은 글 · 끝에 '다음 작업물'. 화면은 이 페이지를 위해 배포한 사이트에서 새로 찍은 캡처 · 녹화다.
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
  /* 판 전환으로 들어왔으면 판이 걷힐 때까지 등장 연출을 멈춰 둔다(data-ready) */
  const { isTransitioning, navigateWithSlide } = usePageTransition();
  /* 다음 작업물은 미리 받아 둔다 — 누르는 순간 판 전환이 바로 시작되게(받아 두지 않으면 로딩 화면이 먼저 밀려 들어왔다) */
  const router = useRouter();
  const nextHref = next?.href;
  useEffect(() => {
    if (nextHref) router.prefetch(nextHref);
  }, [nextHref, router]);
  const ready = !isTransitioning;
  useReveal(rootRef, [viewLang, project.id], ready);
  useScrollProgress(rootRef, [viewLang, project.id]);

  return (
    <article ref={rootRef} className={styles.landing} lang={viewLang} data-ready={ready ? "" : undefined}>
      <LandingNav />
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
          {/* 다음 작업물은 아래에서 판이 올라오며 넘어간다(참고 사이트). 새 탭 클릭은 막지 않는다 */}
          <Link
            href={next.href}
            className={styles.nextLink}
            data-reveal=""
            style={delay(1)}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              if (!isPlainClick(e)) return;
              e.preventDefault();
              navigateWithSlide(next.href, "bottom");
            }}
          >
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

/** 데모 무대 — 가운데 칼럼 폭에 데모 창 하나 */
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
 * 흐름 — 페이지 가운데 전체. 참고 사이트(andreasantonsson.dev/project/synthetic-theatre)처럼 이미지가 중심이다:
 * 강한 장면만 화면 폭 전체로, 나머지는 한 장씩 폭 · 위치를 바꿔 가며 틀 없이 잇는다. 격자 · 카드로 늘어놓지 않고, 글은 짧은 쉼표(Note)뿐
 */
export function Flow({ children }: { children: ReactNode }) {
  return <div className={styles.flow}>{children}</div>;
}

/** 짧은 글 — 번호 · 제목 · 한 줄. 이미지 묶음 사이의 쉼표 */
export function Note({ no, title, body, viewLang }: { no?: string; title: L10n; body?: L10n; viewLang: Lang }) {
  return (
    <header className={styles.note}>
      {no && <span className={styles.noteNo} data-reveal="">{no}</span>}
      <h2 className={styles.noteTitle} data-reveal="" style={delay(1)}>{title[viewLang]}</h2>
      {body && <p className={styles.noteBody} data-reveal="" style={delay(2)}>{body[viewLang]}</p>}
    </header>
  );
}

export type FrameAt = "bleed" | "wide" | "left" | "right" | "center";

/**
 * 한 장 — 이 페이지를 위해 2배 해상도로 새로 찍은 캡처(WebP 2880×1800) 또는 녹화를 원래 비율 그대로.
 * at: bleed(화면 폭 전체 — 강한 장면에만) · wide(94%) · left · right(78%, 한쪽에 붙인다) · center(64%). 폰 · 태블릿은 여백 안 폭 전체.
 * 그림은 줄이지 않고 원본을 낸다(unoptimized — 사이트의 이미지 최적화는 1536px 까지라 화면 폭에서 흐려졌다).
 * 녹화는 보일 때만 소리 없이 되풀이 재생한다(판 전환 중 · 움직임 줄이기면 멈춘다)
 */
export function Frame({ src, video, alt, at = "wide", width = 2880, height = 1800, priority }: {
  src?: string; video?: string; alt: string; at?: FrameAt; width?: number; height?: number; priority?: boolean;
}) {
  return (
    <figure className={`${styles.frame} ${styles[`frame_${at}`]}`} data-reveal="rise">
      {video ? (
        <FrameVideo src={video} poster={src} label={alt} width={width} height={height} />
      ) : src ? (
        <Image src={src} alt={alt} width={width} height={height} sizes={at === "bleed" ? "100vw" : "80vw"} unoptimized priority={priority} className={styles.frameMedia} />
      ) : null}
    </figure>
  );
}

function FrameVideo({ src, poster, label, width, height }: { src: string; poster?: string; label: string; width: number; height: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  /* 판 전환이 도는 동안은 재생하지 않는다 — 영상 디코더가 켜지는 순간이 제목 등장과 겹쳤다 */
  const { isTransitioning } = usePageTransition();
  useEffect(() => {
    const el = ref.current;
    if (!el || isTransitioning || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [isTransitioning]);
  return (
    <video
      ref={ref}
      className={styles.frameMedia}
      src={src}
      poster={poster}
      width={width}
      height={height}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
}

/** 휴대폰 화면 여럿 — 세로 화면을 틈 없이 이어 붙여 화면 폭 전체를 채우는 띠 하나 */
export function Phones({ items }: { items: { src: string; alt: string }[] }) {
  return (
    <div className={styles.phones} data-reveal="rise">
      {items.map((it) => (
        <div key={it.src} className={styles.phone}>
          <Image src={it.src} alt={it.alt} fill unoptimized className={styles.phoneImage} />
        </div>
      ))}
    </div>
  );
}
