"use client";

import { motion } from "framer-motion";
import { siteConfig } from "@/config/site.config";
import OptimizedImage from "@/components/ui/OptimizedImage";
import styles from "./ContactDrawer.module.css";

interface ContactInfoCardsProps {
  t: (key: string) => string;
  copied: boolean;
  setCopied: (value: boolean) => void;
}

const cardInitial = { opacity: 0, scale: 0.95 };
const cardAnimate = {
  opacity: 1,
  scale: 1,
  transition: { duration: 0.4, delay: 0.35, ease: "easeOut" as const },
};
const cardExit = {
  opacity: 0,
  scale: 0.95,
  transition: { duration: 0.25, ease: "easeIn" as const },
};

const contentInitial = { opacity: 0, y: 10 };
const contentAnimate = {
  opacity: 1,
  y: 0,
  transition: { duration: 0.4, delay: 0.55, ease: "easeOut" as const },
};
const contentExit = {
  opacity: 0,
  transition: { duration: 0.15, delay: 0.4 },
};

export default function ContactInfoCards({
  t,
  copied,
  setCopied,
}: ContactInfoCardsProps) {
  return (
    <div className={styles.rightColumn}>
      {/* 이메일 카드 */}
      <motion.div
        className={styles.emailCard}
        initial={cardInitial}
        animate={cardAnimate}
        exit={{ ...cardExit, transition: { duration: 0.25, delay: 0.05, ease: "easeIn" as const } }}
      >
        <motion.div
          initial={contentInitial}
          animate={contentAnimate}
          exit={contentExit}
        >
          <h3 className={styles.emailTitle}>{t("contact.drawer.emailTitle")}</h3>
          <button
            className={`${styles.emailAddress} ${copied ? styles.emailAddressCopied : ""}`}
            onClick={() => {
              navigator.clipboard?.writeText(siteConfig.contact.email);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <span
              className={`${styles.emailTextWrapper} ${copied ? styles.hiddenKeepSpace : ""}`}
            >
              {siteConfig.contact.email}
              <svg
                className={styles.copyIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </span>
            <span
              className={`${styles.copiedText} ${copied ? "" : styles.hidden}`}
            >
              {t("contact.drawer.copied")}
              <svg
                className={styles.checkIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </motion.div>
      </motion.div>

      {/* 프로필 카드 */}
      <motion.div
        className={styles.profileCard}
        initial={cardInitial}
        animate={cardAnimate}
        exit={cardExit}
      >
        <motion.div
          className={styles.profileContent}
          initial={contentInitial}
          animate={contentAnimate}
          exit={contentExit}
        >
          <div className={styles.profileImage}>
            <span className={styles.profilePlaceholder}>
              <OptimizedImage
                src="/images/profile_pic.webp"
                alt="Profile"
                width={400}
                height={400}
                priority={false}
                placeholder="blur"
              />
            </span>
          </div>
          <div className={styles.profileInfo}>
            <h4 className={styles.profileName}>{siteConfig.personal.name}</h4>
            <p className={styles.profileRole}>{siteConfig.personal.role}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* 소셜 카드 */}
      <motion.div
        className={styles.socialCard}
        initial={cardInitial}
        animate={cardAnimate}
        exit={cardExit}
      >
        <motion.div
          className={styles.socialIcons}
          initial={contentInitial}
          animate={contentAnimate}
          exit={contentExit}
        >
          {siteConfig.social.github && (
            <a
              className={styles.socialIcon}
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          )}
          {siteConfig.social.linkedin && (
            <a
              className={styles.socialIcon}
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          )}
          {siteConfig.social.blog && (
            <a
              className={styles.socialIcon}
              href={siteConfig.social.blog}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Blog"
            >
              <svg viewBox="0 0 24 24">
                <path d="M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415a3.3 3.3 0 013.293 3.295A3.303 3.303 0 013.283 24C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z" />
              </svg>
            </a>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
