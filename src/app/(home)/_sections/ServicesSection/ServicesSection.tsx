"use client";

import { forwardRef, useRef, useEffect, useCallback } from "react";
import { motion, MotionValue, useTransform } from "framer-motion";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./ServicesSection.module.css";

interface ServicesSectionProps {
  serviceY0: MotionValue<number>;
  serviceY1: MotionValue<number>;
  serviceY2: MotionValue<number>;
}

// 아이템이 앞선 아이템의 padding 영역으로 파고들 수 있는 최대 overlap (px)
// — 레이아웃 높이는 그대로, 시각적 간격만 이만큼 축소됨
const MAX_OVERLAP = 28;

const ServicesSection = forwardRef<HTMLElement, ServicesSectionProps>(
  ({ serviceY0, serviceY2 }, ref) => {
    const cfg = useSiteConfig();
    const headerRef = useRef<HTMLDivElement>(null);
    const bottomLineRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // 자연 간격: [header→item0, item0→item1, item1→item2, item2→item3]
    const gaps = useRef([0, 0, 0, 0]);
    // item3.bottom → bottomLine.top 간격 (아래 막기용)
    const bottomGap = useRef(0);

    const measure = useCallback(() => {
      const header = headerRef.current;
      const items = itemRefs.current;
      if (!header || !items[0]) return;

      const hb = header.getBoundingClientRect().bottom;
      items.forEach((el, i) => {
        if (!el) return;
        if (i === 0) {
          gaps.current[0] = el.getBoundingClientRect().top - hb;
        } else if (items[i - 1]) {
          gaps.current[i] =
            el.getBoundingClientRect().top -
            items[i - 1]!.getBoundingClientRect().bottom;
        }
      });
      const last = items[items.length - 1];
      const bl = bottomLineRef.current;
      if (last && bl) {
        bottomGap.current =
          bl.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
      }
    }, []);

    useEffect(() => {
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }, [measure]);

    /* ── 충돌 cascade (velocity 비례 overlap, 방향 전환) ── */
    // 위로 스크롤(v<0): item0이 leader → 아래 항목들이 cascade
    // 아래로 스크롤(v>0): item3이 leader → 위 항목들이 cascade
    const getOverlap = (v: number) =>
      Math.min(Math.abs(v) / 25, 1) * MAX_OVERLAP;

    const computeYs = (lead: number, ov: number): number[] => {
      const g = gaps.current;
      // 자연 gap이 0이어도 상/하단 간격이 ov만큼 줄어들도록
      // clamp는 natural gap + ov(오버랩 허용량)로 확장
      const topFloor = -(g[0] + ov);           // item0 최대 상승 지점
      const botCeil = bottomGap.current + ov;  // item3 최대 하강 지점

      if (lead <= 0) {
        // 위 스크롤: item0이 lead로 이동, 최소 -ov(위쪽) 확보
        const y0 = Math.max(topFloor, Math.min(lead, -ov));
        const y1 = y0 - g[1] - ov;
        const y2 = y1 - g[2] - ov;
        const y3 = y2 - g[3] - ov;
        return [y0, y1, y2, y3];
      }
      // 아래 스크롤: item3이 lead로 이동, 최소 +ov(아래쪽) 확보, cascade로 item0까지
      const y3 = Math.min(botCeil, Math.max(lead, ov));
      const y2 = y3 + g[3] + ov;
      const y1 = y2 + g[2] + ov;
      const y0 = y1 + g[1] + ov;
      return [y0, y1, y2, y3];
    };

    const clampedY0 = useTransform(
      [serviceY0, serviceY2],
      ([lead, v]: number[]) => computeYs(lead, getOverlap(v))[0]
    );
    const clampedY1 = useTransform(
      [serviceY0, serviceY2],
      ([lead, v]: number[]) => computeYs(lead, getOverlap(v))[1]
    );
    const clampedY2 = useTransform(
      [serviceY0, serviceY2],
      ([lead, v]: number[]) => computeYs(lead, getOverlap(v))[2]
    );
    const clampedY3 = useTransform(
      [serviceY0, serviceY2],
      ([lead, v]: number[]) => computeYs(lead, getOverlap(v))[3]
    );

    const yTransforms = [clampedY0, clampedY1, clampedY2, clampedY3];

    return (
      <Section className={styles.services} ref={ref}>
        <div className="tw:flex tw:items-center tw:gap-2xl" ref={headerRef}>
          <span className={styles.label}>
            <T ko={cfg.services.label_ko} en={cfg.services.label} />
          </span>
          <div className={`${styles.headerLine} horizontal-rule`} />
        </div>

        <div className="tw:flex tw:flex-col">
          {cfg.services.items.map((service, index) => (
            <motion.div
              key={service.num}
              className={`${styles.item} service-item`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              style={yTransforms[index] ? { y: yTransforms[index] } : undefined}
              whileHover={{ x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`${styles.itemLine} horizontal-rule`} />
              <div className={styles.itemContent}>
                <span className={styles.itemNumber}>{service.num}</span>
                <h2 className={styles.itemTitle}>
                  <T ko={service.title_ko} en={service.title} />
                </h2>
                <span className={styles.itemDescription}>
                  <T ko={service.desc_ko} en={service.desc} />
                </span>
                <motion.div
                  className={styles.itemOval}
                  whileHover={{ scale: 1.2 }}
                />
              </div>
            </motion.div>
          ))}
          <div
            className={`${styles.itemLine} horizontal-rule`}
            ref={bottomLineRef}
          />
        </div>
      </Section>
    );
  }
);

ServicesSection.displayName = "ServicesSection";

export default ServicesSection;
