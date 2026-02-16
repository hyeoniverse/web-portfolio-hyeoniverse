"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import { useRecaptcha } from "@/providers/RecaptchaProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { siteConfig } from "@/config/site.config";
import ContactSuccessView from "./ContactSuccessView";
import ContactInfoCards from "./ContactInfoCards";
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
  const { t } = useLanguage();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { ready: recaptchaReady } = useRecaptcha();

  useEffect(() => {
    setMounted(true);
  }, []);

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
  }, [isOpen, recaptchaEnabled, recaptchaVersion, recaptchaReady]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      onClose();
      resetForm();
    }
  };

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
            {/* 닫기 버튼 */}
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
                  variants={{ hover: { rotate: 45 } }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.span
                  className={styles.closeLine}
                  variants={{ hover: { rotate: -45 } }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
              </span>
            </motion.button>

            {/* 왼쪽: 폼 카드 */}
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
                  {formState.succeeded ? t("contact.drawer.successTitle") : t("contact.drawer.formTitle")}
                </h2>

                <AnimatePresence mode="wait">
                  {formState.succeeded && submittedData ? (
                    <ContactSuccessView
                      submittedData={submittedData}
                      resetForm={resetForm}
                      t={t}
                    />
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
                          placeholder={t("contact.drawer.namePlaceholder")}
                          maxLength={100}
                        />
                        <input
                          id="email"
                          type="email"
                          name="email"
                          className={styles.input}
                          placeholder={t("contact.drawer.emailPlaceholder")}
                          maxLength={254}
                        />
                      </div>

                      <input
                        id="title"
                        type="text"
                        name="title"
                        className={styles.input}
                        placeholder={t("contact.drawer.titlePlaceholder")}
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
                            {fileName || t("contact.drawer.fileUpload")}
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
                          placeholder={t("contact.drawer.messagePlaceholder")}
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
                            {t("contact.drawer.acceptPrivacy")}{" "}
                            <Link
                              data-more="true"
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("contact.drawer.privacyPolicy")}
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
                          t("contact.sending")
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

            {/* 오른쪽: 정보 카드 */}
            <ContactInfoCards
              t={t}
              copied={copied}
              setCopied={setCopied}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
