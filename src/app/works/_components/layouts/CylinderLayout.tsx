"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import IntroBunny from "./CylinderIntroBunny";
import type { WorksLayoutProps } from "./shared";
import styles from "./CylinderLayout.module.css";

/* ── Intro texture — cosmic: nebula wash + stars ── */
function createIntroDataUrl(isDark: boolean): string {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s; c.height = s;
  const ctx = c.getContext("2d")!;

  // Deep space base
  ctx.fillStyle = isDark ? "#000000" : "#000000";
  ctx.fillRect(0, 0, s, s);

  // Nebula wash — accent pink (always on dark base)
  const n1 = ctx.createRadialGradient(s * 0.3, s * 0.35, 0, s * 0.35, s * 0.4, s * 0.5);
  n1.addColorStop(0, "rgba(212,0,99,0.15)");
  n1.addColorStop(0.5, "rgba(212,0,99,0.04)");
  n1.addColorStop(1, "transparent");
  ctx.fillStyle = n1;
  ctx.fillRect(0, 0, s, s);

  // Nebula wash — blue/purple
  const n2 = ctx.createRadialGradient(s * 0.7, s * 0.65, 0, s * 0.65, s * 0.6, s * 0.45);
  n2.addColorStop(0, "rgba(80,40,180,0.12)");
  n2.addColorStop(0.5, "rgba(80,40,180,0.03)");
  n2.addColorStop(1, "transparent");
  ctx.fillStyle = n2;
  ctx.fillRect(0, 0, s, s);

  // Stars (intro is always dark)
  {
    const rng = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 80; i++) {
      const x = rng(i * 7 + 1) * s;
      const y = rng(i * 13 + 3) * s;
      const r = rng(i * 3 + 5) * 1.2 + 0.3;
      const a = rng(i * 11 + 7) * 0.5 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
  }

  return c.toDataURL("image/png");
}

/* ── Constants ── */
const RADIUS = 35;
const PLANE_WIDTH = 46;
const MIN_SEGMENT_ANGLE = Math.PI / 3; // 패널이 적어도 이만큼은 간격
const GAP_RATIO = 0.08;
const LERP_SPEED = 0.06;
const TILT_Z = 0.14;
const MOUSE_X = 0.06;
const MOUSE_Y = 0.04;
const SCROLL_SENSITIVITY = 0.0008;
const SCROLL_CLAMP = 80;
const BACK_THRESHOLD = Math.PI * 0.55;

/* ── Texture loader ── */
function useImageTextures(urls: string[]) {
  const textures = useLoader(THREE.TextureLoader, urls);
  return Array.isArray(textures) ? textures : [textures];
}

/* ── Curved Plane geometry ── */
function makeCurvedPlane(
  angle: number, arc: number, radius: number, width: number, segsV: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segsV; j++) {
    const t = j / segsV;
    const a = angle - arc / 2 + t * arc;
    const y = Math.sin(a) * radius;
    const z = Math.cos(a) * radius;
    positions.push(-width / 2, y, z);
    uvs.push(0, 1 - t);
    positions.push(width / 2, y, z);
    uvs.push(1, 1 - t);
  }

  for (let j = 0; j < segsV; j++) {
    const a = j * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* ── 3D Vertical Cylinder ── */
function VerticalCylinder({ allImages, segAngle, arc, scrollRef, mouseRef, actualRotRef, screenPosRef, dimRef, onMeshHover, onMeshLeave }: {
  allImages: string[];
  segAngle: number;
  arc: number;
  scrollRef: React.RefObject<number>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  actualRotRef: React.MutableRefObject<number>;
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
  dimRef: React.RefObject<number>;
  onMeshHover: (slotIdx: number) => void;
  onMeshLeave: (slotIdx: number) => void;
}) {
  const tiltGroupRef = useRef<THREE.Group>(null);
  const scrollGroupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const { camera } = useThree();
  const textures = useImageTextures(allImages);
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const tiltEuler = useMemo(() => new THREE.Euler(), []);
  const scrollEuler = useMemo(() => new THREE.Euler(), []);


  const count = allImages.length;
  const tiltRef = useRef({ x: 0, y: 0 });
  const initializedRef = useRef(false);

  useFrame(() => {
    if (!tiltGroupRef.current || !scrollGroupRef.current) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      scrollGroupRef.current.rotation.x = Math.PI;
    }

    const s = scrollRef.current ?? 0;
    const m = mouseRef.current ?? { x: 0, y: 0 };
    const isDesktop = window.innerWidth > 1024;

    const targetRotX = s * segAngle * count + Math.PI;
    const sRot = scrollGroupRef.current.rotation;
    sRot.x += (targetRotX - sRot.x) * LERP_SPEED;
    actualRotRef.current = sRot.x;

    const tRot = tiltGroupRef.current.rotation;
    if (isDesktop) {
      tiltRef.current.x += (m.y * MOUSE_Y - tiltRef.current.x) * LERP_SPEED;
      tiltRef.current.y += (m.x * MOUSE_X - tiltRef.current.y) * LERP_SPEED;
      tRot.y = tiltRef.current.y;
      tRot.z = TILT_Z + tiltRef.current.x;
    } else {
      tiltRef.current.x *= 0.9;
      tiltRef.current.y *= 0.9;
      tRot.y = tiltRef.current.y;
      tRot.z = tiltRef.current.x;
    }

    scrollEuler.set(sRot.x, 0, 0);
    tiltEuler.set(0, tRot.y, tRot.z);
    for (let i = 0; i < count; i++) {
      const angle = i * segAngle;
      tempVec.set(0, Math.sin(angle) * RADIUS, Math.cos(angle) * RADIUS);
      tempVec.applyEuler(scrollEuler);
      tempVec.applyEuler(tiltEuler);
      tempVec.project(camera);
      screenPosRef.current[i] = {
        x: tempVec.x * window.innerWidth * 0.5,
        y: -tempVec.y * window.innerHeight * 0.5,
      };
    }

    // hover dimmed — dimRef > 0 이면 해당 slot 어둡게
    // dimRef = meshIdx+1 (mesh hover) 또는 meshIdx+2 (metaItem interactive hover)
    const dimVal = dimRef.current ?? 0;
    const hoveredMeshIdx = dimVal > 0 ? (dimVal <= count ? dimVal - 1 : dimVal - 2) : -1;
    for (let mi = 0; mi < meshRefs.current.length; mi++) {
      const mesh = meshRefs.current[mi];
      if (!mesh?.material) continue;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const targetBright = mi === hoveredMeshIdx ? 0.3 : 1;
      const cur = mat.color.r;
      const next = cur + (targetBright - cur) * 0.12;
      mat.color.setScalar(next);
    }
  });

  const segments = useMemo(() => {
    return textures.map((tex, i) => {
      const angle = i * segAngle;
      const geo = makeCurvedPlane(angle, arc, RADIUS, PLANE_WIDTH, 32);
      tex.colorSpace = THREE.SRGBColorSpace;
      return { geo, tex };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textures.length, segAngle, arc]);

  return (
    <group ref={tiltGroupRef}>
      <group ref={scrollGroupRef}>
        {segments.map(({ geo, tex }, i) => (
          <mesh
            key={i}
            geometry={geo}
            ref={(el) => { if (el) meshRefs.current[i] = el; }}
            onPointerEnter={() => {
              dimRef.current = i + 1;
              onMeshHover(i);
            }}
            onPointerLeave={() => {
              if (dimRef.current === i + 1) dimRef.current = 0;
              onMeshLeave(i);
            }}
          >
            <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── Theme-aware clear color ── */
function TransparentBg() {
  const { gl } = useThree();
  useEffect(() => { gl.setClearColor(0x000000, 0); }, [gl]);
  return null;
}

const BASE_CAM_Z = 9;
const REF_W = 1400;
const REF_H = 800;

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const scale = Math.min(1, size.width / REF_W, size.height / REF_H);
    camera.position.z = BASE_CAM_Z / scale;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}


/* ── Main Layout ── */
export default function CylinderLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const siteConfig = useSiteConfig();
  const { navigateWithTransition } = usePageTransition();
  const w = siteConfig.works;

  // allImages[0] = intro, allImages[1..N] = projects
  const isDark = theme === "dark";
  const introDataUrl = useMemo(() => createIntroDataUrl(isDark), [isDark]);
  const allImages = useMemo(
    () => [introDataUrl, ...projects.map((p) => p.image)],
    [projects, introDataUrl],
  );
  const slotCount = allImages.length;
  const projectImageMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.image])),
    [projects],
  );
  // 겹치지 않도록: max(고정 각도, 360°/슬롯수)
  const segAngle = Math.min(MIN_SEGMENT_ANGLE, (Math.PI * 2) / slotCount);
  const arc = segAngle * (1 - GAP_RATIO);

  const scrollRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const actualRotRef = useRef(Math.PI);
  const screenPosRef = useRef<{ x: number; y: number }[]>(
    Array.from({ length: slotCount }, () => ({ x: 0, y: 0 })),
  );
  const slotRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const overlayRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const activeIdxRef = useRef(0);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const floatingCommentsRef = useRef<HTMLDivElement>(null);
  // slot 0 패널의 뷰포트 % 경계 (3D 프로젝션에서 계산)
  const slotBoundsRef = useRef({ left: 20, top: 15, right: 80, bottom: 85 });
  // metaItem hover 시 실린더 이미지 dimmed (Three.js 내부에서 lerp)
  const hoverDimRef = useRef(0);

  // intro slot에 떠다니는 최신 works 댓글
  const [recentComments, setRecentComments] = useState<
    { id: string; work_id: string; work_title: string; nickname: string; content: string }[]
  >([]);
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
  }, []);

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
  }, [recentComments.length]);

  // Wheel
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const clamped = Math.max(-SCROLL_CLAMP, Math.min(SCROLL_CLAMP, e.deltaY));
      scrollRef.current += clamped * SCROLL_SENSITIVITY;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // Mouse
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
      if (wrapRef.current) {
        wrapRef.current.style.setProperty("--mx", `${e.clientX}px`);
        wrapRef.current.style.setProperty("--my", `${e.clientY}px`);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // rAF — slot visibility + position
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const cylinderRotX = actualRotRef.current;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < slotCount; i++) {
        const slotAngle = i * segAngle;
        let relAngle = -slotAngle + cylinderRotX - Math.PI;
        relAngle = ((relAngle % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

        const absAngle = Math.abs(relAngle);
        const visible = absAngle < BACK_THRESHOLD;
        const pos = screenPosRef.current[i] || { x: 0, y: 0 };

        const el = slotRefs.current.get(i);
        const ov = overlayRefs.current.get(i);
        const reveal = Math.max(0, 1 - absAngle / (BACK_THRESHOLD * 0.35));
        if (el && ov) {
          if (visible) {
            const metaH = el.offsetHeight;
            const ovH = ov.offsetHeight;
            const shift = ovH / 2;
            el.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y - shift}px))`;
            el.style.opacity = "1";
            el.style.visibility = "visible";
            el.style.setProperty("--reveal", reveal.toFixed(3));
            const gap = 32;
            ov.style.transform = `translate(calc(-50% + ${pos.x}px), ${pos.y - shift + metaH / 2 + gap}px)`;
            ov.style.opacity = "1";
            ov.style.visibility = "visible";
            ov.style.setProperty("--reveal", reveal.toFixed(3));
          } else {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.setProperty("--reveal", "0");
            ov.style.opacity = "0";
            ov.style.visibility = "hidden";
            ov.style.setProperty("--reveal", "0");
          }
        } else if (el) {
          if (visible) {
            el.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
            el.style.opacity = "1";
            el.style.visibility = "visible";
            el.style.setProperty("--reveal", reveal.toFixed(3));
          } else {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.setProperty("--reveal", "0");
          }
        }

        if (absAngle < bestDist) {
          bestDist = absAngle;
          bestIdx = i;
        }
      }

      // intro slot 패널의 뷰포트 경계 계산 (bunny와 동일한 3D 프로젝션 기반)
      const slot0 = screenPosRef.current[0] || { x: 0, y: 0 };
      const camZ = 9, fov = 55;
      const panelDist = camZ + RADIUS;
      const halfH = Math.tan((fov * Math.PI) / 360) * panelDist;
      const aspect = window.innerWidth / window.innerHeight;
      const halfW = halfH * aspect;
      const pxPerUnitX = (window.innerWidth * 0.5) / halfW;
      const pxPerUnitY = (window.innerHeight * 0.5) / halfH;
      const panelHalfWpx = (PLANE_WIDTH / 2) * pxPerUnitX;
      const panelHalfHpx = ((arc * RADIUS) / 2) * pxPerUnitY;
      const cx = window.innerWidth / 2 + slot0.x;
      const cy = window.innerHeight / 2 + slot0.y;
      // 곡면 패널 → 실제 가시 영역은 투영의 ~65%
      const shrink = 0.65;
      slotBoundsRef.current = {
        left: ((cx - panelHalfWpx * shrink) / window.innerWidth) * 100,
        top: ((cy - panelHalfHpx * shrink) / window.innerHeight) * 100,
        right: ((cx + panelHalfWpx * shrink) / window.innerWidth) * 100,
        bottom: ((cy + panelHalfHpx * shrink) / window.innerHeight) * 100,
      };

      // intro 일 때만 댓글 버블 보이기
      const fc = floatingCommentsRef.current;
      if (fc) {
        fc.style.visibility = bestIdx === 0 ? "visible" : "hidden";
      }


      if (activeIdxRef.current !== bestIdx) {
        activeIdxRef.current = bestIdx;
        if (indicatorRef.current) {
          const dots = indicatorRef.current.children;
          for (let j = 0; j < dots.length; j++) {
            dots[j].classList.toggle(styles.indicatorDotActive, j === bestIdx);
          }
        }
      }



      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // arc / segAngle 은 slotCount 에서 derive 되므로 deps 에 별도 추가 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotCount]);

  const handleClick = useCallback((projectIdx: number) => {
    const p = projects[projectIdx];
    const slotIdx = projectIdx + 1;
    const el = slotRefs.current.get(slotIdx);
    if (el) onProjectClick(p.id, el.getBoundingClientRect(), p.image);
  }, [projects, onProjectClick]);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [0, 0, 9], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <TransparentBg />
        <ResponsiveCamera />
        <VerticalCylinder
          allImages={allImages}
          segAngle={segAngle}
          arc={arc}
          scrollRef={scrollRef}
          mouseRef={mouseRef}
          actualRotRef={actualRotRef}
          screenPosRef={screenPosRef}
          dimRef={hoverDimRef}
          onMeshHover={(idx) => {
            slotRefs.current.get(idx)?.classList.add(styles.metaItemHovered);
            overlayRefs.current.get(idx)?.classList.add(styles.metaOverlayHovered);
          }}
          onMeshLeave={(idx) => {
            slotRefs.current.get(idx)?.classList.remove(styles.metaItemHovered);
            overlayRefs.current.get(idx)?.classList.remove(styles.metaOverlayHovered);
          }}
        />
        <IntroBunny screenPosRef={screenPosRef} arc={arc} actualRotRef={actualRotRef} />
      </Canvas>

      {/* Slot 0 — Intro (HTML overlay, 3D intro 패널 위에 표시) */}
      <div
        ref={(el) => { if (el) slotRefs.current.set(0, el); }}
        className={styles.introItem}
        style={{ visibility: "hidden", opacity: 0 }}
      >
        <span className={styles.introStars} aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className={styles.introStar} style={{
              left: `${[8,85,22,68,42,90,15,55,75,35,62,5][i]}%`,
              top: `${[12,28,72,55,8,80,45,92,18,65,38,85][i]}%`,
              animationDelay: `${i * 0.4}s`,
              width: `${i % 3 === 0 ? 3 : 2}px`,
              height: `${i % 3 === 0 ? 3 : 2}px`,
            }} />
          ))}
        </span>
        <span className={styles.introOvalOuter} aria-hidden="true" />
        <span className={styles.introOvalInner} aria-hidden="true" />
        <span className={styles.introLabel}><T ko={w.introLabel_ko} en={w.introLabel} /></span>
        <h1 className={styles.introTitle}><T ko={w.introTitle_ko} en={w.introTitle} /></h1>
        <span className={styles.introRule} aria-hidden="true">
          <span className={styles.introRuleLine} />
          <span className={styles.introRuleDot} />
          <span className={styles.introRuleLine} />
        </span>
        <p className={styles.introTagline}><T ko={w.introTagline_ko} en={w.introTagline} /></p>
        <span className={styles.introScroll}>scroll to explore ↓</span>

      </div>

      {/* 떠다니는 최신 댓글 버블 — .wrap 직접 자식 (introItem의 transform 영향 밖) */}
      {recentComments.length > 0 && (
        <div ref={floatingCommentsRef} className={styles.floatingComments} style={{ visibility: "hidden" }} tabIndex={-1}>
          {recentComments.map((c, i) => (
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
      )}

      {/* Slot 1~N — 제목·카테고리만 difference */}
      {projects.map((proj, i) => {
        const slotIndex = i + 1;
        return (
          <div
            key={proj.id}
            ref={(el) => { if (el) slotRefs.current.set(slotIndex, el); }}
            className={styles.metaItem}
            style={{ visibility: "hidden", opacity: 0 }}
          >
            <span className={styles.metaCategory}>
              <T ko={proj.category.ko} en={proj.category.en} />
            </span>
            <h2
              className={styles.metaTitle}
              onClick={() => handleClick(i)}
              data-clickable="true"
              onMouseEnter={() => {
                hoverDimRef.current = i + 2;
                overlayRefs.current.get(i + 1)?.classList.add(styles.metaOverlayHovered);
              }}
              onMouseLeave={() => {
                if (hoverDimRef.current === i + 2) hoverDimRef.current = 0;
                overlayRefs.current.get(i + 1)?.classList.remove(styles.metaOverlayHovered);
              }}
            >
              {proj.title.split(" ").map((word, wi) => (
                <span
                  key={wi}
                  className={styles.metaWord}
                  style={{ "--word-idx": wi } as React.CSSProperties}
                >
                  {word}
                </span>
              ))}
            </h2>
          </div>
        );
      })}

      {/* Slot 1~N — metaDetails + cta (difference 밖, 항상 흰색) */}
      {projects.map((proj, i) => {
        const slotIndex = i + 1;
        const descText = language === "en" && proj.description.en ? proj.description.en : proj.description.ko;
        const descAlt = language === "en" ? proj.description.ko : (proj.description.en || proj.description.ko);
        const words = descText.split(" ");
        const descEnd = words.length * 0.04 + 0.35;
        const detailsDelay = `${descEnd.toFixed(2)}s`;
        const ctaDelay = `${(descEnd + 0.2).toFixed(2)}s`;
        return (
          <div
            key={`ov-${proj.id}`}
            ref={(el) => { if (el) overlayRefs.current.set(slotIndex, el); }}
            className={styles.metaOverlay}
            style={{ visibility: "hidden", opacity: 0 }}
          >
            <Tooltip content={descAlt} delay={600} placement="bottom">
              <p className={styles.metaDesc}>
                {words.map((word, wi) => (
                  <span
                    key={wi}
                    className={styles.metaDescWord}
                    style={{ transitionDelay: `${wi * 0.04}s` }}
                  >
                    {word}&nbsp;
                  </span>
                ))}
              </p>
            </Tooltip>
            <div
              className={styles.metaDetails}
              style={{ transitionDelay: detailsDelay }}
            >
              <span className={styles.metaDetailsRow}>
                {proj.year} — <T ko={proj.category.ko} en={proj.category.en} /> — <T ko={proj.role.ko} en={proj.role.en} />
              </span>
              <span className={styles.metaDetailsMarquee}>
                <span className={styles.metaDetailsTrack}>
                  <span className={styles.metaDetailsContent}>{proj.tech.join(" · ")}</span>
                  <span className={styles.metaDetailsContent} aria-hidden="true">{proj.tech.join(" · ")}</span>
                </span>
              </span>
            </div>
            <div
              className={styles.ctaInline}
              style={{ transitionDelay: ctaDelay }}
              onClick={() => handleClick(i)}
              data-clickable="true"
              onMouseEnter={() => { hoverDimRef.current = i + 2; }}
              onMouseLeave={() => { if (hoverDimRef.current === i + 2) hoverDimRef.current = 0; }}
            >
              <span className={styles.ctaBg} />
              <span className={styles.ctaArrow}>→</span>
            </div>
          </div>
        );
      })}

      {/* Indicator */}
      <div ref={indicatorRef} className={styles.indicator}>
        {Array.from({ length: slotCount }, (_, i) => (
          <div key={i} className={`${styles.indicatorDot} ${i === 0 ? styles.indicatorDotActive : ""}`} />
        ))}
      </div>

      {/* 좌하단 */}
      <div className={styles.fixedInfo}>
        <span className={styles.fixedAvailable}>Available for work</span>
        <span className={styles.fixedDate}>
          {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })} ↗
        </span>
      </div>
    </div>
  );
}
