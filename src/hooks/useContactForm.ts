"use client";

import { useState, useCallback, useRef } from "react";
import { sendContact, type ContactProvider } from "@/lib/contactSend";
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

/** 전송 상태 — 예전 @formspree/react 의 formState 가운데 화면이 쓰던 두 값 */
export interface ContactFormState {
  submitting: boolean;
  succeeded: boolean;
}

interface UseContactFormReturn {
  // 폼 상태
  formState: ContactFormState;
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
  /* 설정 › 서비스 › 이메일 서비스에서 고른 공급자로 보낸다(lib/contactSend). 예전에는 Formspree 폼 ID 를 여기 박아 두어
     공급자를 바꿔도 Formspree 로만 갔다 */
  const [formState, setFormState] = useState<ContactFormState>({ submitting: false, succeeded: false });

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

  const provider = (cfg.emailService?.provider ?? "formspree") as ContactProvider;
  const publicKeys = cfg.publicKeys;

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
      setFormState({ submitting: false, succeeded: false });
      setName("");
      setEmail("");
      setTitle("");
      setMessage("");
      setPrivacyAccepted(false);
      setFileName("");
      setRecaptchaToken(null);
      setSubmittedData(null);
      recaptchaRef.current?.reset();
    },
    []
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
        showFormToastRef.current(t("contact.validation.nameRequired"));
        return;
      }
      if (!email?.trim()) {
        showFormToastRef.current(t("contact.validation.emailRequired"));
        return;
      }
      if (!EMAIL_RE.test(email)) {
        showFormToastRef.current(t("contact.validation.emailInvalid"));
        return;
      }
      if (title?.trim() && (title.trim().length < 2 || title.trim().length > 50)) {
        showFormToastRef.current(t("contact.validation.titleLength"));
        return;
      }
      if (!message?.trim()) {
        showFormToastRef.current(t("contact.validation.messageRequired"));
        return;
      }
      if (!privacyAccepted) {
        showFormToastRef.current(t("contact.validation.privacyRequired"));
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
          showFormToastRef.current(t("contact.validation.recaptchaRequired"));
          return;
        }
        if (recaptchaVersion === "v3" && !executeRecaptcha) {
          showFormToastRef.current(t("contact.validation.recaptchaNotLoaded"));
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

        /* 파일을 고르지 않았으면 빈 파일 칸을 빼고 보낸다 — 빈 칸도 첨부로 치는 공급자가 있다 */
        const withAttachment = !!attachedFile;
        if (!withAttachment) formData.delete("attachment");

        setFormState({ submitting: true, succeeded: false });
        const result = await sendContact(provider, {
          ...publicKeys,
          /* 빌드 때 넣은 환경 변수도 받는다 — 설정 화면에 저장한 값이 없을 때 */
          NEXT_PUBLIC_FORMSPREE_ID: publicKeys.NEXT_PUBLIC_FORMSPREE_ID || process.env.NEXT_PUBLIC_FORMSPREE_ID,
          NEXT_PUBLIC_WEB3FORMS_KEY: publicKeys.NEXT_PUBLIC_WEB3FORMS_KEY || process.env.NEXT_PUBLIC_WEB3FORMS_KEY,
          NEXT_PUBLIC_EMAILJS_SERVICE_ID: publicKeys.NEXT_PUBLIC_EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: publicKeys.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
          NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: publicKeys.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
        }, formData);
        setFormState({ submitting: false, succeeded: result.ok });

        /* 첨부를 단 전송의 결과를 알린다 — 이어 실패하면 첨부만 저절로 꺼진다(/api/contact/attachment).
           연결 실패·설정 없음은 첨부 탓이 아니라 세지 않는다. 기다리지 않는다 */
        if (withAttachment && (result.ok || result.reason === "rejected")) {
          void fetch("/api/contact/attachment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ok: result.ok, reason: result.ok ? undefined : result.detail }),
          }).catch(() => {});
        }

        if (result.ok) {
          showFormToastRef.current(t("contact.validation.sent"), "success");
          setRecaptchaToken(null);
          recaptchaRef.current?.reset();
        } else if (result.reason === "network") {
          showToastRef.current(t("contact.validation.networkError"), "error");
        } else if (result.reason === "not_configured") {
          console.error(`Contact form: ${provider} keys are not configured`);
          showFormToastRef.current(t("contact.validation.sendFailed"));
        } else {
          /* 공급자가 돌려준 사유는 영어 한 언어고 방문자가 고칠 수 있는 것도 아니라 콘솔에 남긴다(#862).
             첨부를 달았으면 파일 없이 다시 보내 보라고 알린다 — 첨부 때문에 막혔을 수 있다 */
          if (result.detail) console.error(`${provider} rejected the message:`, result.detail);
          showFormToastRef.current(t(withAttachment ? "contact.validation.sendFailedAttachment" : "contact.validation.sendFailed"));
        }
      } catch (error) {
        console.error("Form submission error:", error);
        setFormState({ submitting: false, succeeded: false });
        showToastRef.current(t("contact.validation.networkError"), "error");
      }
    },
    [
      provider,
      publicKeys,
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
