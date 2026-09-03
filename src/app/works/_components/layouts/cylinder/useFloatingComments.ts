"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface WorkComment {
  id: string;
  work_id: string;
  work_title: string;
  nickname: string;
  content: string;
}

/** 3D 프로젝션이 계산해 넘겨주는 slot 0 패널의 뷰포트 % 경계 — 버블이 이 안에서만 논다 */
export interface SlotBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/* ── intro 패널에 떠다니는 최신 작품 댓글 ──
   위치는 state 가 아니라 ref + transform 으로 쓴다. 매 프레임 리렌더를 피하려는 것이고,
   댓글 개수가 바뀔 때만 루프를 다시 건다. 벽 바운스에 더해 패널 가운데 제목 영역을 회피하고,
   아주 가끔 방향을 미세하게 틀어 직선만 타지 않게 한다. */
export function useFloatingComments(slotBoundsRef: RefObject<SlotBounds>) {
  const [recentComments, setRecentComments] = useState<WorkComment[]>([]);
  const bubbleRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const bubblePhysics = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);


  useEffect(() => {
    fetch("/api/work-comments/recent?limit=8")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const comments = (Array.isArray(data) ? data : [])
          .filter((c: { content?: string; is_deleted?: boolean }) => c.content && !c.is_deleted)
          .slice(0, 8)
          .map((c: { id: string; work_id: string; work_title?: string; nickname: string; content: string }) => ({
            id: c.id,
            work_id: c.work_id,
            work_title: c.work_title || "",
            nickname: c.nickname,
            content: c.content.length > 40 ? c.content.slice(0, 40) + "…" : c.content,
          }));
        setRecentComments(comments);
        // 초기 위치: 가장자리 랜덤 (중앙 회피)
        bubblePhysics.current = comments.map((_, i) => {
          // 초기 위치: slot 패널 가장자리 4코너 (px)
          const sb = slotBoundsRef.current;
          const w = window.innerWidth, h = window.innerHeight;
          const wL = sb.left * w / 100 + 20, wR = sb.right * w / 100 - 20;
          const wT = sb.top * h / 100 + 10, wB = sb.bottom * h / 100 - 10;
          const edge = i % 4;
          const x = edge % 2 === 0 ? wL + Math.random() * 60 : wR - Math.random() * 60;
          const y = edge < 2 ? wT + Math.random() * 40 : wB - Math.random() * 40;
          const angle = Math.random() * Math.PI * 2;
          return { x, y, vx: Math.cos(angle) * 0.5, vy: Math.sin(angle) * 0.5 };
        });
      })
      .catch(() => {});
  }, [slotBoundsRef]);

  // 버블 물리 RAF — bunny와 동일 패턴 (velocity + friction + wall bounce + kick)
  useEffect(() => {
    if (recentComments.length === 0) return;
    const SPEED = 0.4; // px/frame — 일정 속도
    let raf = 0;

    const tick = () => {
      const sb = slotBoundsRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const wallL = sb.left * w / 100 + 10;
      const wallR = sb.right * w / 100 - 10;
      const wallT = sb.top * h / 100 + 5;
      const wallB = sb.bottom * h / 100 - 5;
      const pw = wallR - wallL, ph = wallB - wallT;
      const tL = wallL + pw * 0.3, tR = wallL + pw * 0.7;
      const tT = wallT + ph * 0.25, tB = wallT + ph * 0.75;

      const bp = bubblePhysics.current;
      for (let i = 0; i < bp.length; i++) {
        const b = bp[i];
        // 속도 크기 일정하게 유지
        const spd = Math.hypot(b.vx, b.vy) || 1;
        b.vx = (b.vx / spd) * SPEED;
        b.vy = (b.vy / spd) * SPEED;
        b.x += b.vx;
        b.y += b.vy;
        // 벽 바운스 — 방향만 반전
        if (b.x < wallL) { b.x = wallL; b.vx = Math.abs(b.vx); }
        if (b.x > wallR) { b.x = wallR; b.vx = -Math.abs(b.vx); }
        if (b.y < wallT) { b.y = wallT; b.vy = Math.abs(b.vy); }
        if (b.y > wallB) { b.y = wallB; b.vy = -Math.abs(b.vy); }
        // 제목 영역 회피
        if (b.x > tL && b.x < tR && b.y > tT && b.y < tB) {
          const dL = b.x - tL, dR = tR - b.x, dT = b.y - tT, dB = tB - b.y;
          const m = Math.min(dL, dR, dT, dB);
          if (m === dL) { b.x = tL - 1; b.vx = -Math.abs(b.vx); }
          else if (m === dR) { b.x = tR + 1; b.vx = Math.abs(b.vx); }
          else if (m === dT) { b.y = tT - 1; b.vy = -Math.abs(b.vy); }
          else { b.y = tB + 1; b.vy = Math.abs(b.vy); }
        }
        // 아주 가끔 방향 미세 변경 (직선만 타지 않게)
        if (Math.random() < 0.003) {
          const a = (Math.random() - 0.5) * 0.5;
          const cos = Math.cos(a), sin = Math.sin(a);
          const nvx = b.vx * cos - b.vy * sin;
          const nvy = b.vx * sin + b.vy * cos;
          b.vx = nvx;
          b.vy = nvy;
        }
        const el = bubbleRefs.current[i];
        if (el) el.style.transform = `translate(${b.x}px, ${b.y}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [recentComments.length, slotBoundsRef]);

  return { recentComments, bubbleRefs };
}
