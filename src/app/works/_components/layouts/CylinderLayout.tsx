"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
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
function VerticalCylinder({ allImages, segAngle, arc, scrollRef, mouseRef, actualRotRef, screenPosRef }: {
  allImages: string[];
  segAngle: number;
  arc: number;
  scrollRef: React.RefObject<number>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  actualRotRef: React.MutableRefObject<number>;
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
}) {
  const tiltGroupRef = useRef<THREE.Group>(null);
  const scrollGroupRef = useRef<THREE.Group>(null);
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

    const targetRotX = s * segAngle * count + Math.PI;
    const sRot = scrollGroupRef.current.rotation;
    sRot.x += (targetRotX - sRot.x) * LERP_SPEED;
    actualRotRef.current = sRot.x;

    tiltRef.current.x += (m.y * MOUSE_Y - tiltRef.current.x) * LERP_SPEED;
    tiltRef.current.y += (m.x * MOUSE_X - tiltRef.current.y) * LERP_SPEED;
    const tRot = tiltGroupRef.current.rotation;
    tRot.y = tiltRef.current.y;
    tRot.z = TILT_Z + tiltRef.current.x;

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
          <mesh key={i} geometry={geo}>
            <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── Theme-aware clear color ── */
function ClearColor({ color }: { color: string }) {
  const { gl } = useThree();
  useEffect(() => { gl.setClearColor(color, 1); }, [gl, color]);
  return null;
}


/* ── Main Layout ── */
export default function CylinderLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const siteConfig = useSiteConfig();
  const w = siteConfig.works;
  const clearColor = theme === "dark" ? "#0a0810" : "#fdf5ea";

  // allImages[0] = intro, allImages[1..N] = projects
  const isDark = theme === "dark";
  const introDataUrl = useMemo(() => createIntroDataUrl(isDark), [isDark]);
  const allImages = useMemo(
    () => [introDataUrl, ...projects.map((p) => p.image)],
    [projects, introDataUrl],
  );
  const slotCount = allImages.length;
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
  const activeIdxRef = useRef(0);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
        if (el) {
          if (visible) {
            el.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
            el.style.opacity = "1";
            el.style.display = "";
          } else {
            el.style.opacity = "0";
            el.style.display = "none";
          }
        }

        if (absAngle < bestDist) {
          bestDist = absAngle;
          bestIdx = i;
        }
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
  }, [slotCount]);

  const handleClick = useCallback((projectIdx: number) => {
    const p = projects[projectIdx];
    const slotIdx = projectIdx + 1;
    const el = slotRefs.current.get(slotIdx);
    if (el) onProjectClick(p.id, el.getBoundingClientRect(), p.image);
  }, [projects, onProjectClick]);

  return (
    <div ref={wrapRef} className={styles.wrap} style={{ "--_bg": clearColor } as React.CSSProperties}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [0, 0, 9], fov: 55 }}
        gl={{ antialias: true }}
      >
        <ClearColor color={clearColor} />
        <VerticalCylinder
          allImages={allImages}
          segAngle={segAngle}
          arc={arc}
          scrollRef={scrollRef}
          mouseRef={mouseRef}
          actualRotRef={actualRotRef}
          screenPosRef={screenPosRef}
        />
        <IntroBunny screenPosRef={screenPosRef} arc={arc} actualRotRef={actualRotRef} />
      </Canvas>

      {/* Slot 0 — Intro (HTML overlay, 3D intro 패널 위에 표시) */}
      <div
        ref={(el) => { if (el) slotRefs.current.set(0, el); }}
        className={styles.introItem}
        style={{ display: "none", opacity: 0 }}
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

      {/* Slot 1~N — Project meta */}
      {projects.map((proj, i) => {
        const slotIndex = i + 1;
        return (
          <div
            key={proj.id}
            ref={(el) => { if (el) slotRefs.current.set(slotIndex, el); }}
            className={`${styles.metaItem} ${styles.metaItemEnter}`}
            style={{ display: "none", opacity: 0 }}
          >
            <span className={styles.metaCategory}>
              <T ko={proj.category.ko} en={proj.category.en} />
            </span>
            <h2 className={styles.metaTitle} onClick={() => handleClick(i)}>
              {proj.title.split(" ").map((word, wi) => (
                <span
                  key={wi}
                  className={styles.metaWord}
                  style={{ animationDelay: `${wi * 0.08}s` }}
                >
                  {word}
                </span>
              ))}
            </h2>
            {(() => {
              const descText = language === "en" && proj.description.en ? proj.description.en : proj.description.ko;
              const words = descText.split(" ");
              const descEnd = words.length * 0.04 + 0.35;
              const detailsDelay = `${descEnd.toFixed(2)}s`;
              const ctaDelay = `${(descEnd + 0.2).toFixed(2)}s`;
              return (
                <>
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
                  <div
                    className={styles.metaDetails}
                    style={{ transitionDelay: detailsDelay }}
                  >
                    <span>{proj.year}</span>
                    <span className={styles.metaDot} />
                    <span><T ko={proj.role.ko} en={proj.role.en} /></span>
                    <span className={styles.metaDot} />
                    <span>{proj.tech.slice(0, 3).join(" · ")}</span>
                  </div>
                  <div
                    className={styles.ctaInline}
                    style={{ transitionDelay: ctaDelay }}
                    onClick={() => handleClick(i)}
                  >
                    <span className={styles.ctaBg} />
                    <span className={styles.ctaArrow}>→</span>
                  </div>
                </>
              );
            })()}
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
