"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import type { UseMagneticReturn } from "@/hooks/useMagnetic";
import styles from "./CTASection.module.css";

const SOCIAL_ICONS: Record<string, { label: string; path: string }> = {
  github: {
    label: "GitHub",
    path: "M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z",
  },
  linkedin: {
    label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  blog: {
    label: "Blog",
    path: "M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415a3.3 3.3 0 013.293 3.295A3.303 3.303 0 013.283 24C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z",
  },
  twitter: {
    label: "X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  instagram: {
    label: "Instagram",
    path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z",
  },
  youtube: {
    label: "YouTube",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  behance: {
    label: "Behance",
    path: "M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988H0V5.021h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zM3 11h3.584c2.508 0 2.906-3-.312-3H3v3zm3.391 3H3v3.016h3.341c3.055 0 2.868-3.016.05-3.016z",
  },
  dribbble: {
    label: "Dribbble",
    path: "M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308a10.29 10.29 0 004.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4a10.161 10.161 0 006.29 2.166c1.42 0 2.77-.29 4.006-.816zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702A10.176 10.176 0 0012 1.764c-.825 0-1.63.1-2.4.288zm10.335 3.483c-.218.29-1.91 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z",
  },
};

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
        {/* Decorative elements */}
        <div className={styles.glow} aria-hidden="true" />
        <div className={`${styles.accentLine} ${styles.accentLineLeft}`} aria-hidden="true" />
        <div className={`${styles.accentLine} ${styles.accentLineRight}`} aria-hidden="true" />
        <div className={`${styles.cornerMark} ${styles.cornerTL}`} aria-hidden="true" />
        <div className={`${styles.cornerMark} ${styles.cornerTR}`} aria-hidden="true" />
        <div className={`${styles.cornerMark} ${styles.cornerBL}`} aria-hidden="true" />
        <div className={`${styles.cornerMark} ${styles.cornerBR}`} aria-hidden="true" />

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
            <motion.div
              ref={magnetic.ref}
              className={styles.buttonWrapper}
              style={{ x: magnetic.x, y: magnetic.y }}
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

            {resumeUrl && (
              <motion.div
                ref={resumeMagnetic.ref}
                className={styles.buttonWrapper}
                style={{ x: resumeMagnetic.x, y: resumeMagnetic.y }}
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
