"use client";

import { forwardRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const CoffeeCanvas = dynamic(() => import("./CoffeeCanvas"), { ssr: false });
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import type { UseMagneticReturn } from "@/hooks/useMagnetic";
import { SOCIAL_ICONS } from "./socialIcons";
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
        <div className={styles.decor} aria-hidden="true">
          <div className={styles.decorStage}>
            <CoffeeCanvas />
          </div>
        </div>
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
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    }
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
          {(() => {
            // Prefer socialLinks array; fallback to old social object
            type SocialLink = { platform: string; url: string; label?: string };
            const links: SocialLink[] =
              cfg.socialLinks && cfg.socialLinks.length > 0
                ? (cfg.socialLinks as SocialLink[]).filter((l) => l.url)
                : Object.entries((cfg.social ?? {}) as Record<string, string>)
                    .filter(([, url]) => url)
                    .map(([platform, url]) => ({ platform, url }));
            if (links.length === 0) return null;
            // Generic link icon for unknown platforms
            const GENERIC_PATH =
              "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71";
            return (
              <div className={styles.socialRow}>
                {links.map((link, i) => {
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
                        {icon ? (
                          <svg viewBox="0 0 24 24"><path d={icon.path} /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={GENERIC_PATH} /></svg>
                        )}
                      </a>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </Section>
    );
  },
);

CTASection.displayName = "CTASection";

export default CTASection;
