"use client";

import type { RefObject } from "react";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import type { WorkComment } from "./useFloatingComments";
import styles from "./CylinderCommentBubbles.module.css";

/* 인트로 위를 떠다니는 최신 작품 댓글.
   .wrap 의 직접 자식이라야 한다 — 인트로 패널 안에 넣으면 그쪽 transform 을 같이 받아
   물리 좌표가 어긋난다. 개별 위치는 useFloatingComments 가 매 프레임 transform 으로 쓴다. */
export default function CylinderCommentBubbles({
  comments,
  bubbleRefs,
  containerRef,
  projectImageMap,
}: {
  comments: WorkComment[];
  bubbleRefs: RefObject<(HTMLAnchorElement | null)[]>;
  containerRef: RefObject<HTMLDivElement | null>;
  projectImageMap: Map<string, string>;
}) {
  const { navigateWithTransition } = usePageTransition();
  if (comments.length === 0) return null;

  return (
    <div ref={containerRef} className={styles.floatingComments} style={{ visibility: "hidden" }} tabIndex={-1}>
      {comments.map((c, i) => (
        <div
          key={c.id}
          ref={(el) => { bubbleRefs.current[i] = el as HTMLAnchorElement | null; }}
          className={styles.floatingBubble}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            const img = projectImageMap.get(c.work_id) || "";
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            navigateWithTransition(`/works/${c.work_id}`, img, rect);
          }}
        >
          <span className={styles.bubbleNick}>{c.work_title || "Work"}</span>
          <span className={styles.bubbleText}>{c.content}</span>
        </div>
      ))}
    </div>
  );
}
