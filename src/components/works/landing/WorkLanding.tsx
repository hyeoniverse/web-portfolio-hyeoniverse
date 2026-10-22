"use client";

import Link from "next/link";
import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import { EMPTY_LANDING, contentMediaOf, landingMediaOf, type LandingMedia } from "@/types/workLanding";
import { formatWorkYear } from "@/utils/formatWorkYear";
import { LandingDemoFrame } from "./LandingDemo";
import { LandingScreen } from "./LandingScreen";
import { useReveal, useScrollProgress } from "./useReveal";
import styles from "./WorkLanding.module.css";

/**
 * 작업물 상세 — 랜딩 페이지 형태(설정의 works.detailStyle = "landing").
 *
 * andreasantonsson.dev 의 프로젝트 페이지(project/secret-level)를 따랐다 — 글 없이 그림 위주.
 * 분류 한 줄 · 강조색 큰 세리프 제목 · 역할 / 기간 / 사이트 / GitHub 한 줄 → 화면 폭을 채우는 대표 화면 →
 * 넓은 여백을 두고 이어지는 미디어(칼럼 폭 화면 · 화면 폭 가로 컷 · 데모) → 다음 작업물을 크게.
 * 미디어는 편집기의 '랜딩 페이지' 칸(project.landing.media), 비어 있으면 본문에 든 실제 화면 캡처 · 녹화로 채운다(글은 보이지 않는다).
 * 칼럼 폭 화면은 참고 페이지의 녹화 화면처럼 어두운 무대 위에 띄운다 — 뒤에 같은 화면을 흐리게 깔고, 화면은 통째로.
 * 움직임: 제목 글자가 올라오고, 칼럼 폭 미디어는 들어오며 커지고, 화면 폭 컷은 스크롤에 따라 안쪽 그림이 천천히 움직인다.
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
  const landing = project.landing?.[viewLang] ?? EMPTY_LANDING;
  const other = project.landing?.[viewLang === "ko" ? "en" : "ko"] ?? EMPTY_LANDING;
  /* 미디어를 비웠으면 본문에 든 실제 화면 캡처 · 녹화로(대표 화면과 같은 그림은 뺀다). 본문에도 없으면 갤러리 */
  const media = useMemo(() => {
    const mine = landingMediaOf(landing, []);
    if (mine.length > 0) return mine;
    const fromContent = contentMediaOf(project.content[viewLang] ?? "", project.content[viewLang === "ko" ? "en" : "ko"] ?? "")
      .filter((src) => src !== project.image);
    return landingMediaOf(other, fromContent.length > 0 ? fromContent : project.gallery);
  }, [landing, other, project.content, project.gallery, project.image, viewLang]);

  const name = pickLocalized(project.title, viewLang);
  const eyebrow = landing.eyebrow.trim() || other.eyebrow.trim() || pickLocalized(project.subtitle, viewLang);
  const period = formatWorkYear(project.year, viewLang);
  const role = pickLocalized(project.role, viewLang);

  useReveal(rootRef, [viewLang, project.id]);
  useScrollProgress(rootRef, [viewLang, project.id, media.length]);

  return (
    <article ref={rootRef} className={styles.landing} lang={viewLang}>
      {/* ── 머리 — 분류 · 큰 제목 · 역할 / 기간 / 사이트 / GitHub ── */}
      <header className={styles.hero}>
        {eyebrow && <p className={styles.eyebrow} data-reveal="">{eyebrow}</p>}
        <h1 className={styles.title} aria-label={name}>
          <SplitLetters text={name} />
        </h1>
        <dl className={styles.meta} data-reveal="" style={delay(4)}>
          {role && <MetaItem label={t("workDetail.role")}>{role}</MetaItem>}
          {period && <MetaItem label={t("workDetail.landing.period")}>{period}</MetaItem>}
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

      {/* ── 대표 화면 — 화면 폭을 채운다. 스크롤에 따라 안쪽 그림이 천천히 움직인다 ── */}
      {project.image && (
        <div className={styles.full} data-progress="through">
          <LandingScreen src={project.image} alt={name} fit="cover" sizes="100vw" priority className={styles.parallax} />
        </div>
      )}

      {/* ── 미디어 — 칼럼 폭 화면 · 화면 폭 가로 컷 · 데모 ── */}
      <div className={styles.sequence}>
        {media.map((m, i) => (
          <Media key={`${m.src ?? m.demo}-${i}`} media={m} alt={`${name} ${i + 1}`} demoLabel={m.demo ? t(`workDetail.landing.demo.${m.demo}`) : ""} liveLabel={t("workDetail.landing.live")} />
        ))}
      </div>

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

/** 나타나는 순서 — 글자 · 칸마다 조금씩 늦춘다 */
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

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.metaItem}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={styles.metaValue}>{children}</dd>
    </div>
  );
}

/** 미디어 한 칸 — full 은 화면 폭 가로 컷(안쪽 그림이 스크롤 따라 움직인다), inset 은 칼럼 폭 무대(들어오며 커진다), 데모는 칼럼 폭 창 */
function Media({ media, alt, demoLabel, liveLabel }: { media: LandingMedia; alt: string; demoLabel: string; liveLabel: string }) {
  if (media.demo) {
    return (
      <div className={styles.inset} data-reveal="zoom">
        <LandingDemoFrame demo={media.demo} label={demoLabel} liveLabel={liveLabel} />
      </div>
    );
  }
  if (!media.src) return null;
  if (media.size === "full") {
    return (
      <div className={`${styles.full} ${styles.strip}`} data-progress="through">
        <LandingScreen src={media.src} alt={alt} fit="cover" sizes="100vw" className={styles.parallax} />
      </div>
    );
  }
  /* 무대 — 뒤에 같은 화면을 흐리게(영상이면 어두운 바탕만), 가운데 화면을 통째로 */
  const still = !/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(media.src);
  return (
    <div className={styles.inset} data-progress="enter">
      <div className={styles.stage}>
        {still && <div className={styles.stageBackdrop} style={{ backgroundImage: `url("${media.src}")` }} aria-hidden />}
        <div className={styles.stageScreen}>
          <LandingScreen src={media.src} alt={alt} fit="contain" sizes="(max-width: 1200px) 90vw, 1000px" />
        </div>
      </div>
    </div>
  );
}
