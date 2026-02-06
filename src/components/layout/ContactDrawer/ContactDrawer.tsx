"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import { siteConfig } from "@/config/site.config";
import OptimizedImage from "@/components/ui/OptimizedImage";
import styles from "./ContactDrawer.module.css";

interface SubmittedData {
  name: string;
  email: string;
  title: string;
  message: string;
  fileName: string;
}

interface FormState {
  errors: {
    getFormErrors?: () => readonly { message: string }[];
    getAllFieldErrors?: () => readonly [
      string,
      readonly { message: string }[],
    ][];
  } | null;
  result: unknown;
  submitting: boolean;
  succeeded: boolean;
}

interface FormToast {
  message: string;
  type: "error" | "success";
}

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  formState: FormState;
  formRef: React.RefObject<HTMLFormElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  recaptchaRef: React.RefObject<ReCAPTCHA | null>;
  privacyAccepted: boolean;
  setPrivacyAccepted: (value: boolean) => void;
  fileName: string;
  setFileName: (value: string) => void;
  setRecaptchaToken: (value: string | null) => void;
  submittedData: SubmittedData | null;
  recaptchaEnabled: boolean;
  recaptchaVersion: "v2" | "v3";
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  resetForm: (e?: React.MouseEvent) => void;
  formToast: FormToast | null;
  copied: boolean;
  setCopied: (value: boolean) => void;
}

export default function ContactDrawer({
  isOpen,
  onClose,
  formState,
  formRef,
  fileInputRef,
  recaptchaRef,
  privacyAccepted,
  setPrivacyAccepted,
  fileName,
  setFileName,
  setRecaptchaToken,
  submittedData,
  recaptchaEnabled,
  recaptchaVersion,
  handleSubmit,
  resetForm,
  formToast,
  copied,
  setCopied,
}: ContactDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Mount portal after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle reCAPTCHA badge visibility
  useEffect(() => {
    if (!recaptchaEnabled || recaptchaVersion !== "v3") return;

    const badge = document.querySelector(".grecaptcha-badge") as HTMLElement;
    if (badge) {
      badge.style.visibility = isOpen ? "visible" : "hidden";
      badge.style.opacity = isOpen ? "1" : "0";
      badge.style.zIndex = isOpen ? "9999" : "";
      badge.style.transition = "visibility 0.3s, opacity 0.3s";
    }

    return () => {
      const badge = document.querySelector(".grecaptcha-badge") as HTMLElement;
      if (badge) {
        badge.style.visibility = "hidden";
        badge.style.opacity = "0";
        badge.style.zIndex = "";
      }
    };
  }, [isOpen, recaptchaEnabled, recaptchaVersion]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      onClose();
      resetForm();
    }
  };

  // Don't render on server or before hydration
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.7, ease: "easeOut" },
          }}
          exit={{
            opacity: 0,
            transition: { duration: 0.4, delay: 0.7, ease: "easeOut" },
          }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={drawerRef}
            className={styles.drawer}
            initial={{ x: "-100%" }}
            animate={{
              x: 0,
              transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
            }}
            exit={{
              x: "-100%",
              transition: {
                duration: 0.8,
                ease: [0.4, 0, 0.6, 1],
              },
            }}
          >
            {/* Close Button */}
            <motion.button
              className={styles.closeBtn}
              onClick={() => {
                onClose();
                resetForm();
              }}
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { duration: 0.3, delay: 0.7 },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.15, delay: 0.4 },
              }}
              whileHover="hover"
            >
              <span className={styles.closeIconWrapper}>
                <motion.span
                  className={styles.closeLine}
                  variants={{
                    hover: { rotate: 45 },
                  }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.span
                  className={styles.closeLine}
                  variants={{
                    hover: { rotate: -45 },
                  }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
              </span>
            </motion.button>

            {/* Left: Form Card */}
            <motion.div
              className={styles.formCard}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: 0.4, delay: 0.35, ease: "easeOut" },
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                transition: { duration: 0.25, delay: 0.1, ease: "easeIn" },
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, delay: 0.55, ease: "easeOut" },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.4 },
                }}
              >
                <h2 className={styles.title}>
                  {formState.succeeded ? "Message Sent!" : "Fill out the form"}
                </h2>

                {/* Success View / Form */}
                <AnimatePresence mode="wait">
                  {formState.succeeded && submittedData ? (
                    <motion.div
                      key="success-view"
                      className={styles.successView}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <motion.div
                        className={styles.successLabel}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                          exit: { opacity: 0, y: -10 },
                        }}
                        transition={{
                          duration: 0.4,
                          delay: 0.1,
                          ease: [0.65, 0, 0.35, 1],
                        }}
                      >
                        [Preview] Message you sent
                      </motion.div>

                      <motion.div
                        className={styles.successHeader}
                        variants={{
                          hidden: { clipPath: "inset(100% 0 0 0)", y: 30 },
                          visible: { clipPath: "inset(0% 0 0 0)", y: 0 },
                          exit: { clipPath: "inset(0 0 100% 0)", y: -20 },
                        }}
                        transition={{
                          duration: 0.5,
                          delay: 0.15,
                          ease: [0.65, 0, 0.35, 1],
                        }}
                      >
                        <span className={styles.successFrom}>
                          {submittedData.name}
                        </span>
                        <span className={styles.successEmail}>
                          {submittedData.email}
                        </span>
                      </motion.div>

                      {submittedData.title && (
                        <motion.div
                          className={styles.successTitle}
                          variants={{
                            hidden: { clipPath: "inset(100% 0 0 0)", y: 20 },
                            visible: { clipPath: "inset(0% 0 0 0)", y: 0 },
                            exit: { clipPath: "inset(0 0 100% 0)", y: -15 },
                          }}
                          transition={{
                            duration: 0.5,
                            delay: 0.2,
                            ease: [0.65, 0, 0.35, 1],
                          }}
                        >
                          {submittedData.title}
                        </motion.div>
                      )}

                      <motion.div
                        className={styles.successDivider}
                        variants={{
                          hidden: { scaleX: 0, opacity: 0 },
                          visible: { scaleX: 1, opacity: 1 },
                          exit: { scaleX: 0, opacity: 0 },
                        }}
                        transition={{
                          duration: 0.6,
                          delay: 0.25,
                          ease: [0.65, 0, 0.35, 1],
                        }}
                      />

                      <motion.div
                        className={styles.successMessageWrapper}
                        variants={{
                          hidden: { clipPath: "inset(0 0 100% 0)", y: 40 },
                          visible: { clipPath: "inset(0 0 0% 0)", y: 0 },
                          exit: { clipPath: "inset(100% 0 0 0)", y: -30 },
                        }}
                        transition={{
                          duration: 0.6,
                          delay: 0.3,
                          ease: [0.65, 0, 0.35, 1],
                        }}
                      >
                        <span className={styles.successMessageLabel}>
                          Message
                        </span>
                        <p className={styles.successMessage}>
                          {submittedData.message}
                        </p>
                      </motion.div>

                      {submittedData.fileName && (
                        <motion.div
                          className={styles.successAttachment}
                          variants={{
                            hidden: {
                              scale: 0.8,
                              opacity: 0,
                              filter: "blur(10px)",
                            },
                            visible: {
                              scale: 1,
                              opacity: 1,
                              filter: "blur(0px)",
                            },
                            exit: {
                              scale: 0.8,
                              opacity: 0,
                              filter: "blur(10px)",
                            },
                          }}
                          transition={{
                            duration: 0.4,
                            delay: 0.35,
                            ease: [0.65, 0, 0.35, 1],
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {submittedData.fileName}
                        </motion.div>
                      )}

                      <motion.button
                        type="button"
                        className={styles.successBtn}
                        onClick={resetForm}
                        variants={{
                          hidden: { y: 40, opacity: 0, scale: 0.9 },
                          visible: { y: 0, opacity: 1, scale: 1 },
                          exit: { y: 30, opacity: 0, scale: 0.95 },
                        }}
                        transition={{
                          duration: 0.5,
                          delay: 0.4,
                          ease: [0.65, 0, 0.35, 1],
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Send Another Message
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="contact-form"
                      ref={formRef}
                      onSubmit={handleSubmit}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
                    >
                      <div className={styles.formRow}>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          className={styles.input}
                          placeholder="Name"
                          maxLength={100}
                        />
                        <input
                          id="email"
                          type="email"
                          name="email"
                          className={styles.input}
                          placeholder="Your Email"
                          maxLength={254}
                        />
                      </div>

                      <input
                        id="title"
                        type="text"
                        name="title"
                        className={styles.input}
                        placeholder="Title (optional)"
                        minLength={2}
                        maxLength={50}
                      />

                      {siteConfig.emailService.enableFileUpload && (
                        <div
                          className={fileName ? styles.fileWrapper : undefined}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            name="attachment"
                            accept=".pdf,.doc,.docx"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setFileName(file?.name || "");
                            }}
                          />
                          <button
                            type="button"
                            className={`${styles.fileBtn} ${fileName ? styles.fileBtnActive : ""}`}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {fileName || "Attach a pdf/doc file, max 10MB"}
                          </button>
                          {fileName && (
                            <button
                              type="button"
                              className={styles.fileCancelBtn}
                              onClick={() => {
                                setFileName("");
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                              aria-label="Remove file"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  d="M18 6L6 18M6 6l12 12"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}

                      <div className={styles.textareaWrapper}>
                        <textarea
                          id="message"
                          name="message"
                          className={styles.textarea}
                          placeholder="Something to say?"
                          rows={6}
                          maxLength={2000}
                        />
                        <div
                          className={`${styles.formToast} ${formToast ? styles.formToastVisible : ""} ${formToast?.type === "success" ? styles.formToastSuccess : ""}`}
                        >
                          {formToast?.message}
                        </div>
                      </div>

                      <div className={styles.formFooter}>
                        <div
                          className={styles.privacy}
                          onClick={() => setPrivacyAccepted(!privacyAccepted)}
                          data-clickable="true"
                        >
                          <input
                            type="checkbox"
                            name="privacy"
                            checked={privacyAccepted}
                            onChange={(e) =>
                              setPrivacyAccepted(e.target.checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                            data-clickable="true"
                          />
                          <span>
                            Accept the{" "}
                            <Link
                              data-more="true"
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Privacy Policy
                            </Link>
                          </span>
                        </div>
                      </div>

                      {recaptchaEnabled && recaptchaVersion === "v2" && (
                        <div className={styles.recaptcha}>
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={
                              process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""
                            }
                            onChange={(token) => setRecaptchaToken(token)}
                            onExpired={() => setRecaptchaToken(null)}
                            theme="dark"
                          />
                        </div>
                      )}

                      <button
                        type={formState.succeeded ? "button" : "submit"}
                        className={`${styles.submitBtn} ${formState.succeeded ? styles.submitBtnSuccess : ""}`}
                        disabled={formState.submitting}
                        onClick={formState.succeeded ? resetForm : undefined}
                      >
                        {formState.submitting ? (
                          "Sending..."
                        ) : formState.succeeded ? (
                          <>
                            <span className={styles.submitTextDefault}>
                              Sent
                              <svg
                                className={styles.submitIcon}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path
                                  d="M20 6L9 17l-5-5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            <span className={styles.submitTextHover}>
                              Reset
                              <svg
                                className={styles.submitIcon}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path
                                  d="M1 4v6h6M23 20v-6h-6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          </>
                        ) : (
                          "Submit"
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* Right: Info Cards */}
            <div className={styles.rightColumn}>
              {/* Email Card */}
              <motion.div
                className={styles.emailCard}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.4, delay: 0.35, ease: "easeOut" },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  transition: { duration: 0.25, delay: 0.05, ease: "easeIn" },
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.4,
                      delay: 0.55,
                      ease: "easeOut",
                    },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.4 },
                  }}
                >
                  <h3 className={styles.emailTitle}>Or email me</h3>
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
                      Copied!
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

              {/* Profile Card */}
              <motion.div
                className={styles.profileCard}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.4, delay: 0.35, ease: "easeOut" },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  transition: { duration: 0.25, ease: "easeIn" },
                }}
              >
                <motion.div
                  className={styles.profileContent}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.4,
                      delay: 0.55,
                      ease: "easeOut",
                    },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.4 },
                  }}
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
                    <h4 className={styles.profileName}>
                      {siteConfig.personal.name}
                    </h4>
                    <p className={styles.profileRole}>
                      {siteConfig.personal.role}
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Social Card */}
              <motion.div
                className={styles.socialCard}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.4, delay: 0.35, ease: "easeOut" },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  transition: { duration: 0.25, ease: "easeIn" },
                }}
              >
                <motion.div
                  className={styles.socialIcons}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.4,
                      delay: 0.55,
                      ease: "easeOut",
                    },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.4 },
                  }}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
