"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import gsap from "gsap";
import T from "@/components/ui/T";
import { pickLocalized } from "@/types/common";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import TransitionLink from "@/components/ui/TransitionLink";
import { workHref, type WorksLayoutProps } from "./shared";
import styles from "./CinematicLayout.module.css";

const SETS = 5;
const LERP = 0.06;
const IMG_PARALLAX = 100;
const META_PARALLAX = -80;
const YEAR_PARALLAX = 200;

interface PanelRefs {
  root: HTMLElement;
  image: HTMLDivElement | null;
  meta: HTMLDivElement | null;
  year: HTMLDivElement | null;
}

export default function CinematicLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<PanelRefs[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const { language } = useLanguage();
  const { setInfinite } = useLenis();
  const allProjects = Array(SETS).fill(projects).flat();

  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const panels = panelsRef.current;
    if (panels.length === 0) return;

    const oneSetWidth = track.scrollWidth / SETS;
    const initialX = oneSetWidth * Math.floor(SETS / 2);

    let scrollX = initialX;
    let targetScrollX = initialX;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetScrollX += e.deltaY;
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });

    let rafId = 0;
    const animate = () => {
      scrollX += (targetScrollX - scrollX) * LERP;

      if (oneSetWidth > 0) {
        while (scrollX > oneSetWidth * (SETS - 1)) {
          scrollX -= oneSetWidth;
          targetScrollX -= oneSetWidth;
        }
        while (scrollX < oneSetWidth) {
          scrollX += oneSetWidth;
          targetScrollX += oneSetWidth;
        }
      }

      gsap.set(track, { x: -scrollX });

      const posInSet = ((scrollX % oneSetWidth) + oneSetWidth) % oneSetWidth;
      const p = oneSetWidth > 0 ? posInSet / oneSetWidth : 0;
      setProgress(p);
      setActiveIdx(Math.min(projects.length - 1, Math.floor(p * projects.length)));

      const vw = window.innerWidth;
      const viewCenter = vw / 2;
      for (let i = 0; i < panels.length; i++) {
        const { root, image, meta, year } = panels[i];
        const rect = root.getBoundingClientRect();
        // Cull panels far offscreen
        if (rect.right < -vw || rect.left > vw * 2) continue;

        const offset = (rect.left + rect.width / 2 - viewCenter) / vw;
        if (image) gsap.set(image, { x: offset * IMG_PARALLAX });
        if (meta) {
          gsap.set(meta, {
            x: offset * META_PARALLAX,
            opacity: gsap.utils.clamp(0, 1, 1 - Math.abs(offset) * 1.5),
          });
        }
        if (year) gsap.set(year, { x: offset * YEAR_PARALLAX });
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      wrap.removeEventListener("wheel", onWheel);
    };
  }, [projects.length]);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div ref={trackRef} className={styles.track}>
        {allProjects.map((p, i) => (
          <TransitionLink
            key={`${p.id}-${i}`}
            href={workHref(p)}
            ref={(el: HTMLAnchorElement | null) => {
              if (el) {
                panelsRef.current[i] = {
                  root: el,
                  image: el.querySelector(`.${styles.image}`),
                  meta: el.querySelector(`.${styles.meta}`),
                  year: el.querySelector(`.${styles.yearBig}`),
                };
              }
            }}
            className={styles.panel}
            navigate={(rect) => onProjectClick(p, rect)}
          >
            <div className={styles.image}>
              <MediaThumb src={p.image} alt={pickLocalized(p.title, language)} fill sizes="100vw" priority={i === 0} fallbackSeed={p.id} />
            </div>
            <div className={styles.overlay} />
            <div className={styles.meta}>
              <div className={styles.metaNumber}>{p.number}</div>
              <div className={styles.metaCategory}>
                <T ko={p.category.ko} en={p.category.en} />
              </div>
              <h2 className={styles.metaTitle}><T ko={p.title.ko} en={p.title.en} /></h2>
              <p className={styles.metaSub}>
                <T ko={p.subtitle.ko} en={p.subtitle.en} />
              </p>
              <p className={styles.metaDesc}>
                <T ko={p.description.ko} en={p.description.en} />
              </p>
              <div className={styles.metaTech}>
                {p.tech.slice(0, 4).map((tech: string, j: number) => (
                  <span key={j}>{tech}</span>
                ))}
              </div>
            </div>
            <div className={styles.yearBig}>{p.year}</div>
          </TransitionLink>
        ))}
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={styles.counter}>
        {String(activeIdx + 1).padStart(2, "0")} — {String(projects.length).padStart(2, "0")}
      </div>
    </div>
  );
}
