"use client";

import { forwardRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

const CoffeeCanvas = dynamic(() => import("./CoffeeCanvas"), { ssr: false });
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import type { UseMagneticReturn } from "@/hooks/useMagnetic";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import styles from "./CTASection.module.css";

interface CTASectionProps {
  magnetic: UseMagneticReturn;
  resumeMagnetic: UseMagneticReturn;
  onContactClick: () => void;
}

const CTASection = forwardRef<HTMLElement, CTASectionProps>(
  ({ magnetic, resumeMagnetic, onContactClick }, ref) => {
    const { t, language } = useLanguage();
    const cfg = useSiteConfig();
    const resumeUrl = cfg.cta.resumeUrl;

    /** 번역 + 설명을 한 말풍선에 통합 */
    const combinedTooltip = (label: string, ko: string, en: string) => {
      const text = language === "ko" ? ko : en;
      const alt = language === "ko" ? en : ko;
      const langLabel = language === "ko" ? "EN" : "KO";
      const hasTranslation = alt !== text;
      return hasTranslation
        ? <><div>{langLabel} {alt}</div><div>{label}</div></>
        : label;
    };

    return (
      <Section fullHeight center className={styles.cta} ref={ref}>
        {cfg.home3d.coffeeCup && (
          <div className={styles.decor} aria-hidden="true">
            <div className={styles.decorStage}>
              <CoffeeCanvas />
            </div>
          </div>
        )}
        <div className={styles.content}>
          <p className={`${styles.label} reveal-text`}>
            <T ko={cfg.cta.label_ko} en={cfg.cta.label} />
          </p>
          <h2 className={styles.title}>
            <span className={`${styles.titleLine} reveal-text`}>
              <T ko={cfg.cta.title_ko[0]} en={cfg.cta.title[0]} />
            </span>
            <span className={`${styles.titleLine} reveal-text`}>
              <T ko={cfg.cta.title_ko[1]} en={cfg.cta.title[1]} />
            </span>
          </h2>

          <div className={styles.buttonGroup}>
            <div className={styles.buttonWrapper}>
            <motion.div
              ref={magnetic.ref}
              className={styles.magneticInner}
              style={{ left: magnetic.x, top: magnetic.y }}
              onMouseMove={magnetic.handleMouseMove}
              onMouseLeave={magnetic.handleMouseLeave}
            >
              <Tooltip content={combinedTooltip(t("tooltip.contact"), cfg.cta.buttonText_ko, cfg.cta.buttonText)} placement="bottom" wrapperStyle={{ display: "block" }}>
                <Button
                  variant="outline"
                  size="xl"
                  className={styles.ctaBtn}
                  onClick={onContactClick}
                  soundDisabled
                  icon={
                    <motion.span
                      className={styles.buttonIndicator}
                      whileHover={{ scale: 1.5 }}
                    />
                  }
                  iconPosition="right"
                >
                  <T ko={cfg.cta.buttonText_ko} en={cfg.cta.buttonText} noTooltip />
                </Button>
              </Tooltip>
            </motion.div>
            </div>

            {resumeUrl && (
              <div className={styles.buttonWrapper}>
              <motion.div
                ref={resumeMagnetic.ref}
                className={styles.magneticInner}
                style={{ left: resumeMagnetic.x, top: resumeMagnetic.y }}
                onMouseMove={resumeMagnetic.handleMouseMove}
                onMouseLeave={resumeMagnetic.handleMouseLeave}
              >
                <Tooltip content={combinedTooltip(t("tooltip.resume"), cfg.cta.resumeButtonText_ko, cfg.cta.resumeButtonText)} placement="bottom" wrapperStyle={{ display: "block" }}>
                  <Button
                    variant="outline"
                    size="xl"
                    className={styles.resumeBtn}
                    href={resumeUrl}
                    external
                    download
                    soundDisabled
                    icon={<Download size={16} />}
                    iconPosition="right"
                  >
                    <T ko={cfg.cta.resumeButtonText_ko} en={cfg.cta.resumeButtonText} noTooltip />
                  </Button>
                </Tooltip>
              </motion.div>
              </div>
            )}
          </div>

          {/* Social Links — driven by cfg.socialLinks (admin settings) */}
          {cfg.socialLinks && cfg.socialLinks.filter((l) => l.url).length > 0 && (
            <div className={styles.socialRow}>
              {cfg.socialLinks.filter((l) => l.url).map((link, i) => {
                const icon = SOCIAL_ICONS[link.platform];
                const label = icon?.label ?? link.label ?? link.platform;
                return (
                  <Tooltip key={`${link.platform}-${i}`} content={label} placement="bottom">
                    <a
                      className={styles.socialLink}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      {link.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={link.icon} alt="" />
                      ) : icon?.stroke ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon.path} /></svg>
                      ) : icon ? (
                        <svg viewBox="0 0 24 24"><path d={icon.path} /></svg>
                      ) : null}
                    </a>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>

      </Section>
    );
  },
);

CTASection.displayName = "CTASection";

export default CTASection;
