"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { useSyncRef } from "@/hooks/useSyncRef";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
import { FileText, Play, Volume2, VolumeX } from "@/components/icons";
import Button from "@/components/ui/Button";
import type { GalleryNotes } from "@/data/projects";
import { useGalleryNarration } from "./useGalleryNarration";
import { isOfficeDocUrl, officeDocKind, officeViewerUrl } from "@/lib/officeViewer";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./WorkGallery.module.css";

/* 가운데에서 몇 장까지 그릴지 — 더 먼 장은 어차피 가려지고 흐려져 보이지 않는다 */
const VISIBLE_SIDE = 3;
/* 한 장 옮기는 데 필요한 끌기 거리(무대 폭 대비). 작을수록 예민하게 넘어간다 */
const DRAG_RATIO = 0.55;
/* 한 장 넘기는 데 필요한 휠 양(트랙패드) — 살짝 스치는 것으로는 안 넘어가게 */
const WHEEL_STEP = 60;
/* 걸음 사이 최소 간격 — 계속 굴려도 이보다 빨리는 안 넘어간다 */
const WHEEL_MIN_GAP_MS = 150;
/* 이만큼 조용하면 새로 쓴 것으로 본다 */
const WHEEL_QUIET_MS = 120;
/* 갤러리를 화면 가운데로 끌어오는 판정 — 중심이 이만큼 어긋나 있을 때만 움직인다 */
const CENTER_SLACK_PX = 48;
/* 한 번 가운데로 옮긴 뒤 이 시간 동안은 다시 옮기지 않는다(스크롤과 싸우지 않게) */
const CENTER_COOLDOWN_MS = 1200;
/* 마우스 휠 한 칸으로 볼 최소 크기 — 트랙패드 관성 꼬리는 이보다 잘게 들어온다 */
const WHEEL_TICK = 40;

type Props = {
  images: string[];
  /** alt 에 쓸 작업물 제목 */
  title: string;
  /** 처음 보여 줄 장 — 격자에서 누른 그 장부터 시작한다 */
  initialIndex?: number;
  /** 가운데 장을 누르면 — 크게 보는 뷰어를 여는 쪽 */
  onOpen: (index: number) => void;
  /** 장마다의 음성(대본·음성 파일) — 있으면 갤러리가 화면에 들어올 때 음성과 함께 넘어가고, 띠 왼쪽에 음성 단추가 생긴다 */
  notes?: GalleryNotes;
  /** 갤러리가 가려져 있다(확대 뷰어가 열림) — 음성을 멈췄다가 풀리면 잇는다 */
  suspended?: boolean;
};

/**
 * 작업물 상세의 갤러리 — 가운데 한 장이 크고 양옆이 원근으로 기울어 이어지는 코버플로우.
 *
 * 끌기·휠·화살표 키로 넘기고, 옆 장을 누르면 그 장이 가운데로 온다(앞·뒤 단추는 두지 않는다 —
 * 옆 장이 그 자리에 있어 누르면 되고, 아래 점으로도 바로 건너뛴다).
 * 가운데 장을 누르면 크게 보는 뷰어가 뜬다.
 *
 * 휠은 세로든 가로든 갤러리가 받는다. 다만 양 끝에서 그 방향으로 더 굴리면 흘려보내
 * 페이지가 이어서 움직인다 — 그러지 않으면 갤러리 위에서 페이지가 영영 멈춘다.
 */
export default function WorkGallery({ images, title, initialIndex = 0, onOpen, notes, suspended = false }: Props) {
  const { language } = useLanguage();
  /* 이 컴포넌트가 쓰는 문구는 몇 개뿐이라 사전 키 대신 여기서 고른다 */
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [index, setIndex] = useState(initialIndex);
  /* 끄는 중의 소수 위치 — 0.4 면 다음 장 쪽으로 40% 와 있다는 뜻 */
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  /* 아래 띠를 잡고 끄는 중 — 끄는 동안에는 칸 폭을 고르게 두고(data-scrub), 음성도 손을 뗄 때까지 미룬다 */
  const [scrubbing, setScrubbing] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; moved: boolean } | null>(null);
  /* 끌고 난 직후의 click 은 흘린다 — 손을 뗀 자리에서 뷰어가 열리면 성가시다 */
  const skipClick = useRef(false);
  const wheelAcc = useRef(0);
  /* 트랙패드는 한 번 쓸어도 관성으로 휠 사건을 수십 개 보낸다. 한 번 넘긴 뒤에는 그 꼬리를
     흘려보내고(lock), 사람이 다시 쓸었다고 볼 만한 신호가 오면 바로 푼다 */
  const wheelStepAt = useRef(0);
  const wheelEventAt = useRef(0);
  const wheelPrevAbs = useRef(0);
  const wheelLock = useRef(false);
  /* 넘긴 뒤로 가장 작았던 양 — 관성은 계속 줄어드니, 이보다 훌쩍 커지면 사람이 다시 쓴 것이다 */
  const wheelMinAbs = useRef(Infinity);
  /* 마지막으로 갤러리를 가운데로 옮긴 시각 */
  const centeredAt = useRef(0);

  const last = images.length - 1;
  const clamp = useCallback((n: number) => Math.max(0, Math.min(last, n)), [last]);
  const go = useCallback((n: number) => setIndex((cur) => clamp(typeof n === "number" ? n : cur)), [clamp]);
  /* 음성과 함께 넘겨 보기 — 장의 음성이 끝나면 다음 장으로. 기본은 켜짐이라 갤러리가 화면에 들어오면 읽고 벗어나면
     멈춘다. 끝났거나 멈춘 뒤에는 사람이 갤러리를 만질 때(engage) 그 장부터 읽는다.
     크게 보기(뷰어)가 열린 동안도 멈춘다 — 뷰어 뒤에서 갤러리가 혼자 넘어가면 닫았을 때 엉뚱한 장이다 */
  const narration = useGalleryNarration({ images, notes, index, goTo: go, hold: scrubbing || suspended, viewRef: stageRef });

  /* 장 수가 줄어 현재 위치가 범위를 넘으면 맞춘다 */
  const countChanged = useDepsChanged([images.length]);
  if (countChanged) setIndex((cur) => Math.max(0, Math.min(images.length - 1, cur)));

  /* ── 끌기 ── */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    /* setPointerCapture 를 걸지 않는다 — 걸면 손을 뗄 때의 click 이 무대로 가서
       안쪽 장의 클릭(크게 보기)이 아예 오지 않는다 */
    pointer.current = { id: e.pointerId, x: e.clientX, moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const width = stageRef.current?.clientWidth ?? 1;
    const delta = (e.clientX - p.x) / (width * DRAG_RATIO);
    if (Math.abs(e.clientX - p.x) > 4) p.moved = true;
    /* 양 끝에서는 절반만 따라와 더 없다는 걸 손으로 알린다 */
    const raw = -delta;
    const next = index + raw;
    const over = next < 0 ? next : next > last ? next - last : 0;
    setDrag(raw - over / 2);
  };
  const endDrag = (e: React.PointerEvent) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    skipClick.current = p.moved;
    pointer.current = null;
    setDragging(false);
    /* 절반을 넘겼으면 다음 장으로 */
    setIndex((cur) => clamp(Math.round(cur + drag)));
    if (p.moved && Math.round(drag) !== 0) narration.engage();
    setDrag(0);
  };

  /* ── 휠 ── */
  /* 리스너는 한 번만 걸고 자리 값은 ref 로 읽는다 — 장이 바뀔 때마다 다시 걸면 그 사이 휠을 놓친다 */
  const posRef = useRef({ index: 0, last: 0 });
  useSyncRef(posRef, { index, last });
  const centerRef = useRef<() => void>(() => {});
  /* 갤러리에서 장을 넘기기 시작하면 갤러리를 화면 한가운데로 데려온다 — 장이 화면 밖으로
     반쯤 걸친 채로 넘기면 읽을 수가 없다. 페이지 스크롤은 Lenis 가 맡으므로 그쪽에 부탁한다 */
  const { scrollTo, lenis } = useLenis();

  const centerGallery = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const now = performance.now();
    if (now - centeredAt.current < CENTER_COOLDOWN_MS) return;
    const r = el.getBoundingClientRect();
    const off = (r.top + r.height / 2) - window.innerHeight / 2;
    if (Math.abs(off) < CENTER_SLACK_PX) return;
    centeredAt.current = now;
    if (lenis) scrollTo(el, { offset: -(window.innerHeight - r.height) / 2, duration: 0.6 });
    else el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [lenis, scrollTo]);
  useSyncRef(centerRef, centerGallery);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    /* 캡처 단계에서 붙잡아 stopPropagation 한다 — Lenis 는 window 에서 휠을 듣고 preventDefault 를
       보지 않아서, 여기까지 막지 않으면 장도 넘어가고 페이지도 같이 내려간다 */
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      const { index: cur, last: end } = posRef.current;
      /* 양 끝에서 그 방향으로 더 굴리면 페이지 몫 */
      if (end <= 0 || (delta < 0 && cur <= 0) || (delta > 0 && cur >= end)) {
        wheelAcc.current = 0;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      centerRef.current();
      const now = performance.now();
      const gap = now - wheelEventAt.current;
      wheelEventAt.current = now;
      const abs = Math.abs(delta);
      const prevAbs = wheelPrevAbs.current;
      wheelPrevAbs.current = abs;

      /* 잠긴 것을 풀 만한 신호 — 잠깐 조용했거나, 잦아들던 양이 훌쩍 커졌거나(다시 쓸었다),
         크기가 똑같이 들어오거나(마우스 휠은 한 칸마다 같은 양이 오고, 관성은 점점 준다).
         쓸기 한 번이 점점 세지는 구간과 헷갈리지 않게, "커졌다" 는 잦아든 뒤와 견준다 */
      if (wheelLock.current
        && (gap >= WHEEL_QUIET_MS || abs > wheelMinAbs.current * 2 + 4 || (abs === prevAbs && abs >= WHEEL_TICK))) {
        wheelLock.current = false;
      }
      if (wheelLock.current) {
        wheelMinAbs.current = Math.min(wheelMinAbs.current, abs);
        wheelAcc.current = 0;
        return; // 관성 꼬리
      }

      /* 방향을 바꾸면 그때까지 모은 양은 버린다 */
      if (wheelAcc.current !== 0 && Math.sign(delta) !== Math.sign(wheelAcc.current)) wheelAcc.current = 0;
      wheelAcc.current += delta;
      if (Math.abs(wheelAcc.current) < WHEEL_STEP) return;
      if (now - wheelStepAt.current < WHEEL_MIN_GAP_MS) { wheelAcc.current = 0; return; }
      const dir = wheelAcc.current > 0 ? 1 : -1;
      wheelAcc.current = 0;
      wheelStepAt.current = now;
      /* 한 번 넘겼으니 이어 오는 꼬리는 흘린다 — 위 조건이 맞으면 곧바로 다시 풀린다 */
      wheelLock.current = true;
      wheelMinAbs.current = Infinity;
      setIndex((n) => Math.max(0, Math.min(end, n + dir)));
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setIndex((cur) => clamp(cur - 1)); narration.engage(); }
    if (e.key === "ArrowRight") { e.preventDefault(); setIndex((cur) => clamp(cur + 1)); narration.engage(); }
    // 문서 칸은 확대 뷰어가 없다 — 뷰어 안에서 넘겨 본다
    if ((e.key === "Enter" || e.key === " ") && !isOfficeDocUrl(images[index] ?? "")) { e.preventDefault(); onOpen(index); }
  };

  /* ── 띠 끌기 ── 지금 자리를 잡고 좌우로 끌면 장이 따라온다. 끄는 동안에는 칸 폭을 고르게 두어
     (아래 data-scrub) 손 밑에서 배치가 흔들리지 않게 한다 */
  const railRef = useRef<HTMLDivElement>(null);
  const indexFromX = useCallback((clientX: number) => {
    const rail = railRef.current;
    if (!rail || images.length === 0) return 0;
    const r = rail.getBoundingClientRect();
    const ratio = (clientX - r.left) / Math.max(1, r.width);
    return Math.max(0, Math.min(images.length - 1, Math.floor(ratio * images.length)));
  }, [images.length]);
  const onRailDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    railRef.current?.setPointerCapture(e.pointerId);
    setScrubbing(true);
    setIndex(indexFromX(e.clientX));
  };
  const onRailMove = (e: React.PointerEvent) => {
    if (!scrubbing) return;
    setIndex(indexFromX(e.clientX));
  };
  const endScrub = (e: React.PointerEvent) => {
    if (!scrubbing) return;
    railRef.current?.releasePointerCapture?.(e.pointerId);
    setScrubbing(false);
    narration.engage();
  };

  const position = index + drag;

  /* 음성 단추 — 읽는 중(누르면 끄고 기억) · 켜짐(누르면 바로 읽기) · 꺼짐(누르면 다시 켜고 읽기) */
  const narrationState = narration.playing ? "playing" : narration.enabled ? "ready" : "off";
  const narrationLabel = narration.playing
    ? t("음성 끄기", "Turn off narration")
    : narration.enabled ? t("음성 듣기", "Play narration") : t("음성 켜기", "Turn on narration");

  return (
    <div className={styles.gallery}>
      <div
        ref={stageRef}
        className={styles.stage}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("작업물 갤러리", "Work gallery")}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        data-dragging={dragging ? "" : undefined}
      >
        {images.map((src, i) => {
          const offset = i - position;
          if (Math.abs(offset) > VISIBLE_SIDE + 0.5) return null;
          const dist = Math.min(Math.abs(offset), VISIBLE_SIDE);
          const sign = Math.sign(offset);
          const active = Math.round(position) === i;
          const doc = isOfficeDocUrl(src);
          return (
            <div
              key={src + i}
              className={styles.slide}
              style={{
                /* 옆으로 갈수록 간격이 좁아져(제곱근) 멀리 있는 장들이 겹쳐 쌓인다 — 깊이감 */
                "--_x": `${sign * Math.sqrt(dist) * 42}%`,
                "--_rot": `${-offset * 26}deg`,
                "--_scale": `${1 - dist * 0.14}`,
                "--_dim": `${Math.min(dist * 0.28, 0.72)}`,
                zIndex: 100 - Math.round(dist * 10),
              } as React.CSSProperties}
              aria-hidden={!active}
            >
              {doc && active ? (
                /* 문서(옛 .ppt 등) — 그림으로 바꿀 방법이 없어 파일째 올라온 칸. 가운데 온 장만 문서 뷰어를
                   띄워 그 안에서 넘겨 보게 한다(뷰어는 무겁고, 옆 장은 기울어 있어 어차피 읽을 수 없다) */
                <div className={`${styles.slideButton} ${styles.slideDoc}`}>
                  <iframe
                    src={officeViewerUrl(src)}
                    title={`${title} ${i + 1}`}
                    className={styles.docFrame}
                    loading="lazy"
                  />
                </div>
              ) : (
                <Pressable
                  className={styles.slideButton}
                  noTapScale
                  data-cursor={active && !doc ? "zoom" : undefined}
                  tabIndex={-1}
                  aria-label={`${title} ${i + 1}`}
                  onClick={() => {
                    if (skipClick.current) { skipClick.current = false; return; }
                    if (!active) { setIndex(i); narration.engage(); }
                    else if (!doc) onOpen(i);
                  }}
                >
                  {doc ? (
                    <span className={styles.docCard}>
                      <FileText size={40} strokeWidth={1.25} />
                      <span className={styles.docKind}>{officeDocKind(src)}</span>
                    </span>
                  ) : (
                    <ProgressiveImage
                      src={src}
                      alt={`${title} ${i + 1}`}
                      fill
                      sizes="(max-width: 768px) 86vw, 900px"
                      className={styles.image}
                    />
                  )}
                </Pressable>
              )}
              {/* 격자로 돌아가기 — 가운데 장의 왼쪽 위. 무대 구석에 두면 바탕이 비어 있어
                  뒤집기(difference)가 제 색을 못 내고 묻힌다 */}
            </div>
          );
        })}

        {/* 소리가 막힌 방문(주소를 직접 열거나 새로고침) — 첫 장 위에서 음성과 함께 볼지 묻는다.
            무대의 끌기·키(Enter 는 크게 보기)가 이 단추들을 가로채지 않게 막는다 */}
        {narration.waiting && (
          <div
            className={styles.cover}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Pressable className={styles.coverPlay} onClick={() => { centerRef.current(); narration.play(); }} aria-label={t("음성과 함께 보기", "Play with narration")}>
              <Play size={30} fill="currentColor" strokeWidth={0} className={styles.coverPlayIcon} />
            </Pressable>
            <span className={styles.coverLabel} aria-hidden>{t("음성과 함께 보기", "Play with narration")}</span>
            <Button variant="outline" size="sm" shape="capsule" onClick={narration.decline} className={styles.coverSkip}>
              {t("음성 없이 보기", "View without narration")}
            </Button>
          </div>
        )}
      </div>

      {/* 조작 막대 — 음성이 있는 갤러리는 영상 플레이어처럼 띠 왼쪽에 음성 단추, 오른쪽에 장 번호를 둔다.
          띠는 끌기를 받으므로 단추를 띠 안에 넣지 않고 옆 칸에 둔다 */}
      <div className={narration.hasNarration ? styles.controlBar : undefined}>
        {narration.hasNarration && (
          <span className={styles.narrationSlot}>
            <Tooltip content={narrationLabel} placement="top" delay={120}>
              <Button
                variant="ghost"
                shape="circle"
                size="sm"
                className={styles.narrationToggle}
                data-state={narrationState}
              data-narration-toggle=""
                icon={narration.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                /* 켤 때는 갤러리를 화면 가운데로 — 반쯤 걸쳐 있으면 "보고 있지 않다"로 쳐서 읽지 않는다 */
                onClick={() => { if (!narration.playing) centerRef.current(); narration.toggle(); }}
                aria-label={narrationLabel}
              />
            </Tooltip>
          </span>
        )}

        {/* 어디쯤인지 — 한 줄짜리 띠를 장 수만큼 나눠 가진다. 칸 폭이 고정이 아니라 비율이라
            몇 장이든 한 줄에 들어오고, 지나온 칸은 진하게 남아 얼마나 왔는지도 같이 읽힌다.
            누르면 그 칸의 장으로 건너뛴다 */}
        <div
          className={styles.controls}
          ref={railRef}
          data-scrub={scrubbing ? "" : undefined}
          onPointerDown={onRailDown}
          onPointerMove={onRailMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        >
          {images.map((src, i) => (
            /* 칸에 손을 얹으면 그 장을 작게 보여 준다 — 번호만으로는 어느 장인지 알 수 없다 */
            <Tooltip
              key={src + i}
              content={
                <span className={styles.segPreview}>
                  {isOfficeDocUrl(src) ? (
                    <span className={styles.docCard}>
                      <FileText size={20} strokeWidth={1.5} />
                      <span className={styles.docKind}>{officeDocKind(src)}</span>
                    </span>
                  ) : (
                    <ProgressiveImage src={src} alt="" fill sizes="160px" className={styles.segPreviewImg} />
                  )}
                </span>
              }
              placement="top"
              delay={120}
              hideArrow
              bubbleClassName={styles.segTip}
              wrapperStyle={{ display: "flex", flex: i === index && !scrubbing ? "4 1 0" : "1 1 0", minWidth: 0 }}
            >
              <Pressable
                className={[
                  styles.seg,
                  i === index ? styles.segActive : "",
                  i < index ? styles.segPassed : "",
                ].filter(Boolean).join(" ")}
                onClick={() => { go(i); narration.engage(); }}
                aria-label={`${i + 1} / ${images.length}`}
                aria-current={i === index ? "true" : undefined}
              />
            </Tooltip>
          ))}
        </div>

        {narration.hasNarration && (
          <span className={styles.counter} aria-hidden>{index + 1} / {images.length}</span>
        )}
      </div>
    </div>
  );
}
