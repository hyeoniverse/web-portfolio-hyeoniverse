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
import { textUnits } from "../../_utils";
import styles from "./CinematicLayout.module.css";

const SETS = 5;
const LERP = 0.1;
/* 한 번 굴리면 한 판 — 판이 화면을 꽉 채우므로 중간에 멈추면 두 판이 반씩 걸쳐 보인다.
   굴린 양이 이만큼(WHEEL_STEP) 쌓이면 다음 판으로 넘긴다. 한 번 넘긴 뒤에는 그 굴림이 끝날
   때까지(손을 떼도 관성으로 한참 더 들어온다) 흘리고, 손을 떼지 않고 계속 굴리는 동안에는
   HOLD_STEP_MS 마다 한 판씩 넘어간다 */
const WHEEL_STEP = 24;
const WHEEL_REST_MS = 140;
const HOLD_STEP_MS = 700;
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

    /* 판 하나 단위로 걸리게 한다 — 굴린 만큼 그대로 밀면 아무 데서나 멈춰 두 판이 걸쳐 보인다 */
    const panelWidth = () => (projects.length > 0 ? oneSetWidth / projects.length : 0);
    let wheelAccum = 0;
    let lastEventAt = 0;
    let lastStepAt = 0;
    let steppedThisGesture = false;

    const onWheel = (e: WheelEvent) => {
      const w = panelWidth();
      if (w <= 0) return;
      /* 판을 넘기는 건 이 칸이 화면에 딱 물렸을 때뿐이다. 표지에서 내려오는 중에 넘기면
         도착하자마자 한 판이 지나가 있다 */
      const top = wrap.getBoundingClientRect().top;
      if (Math.abs(top) > 4) return;
      const now = performance.now();
      // 한동안 조용했으면 새로 굴리기 시작한 것으로 본다
      if (now - lastEventAt > WHEEL_REST_MS) {
        steppedThisGesture = false;
        wheelAccum = 0;
      }
      lastEventAt = now;
      /* 첫 판에서 위로 굴리면 표지로 돌아간다 — 붙잡아 두면 표지로 나갈 길이 없다.
         방금 이 굴림으로 첫 판에 온 것이라면 놓아주지 않는다 — 한 번 굴렸는데 판도 넘어가고
         표지까지 끌려 올라온다. 놓아줄 때는 preventDefault·stopPropagation 을 하지 않아야
         Lenis 가 그 휠을 받는다 */
      const setIdx = ((Math.round(targetScrollX / w) % projects.length) + projects.length) % projects.length;
      if (e.deltaY < 0 && setIdx === 0 && !steppedThisGesture) return;
      /* 여기서부터는 세로 페이지 스크롤에 넘기지 않는다 — Lenis 는 window 에서 듣기 때문에
         preventDefault 만으로는 안 막히고 전파를 끊어야 한다 */
      e.preventDefault();
      e.stopPropagation();
      // 이번 굴림에서 이미 한 판 넘겼다면 관성은 흘린다. 계속 굴리고 있을 때만 다음 판으로 간다
      if (steppedThisGesture && now - lastStepAt < HOLD_STEP_MS) return;
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < WHEEL_STEP) return;
      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      steppedThisGesture = true;
      lastStepAt = now;
      targetScrollX = (Math.round(targetScrollX / w) + dir) * w;
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
      /* 세는 자리는 지금 가고 있는 판을 가리킨다 — 흘러가는 위치로 세면 다 도착할 때까지
         이전 판 번호가 남는다(감속이 점근이라 마지막 한 픽셀이 오래 걸린다) */
      const pw = panelWidth();
      if (pw > 0) {
        const idx = ((Math.round(targetScrollX / pw) % projects.length) + projects.length) % projects.length;
        setActiveIdx(idx);
      }

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
            {/* 제목 길이를 글자 크기 계산에 넘긴다 — 두 언어 중 긴 쪽을 기준으로 잡아 언어를
                바꿀 때 크기가 뛰지 않게 한다 */}
            <div
              className={styles.meta}
              style={{
                ["--title-units" as string]: String(
                  Math.max(8, textUnits(p.title.ko), textUnits(p.title.en)),
                ),
              }}
            >
              <div className={styles.metaNumber}>{p.number}</div>
              <div className={styles.metaCategory}>
                <T ko={p.category.ko} en={p.category.en} />
              </div>
              <h2 className={styles.metaTitle}><T ko={p.title.ko} en={p.title.en} /></h2>
              <p className={styles.metaSub}>
                <T ko={p.subtitle.ko} en={p.subtitle.en} />
              </p>
              {/* 설명이 없으면 상자째 빼놓는다 — 이 상자는 배경·여백을 갖고 있어 글이 없으면
                  빈 띠만 남는다(저장소로 채운 목록은 설명이 비어 있는 것이 많다) */}
              {(p.description.ko || p.description.en) && (
                <p className={styles.metaDesc}>
                  <T ko={p.description.ko} en={p.description.en} />
                </p>
              )}
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
