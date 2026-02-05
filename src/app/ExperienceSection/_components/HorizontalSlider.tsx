"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import styles from "./HorizontalSlider.module.css";
import Button from "@/components/ui/Button";
import { experiencesData } from "@/data";
import { SectionHeader } from "./SectionHeader";
import { ExperienceCard } from "./ExperienceCard";
import { fadeInLeft } from "@/animations";
import { EditorialHeader } from "@/components/common/EditorialHeader";
import { EditorialFooter } from "@/components/common/EditorialFooter";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Experience } from "@/types";

interface HorizontalSectionProps {
  title: string;
  data: typeof experiencesData;
  label: string;
  description: string;
  date: string;
  location: string;
  number: string;
}

const HorizontalSection = ({
  title,
  data,
  label,
  description,
  date,
  location,
  number,
}: HorizontalSectionProps) => {
  return (
    <div className={styles.section}>
      <div className="grid-background" />
      <EditorialHeader
        inView={true}
        leftContent={
          <>
            <span className={styles.sectionLabel}>{label}</span>
            <span className={styles.separator}>•</span>
            <span className={styles.totalCount}>
              {data.length.toString().padStart(2, "0")} Entries
            </span>
          </>
        }
        centerContent={
          <span
            className={styles.title}
          >{`・・・✦ ${description} ✦・・・`}</span>
        }
        rightContent={
          <>
            <span className={styles.date}>{date}</span>
            <span className={styles.location}>{location}</span>
          </>
        }
      />
      <SectionHeader
        variants={fadeInLeft}
        number={number}
        title={title}
        count={data.length}
      />
      <div className={styles.cardsContainer}>
        {data.map((item: Experience, index: number) => (
          <ExperienceCard key={item.id} experience={item} index={index} />
        ))}
      </div>
      <EditorialFooter
        leftContent={
          <span className={styles.pageNumber}>{`Page ${number} of 03`}</span>
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
};

const sectionKeys = ["education", "activity", "achievements"] as const;

export function HorizontalSlider() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<HTMLDivElement[]>([]);
  const gapRef = useRef(0);
  const [activeSection, setActiveSection] = useState<
    "education" | "activity" | "achievements"
  >("education");

  const sectionTitles = [
    "Education & Certifications",
    "Team work & Activities",
    "Awards & Recognition",
  ];
  const sectionData = [
    experiencesData.filter((exp: Experience) => exp.type === "education"),
    experiencesData.filter((exp: Experience) => exp.type === "activity"),
    experiencesData.filter((exp: Experience) => exp.type === "achievement"),
  ];
  const sectionLabels = [
    "Learning Path",
    "Academic Foundation",
    "Recognition & Growth",
  ];
  const sectionDescription = [
    "Grow through learning", // Education & Certifications
    "Collaborate & create", // Team work & Activities
    "Prove your impact", // Awards & Recognition
  ];
  const sectionDates = ["2020 — Current", "2023 — Current", "2022, 2023"];
  const sectionLocations = ["Seoul, KR", "Seoul, KR", "Seoul, KR"];

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
      id: "experience-slider",
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
      onUpdate: (self) => {
        const progressX = self.progress * getTotalWidth();
        let idx = sectionsRef.current.findIndex(
          (sec) => progressX < sec.offsetLeft + sec.offsetWidth / 2
        );
        if (idx === -1) idx = sectionsRef.current.length - 1;
        setActiveSection(sectionKeys[idx]);
      },
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

  const scrollToSection = (index: number) => {
    const st = ScrollTrigger.getById("experience-slider");
    if (
      !st ||
      sectionsRef.current.length === 0 ||
      !sectionsRef.current[index] ||
      !containerRef.current ||
      !pageContainerRef.current
    )
      return;

    const totalWidth = (() => {
      const visibleWidth = containerRef.current.clientWidth;
      return (
        pageContainerRef.current.scrollWidth - visibleWidth + gapRef.current
      );
    })();

    if (totalWidth === 0) return;

    const targetX = sectionsRef.current[index].offsetLeft;
    const progress = targetX / totalWidth;
    const scrollPos = st.start + progress * (st.end - st.start);

    gsap.to(window, {
      scrollTo: scrollPos,
      duration: 1,
      ease: "power2.inOut",
    });
  };

  const { isMobile } = useIsMobile();

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.sectionIndicator}>
        {sectionKeys.map((key, idx) => (
          <Button
            key={key}
            style="outline"
            active={activeSection === key}
            onClick={() => scrollToSection(idx)}
          >
            {isMobile ? idx + 1 : sectionTitles[idx]}
          </Button>
        ))}
      </div>

      <div ref={pageContainerRef} className={styles.pageContainer}>
        {sectionData.map((data, idx) => (
          <div
            key={idx}
            ref={(el: HTMLDivElement | null) => {
              if (el) sectionsRef.current[idx] = el;
            }}
            className={styles.sectionWrapper}
          >
            <HorizontalSection
              title={sectionTitles[idx]}
              data={data}
              label={sectionLabels[idx]}
              description={sectionDescription[idx]}
              date={sectionDates[idx]}
              location={sectionLocations[idx]}
              number={String(idx + 1).padStart(2, "0")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
