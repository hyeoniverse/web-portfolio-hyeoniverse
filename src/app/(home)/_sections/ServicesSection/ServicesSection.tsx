"use client";

import { forwardRef } from "react";
import { motion, MotionValue } from "framer-motion";
import Section from "@/components/ui/Section";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./ServicesSection.module.css";

interface ServicesSectionProps {
  serviceY0: MotionValue<number>;
  serviceY1: MotionValue<number>;
  serviceY2: MotionValue<number>;
}

const ServicesSection = forwardRef<HTMLElement, ServicesSectionProps>(
  ({ serviceY0, serviceY1, serviceY2 }, ref) => {
    const { language } = useLanguage();
    const cfg = useSiteConfig();
    const ko = language === "ko";
    const yTransforms = [serviceY0, serviceY1, serviceY2, undefined];

    return (
      <Section className={styles.services} ref={ref}>
        <div className={styles.header}>
          <span className={styles.label}>
            {ko ? cfg.services.label_ko : cfg.services.label}
          </span>
          <div className={`${styles.headerLine} horizontal-rule`} />
        </div>

        <div className={styles.list}>
          {cfg.services.items.map((service, index) => (
            <motion.div
              key={service.num}
              className={`${styles.item} service-item`}
              style={yTransforms[index] ? { y: yTransforms[index] } : undefined}
              whileHover={{ x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`${styles.itemLine} horizontal-rule`} />
              <div className={styles.itemContent}>
                <span className={styles.itemNumber}>{service.num}</span>
                <h2 className={styles.itemTitle}>
                  {ko ? service.title_ko : service.title}
                </h2>
                <span className={styles.itemDescription}>
                  {ko ? service.desc_ko : service.desc}
                </span>
                <motion.div
                  className={styles.itemOval}
                  whileHover={{ scale: 1.2 }}
                />
              </div>
            </motion.div>
          ))}
          <div className={`${styles.itemLine} horizontal-rule`} />
        </div>
      </Section>
    );
  }
);

ServicesSection.displayName = "ServicesSection";

export default ServicesSection;
