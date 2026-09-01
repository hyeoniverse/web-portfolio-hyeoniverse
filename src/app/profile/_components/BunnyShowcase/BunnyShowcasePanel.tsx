"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import T from "@/components/ui/T";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BunnyProfile } from "@/types/profile";
import styles from "./BunnyShowcase.module.css";
import Pressable from "@/components/ui/Pressable";

const THREE_CLAMP = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Expression = "normal" | "surprised" | "happy";


/* ── 3D 모델 표정을 본뜬 SVG 아이콘 ── */

const EYE_COLOR = "currentColor";

function NormalFaceSVG() {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
      {/* 왼쪽 눈: 세로 타원 (3D sphere scale [1, 1.3]) */}
      <ellipse cx="16" cy="16" rx="4" ry="5.5" fill={EYE_COLOR} />
      {/* 오른쪽 눈 */}
      <ellipse cx="32" cy="16" rx="4" ry="5.5" fill={EYE_COLOR} />
    </svg>
  );
}

function SurprisedFaceSVG() {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
      {/* 왼쪽 >< : 교차 선 (3D rotated box) */}
      <line x1="10" y1="10" x2="18" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="22" x2="18" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      {/* 오른쪽 */}
      <line x1="38" y1="10" x2="30" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="22" x2="30" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function HappyFaceSVG() {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
      {/* 왼쪽 ^^ : 위로 볼록한 아치 (3D torus arc) */}
      <path d="M10 20 Q16 8 22 20" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* 오른쪽 */}
      <path d="M26 20 Q32 8 38 20" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * 통통하고 둥근 5각 별 테두리.
 *
 * 안쪽 반지름을 바깥의 절반까지 키워 팔을 두껍게 하고(고전적인 별은 0.38 이라 앙상하다),
 * 꼭짓점과 안쪽 골을 잘라 곡선으로 잇는다. 다만 잘라내는 폭이 변 길이의 절반을 넘으면
 * 양쪽 곡선이 서로를 먹어 별이 아니라 덩어리가 된다 — 변 32 에 잘라내는 폭 합계 15 로 둬서
 * 가운데에 직선 구간이 남게 했다.
 *
 * 비율은 늘리지 않는다. 버튼 상자에 맞춰 stretch 하면 위아래로 눌린 별이 된다.
 */
function StarOutline() {
  return (
    <svg
      className={styles.exprStar}
      viewBox="0 0 100 100"
      aria-hidden
    >
      <path d="M 46.46 9.17 Q 50.00 2.00 53.54 9.17 L 61.01 24.31 Q 64.11 30.58 71.03 31.59 L 87.73 34.02 Q 95.65 35.17 89.92 40.75 L 77.84 52.53 Q 72.83 57.42 74.01 64.32 L 76.86 80.95 Q 78.21 88.83 71.13 85.11 L 56.20 77.26 Q 50.00 74.00 43.80 77.26 L 28.87 85.11 Q 21.79 88.83 23.14 80.95 L 25.99 64.32 Q 27.17 57.42 22.16 52.53 L 10.08 40.75 Q 4.35 35.17 12.27 34.02 L 28.97 31.59 Q 35.89 30.58 38.99 24.31 Z" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const FACE_MAP: Record<Expression, ReactNode> = {
  normal: <NormalFaceSVG />,
  surprised: <SurprisedFaceSVG />,
  happy: <HappyFaceSVG />,
};

interface Props {
  animateClass?: string;
  /** 소개 문구 — 설정에서 편집한다. 예전에는 번역 파일에만 있어 손댈 수 없었다. */
  bunny: BunnyProfile;
}

/* ── 어디를 눌렀는지 ──────────────────────────────────────
   여기서는 정하지 않는다. 몽이가 지금 어떤 자세로 돌아 있는지는 FloatingScene 만 알기
   때문이다. 예전에는 이 파일이 "상자 가운데가 몽이 가운데" 라고 가정하고 로컬 좌표를
   만들었는데, 몽이를 돌리면 그 가정이 깨져 왼쪽 볼을 집었는데 오른쪽 볼이 늘어났다.

   그래서 이쪽은 화면 좌표만 넘기고, 무엇을 만지고 있는지는 장면이 광선을 쏴서 풀어 준다.
   그 결과(`spot`)를 다시 읽어 커서와 동작을 정한다. */

/** 커서를 화면 정규 좌표로. 광선을 쏘려면 뷰포트 기준이어야 한다(상자 기준이 아니라). */
function toNdc(e: { clientX: number; clientY: number }) {
  return {
    x: (e.clientX / window.innerWidth) * 2 - 1,
    y: -(e.clientY / window.innerHeight) * 2 + 1,
  };
}

/** 볼을 위로 끌 수 있는 한계(NDC). 더 끌면 밀린 살이 눈까지 올라온다. */
const PULL_UP_LIMIT = 0.05;
/** 좌우·아래로 끌 수 있는 한계(NDC). */
const PULL_LIMIT = 0.22;

type Spot = "pinch" | "pet" | "poke" | "grab";

/**
 * 트레일 커서를 전역으로 감춘다. 몽이를 만지는 동안에는 장면 안의 3D 손이 커서 노릇을 한다.
 *
 * 자리 상자에만 표시하면 모자란다. 볼을 잡고 끌면 포인터를 이 상자가 붙잡아(setPointerCapture)
 * 밖으로 나가도 계속 잡고 있는데, 트레일은 지금 커서 밑에 있는 요소를 따로 찾아보므로
 * 상자 밖에서는 다시 나타난다 — 손과 트레일이 같이 보인다.
 */
function setTrailHidden(on: boolean): void {
  if (on) document.body.dataset.cursor = "blank";
  else delete document.body.dataset.cursor;
}

/** 이만큼 안 움직이고 뗐으면 끈 게 아니라 찌른 것(px). */
const TAP_SLOP = 8;


export default function BunnyShowcasePanel({ animateClass, bunny }: Props) {
  /* 표정은 스토어 하나에서 관리한다. 무한 스크롤에서 이 패널이 여러 벌 그려지는데
     각자 상태를 들고 있으면 서로 다른 표정을 몽이에게 밀어 넣어 깜빡인다.
     자동 로테이션도 여기가 아니라 ProfileMeSection 에서 한 번만 돈다. */
  const expression = useProfileSectionStore((st) => st.bunnyExpression) ?? "normal";
  const { language } = useLanguage();
  const L = (t: { ko: string; en: string }) => (language === "ko" ? t.ko || t.en : t.en || t.ko);
  /* 떠다니는 몽이가 내려앉을 자리. 여기에 3D 를 하나 더 그리면 화면에 몽이가 둘이 된다. */
  const dockRef = useRef<HTMLDivElement>(null);

  const ac = animateClass ?? "";

  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const { addBunnyDockSlot, removeBunnyDockSlot } = useProfileSectionStore.getState();
    addBunnyDockSlot(el);
    return () => removeBunnyDockSlot(el);
  }, []);

  const handleExpression = useCallback((expr: Expression) => {
    useProfileSectionStore.getState().setBunnyExpression(expr);
  }, []);

  /* ── 끌어서 돌리기 ──
     몽이 그림은 위에 뜬 오버레이가 그리고 그 오버레이는 클릭을 받지 않는다. 그래서 입력은
     자리 상자가 받아 각도만 넘기고, 실제 회전은 FloatingScene 이 그린다.
     상태가 아니라 객체를 제자리에서 고친다 — 매 프레임 setState 하면 렌더가 계속 돈다. */
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  /* 누른 자리와, 그 뒤로 얼마나 움직였는지. 톡 찌른 건지 끈 건지를 뗄 때 가른다. */
  const press = useRef<{ x: number; y: number; nx: number; ny: number; moved: number; spot: Spot } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const { bunnyDrag: drag, bunnyTouch: touch } = useProfileSectionStore.getState();
    const ndc = toNdc(e);
    /* 무엇을 만지고 있는지는 장면이 직전 프레임에 풀어 둔 값을 쓴다. 커서를 움직여야
       누를 수 있으니 그 값은 언제나 지금 자리의 것이다. */
    const spot: Spot = touch.spot || "grab";
    press.current = { x: e.clientX, y: e.clientY, nx: ndc.x, ny: ndc.y, moved: 0, spot };
    /* 자리마다 하는 일이 다르다. 잡아당기거나 쓰다듬는 동안에는 돌지 않는다 —
       동시에 하면 뭘 하고 있는지 안 보인다. */
    touch.cheek = spot === "pinch" ? 1 : 0;
    touch.grabX = ndc.x;
    touch.grabY = ndc.y;
    touch.pullX = 0;
    touch.pullY = 0;
    touch.petting = spot === "pet";
    /* 만지는 데 따라 표정이 바뀐다 — 쓰다듬으면 좋아하고, 볼을 잡히면 놀란다. */
    if (spot === "pet") useProfileSectionStore.getState().setBunnyExpression("happy");
    if (spot === "pinch") useProfileSectionStore.getState().setBunnyExpression("surprised");
    drag.dragging = spot === "grab" || spot === "poke";
    drag.vx = 0;
    drag.vy = 0;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragging = "true";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const last = lastPointer.current;
    if (!last) return;
    const touch = useProfileSectionStore.getState().bunnyTouch;
    if (press.current) {
      press.current.moved += Math.hypot(e.clientX - last.x, e.clientY - last.y);
    }
    /* 쓰다듬거나 볼을 잡고 있으면 커서 자리만 넘긴다 — 그 자리를 몽이 위의 점으로 옮기는
       일은 자세를 아는 장면이 한다. */
    if (press.current && (touch.petting || touch.cheek !== 0)) {
      const ndc = toNdc(e);
      touch.pullX = THREE_CLAMP(ndc.x - press.current.nx, -PULL_LIMIT, PULL_LIMIT);
      /* NDC 는 위가 + 라, 위로 끌면 양수다. 위로만 상한이 좁다. */
      touch.pullY = THREE_CLAMP(ndc.y - press.current.ny, -PULL_LIMIT, PULL_UP_LIMIT);
      lastPointer.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const drag = useProfileSectionStore.getState().bunnyDrag;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    /* 화면 폭의 절반쯤 끌면 한 바퀴 — 손맛이 너무 가볍지도 무겁지도 않은 값. */
    const perPx = (Math.PI * 2) / (window.innerWidth * 0.5);
    drag.y += dx * perPx;
    /* 위아래는 자유롭게 두면 뒤집혀서 무슨 자세인지 알 수 없다 — 70도쯤에서 멈춘다. */
    drag.x = Math.max(-1.2, Math.min(1.2, drag.x + dy * perPx));
    drag.vx = dy * perPx;
    drag.vy = dx * perPx;
  }, []);

  /* 커서 자리를 넘기고, 장면이 풀어 준 자리에 맞는 손 모양을 고른다. 누르고 있는 동안에는
     바꾸지 않는다 — 잡아당기다 손이 볼 밖으로 나갔다고 모양이 바뀌면 뭘 하고 있는지 흔들린다. */
  const onHover = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const touch = useProfileSectionStore.getState().bunnyTouch;
    const ndc = toNdc(e);
    touch.ndcX = ndc.x;
    touch.ndcY = ndc.y;
    touch.over = true;
    const spot = press.current ? press.current.spot : touch.spot || "grab";
    /* 잡고 있는 동안에는 쥔 손으로 — 무엇을 하고 있는지가 손 모양에도 남는다.
       몽이 위에서는 어디든 손이 커서다. 몸통만 트레일 커서로 되돌리면 같은 대상 위에서
       커서가 두 종류로 갈린다. */
    touch.hand = press.current && spot === "pinch" ? "pinching" : spot;
    /* 손은 3D 로 장면 안에 세운다. DOM 커서는 그 자리에서 비켜 준다 — 둘 다 있으면 손이 둘이다. */
    e.currentTarget.dataset.cursor = "blank";
    setTrailHidden(true);
  }, []);

  useEffect(() => () => { delete document.body.dataset.cursor; }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const { bunnyDrag: drag, bunnyTouch: touch } = useProfileSectionStore.getState();
    drag.dragging = false;
    /* 거의 안 움직이고 뗐으면 찌른 것이다. 볼이든 몸이든 상관없다. */
    if (press.current && press.current.moved < TAP_SLOP) {
      touch.grabX = press.current.nx;
      touch.grabY = press.current.ny;
      touch.poke = 1;
    }
    /* 놓으면 볼은 스스로 돌아간다 — 되돌리는 건 FloatingScene 이 용수철로 한다. */
    touch.cheek = 0;
    touch.petting = false;
    /* 손을 떼면 커서가 지금 어디 있는지 알 수 없다. 트레일을 되살려 두고,
       상자 안이면 바로 다음 이동에서 다시 감춘다. */
    if (!e.currentTarget.matches(":hover")) {
      touch.over = false;
      touch.hand = "";
      setTrailHidden(false);
    }
    press.current = null;
    lastPointer.current = null;
    delete e.currentTarget.dataset.dragging;
  }, []);

  const expressions: { key: Expression; labelKey: string; descKey: string }[] = [
    { key: "normal", labelKey: "bunny.exprNormal", descKey: "bunny.exprNormalDesc" },
    { key: "surprised", labelKey: "bunny.exprSurprised", descKey: "bunny.exprSurprisedDesc" },
    { key: "happy", labelKey: "bunny.exprHappy", descKey: "bunny.exprHappyDesc" },
  ];

  return (
    <div className={styles.layout}>
      {/* 몽이가 내려앉는 자리 — 그림은 떠다니는 몽이(FloatingObject)가 대신 그린다.
          비어 있는 상자지만 크기가 곧 몽이의 크기이자 위치다. */}
      <div
        ref={dockRef}
        className={`${styles.dock} ${ac}`}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => { onHover(e); onPointerMove(e); }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          const touch = useProfileSectionStore.getState().bunnyTouch;
          touch.over = false;
          touch.hand = "";
          touch.spot = "";
          setTrailHidden(false);
        }}
        role="presentation"
      />

      {/* Info */}
      <div className={`${styles.info} ${ac}`}>
        <span className={styles.nameLabel}>MEET</span>
        <h3 className={styles.name}>{L(bunny.name)}</h3>
        <span className={styles.subtitle}>{L(bunny.subtitle)}</span>

        <div className={styles.storyBlock}>
          {bunny.stories.map((story, i) => (
            <p key={i} className={styles.storyText}>{L(story)}</p>
          ))}
        </div>

        <div className={styles.exprBar}>
          {expressions.map(({ key, labelKey, descKey }) => (
            <Pressable
              key={key}
              className={`${styles.exprCard} ${expression === key ? styles.exprCardActive : ""}`}
              data-active={expression === key || undefined}
              onClick={() => handleExpression(key)}
            >
              {/* 별은 얼굴만 감싼다. 버튼 전체에 깔면 아래팔의 선이 라벨·설명 위를 가로질러
                  글자가 읽히지 않는다 — 글자는 별 바깥, 아래에 둔다. */}
              <span className={styles.exprIcon}>
                <StarOutline />
                <span className={styles.exprFace}>{FACE_MAP[key]}</span>
              </span>
              <span className={styles.exprLabel}><T k={labelKey} /></span>
              <span className={styles.exprDesc}><T k={descKey} /></span>
            </Pressable>
          ))}
        </div>
      </div>
    </div>
  );
}
