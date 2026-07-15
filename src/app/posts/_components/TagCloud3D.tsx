"use client";

import { useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Tags, ChevronRight } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import styles from "./TagCloud3D.module.css";

interface TagItem {
  tag: string;
  count: number;
}

interface TagCloud3DProps {
  tags: TagItem[];
  /** 활성 태그 set — 다중 선택 지원. 단일 사용처는 1개짜리 Set 전달. */
  activeTags?: ReadonlySet<string> | null;
  /** 주어지면 클릭 시 호출(필터링용) — 안 주면 default 로 `/posts/tags/[tag]` 페이지 이동 */
  onTagClick?: (tag: string) => void;
  /** 구 반지름 (px). sidebar 가 좁으니 기본 90 */
  size?: number;
  /** true 면 3D sphere 대신 chip 리스트(개수 명시) 로 렌더 — 필터링 중 결과 태그 표시용. label 헤더는 동일. */
  asChips?: boolean;
}

/** 태그를 구체 표면에 Fibonacci 분포 + rAF 회전. CSS 3D translate3d + scale/opacity 로 depth 표현.
 *  hover 시 자동 회전 일시정지, drag 로 수동 회전. */
export default function TagCloud3D({ tags, activeTags, onTagClick, size = 90, asChips = false }: TagCloud3DProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const velRef = useRef({ yaw: 0.006, pitch: 0.002 });
  const angleRef = useRef({ yaw: 0, pitch: 0 });
  const pausedRef = useRef(false);

  // Fibonacci sphere — 균등 분포
  const points = useMemo(() => {
    const n = tags.length;
    return tags.map((tag, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x0: Math.sin(phi) * Math.cos(theta),
        y0: Math.cos(phi),
        z0: Math.sin(phi) * Math.sin(theta),
        ...tag,
      };
    });
  }, [tags]);

  // count → 폰트 크기 매핑 (10~15px)
  const fontFor = useMemo(() => {
    if (!tags.length) return () => 11;
    const counts = tags.map((t) => t.count);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    return (c: number) => {
      const ratio = max === min ? 0.5 : (c - min) / (max - min);
      return 10 + ratio * 5;
    };
  }, [tags]);

  // rAF rotation loop — DOM 직접 조작 (React re-render 안 함). chip 모드면 sphere 없으니 skip.
  useEffect(() => {
    if (asChips) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 16.67;
      last = now;
      if (!pausedRef.current) {
        angleRef.current.yaw += velRef.current.yaw * dt;
        angleRef.current.pitch += velRef.current.pitch * dt;
      }
      const { yaw, pitch } = angleRef.current;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      for (let i = 0; i < points.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const p = points[i];
        // pitch (X axis) 먼저 → yaw (Y axis)
        const y1 = p.y0 * cp - p.z0 * sp;
        const z1 = p.y0 * sp + p.z0 * cp;
        const x2 = p.x0 * cy + z1 * sy;
        const z2 = -p.x0 * sy + z1 * cy;
        const depth = (z2 + 1) / 2; // 0 (뒷면) ~ 1 (앞면)
        el.style.transform = `translate3d(${x2 * size}px, ${y1 * size}px, 0) translate(-50%, -50%) scale(${0.55 + depth * 0.55})`;
        el.style.opacity = String(0.3 + depth * 0.7);
        el.style.zIndex = String(Math.round(depth * 100));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [points, size, asChips]);

  // hover 정지 + drag 회전. setPointerCapture 쓰면 자식 Link 의 click 이 가로채져서
  // document 레벨에 move/up 등록 (PostsClient series row 와 동일 패턴).
  useEffect(() => {
    if (asChips) return;
    const el = containerRef.current;
    if (!el) return;
    const onEnter = () => { pausedRef.current = true; };
    const onLeave = () => { pausedRef.current = false; };

    // drag 판정 임계값 — 너무 작으면 마우스 jitter 가 drag 로 인식돼 click 이 안 먹힘.
    // 10px Manhattan distance 면 의도적 drag 만 잡힘.
    const DRAG_THRESHOLD = 10;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return; // 좌클릭만
      const startX = e.clientX;
      const startY = e.clientY;
      let lastX = startX;
      let lastY = startY;
      let dragging = false;

      const onMove = (ev: PointerEvent) => {
        const totalMoved = Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY);
        if (!dragging && totalMoved > DRAG_THRESHOLD) {
          dragging = true;
          // 커스텀 커서 시스템 (CursorTrail) 에 drag 모양 신호 — TroubleshootingPanel 패턴
          el.setAttribute("data-cursor", "grab");
        }
        if (dragging) {
          const dx = ev.clientX - lastX;
          const dy = ev.clientY - lastY;
          angleRef.current.yaw += dx * 0.01;
          angleRef.current.pitch += dy * 0.01;
          ev.preventDefault();
        }
        lastX = ev.clientX;
        lastY = ev.clientY;
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        el.removeAttribute("data-cursor");
        // 실제로 drag 가 일어났을 때만 click 1회 차단 — 단순 클릭은 그대로 통과
        if (dragging) {
          const block = (cev: MouseEvent) => {
            cev.stopPropagation();
            cev.preventDefault();
            document.removeEventListener("click", block, true);
          };
          document.addEventListener("click", block, true);
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
    };
  }, [asChips]);

  if (!tags.length) return null;

  return (
    <div className={styles.wrap}>
      <Link href="/posts/tags" className={styles.label}>
        <Tags size={14} aria-hidden />
        <T k="postsPage.tags" tooltip={t("postsPage.tagCloudHint")} />
        <ChevronRight size={14} aria-hidden className={styles.labelArrow} />
      </Link>
      {asChips ? (
        /* 필터링 중 — 결과 태그를 chip + 명시적 개수로. 클릭 시 토글(OR) 필터. */
        <div className={styles.chips}>
          {tags.map((tg) => (
            <button
              key={tg.tag}
              type="button"
              className={`${styles.chip} ${activeTags?.has(tg.tag) ? styles.chipActive : ""}`}
              onClick={() => onTagClick?.(tg.tag)}
              data-clickable="true"
            >
              <span>#{tg.tag}</span>
              <span className={styles.chipCount}>{tg.count}</span>
            </button>
          ))}
        </div>
      ) : (
        <div ref={containerRef} className={styles.sphere} style={{ height: size * 2.2 }}>
          <div className={styles.scene}>
            {points.map((p, i) => (
              <Link
                key={p.tag}
                ref={(el) => { itemRefs.current[i] = el; }}
                href={`/posts/tags/${encodeURIComponent(p.tag)}`}
                onClick={(e) => {
                  // onTagClick 이 명시되면 페이지 이동 막고 호출자에 위임 (필터링 등)
                  if (onTagClick) {
                    e.preventDefault();
                    onTagClick(p.tag);
                  }
                }}
                className={`${styles.tag} ${activeTags?.has(p.tag) ? styles.tagActive : ""}`}
                style={{ fontSize: `${fontFor(p.count)}px` }}
              >
                {p.tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
