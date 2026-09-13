"use client";

import type { RefObject } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import type { Project } from "@/data/projects";
import { workHref } from "../shared";
import type { WorkComment } from "./useFloatingComments";
import styles from "./CylinderCommentBubbles.module.css";

/* 인트로 위를 떠다니는 최신 작품 댓글.
   .wrap 의 직접 자식이라야 한다 — 인트로 패널 안에 넣으면 그쪽 transform 을 같이 받아
   물리 좌표가 어긋난다. 개별 위치는 useFloatingComments 가 매 프레임 transform 으로 쓴다. */
export default function CylinderCommentBubbles({
  comments,
  bubbleRefs,
  containerRef,
  projectsById,
}: {
  comments: WorkComment[];
  bubbleRefs: RefObject<(HTMLAnchorElement | null)[]>;
  containerRef: RefObject<HTMLDivElement | null>;
  projectsById: Map<string, Project>;
}) {
  if (comments.length === 0) return null;

  return (
    <div ref={containerRef} className={styles.floatingComments} style={{ visibility: "hidden" }} tabIndex={-1}>
      {comments.map((c, i) => {
        const project = projectsById.get(c.work_id);
        // 목록에 없는 작업물이면 id 주소로 — proxy 가 slug 주소로 돌려보낸다
        const href = project ? workHref(project) : `/works/${c.work_id}`;
        return (
          <TransitionLink
            key={c.id}
            href={href}
            image={project?.image || ""}
            ref={(el: HTMLAnchorElement | null) => { bubbleRefs.current[i] = el; }}
            className={styles.floatingBubble}
          >
            <span className={styles.bubbleNick}>{c.work_title || "Work"}</span>
            <span className={styles.bubbleText}>{c.content}</span>
          </TransitionLink>
        );
      })}
    </div>
  );
}
