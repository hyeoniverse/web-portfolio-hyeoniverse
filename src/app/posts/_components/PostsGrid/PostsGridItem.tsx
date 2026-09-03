"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import type { Post } from "@/types/post";
import type { CardType } from "@/data/postsBentoTemplates";
import PostCard from "../PostCard/PostCard";
import TimelineMotionItem from "../TimelineMotionItem";
import type { PostsLayout } from "./PostsGrid";
import styles from "./PostsGrid.module.css";

/* 그리드 아이템 하나 — 래퍼 클래스(bento wide · featured hero · 시리즈 step · 타임라인 좌/우) + PostCard.
   타임라인이면 월 마커(id `tl-m-<key>` — useTimeline 의 점프·scroll-spy 대상)를 앞에 붙이고 TimelineMotionItem 으로 감싼다. */
export default function PostsGridItem({
  post,
  type,
  postsLayout,
  activeSeries,
  isFeaturedHero,
  stepNumber,
  timelineMarker,
  markerId,
  tlSide,
  tlSingleCol,
  isHot,
  imgError,
  onImgError,
}: {
  post: Post;
  type: CardType;
  postsLayout: PostsLayout;
  activeSeries: boolean;
  isFeaturedHero: boolean;
  /** 시리즈 필터링 시 1-based 두 자리 번호, 아니면 null */
  stepNumber: string | null;
  /** 타임라인에서 월이 바뀌는 첫 카드면 마커 라벨(연. 월), 아니면 null */
  timelineMarker: string | null;
  markerId: string;
  tlSide: "left" | "right";
  tlSingleCol: boolean;
  isHot: boolean;
  imgError: boolean;
  onImgError: (id: string) => void;
}) {
  const cls =
    !activeSeries && (type === "wide" || type === "banner")
      ? styles.gridWide
      : "";
  const isTimeline = !activeSeries && postsLayout === "timeline";
  const tlSideClass = isTimeline
    ? tlSide === "left"
      ? styles.gridItemTlLeft
      : styles.gridItemTlRight
    : "";
  const itemClassName = `${styles.gridItem} ${cls} ${isFeaturedHero ? styles.gridFeaturedHero : ""} ${activeSeries ? styles.seriesStep : ""} ${tlSideClass}`;
  const cardInner = (
    <>
      {stepNumber && (
        <div
          className={styles.seriesStepNumber}
          aria-hidden="true"
        >
          {stepNumber}
        </div>
      )}
      <div
        className={
          activeSeries ? styles.seriesStepBody : ""
        }
      >
        <PostCard
          post={post}
          variant={isFeaturedHero ? "featured" : "standard"}
          layout={activeSeries ? undefined : postsLayout}
          banner={!activeSeries && type === "banner"}
          square={!activeSeries && type === "square"}
          portrait={!activeSeries && type === "portrait"}
          compact={activeSeries}
          isHot={isHot}
          onImgError={onImgError}
          imgError={imgError}
        />
      </div>
    </>
  );
  // 타임라인 리빌은 framer useScroll 로 스크롤 진행에 비례(TimelineMotionItem). 그 외는 plain div.
  const cardEl = isTimeline ? (
    <TimelineMotionItem
      side={tlSide}
      disableX={tlSingleCol}
      className={itemClassName}
    >
      {cardInner}
    </TimelineMotionItem>
  ) : (
    <div className={itemClassName}>
      {cardInner}
    </div>
  );
  return timelineMarker ? (
    <Fragment>
      <motion.div
        id={markerId}
        className={styles.timelineMarker}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -6% 0px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className={styles.timelineMarkerLabel}>{timelineMarker}</span>
      </motion.div>
      {cardEl}
    </Fragment>
  ) : (
    cardEl
  );
}
