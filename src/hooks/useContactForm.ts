"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import ReCAPTCHA from "react-google-recaptcha";
import { useRecaptcha } from "@/providers/RecaptchaProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { EMAIL_RE } from "@/utils/commentValidation";
import { validateFileSize } from "@/lib/compressImage";
import { errorText } from "@/lib/apiError";
import { useLanguage } from "@/providers/LanguageProvider";

/** 문의 첨부 올리기 — 서명 URL 발급(/api/contact/upload) → 비공개 버킷에 바로 업로드 */
async function uploadContactAttachment(
  file: File,
  recaptchaToken: string | undefined,
): Promise<{ ok: true; path: string; ticket?: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch("/api/contact/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, size: file.size, recaptchaToken }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; bucket?: string; path?: string; token?: string; ticket?: string };
    if (!data.ok || !data.path || !data.token || !data.bucket) return { ok: false, reason: data.reason ?? "network" };
    const { error } = await createClient().storage
      .from(data.bucket)
      .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) return { ok: false, reason: "storage" };
    return { ok: true, path: data.path, ticket: data.ticket };
  } catch {
    return { ok: false, reason: "network" };
  }
}

interface SubmittedData {
  name: string;
  email: string;
  title: string;
  message: string;
  fileName: string;
}

/** 전송 상태 — 예전 @formspree/react 의 formState 가운데 화면이 쓰던 두 값 */
interface ContactFormState {
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
  /* 서버(/api/contact)로 보내면 서버가 입력 · reCAPTCHA 를 확인하고 설정의 공급자로 넘긴다(lib/contactSend) */
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

  /* 서버가 돌려준 실패 사유 → 안내. 설정 문제(not_configured)는 방문자가 고칠 수 없어 일반 문구로 */
  const showContactFailure = useCallback((reason?: string) => {
    if (reason === "network") showToastRef.current(t("contact.validation.networkError"), "error");
    else if (reason === "captcha") showFormToastRef.current(t("contact.validation.captchaFailed"));
    else if (reason === "rate_limited") showFormToastRef.current(t("contact.validation.rateLimited"));
    else if (reason === "too_large" || reason === "type") showFormToastRef.current(t("contact.validation.attachmentRejected"));
    else showFormToastRef.current(t("contact.validation.sendFailed"));
  }, [t]);

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

        setFormState({ submitting: true, succeeded: false });

        /* reCAPTCHA 토큰 — 서버가 Google 에 한 번 확인한다(/api/contact). 토큰은 한 번만 확인할 수 있어서,
           첨부가 있으면 첨부를 올릴 때 확인하고 그때 받은 티켓을 보내기에 대신 싣는다 */
        let recaptcha: string | undefined;
        if (recaptchaEnabled) {
          if (recaptchaVersion === "v3" && executeRecaptcha) recaptcha = await executeRecaptcha("contact_form");
          else if (recaptchaVersion === "v2" && recaptchaToken) recaptcha = recaptchaToken;
        }

        /* 첨부 — 서명 URL 을 받아 비공개 버킷에 바로 올린다. 메일에는 서버가 만든 내려받기 링크가 붙는다 */
        let attachment: { path: string; name: string; ticket?: string } | undefined;
        if (attachedFile) {
          const up = await uploadContactAttachment(attachedFile, recaptcha);
          if (!up.ok) {
            setFormState({ submitting: false, succeeded: false });
            showContactFailure(up.reason);
            return;
          }
          attachment = { path: up.path, name: attachedFile.name, ticket: up.ticket };
        }

        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            title: title?.trim() || "",
            message: message.trim(),
            recaptchaToken: attachment?.ticket ? undefined : recaptcha,
            attachment,
          }),
        });
        const result = (await res.json().catch(() => ({ ok: false, reason: "network" }))) as { ok: boolean; reason?: string };
        setFormState({ submitting: false, succeeded: result.ok });

        if (result.ok) {
          showFormToastRef.current(t("contact.validation.sent"), "success");
          setRecaptchaToken(null);
          recaptchaRef.current?.reset();
        } else {
          showContactFailure(result.reason);
          // v2 체크박스 토큰은 한 번 쓰면 끝이라 다시 체크하게 한다
          setRecaptchaToken(null);
          recaptchaRef.current?.reset();
        }
      } catch (error) {
        console.error("Form submission error:", error);
        setFormState({ submitting: false, succeeded: false });
        showToastRef.current(t("contact.validation.networkError"), "error");
      }
    },
    [
      showContactFailure,
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
