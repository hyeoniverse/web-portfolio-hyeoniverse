"use client";

/* 기능 장의 장면들이 함께 쓰는 것 — 언어 고르기, 스크롤 진행 단계, 캡처 · 영상, 브라우저 창 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { L10n } from "../../_data/showcase";
import { GuideAnchor } from "../guide/GuideStar";
import styles from "./Features.module.css";

/** 넓은 화면인지 — 가로로 흘릴지 세로로 쌓을지. 서버에서는 넓은 쪽으로 그린다 */
export function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    /* 높이 500px 이하(가로로 든 휴대폰)는 넓은 화면으로 치지 않는다 — CSS 의 넓은 화면 규칙과 같은 기준 */
    const mq = matchMedia("(width > 1024px) and (height > 500px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

/* 손가락으로 쓰는 기기인지 — 안내 글을 "누르세요 · 쓸어 넘기세요"로. 마우스가 없고(hover: none) 굵은 포인터(coarse)일 때.
   서버와 첫 그림은 데스크톱 글(클릭 · 스크롤) */
const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";
const subscribeTouch = (cb: () => void) => {
  const mq = matchMedia(TOUCH_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export function useTouchInput() {
  return useSyncExternalStore(subscribeTouch, () => matchMedia(TOUCH_QUERY).matches, () => false);
}

export function useL() {
  const { language, tx } = useLanguage();
  /* 다른 언어로 볼 때는 영어 칸을 About 글 번역(tx — 생성 파일 aboutDict 의 원문으로 찾는다)으로 */
  return (v: L10n) => (language === "ko" ? v.ko ?? v.en : tx(v.en ?? v.ko));
}

/** 다크 테마면 다크 캡처를(있을 때만) */
export function useShotSrc() {
  const { theme } = useTheme();
  return (s: { src: string; srcDark?: string }) => (theme === "dark" && s.srcDark ? s.srcDark : s.src);
}

/**
 * 클릭 + 자동 넘김 — 화면에 들어와 있는 동안 interval(ms)마다 다음 칸으로 간다. 직접 고르면(go) 그 자리에서 다시 센다.
 * 장면 전체에 마우스가 올라가 있다고 멈추지는 않는다 — 장면이 화면을 거의 다 차지해 스크롤만 해도 멈춰 버렸다.
 * 멈춤은 paused(쓰는 쪽이 정한다: 엔드포인트 줄 위 등)와 키보드 초점이 안에 있을 때만.
 * 남은 시간은 ref 상자의 --auto(0~1, 매 프레임)로 넘긴다 — 진행 막대용.
 */
export function useAutoStep<T extends HTMLElement>(count: number, interval: number, paused = false) {
  const ref = useRef<T>(null);
  /* 누적 위치 — 한 바퀴 돌아도 계속 커진다(돌아가는 그림이 처음으로 되감기지 않게). 칸은 count 로 나눈 나머지 */
  const [pos, setPos] = useState(0);
  const index = ((pos % count) + count) % count;
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    /* 키보드로 들어왔을 때만 — 마우스 클릭으로 생긴 초점은 멈춤으로 치지 않는다 */
    const focusIn = (e: FocusEvent) => { if ((e.target as Element).matches?.(":focus-visible")) setFocused(true); };
    const focusOut = (e: FocusEvent) => { if (!el.contains(e.relatedTarget as Node)) setFocused(false); };
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    return () => {
      io.disconnect();
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
    };
  }, []);
  const held = paused || focused;
  useEffect(() => {
    const el = ref.current;
    if (!el || !visible || held || count < 2) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / interval;
      el.style.setProperty("--auto", Math.min(1, t).toFixed(3));
      if (t >= 1) { setPos((v) => v + 1); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, held, count, interval, pos, round]);
  /** 그 칸으로 — 앞으로 가장 가까운 쪽으로 돈다 */
  const go = (i: number) => {
    setPos((v) => v + ((i - (((v % count) + count) % count) + count) % count));
    setRound((r) => r + 1);
  };
  return { ref, index, pos, go };
}

/** 자동 넘김까지 남은 시간 막대 — useAutoStep 의 --auto 를 읽는다 */
export function AutoBar() {
  return <span className={styles.autoBar} aria-hidden />;
}

/** 화면에 보이는 동안만 소리 없이 재생하는 영상 */
function ShotVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.3 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} className={className} src={src} muted loop playsInline preload="none" aria-hidden />;
}

/** 캡처 하나 — 영상이면 영상, 아니면 그림. 바뀔 때마다 살짝 떠오르며 들어온다 */
export function ShotMedia({ src, video, alt, sizes }: { src: string; video?: boolean; alt: string; sizes: string }) {
  return (
    <div key={src} className={styles.shot}>
      {video ? (
        <ShotVideo src={src} className={styles.media} />
      ) : (
        <Image className={styles.media} src={src} alt={alt} fill sizes={sizes} />
      )}
    </div>
  );
}

/** 설명 속 `코드` 표기를 코드 글꼴로 */
export function WithCode({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) => (i % 2 ? <code key={i} className={styles.code}>{part}</code> : part))}
    </>
  );
}

/** 브라우저 창 — 점 셋 · 주소 막대 · 오른쪽 끝 자리(actions) */
export function BrowserFrame({ url, actions, guide, children }: { url: string; actions?: ReactNode; guide?: boolean; children: ReactNode }) {
  return (
    <div className={styles.browser}>
      <div className={styles.browserBar}>
        <span className={styles.browserDots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {/* 길잡이 별이 앉는 자리 — 주소 막대 앞 */}
        {guide && <GuideAnchor size="1.5rem" />}
        <span className={styles.browserUrl}>{url}</span>
        {actions}
      </div>
      <div className={styles.browserBody}>{children}</div>
    </div>
  );
}

/** 장면 머리 — 작은 대문자 눈썹 + 제목 */
export function SceneHead({ label, title, body }: { label: L10n; title: L10n; body?: L10n }) {
  const L = useL();
  return (
    <div className={styles.sceneHead}>
      <span className={styles.sceneLabel}>{L(label)}</span>
      <h3 className={styles.sceneTitle}>{L(title)}</h3>
      {body && <p className={styles.sceneBody}><WithCode text={L(body)} /></p>}
    </div>
  );
}

/* ── 별 — 첫 화면의 네 꼭지 별(브랜드 로고와 같은 모양)을 페이지 끝까지 표식으로 쓴다 ── */

export const STAR_PATH = "M50 0C53 36 64 47 100 50C64 53 53 64 50 100C47 64 36 53 0 50C36 47 47 36 50 0Z";

export function StarMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" aria-hidden>
      <path d={STAR_PATH} />
    </svg>
  );
}

/** 목록 번호 — 지금 항목([data-on])이면 옆에 별이 돌며 나타난다 */
export function RowNum({ n }: { n: number }) {
  return (
    <span className={styles.num}>
      {String(n).padStart(2, "0")}
      <StarMark className={styles.rowStar} />
    </span>
  );
}

/** 장 머리 — 눈썹 · 큰 제목 · 덧말. 오른쪽에 길잡이 별이 내려앉는 자리 */
export function ChapterHead({ eyebrow, title, note, noteTouch }: { eyebrow: L10n; title: L10n; note?: L10n; noteTouch?: L10n }) {
  const L = useL();
  const touch = useTouchInput();
  return (
    <div className={styles.head}>
      <span className={styles.headAnchor}>
        <GuideAnchor size="clamp(3rem, 6vw, 5.5rem)" />
      </span>
      <span className={styles.eyebrow}>{L(eyebrow)}</span>
      <h2 className={styles.title}>{L(title)}</h2>
      {note && <p className={styles.note}>{L(touch && noteTouch ? noteTouch : note)}</p>}
    </div>
  );
}
