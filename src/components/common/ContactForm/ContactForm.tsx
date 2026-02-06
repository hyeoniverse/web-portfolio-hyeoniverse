"use client";

import React, { useEffect } from "react";
import { useForm } from "@formspree/react";
import { Mail, MessageSquare, Send, User } from "lucide-react";

import styles from "./ContactForm.module.css";
import Button from "@/components/ui/Button";
import SuccessMessage from "./SuccessMessage";

import { useContactStore } from "@/stores/contactStore";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";

export default function ContactForm() {
  const [state, handleSubmit] = useForm(
    process.env.NEXT_PUBLIC_FORMSPREE_ID as string,
  );

  const { t } = useLanguage();
  const { playSound } = useSoundManager();
  const { isModalOpen } = useModalStore();
  const { formKey, formData, setFormData, resetForm, setSubmitSuccess } =
    useContactStore();

  // Formspree 상태 변화 감시 → Zustand에 반영
  useEffect(() => {
    if (state.succeeded) {
      playSound("success");
      setSubmitSuccess(true);
      // 폼 전송 후 자동 초기화
      const timer = setTimeout(() => {
        resetForm();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.succeeded, playSound, setSubmitSuccess, resetForm]);

  // 입력값 변경 핸들러 (Zustand formData 갱신)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  useEffect(() => {
    const setKeyboard = () =>
      document.documentElement.setAttribute("data-input", "keyboard");

    const setMouse = () =>
      document.documentElement.setAttribute("data-input", "mouse");

    window.addEventListener("keydown", setKeyboard);
    window.addEventListener("mousedown", setMouse);
    window.addEventListener("touchstart", setMouse);

    return () => {
      window.removeEventListener("keydown", setKeyboard);
      window.removeEventListener("mousedown", setMouse);
      window.removeEventListener("touchstart", setMouse);
    };
  }, []);

  // 상태에 따른 렌더링
  return (
    <form
      key={formKey}
      method="POST"
      className={styles.contactForm}
      onSubmit={handleSubmit}
    >
      <div className={`${styles.content} ${isModalOpen ? styles.clear : ""}`}>
        {state.succeeded ? (
          <SuccessMessage />
        ) : (
          <>
            <input type="hidden" name="_subject" value="Contact Form" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            <input
              type="hidden"
              name="_next"
              value={
                typeof window !== "undefined" ? window.location.origin : ""
              }
            />

            <div className={styles.formGroup}>
              <div className={styles.inputWrapper}>
                <User className={styles.icon} size={16} />
                <input
                  type="text"
                  name="name"
                  placeholder={t("contact.namePlaceholder")}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={state.submitting}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.inputWrapper}>
                <Mail className={styles.icon} size={16} />
                <input
                  type="email"
                  name="email"
                  placeholder={t("contact.emailPlaceholder")}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={state.submitting}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.inputWrapper}>
                <MessageSquare className={styles.icon} size={16} />
                <textarea
                  name="message"
                  placeholder={t("contact.messagePlaceholder")}
                  rows={3}
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  disabled={state.submitting}
                  className={styles.formTextarea}
                />
              </div>
            </div>

            <Button
              type="submit"
              icon={<Send size={16} />}
              style="primary"
              disabled={state.submitting}
            >
              {state.submitting ? t("contact.sending") : t("contact.send")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
