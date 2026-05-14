"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useContactStore } from "@/stores/contactStore";
import { useContactForm } from "@/hooks/useContactForm";
import { useToast } from "@/hooks/useToast";
import { useRecaptcha } from "@/providers/RecaptchaProvider";
import ContactDrawer from "./ContactDrawer";

export default function ContactDrawerWrapper() {
  const pathname = usePathname();
  const { isFormVisible, closeForm } = useContactStore();
  const contactForm = useContactForm();
  const { formToast, showFormToast } = useToast();
  const { load: loadRecaptcha, unload: unloadRecaptcha } = useRecaptcha();
  const [copied, setCopied] = useState(false);

  // Toast 핸들러 연결
  useEffect(() => {
    contactForm.onShowFormToast(showFormToast);
  }, [contactForm, showFormToast]);

  // 열릴 때 reCAPTCHA 로드, 닫힐 때 cross-origin iframe 정리
  useEffect(() => {
    if (isFormVisible) {
      loadRecaptcha();
    } else {
      unloadRecaptcha();
    }
  }, [isFormVisible, loadRecaptcha, unloadRecaptcha]);

  // 페이지 이동 시 drawer 닫기
  useEffect(() => {
    closeForm();
  }, [pathname, closeForm]);

  return (
    <ContactDrawer
      isOpen={isFormVisible}
      onClose={closeForm}
      formState={contactForm.formState}
      formRef={contactForm.formRef}
      fileInputRef={contactForm.fileInputRef}
      recaptchaRef={contactForm.recaptchaRef}
      name={contactForm.name}
      setName={contactForm.setName}
      email={contactForm.email}
      setEmail={contactForm.setEmail}
      title={contactForm.title}
      setTitle={contactForm.setTitle}
      message={contactForm.message}
      setMessage={contactForm.setMessage}
      privacyAccepted={contactForm.privacyAccepted}
      setPrivacyAccepted={contactForm.setPrivacyAccepted}
      fileName={contactForm.fileName}
      setFileName={contactForm.setFileName}
      setRecaptchaToken={contactForm.setRecaptchaToken}
      submittedData={contactForm.submittedData}
      recaptchaEnabled={contactForm.recaptchaEnabled}
      recaptchaVersion={contactForm.recaptchaVersion}
      handleSubmit={contactForm.handleSubmit}
      resetForm={contactForm.resetForm}
      formToast={formToast}
      copied={copied}
      setCopied={setCopied}
    />
  );
}
