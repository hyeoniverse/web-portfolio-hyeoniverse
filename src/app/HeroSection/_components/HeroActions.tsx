"use client";

import { motion } from "framer-motion";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useModalStore } from "@/stores/modalStore";
import { SOCIAL_LINKS } from "@/constants";
import Button from "@/components/ui/Button";
import ContactForm from "@/app/ContactSection/_components/ContactForm";
import { Mail } from "lucide-react";
import styles from "./HeroActions.module.css";
import modalStyles from "@/components/ui/Modal.module.css";
import { scrollToSection } from "@/utils";
import { config } from "@/config";
import { fadeInRightDelayed } from "@/animations";

function ActionItem({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.actionItem}>
      <span className={styles.actionNumber}>{number}</span>
      {children}
    </div>
  );
}

function SocialLink({
  number,
  label,
  href,
}: {
  number: string;
  label: string;
  href: string;
}) {
  const { playSound } = useSoundManager();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.socialLink}
      onMouseEnter={() => playSound("hover")}
      onClick={() => playSound("click")}
    >
      <span className={styles.socialNumber}>{number}</span>
      <span className={styles.socialText}>{label}</span>
      <span className={styles.socialArrow}>↗</span>
    </a>
  );
}

export function HeroActions() {
  const { playSound } = useSoundManager();
  const { openModal, closeModal } = useModalStore();
  const CONTACT_MODAL_ID = "contact-modal";

  const handleViewWorks = () => scrollToSection("projects");

  const handleContact = () => {
    const modals = useModalStore.getState().modals;
    const isOpen = modals.some((m) => m.id === CONTACT_MODAL_ID);

    if (isOpen) {
      closeModal(CONTACT_MODAL_ID);
      return;
    }
    playSound("click");
    openModal(
      <>
        <div className={modalStyles.modalHeader}>
          <div className={modalStyles.headerContent}>
            <Mail className={modalStyles.headerIcon} size={20} />
            <h2 className={modalStyles.modalTitle}>Contact</h2>
          </div>
        </div>
        <ContactForm />
      </>,
      { id: CONTACT_MODAL_ID, width: "500px" },
    );
  };

  return (
    <motion.div
      className={styles.actions}
      variants={fadeInRightDelayed}
      initial="hidden"
      animate="visible"
    >
      {/* Primary Actions */}
      <div className={styles.primaryActions}>
        <ActionItem number="04">
          <Button
            style="primary"
            className={styles.styledButton}
            onClick={handleViewWorks}
          >
            <span className={styles.buttonText}>View Selected Works</span>
            <span className={`${styles.buttonIcon}`}>→</span>
          </Button>
        </ActionItem>

        <ActionItem number="05">
          <Button
            style="outline"
            onClick={handleContact}
            className={styles.styledButton}
          >
            <span className={styles.buttonText}>Get in Touch</span>
            <span className={`${styles.buttonIcon} ${styles.tilt}`}>
              <Mail size={16} />
            </span>
          </Button>
        </ActionItem>
      </div>

      {/* Social Links */}
      <div className={styles.socialSection}>
        <div className={styles.socialLabel}>Social</div>
        <div className={styles.socialLinks}>
          <SocialLink number="01" label="GitHub" href={SOCIAL_LINKS.GITHUB} />
          <SocialLink number="02" label="Blog" href={SOCIAL_LINKS.BLOG} />
          <SocialLink
            number="03"
            label="LinkedIn"
            href={SOCIAL_LINKS.LINKEDIN}
          />
        </div>
      </div>

      {/* Status */}
      <div className={styles.statusSection}>
        <div className={styles.statusItem}>
          <div className={styles.statusTop}>
            <span className={styles.statusLabel}>Status</span>
            <div className={`${styles.statusIndicator} pulse`} />
          </div>
          <span className={styles.statusValue}>{config.personal.status}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Location</span>
          <span className={styles.statusValue}>{config.personal.location}</span>
        </div>
      </div>
    </motion.div>
  );
}
