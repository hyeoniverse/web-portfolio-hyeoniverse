"use client";

import { Copy, Check, SocialBrandIcon } from "@/components/icons";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import { COPY_FEEDBACK_MS } from "@/constants";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import T from "@/components/ui/T";
import OptimizedImage from "@/components/ui/OptimizedImage";
import CloseButton from "@/components/ui/CloseButton";
import Logo from "@/components/common/Logo";
import styles from "./ContactDrawer.module.css";

interface ContactInfoCardsProps {
  copied: boolean;
  setCopied: (value: boolean) => void;
  onClose: () => void;
}

export default function ContactInfoCards({
  copied,
  setCopied,
  onClose,
}: ContactInfoCardsProps) {
  const siteConfig = useSiteConfig();
  const isMobile = useMobileLayout();
  return (
    <div className={styles.rightColumn}>
      {/* 이메일 카드 */}
      <div className={styles.emailCard}>
        {/* 모바일 header: 로고 + 닫기 버튼 */}
        <div className={styles.emailHeader}>
          <div className={styles.emailHeaderSpacer} />
          <Logo variant="full" as="span" className={styles.emailHeaderLogo} />
          <CloseButton
            className={styles.emailHeaderClose}
            onClick={onClose}
            ariaLabel="Close"
          />
        </div>

        <div>
          <h3 className={styles.emailTitle}><T k={isMobile ? "contact.drawer.emailTitleMobile" : "contact.drawer.emailTitle"} /></h3>
          <button
            className={`${styles.emailAddress} ${copied ? styles.emailAddressCopied : ""}`}
            aria-label={copied ? "Email copied" : "Copy email to clipboard"}
            onClick={() => {
              navigator.clipboard?.writeText(siteConfig.contact.email);
              setCopied(true);
              setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
            }}
          >
            <span
              className={`${styles.emailTextWrapper} ${copied ? styles.hiddenKeepSpace : ""}`}
              aria-hidden={copied}
            >
              {siteConfig.contact.email}
              <Copy className={styles.copyIcon} strokeWidth={1.5} />
            </span>
            <span
              className={`${styles.copiedText} ${copied ? "" : styles.hidden}`}
              aria-hidden={!copied}
            >
              <T k="contact.drawer.copied" />
              <Check className={styles.checkIcon} />
            </span>
          </button>
        </div>
      </div>

      {/* 프로필 카드 */}
      <div className={styles.profileCard}>
        <div className={styles.profileContent}>
          <div className={styles.profileImage}>
            <span className={styles.profilePlaceholder}>
              <OptimizedImage
                src="/images/profile_pic.webp"
                alt="Profile"
                width={400}
                height={400}
                priority={false}
              />
            </span>
          </div>
          <div className={styles.profileInfo}>
            <h4 className={styles.profileName}>{siteConfig.personal.name}</h4>
            <p className={styles.profileRole}>{siteConfig.personal.role}</p>
          </div>
        </div>
      </div>

      {/* 소셜 카드 */}
      {siteConfig.socialLinks?.length > 0 && (
        <div className={styles.socialCard}>
          <div className={styles.socialIcons}>
            {siteConfig.socialLinks.filter((l) => l.url).map((link, i) => {
              const label = SOCIAL_ICONS[link.platform]?.label ?? link.label ?? link.platform;
              return (
                <a
                  key={`${link.platform}-${i}`}
                  className={styles.socialIcon}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  {link.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={link.icon} alt="" />
                  ) : (
                    <SocialBrandIcon name={link.platform} />
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
