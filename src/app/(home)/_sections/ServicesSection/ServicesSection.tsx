"use client";

import { forwardRef } from "react";
import { motion, MotionValue } from "framer-motion";
import { services } from "@/data/services";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./ServicesSection.module.css";

interface ServicesSectionProps {
  serviceY0: MotionValue<number>;
  serviceY1: MotionValue<number>;
  serviceY2: MotionValue<number>;
}

const ServicesSection = forwardRef<HTMLElement, ServicesSectionProps>(
  ({ serviceY0, serviceY1, serviceY2 }, ref) => {
    const { t } = useLanguage();
    const yTransforms = [serviceY0, serviceY1, serviceY2, undefined];

    return (
      <section className={styles.services} ref={ref}>
        <div className={styles.header}>
          <span className={styles.label}>{t("services.label")}</span>
          <div className={`${styles.headerLine} horizontal-rule`} />
        </div>

        <div className={styles.list}>
          {services.map((service, index) => (
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
                  {t(`services.${service.key}.title`)}
                </h2>
                <span className={styles.itemDescription}>
                  {t(`services.${service.key}.desc`)}
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
      </section>
    );
  }
);

ServicesSection.displayName = "ServicesSection";

export default ServicesSection;
