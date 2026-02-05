"use client";

import React, { useLayoutEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { experiencesData } from "@/data";
import styles from "./ExperienceStack.module.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Constants
const MIN_SCALE = 0.6; // 0.25에서 0.6으로 증가 - 더 큰 최소 크기 유지
const SCROLL_DURATION = 0.6;
const SCRUB_SMOOTHNESS = 0.2;
const RESIZE_DEBOUNCE_MS = 150;

// Types
interface TitleData {
  origFontSize: number;
  origHeight: number;
}

export default function ExperienceStack() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardsRef = useRef<HTMLElement[]>([]);
  const titleDataRef = useRef<TitleData[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollY = useRef<number>(0);

  // Measure natural height without causing layout thrashing
  const measureNaturalHeight = useCallback((el: HTMLElement): number => {
    // Fallback to getBoundingClientRect if offsetWidth is 0
    const width = el.offsetWidth || el.getBoundingClientRect().width || 300;

    const clone = el.cloneNode(true) as HTMLElement;

    // 원본 요소의 계산된 스타일을 가져와서 명시적으로 설정
    const originalStyle = getComputedStyle(el);

    clone.style.cssText = `
      position: absolute;
      visibility: hidden;
      height: auto;
      width: ${width}px;
      font-size: ${originalStyle.fontSize};
      line-height: ${originalStyle.lineHeight};
      font-weight: ${originalStyle.fontWeight};
      font-family: ${originalStyle.fontFamily};
      padding: ${originalStyle.padding};
      margin: 0;
    `;

    document.body.appendChild(clone);
    const height = clone.scrollHeight || clone.offsetHeight || 50;
    document.body.removeChild(clone);
    return Math.max(height, 20); // Minimum height fallback
  }, []);

  // Calculate pinned titles total height up to index
  const getPinnedHeightBefore = useCallback((index: number): number => {
    return titleDataRef.current
      .slice(0, index)
      .reduce((sum, data) => sum + data.origHeight * MIN_SCALE, 0);
  }, []);

  // Title click handler - scrolls to card and fully expands description
  const handleTitleClick = useCallback(
    (id: string, event: React.MouseEvent) => {
      // 클릭 이벤트가 확실히 처리되도록
      event.preventDefault();
      event.stopPropagation();

      const index = experiencesData.findIndex((exp) => exp.id === id);
      if (index === -1) return;

      const card = cardsRef.current[index];
      const content = contentRefs.current[index];

      if (!card) return;

      // Calculate scroll position: card top + offset for pinned titles above
      const cardRect = card.getBoundingClientRect();
      const scrollY = window.scrollY;
      const pinnedOffset = getPinnedHeightBefore(index);

      // Target: card top position, accounting for already-pinned titles
      const targetY = scrollY + cardRect.top - pinnedOffset;

      // Immediately expand the content
      if (content) {
        gsap.set(content, {
          rotateX: 0,
          clipPath: "inset(0% 0% 0% 0%)",
        });
      }

      // Scroll to the card
      gsap.to(window, {
        scrollTo: {
          y: targetY,
          autoKill: false,
        },
        duration: SCROLL_DURATION,
        ease: "power2.out",
        onComplete: () => {
          // Ensure content stays expanded after scroll
          if (content) {
            gsap.set(content, {
              rotateX: 0,
              clipPath: "inset(0% 0% 0% 0%)",
            });
          }
        },
      });
    },
    [getPinnedHeightBefore],
  );

  // Optimized update function using RAF
  const updateAllTitles = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;

      // Skip if scroll position hasn't changed significantly
      if (Math.abs(currentScrollY - lastScrollY.current) < 0.5) {
        rafIdRef.current = null;
        return;
      }
      lastScrollY.current = currentScrollY;

      const titles = titleRefs.current.filter(Boolean) as HTMLElement[];
      const cards = cardsRef.current;
      let offsetY = 0;

      // Batch DOM reads
      const updates: Array<{
        title: HTMLElement;
        top: number;
        height: number;
        fontSize: number;
      }> = [];

      titles.forEach((title, i) => {
        const st = ScrollTrigger.getById(`title-${i}`);
        const card = cards[i];
        const data = titleDataRef.current[i];

        if (!st || !card || !data) {
          updates.push({
            title,
            top: 0,
            height: data?.origHeight ?? 0,
            fontSize: data?.origFontSize ?? 24,
          });
          return;
        }

        const isPast = st.progress >= 1;
        const isActive = st.isActive;

        if (!isActive && !isPast) {
          updates.push({
            title,
            top: 0,
            height: data.origHeight,
            fontSize: data.origFontSize,
          });
          return;
        }

        let scale: number;
        if (isPast) {
          scale = MIN_SCALE;
        } else {
          const scrollSinceStart = st.scroll() - st.start;
          const scaleProgress = gsap.utils.clamp(
            0,
            1,
            scrollSinceStart / card.clientHeight,
          );
          scale = 1 - scaleProgress * (1 - MIN_SCALE);
        }

        const newHeight = data.origHeight * scale;
        const newFontSize = data.origFontSize * scale;

        updates.push({
          title,
          top: offsetY,
          height: newHeight,
          fontSize: newFontSize,
        });

        offsetY += newHeight;
      });

      // Batch DOM writes with proper z-index and click handling
      updates.forEach(({ title, top, height, fontSize }, index) => {
        // z-index를 역순으로 설정하여 위쪽(최근) 타이틀이 항상 클릭 가능하도록
        // 높은 인덱스 = 나중 카드 = 화면 아래쪽 = 낮은 z-index
        // Modal(100), ActionButton(40)보다 낮은 content 레벨(20~30) 사용
        const zIndex = titles.length - index + 20;

        gsap.set(title, {
          top,
          height: height > 0 ? `${height}px` : "auto",
          fontSize: fontSize > 0 ? `${fontSize}px` : "inherit",
          zIndex,
          cursor: "pointer",
          pointerEvents: "auto",
          userSelect: "none", // 텍스트 선택 방지로 클릭 반응성 향상
        });
      });

      rafIdRef.current = null;
    });
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const container = containerRef.current!;
      const cards = Array.from(
        container.querySelectorAll(`.${styles.card}`),
      ) as HTMLElement[];
      const titles = titleRefs.current.filter(Boolean) as HTMLElement[];
      const contents = contentRefs.current.filter(Boolean) as HTMLElement[];

      // Cache cards reference
      cardsRef.current = cards;

      // 초기 타이틀 스타일 설정
      // Modal(100), ActionButton(40)보다 낮은 content 레벨(20~30) 사용
      titles.forEach((title, i) => {
        gsap.set(title, {
          cursor: "pointer",
          pointerEvents: "auto",
          userSelect: "none",
          zIndex: titles.length - i + 20,
        });
      });

      // Batch measure all titles
      titleDataRef.current = titles.map((title) => {
        // GSAP 애니메이션 초기화 - 원래 상태로 리셋
        gsap.set(title, {
          clearProps: "fontSize,height,top",
        });

        // 다음 프레임에서 측정하여 정확한 원본 크기 확보
        const style = getComputedStyle(title);
        return {
          origFontSize: parseFloat(style.fontSize),
          origHeight: measureNaturalHeight(title),
        };
      });

      // Create title ScrollTriggers
      // Title starts pinning when it touches the bottom of pinned titles stack
      titles.forEach((title, i) => {
        const card = cards[i];
        if (!card) return;

        ScrollTrigger.create({
          id: `title-${i}`,
          trigger: title,
          // Start: when title top touches the pinned stack bottom
          start: () => {
            const pinnedStackHeight = getPinnedHeightBefore(i);
            return `top top+=${pinnedStackHeight}`;
          },
          // End: when all remaining cards have scrolled past
          end: () => {
            const remainingCards = cards.slice(i);
            const totalHeight = remainingCards.reduce(
              (sum, c) => sum + c.clientHeight,
              0,
            );
            return `+=${totalHeight}`;
          },
          pin: title,
          pinSpacing: false,
          scrub: SCRUB_SMOOTHNESS,
          onUpdate: updateAllTitles,
          invalidateOnRefresh: true,
        });
      });

      // Create content ScrollTriggers
      // Content starts folding when card top touches the pinned stack bottom
      cards.forEach((card, i) => {
        const content = contents[i];
        if (!content) return;

        // Set initial state
        gsap.set(content, {
          transformOrigin: "bottom",
          rotateX: 0,
          clipPath: "inset(0% 0% 0% 0%)",
          willChange: "transform, clip-path",
        });

        ScrollTrigger.create({
          id: `content-${i}`,
          trigger: card,
          // Start: when card top touches the pinned stack bottom
          start: () => {
            const pinnedStackHeight = getPinnedHeightBefore(i);
            return `top top+=${pinnedStackHeight}`;
          },
          // End: after scrolling through the card height
          end: () => `+=${card.clientHeight}`,
          scrub: SCRUB_SMOOTHNESS,
          fastScrollEnd: true,
          onUpdate: (self) => {
            const progress = gsap.utils.clamp(0, 1, self.progress);

            gsap.set(content, {
              rotateX: -180 * progress,
              clipPath: `inset(${progress * 200}% 0% 0% 0%)`,
            });
          },
          invalidateOnRefresh: true,
        });
      });

      // Initial update
      updateAllTitles();

      // Re-measure function
      const remeasureAll = () => {
        // 모든 타이틀을 원래 상태로 리셋
        titles.forEach((title) => {
          gsap.set(title, {
            clearProps: "fontSize,height,top",
          });
        });

        // 다음 프레임에서 측정
        requestAnimationFrame(() => {
          titles.forEach((title, i) => {
            const style = getComputedStyle(title);
            titleDataRef.current[i] = {
              origFontSize: parseFloat(style.fontSize),
              origHeight: measureNaturalHeight(title),
            };
          });
          ScrollTrigger.refresh();
          updateAllTitles();
        });
      };

      // Debounced resize handler
      let resizeTimeout: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(remeasureAll, RESIZE_DEBOUNCE_MS);
      };

      // ResizeObserver for container size changes
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(remeasureAll, RESIZE_DEBOUNCE_MS);
        });
        resizeObserver.observe(container);
      }

      // Watch for orientation changes
      const onOrientationChange = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(remeasureAll, 300);
      };

      window.addEventListener("resize", onResize, { passive: true });
      window.addEventListener("orientationchange", onOrientationChange);

      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onOrientationChange);
        resizeObserver?.disconnect();
        clearTimeout(resizeTimeout);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }, containerRef);

    return () => ctx.revert();
  }, [measureNaturalHeight, updateAllTitles, getPinnedHeightBefore]);

  return (
    <section className={styles.wrapper} ref={containerRef}>
      {experiencesData.map((exp, i) => (
        <article
          key={exp.id}
          id={exp.id}
          className={`${styles.card} ${i % 2 === 0 ? styles.left : styles.right}`}
        >
          <h2
            data-text={exp.title}
            data-clickable="true"
            className={styles.title}
            ref={(el) => {
              titleRefs.current[i] = el;
            }}
            onClick={(e) => handleTitleClick(exp.id, e)}
            style={{
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {exp.title}
          </h2>

          <div
            className={styles.content}
            ref={(el) => {
              contentRefs.current[i] = el;
            }}
          >
            <div className={styles.meta}>
              <span className={styles.org}>{exp.organization}</span>
              <time className={styles.date}>
                {exp.startDate} — {exp.endDate ?? "Present"}
              </time>
            </div>

            <ul className={styles.description}>
              {exp.description.map((d, idx) => (
                <li key={idx}>{d}</li>
              ))}
            </ul>

            {exp.technologies && exp.technologies.length > 0 && (
              <div className={styles.tech}>
                {exp.technologies.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
