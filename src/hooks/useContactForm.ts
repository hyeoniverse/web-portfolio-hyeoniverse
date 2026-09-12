"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "@formspree/react";
import ReCAPTCHA from "react-google-recaptcha";
import { useRecaptcha } from "@/providers/RecaptchaProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { EMAIL_RE } from "@/utils/commentValidation";
import { validateFileSize } from "@/lib/compressImage";
import { errorText } from "@/lib/apiError";
import { useLanguage } from "@/providers/LanguageProvider";

interface SubmittedData {
  name: string;
  email: string;
  title: string;
  message: string;
  fileName: string;
}

interface UseContactFormReturn {
  // 폼 상태
  formState: ReturnType<typeof useForm>[0];
  formRef: React.RefObject<HTMLFormElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  recaptchaRef: React.RefObject<ReCAPTCHA | null>;

  // controlled 필드 값 + setters
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;

  // 필드 상태
  privacyAccepted: boolean;
  setPrivacyAccepted: (value: boolean) => void;
  fileName: string;
  setFileName: (value: string) => void;
  recaptchaToken: string | null;
  setRecaptchaToken: (value: string | null) => void;
  submittedData: SubmittedData | null;

  // reCAPTCHA 설정
  recaptchaEnabled: boolean;
  recaptchaVersion: "v2" | "v3";

  // 핸들러
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  resetForm: (e?: React.MouseEvent) => void;

  // Toast 핸들러 (useToast에 연결될 예정)
  onShowFormToast: (callback: (message: string, type?: "error" | "success") => void) => void;
  onShowToast: (callback: (message: string, type: "error" | "success") => void) => void;
}

export function useContactForm(): UseContactFormReturn {
  const [formState, handleFormspreeSubmit, resetFormspree] = useForm("xlgwrpvq");

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // controlled form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [fileName, setFileName] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<SubmittedData | null>(null);

  // Toast 콜백 ref
  const showFormToastRef = useRef<(message: string, type?: "error" | "success") => void>(() => {});
  const showToastRef = useRef<(message: string, type: "error" | "success") => void>(() => {});

  const { t } = useLanguage();

  // reCAPTCHA 설정 — admin 토글 반영을 위해 useSiteConfig 사용
  const cfg = useSiteConfig();
  const recaptchaEnabled = cfg.recaptcha.enabled;
  const recaptchaVersion = cfg.recaptcha.version as "v2" | "v3";
  const { executeRecaptcha } = useRecaptcha();

  // 이전 상태 추적
  const prevSubmittingRef = useRef(false);
  const prevSucceededRef = useRef(false);

  const onShowFormToast = useCallback(
    (callback: (message: string, type?: "error" | "success") => void) => {
      showFormToastRef.current = callback;
    },
    []
  );

  const onShowToast = useCallback(
    (callback: (message: string, type: "error" | "success") => void) => {
      showToastRef.current = callback;
    },
    []
  );

  const resetForm = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      formRef.current?.reset();
      resetFormspree();
      setName("");
      setEmail("");
      setTitle("");
      setMessage("");
      setPrivacyAccepted(false);
      setFileName("");
      setRecaptchaToken(null);
      setSubmittedData(null);
      recaptchaRef.current?.reset();
      prevSucceededRef.current = false;
    },
    [resetFormspree]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const title = formData.get("title") as string;
      const message = formData.get("message") as string;

      // 유효성 검사
      if (!name?.trim()) {
        showFormToastRef.current("Please enter your name");
        return;
      }
      if (!email?.trim()) {
        showFormToastRef.current("Please enter your email");
        return;
      }
      if (!EMAIL_RE.test(email)) {
        showFormToastRef.current("Please enter a valid email address");
        return;
      }
      if (title?.trim() && (title.trim().length < 2 || title.trim().length > 50)) {
        showFormToastRef.current("Title must be 2-50 characters");
        return;
      }
      if (!message?.trim()) {
        showFormToastRef.current("Please enter your message");
        return;
      }
      if (!privacyAccepted) {
        showFormToastRef.current("Please accept the Privacy Policy");
        return;
      }

      /* 첨부 파일 검증 — admin 의 media.limits 적용 (post-compress bypass 활성: 첨부는 압축 안 함) */
      const attachedFile = fileInputRef.current?.files?.[0];
      if (attachedFile) {
        const mediaLimits = cfg.media?.limits as Record<string, number> | undefined;
        const sizeError = validateFileSize(attachedFile, mediaLimits, { skipCompressibleBypass: true });
        if (sizeError) {
          showFormToastRef.current(errorText(sizeError, t, sizeError.message));
          return;
        }
      }

      // reCAPTCHA 유효성 검사
      if (recaptchaEnabled) {
        if (recaptchaVersion === "v2" && !recaptchaToken) {
          showFormToastRef.current("Please complete the reCAPTCHA verification");
          return;
        }
        if (recaptchaVersion === "v3" && !executeRecaptcha) {
          showFormToastRef.current("reCAPTCHA not loaded. Please refresh the page.");
          return;
        }
      }

      try {
        setSubmittedData({
          name: name.trim(),
          email: email.trim(),
          title: title?.trim() || "",
          message: message.trim(),
          fileName,
        });

        if (recaptchaEnabled) {
          if (recaptchaVersion === "v3" && executeRecaptcha) {
            const token = await executeRecaptcha("contact_form");
            formData.append("g-recaptcha-response", token);
          } else if (recaptchaVersion === "v2" && recaptchaToken) {
            formData.append("g-recaptcha-response", recaptchaToken);
          }
        }

        await handleFormspreeSubmit(formData);
      } catch (error) {
        console.error("Form submission error:", error);
        showToastRef.current("Network error. Please check your connection.", "error");
      }
    },
    [
      handleFormspreeSubmit,
      privacyAccepted,
      recaptchaToken,
      recaptchaEnabled,
      recaptchaVersion,
      executeRecaptcha,
      fileName,
      // 첨부 용량 제한을 콜백 안에서 읽는다 — 설정이 바뀌면 새 제한이 적용돼야 한다.
      cfg.media?.limits,
      t,
    ]
  );

  // 폼 성공/에러 처리
  useEffect(() => {
    const justFinishedSubmitting = prevSubmittingRef.current && !formState.submitting;
    const justSucceeded = !prevSucceededRef.current && formState.succeeded;

    prevSubmittingRef.current = formState.submitting;
    prevSucceededRef.current = formState.succeeded;

    if (justFinishedSubmitting) {
      if (justSucceeded) {
        showFormToastRef.current("Message sent successfully!", "success");
        setRecaptchaToken(null);
        recaptchaRef.current?.reset();
      } else if (!formState.succeeded) {
        let errorMsg = "Failed to send message. Please try again.";

        if (formState.errors) {
          const formErrors = formState.errors.getFormErrors?.() || [];
          const fieldErrors = formState.errors.getAllFieldErrors?.() || [];

          if (formErrors.length > 0) {
            errorMsg = formErrors.map((err) => err.message).join(", ");
          } else if (fieldErrors.length > 0) {
            errorMsg = fieldErrors
              .map(([, errors]) => errors.map((err) => err.message).join(", "))
              .join(", ");
          }
        }

        showFormToastRef.current(errorMsg);
      }
    }
  }, [formState.submitting, formState.succeeded, formState.errors]);

  return {
    formState,
    formRef,
    fileInputRef,
    recaptchaRef,
    name,
    setName,
    email,
    setEmail,
    title,
    setTitle,
    message,
    setMessage,
    privacyAccepted,
    setPrivacyAccepted,
    fileName,
    setFileName,
    recaptchaToken,
    setRecaptchaToken,
    submittedData,
    recaptchaEnabled,
    recaptchaVersion,
    handleSubmit,
    resetForm,
    onShowFormToast,
    onShowToast,
  };
}
