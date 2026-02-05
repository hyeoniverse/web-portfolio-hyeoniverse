"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import styles from "./TimelineSlider.module.css";
import { experiencesData } from "@/data";
import { EditorialHeader } from "@/components/common/EditorialHeader";
import { EditorialFooter } from "@/components/common/EditorialFooter";
import { ExperienceCard } from "./ExperienceCard";
import { Experience } from "@/types";
import { getYear } from "@/utils";

export function TimelineSlider() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const gapRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current || !pageContainerRef.current) return;

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    const container = containerRef.current;
    const page = pageContainerRef.current;

    gapRef.current = parseFloat(getComputedStyle(page).gap) || 0;
    const gap = gapRef.current;

    const getTotalWidth = () => {
      if (!pageContainerRef.current || !containerRef.current) return 0;
      const visibleWidth = containerRef.current.clientWidth;
      return pageContainerRef.current.scrollWidth - visibleWidth + gap;
    };

    const st = ScrollTrigger.create({
      id: "timeline-slider",
      trigger: container,
      pin: true,
      scrub: 1,
      start: "top top",
      end: () => `+=${getTotalWidth()}`,
      invalidateOnRefresh: true,
      animation: gsap.fromTo(
        page,
        { x: 0 },
        { x: () => -getTotalWidth(), ease: "none" }
      ),
    });

    const handleResize = () => {
      st.refresh();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      st.kill();
    };
  }, []);

  // experiencesData를 시간순으로 정렬: endDate 우선, 없으면 startDate 기준으로 정렬
  const sortedData = [...experiencesData].sort((a, b) => {
    const dateA = new Date(a.endDate || a.startDate || "2000-01-01").getTime();
    const dateB = new Date(b.endDate || b.startDate || "2000-01-01").getTime();
    return dateB - dateA; // 최신 → 과거
  });

  let prevYear: string | null = null;

  return (
    <div ref={containerRef} className={styles.container}>
      {/* 상단 헤더 */}
      <EditorialHeader
        inView={true}
        leftContent={<span className={styles.sectionLabel}>Timeline</span>}
        centerContent={
          <span className={styles.title}>・・・✦ Life & Work ✦・・・</span>
        }
        rightContent={
          <span className={styles.totalCount}>
            {sortedData.length.toString().padStart(2, "0")} Entries
          </span>
        }
      />

      {/* 가로 스크롤 타임라인 */}
      <div ref={pageContainerRef} className={styles.pageContainer}>
        {sortedData.map((item: Experience, idx: number) => {
          const year = getYear(item.startDate, item.endDate);
          const showDivider = year !== prevYear;
          prevYear = year;

          return (
            <div key={item.id} className={styles.itemWrapper}>
              <div className={styles.yearDivider}>
                {showDivider && (
                  <span className={`${styles.yearLabel}`}>{year}</span>
                )}
              </div>

              <div className={styles.cardWrapper}>
                <ExperienceCard experience={item} index={idx} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 푸터 */}
      <EditorialFooter
        leftContent={
          <span className={styles.pageNumber}>
            Timeline covering {sortedData[0]?.startDate} —{" "}
            {sortedData[sortedData.length - 1]?.endDate}
          </span>
        }
        rightContent={
          <div className={styles.scrollHint}>
            Scroll to Explore
            <div className={`bounce-x`}>→</div>
          </div>
        }
      />
    </div>
  );
}
