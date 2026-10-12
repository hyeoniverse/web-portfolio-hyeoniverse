"use client";

import { useCallback, type ReactNode } from "react";
import T from "@/components/ui/T";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BunnyProfile } from "@/types/profile";
import styles from "./BunnyShowcase.module.css";
import Pressable from "@/components/ui/Pressable";
import BunnyDock from "./BunnyDock";


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

export default function BunnyShowcasePanel({ animateClass, bunny }: Props) {
  /* 표정은 스토어 하나에서 관리한다. 무한 스크롤에서 이 패널이 여러 벌 그려지는데
     각자 상태를 들고 있으면 서로 다른 표정을 몽이에게 밀어 넣어 깜빡인다.
     자동 로테이션도 여기가 아니라 ProfileMeSection 에서 한 번만 돈다. */
  const expression = useProfileSectionStore((st) => st.bunnyExpression) ?? "normal";
  const { language, tx } = useLanguage();
  /* 다른 언어로 볼 때는 영어 칸을 사이트 내용 글 번역(tx)으로 */
  const L = (t: { ko: string; en: string }) => (language === "ko" ? t.ko || t.en : tx(t.en || t.ko));
  const ac = animateClass ?? "";

  const handleExpression = useCallback((expr: Expression) => {
    useProfileSectionStore.getState().setBunnyExpression(expr);
  }, []);

  const expressions: { key: Expression; labelKey: string; descKey: string }[] = [
    { key: "normal", labelKey: "bunny.exprNormal", descKey: "bunny.exprNormalDesc" },
    { key: "surprised", labelKey: "bunny.exprSurprised", descKey: "bunny.exprSurprisedDesc" },
    { key: "happy", labelKey: "bunny.exprHappy", descKey: "bunny.exprHappyDesc" },
  ];

  return (
    <div className={styles.layout}>
      {/* 몽이가 내려앉는 자리 — 입력 처리까지 BunnyDock 이 맡는다 */}
      <BunnyDock className={`${styles.dock} ${ac}`} />

      {/* Info */}
      <div className={`${styles.info} ${ac}`}>
        <span className={styles.nameLabel}>MEET</span>
        <h2 className={styles.name}>{L(bunny.name)}</h2>
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
