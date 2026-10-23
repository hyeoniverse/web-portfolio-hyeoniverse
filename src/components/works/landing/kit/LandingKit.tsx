"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import { ArrowDown, ArrowUpRight, GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { isPlainClick } from "@/utils/gestureUtils";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import { formatWorkYear } from "@/utils/formatWorkYear";
import { useCountUp, useReveal } from "../useReveal";
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
  /* 기다리는 건 판 전환으로 들어온(전환 중에 마운트된) 랜딩뿐 — 떠나는 랜딩까지 멈추면 바탕색 판이 덮기 전에 내용이 사라졌다 */
  const [enteredSliding] = useState(isTransitioning);
  const ready = !(enteredSliding && isTransitioning);
  useReveal(rootRef, [viewLang, project.id], ready);

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

/**
 * 흐르는 띠 — 화면 폭 전체 두 줄. 저절로 흐르지 않고 스크롤로만 흐른다: 이 구간에 들어오면 화면에 붙어(sticky) 있고,
 * 스크롤하는 만큼 윗줄은 왼쪽, 아랫줄은 오른쪽으로 흘러 한 바퀴(한 벌 길이)를 돌면 풀려 다음으로 넘어간다.
 * 줄마다 두 벌을 이어 붙여 한 바퀴의 끝이 처음과 똑같이 이어진다. 진행(--p)은 붙어 있는 동안 스크롤한 비율이다
 */
export function Marquee({ rows }: { rows: { src: string; alt: string }[][] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  usePinnedProgress(rootRef);
  const count = Math.max(...rows.map((row) => row.length));
  return (
    <div ref={rootRef} className={styles.marquee} style={{ ["--count" as string]: count } as CSSProperties}>
      <div className={styles.marqueeStage}>
        {rows.map((row, r) => (
          <div key={r} className={`${styles.marqueeRow} ${r % 2 ? styles.marqueeRowReverse : ""}`}>
            {[0, 1].map((copy) => row.map((it) => (
              <Image
                key={`${copy}-${it.src}`}
                src={it.src}
                alt={copy ? "" : it.alt}
                aria-hidden={copy ? true : undefined}
                width={1280}
                height={800}
                sizes="30vw"
                unoptimized
                className={styles.marqueeItem}
              />
            )))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 붙어 있는 구간의 진행 — 바깥 상자가 화면 맨 위에 닿을 때 0, 바깥 상자 끝이 화면 아래에 닿을 때 1. --p 로 넘기고 값도 알린다 */
function usePinnedProgress(rootRef: RefObject<HTMLElement | null>, onProgress?: (p: number) => void) {
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = root.getBoundingClientRect();
      const total = root.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      root.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef]);
}

/**
 * 시간순 장면 — 화면 폭 전체 무대가 화면에 붙어 있는 동안, 스크롤하는 만큼 다음 장면으로 겹쳐 넘어간다(한 장면에 화면 높이의 60%).
 * 다 넘기면 풀린다. 장면 이름 · 눈금 같은 표시는 두지 않는다(시각 · 날씨는 화면 안 글자로 보인다)
 */
export function Sequence({ items }: { items: { src: string; alt: string }[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  usePinnedProgress(rootRef, (p) => setActive(Math.min(items.length - 1, Math.floor(p * items.length))));
  return (
    <div ref={rootRef} className={styles.sequence} style={{ ["--count" as string]: items.length } as CSSProperties}>
      <div className={styles.sequenceStage}>
        {items.map((it, i) => (
          <Image
            key={it.src}
            src={it.src}
            alt={it.alt}
            width={2880}
            height={1800}
            sizes="100vw"
            unoptimized
            className={`${styles.sequenceFrame} ${i <= active ? styles.sequenceFrameOn : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

/** 움직임 줄이기 설정 — 바뀌면 다시 그린다 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia?.(REDUCED_MOTION);
  mq?.addEventListener("change", cb);
  return () => mq?.removeEventListener("change", cb);
}
function readReducedMotion() {
  return window.matchMedia?.(REDUCED_MOTION).matches ?? false;
}

/** 휴대폰 몸통의 두께를 이루는 겹 수 — 둥근 모서리가 그대로 옆면이 된다 */
const PHONE_SLICES = 14;

/**
 * 구르는 휴대폰 — 진짜 휴대폰처럼 두께(겹친 옆면 · 버튼) · 유리 반사 · 바닥 그림자가 있는 목업이 화면에 붙은 채,
 * 스크롤하는 만큼 홈의 도넛처럼 위에서 아래로 굴러간다(가로축 회전 + 살짝 기울고 떠다님). 앞면만 화면이고 뒷면은 실제 휴대폰 뒷면
 * (카메라 · 별 표시)이다. 한 바퀴 구를 때마다 다음 화면 — 뒷면이 보이는 동안 앞면의 화면(짧은 녹화)을 갈아 끼운다.
 * 한 바퀴 구간의 앞뒤 1/4 은 멈춰 화면을 읽게 한다. 아래에는 화면마다의 주소(route) 줄이 깔려 지금 화면의 주소가 가운데에서 채워진다.
 * 뒤로는 네 갈래 별 몇 개가 천천히 돈다(휴대폰이 입체라 배경은 납작하게, 글자 줄은 주소 줄 하나만)
 */
export function PhoneFlip({ items }: { items: { src: string; video?: string; alt: string; route: string }[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const turns = Math.max(1, items.length - 1);
  usePinnedProgress(rootRef, (p) => {
    const root = rootRef.current;
    if (!root) return;
    const x = Math.min(turns - 1e-4, p * turns);
    const i = Math.floor(x);
    const f = x - i;
    const t = Math.min(1, Math.max(0, (f - 0.25) / 0.5));
    const eased = t * t * (3 - 2 * t);
    root.style.setProperty("--rx", `${(i + eased) * -360}deg`);
    /* 도넛처럼 — 구르는 동안 옆으로 살짝 기울고 위아래로 떠다닌다(주기가 다른 사인 둘) */
    root.style.setProperty("--ry", `${Math.sin(p * Math.PI * 3) * 14}deg`);
    root.style.setProperty("--rz", `${Math.sin(p * Math.PI * 5) * 6}deg`);
    root.style.setProperty("--bob", `${Math.sin(p * Math.PI * 4) * 2.5}dvh`);
    root.style.setProperty("--spin", String(Math.abs(Math.sin(eased * Math.PI * 2))));
    /* 주소 줄 — 화면 i 의 주소 가운데가 화면 가운데에 오도록, 구르는 동안 i+1 의 주소로 옮겨 간다 */
    const row = wordsRef.current;
    if (row) {
      const words = row.children;
      const a = words[i] as HTMLElement | undefined;
      const b = (words[i + 1] as HTMLElement | undefined) ?? a;
      if (a && b) {
        const ca = a.offsetLeft + a.offsetWidth / 2;
        const cb = b.offsetLeft + b.offsetWidth / 2;
        row.style.transform = `translate3d(${window.innerWidth / 2 - (ca + (cb - ca) * eased)}px, 0, 0)`;
      }
    }
    /* 반 바퀴(뒷면이 보일 때)를 넘기면 다음 화면 */
    setCurrent(eased < 0.5 ? i : i + 1);
  });
  const screen = items[current];
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  return (
    <div ref={rootRef} className={styles.phoneFlip} style={{ ["--count" as string]: turns } as CSSProperties}>
      <div className={styles.phoneFlipStage}>
        <div className={styles.phoneBackdrop} aria-hidden>
          <span className={`${styles.phoneSpark} ${styles.phoneSparkA}`} />
          <span className={`${styles.phoneSpark} ${styles.phoneSparkB}`} />
          <span className={`${styles.phoneSpark} ${styles.phoneSparkC}`} />
          <div ref={wordsRef} className={styles.phoneWords}>
            {items.map((it, k) => (
              <span key={k} className={`${styles.phoneWord} ${k === current ? styles.phoneWordOn : ""}`}>{it.route}</span>
            ))}
          </div>
        </div>
        <span className={styles.phoneShadow} aria-hidden />
        <div className={styles.phoneFlipBody}>
          {Array.from({ length: PHONE_SLICES }, (_, k) => (
            <span key={k} className={styles.phoneSlice} style={{ ["--k" as string]: k } as CSSProperties} aria-hidden />
          ))}
          <span className={styles.phoneButtons} aria-hidden />
          <div className={styles.phoneFace}>
            <div className={styles.phoneScreen}>
              {screen?.video ? (
                /* 화면마다 짧은 녹화 — 화면이 바뀌면 새로 붙어 처음부터 되풀이 재생한다(움직임 줄이기면 첫 장면) */
                <video
                  key={screen.video}
                  className={styles.phoneShot}
                  src={screen.video}
                  poster={screen.src}
                  autoPlay={!reducedMotion}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label={screen.alt}
                />
              ) : screen ? (
                <Image src={screen.src} alt={screen.alt} width={780} height={1688} sizes="30vw" unoptimized className={styles.phoneShot} />
              ) : null}
              <span className={styles.phoneIsland} aria-hidden />
              <span className={styles.phoneGlare} aria-hidden />
            </div>
          </div>
          {/* 뒷면 — 무광 유리 · 카메라 섬(렌즈 셋 · 플래시) · 가운데 별. 가로축으로 뒤집혀 붙어 있어 위아래가 바뀐 자리에 둔다 */}
          <div className={`${styles.phoneFace} ${styles.phoneBack}`} aria-hidden>
            <span className={styles.phoneCamera}>
              <i /><i /><i /><b />
            </span>
            <span className={styles.phoneLogo} />
          </div>
        </div>
      </div>
    </div>
  );
}
