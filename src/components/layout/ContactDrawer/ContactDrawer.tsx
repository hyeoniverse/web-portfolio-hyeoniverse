"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Check, RotateCcw } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { useRecaptcha } from "@/providers/RecaptchaProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import CloseIcon from "@/components/ui/CloseIcon";
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
  const siteConfig = useSiteConfig();
  const { t, language } = useLanguage();
  const { stop: lenisStop, start: lenisStart } = useLenis();
  const isMobile = useMobileLayout();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobileDrawer, setIsMobileDrawer] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [clipOpen, setClipOpen] = useState(false);
  const { ready: recaptchaReady } = useRecaptcha();

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobileDrawer(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileDrawer(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // isOpen → true: 마운트 후 다음 프레임에서 clip 열기
  // isOpen → false: clip 닫기(0.8s) → blur fade(0.5s) → 언마운트
  useEffect(() => {
    let rafId: number;
    let unmountTimer: ReturnType<typeof setTimeout>;

    if (isOpen) {
      setShowDrawer(true);
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          setClipOpen(true);
        });
      });
    } else {
      setClipOpen(false);
      // clip(0.8s) + blur fade(0.5s) 후 언마운트
      unmountTimer = setTimeout(() => {
        setShowDrawer(false);
      }, 1300);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    const blurTargets = () =>
      document.querySelectorAll<HTMLElement>("body > nav, body > main");

    const applyBlur = () => {
      if (!isMobileDrawer) {
        blurTargets().forEach((el) => {
          el.style.filter = "blur(12px)";
          el.style.transition = "filter 0.5s ease";
        });
      }
    };

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let cleanTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      lenisStop();
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      requestAnimationFrame(() => {
        document.documentElement.style.overflow = "visible";
      });
      applyBlur();
    } else {
      // clip 닫힌 후(0.8s) blur fade 시작 (transition 유지 → 자연 fade)
      fadeTimer = setTimeout(() => {
        blurTargets().forEach((el) => {
          el.style.filter = "";
        });
      }, 800);
      // blur fade 끝난 후(0.8s + 0.5s) transition cleanup
      cleanTimer = setTimeout(() => {
        blurTargets().forEach((el) => {
          el.style.transition = "";
        });
      }, 1300);
      // 스크롤 복원
      document.documentElement.style.overflow = "";
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, parseInt(top, 10) * -1);
      lenisStart();
    }
    // cleanup: 타이머만 정리 (blur는 else 브랜치에서 처리)
    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (cleanTimer) clearTimeout(cleanTimer);
    };
  }, [isOpen, lenisStop, lenisStart, isMobileDrawer]);

  // 컴포넌트 언마운트 시 blur + 스크롤 완전 정리
  useEffect(() => {
    return () => {
      document.querySelectorAll<HTMLElement>("body > nav, body > main").forEach((el) => {
        el.style.filter = "";
        el.style.transition = "";
      });
      document.documentElement.style.overflow = "";
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, parseInt(top, 10) * -1);
      lenisStart();
    };
  }, [lenisStart]);

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

  if (!mounted || !showDrawer) return null;

  const closedClip = isMobileDrawer
    ? "inset(0 0 100% 0)"
    : "inset(0 100% 0 0)";

  return createPortal(
    <div
      className={styles.clipWrapper}
        data-lenis-prevent
        style={{
          clipPath: clipOpen ? "inset(0 0 0 0)" : closedClip,
          transition: clipOpen
            ? "clip-path 0.9s cubic-bezier(0.25, 0.1, 0.25, 1)"
            : "clip-path 0.8s cubic-bezier(0.4, 0, 0.6, 1)",
        }}
      >
        <div
          className={styles.backdrop}
          onClick={handleBackdropClick}
        >
          <div
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Contact form"
          >
            {/* 닫기 버튼 */}
            <button
              className={styles.closeBtn}
              onClick={() => {
                onClose();
                resetForm();
              }}
              aria-label="Close"
              data-close-trigger
            >
              <CloseIcon />
            </button>

            {/* 왼쪽: 폼 카드 */}
            <div className={styles.formCard}>
              <div>
                <h2 className={styles.title}>
                  {formState.succeeded ? <T k="contact.drawer.successTitle" /> : <T k={isMobile ? "contact.drawer.formTitleMobile" : "contact.drawer.formTitle"} />}
                </h2>

                <AnimatePresence mode="wait">
                  {formState.succeeded && submittedData ? (
                    <ContactSuccessView
                      submittedData={submittedData}
                      resetForm={resetForm}
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
                            {fileName || <T k="contact.drawer.fileUpload" />}
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
                              <X />
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
                        <label
                          className={styles.privacy}
                          data-clickable="true"
                        >
                          <input
                            type="checkbox"
                            name="privacy"
                            checked={privacyAccepted}
                            onChange={(e) =>
                              setPrivacyAccepted(e.target.checked)
                            }
                            data-clickable="true"
                          />
                          <span>
                            {language === "ko" ? (
                              <>
                                <Link
                                  data-more="true"
                                  href="/privacy"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <T k="contact.drawer.privacyPolicy" />
                                </Link>
                                <T k="contact.drawer.acceptPrivacy" />
                              </>
                            ) : (
                              <>
                                <T k="contact.drawer.acceptPrivacy" />
                                <Link
                                  data-more="true"
                                  href="/privacy"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <T k="contact.drawer.privacyPolicy" />
                                </Link>
                              </>
                            )}
                          </span>
                        </label>
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
                          <T k="contact.sending" />
                        ) : formState.succeeded ? (
                          <>
                            <span className={styles.submitTextDefault}>
                              Sent
                              <Check className={styles.submitIcon} strokeWidth={2.5} />
                            </span>
                            <span className={styles.submitTextHover}>
                              Reset
                              <RotateCcw className={styles.submitIcon} strokeWidth={2.5} />
                            </span>
                          </>
                        ) : (
                          "Submit"
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 오른쪽: 정보 카드 */}
            <ContactInfoCards
              copied={copied}
              setCopied={setCopied}
              onClose={() => { onClose(); resetForm(); }}
            />
          </div>
        </div>
      </div>,
    document.body,
  );
}
