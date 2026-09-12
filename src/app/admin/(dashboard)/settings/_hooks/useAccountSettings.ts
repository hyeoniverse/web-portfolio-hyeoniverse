import { useState, useCallback } from "react";
import { STATUS_MESSAGE_DISMISS_MS } from "@/constants";
import type { TFunction } from "@/providers/LanguageProvider";
import { errorFromBody, errorText } from "@/lib/apiError";

export function useAccountSettings(t: TFunction) {
  const [accountEmail, setAccountEmail] = useState("");
  const [accountNewEmail, setAccountNewEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [accountCurrentPassword, setAccountCurrentPassword] = useState("");
  /* 실패인지를 함께 둔다 — 예전에는 문구가 "Error" 로 시작하는지로 갈라, 번역한 실패 문구와
     "비밀번호가 일치하지 않습니다" 가 성공 모양으로 보였다(#862) */
  const [accountStatus, setAccountStatus] = useState({ text: "", error: false });
  const setAccountMessage = useCallback((text: string, isError = false) => setAccountStatus({ text, error: isError }), []);
  const [accountSaving, setAccountSaving] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailChangeSentAt, setEmailChangeSentAt] = useState<string | null>(null);
  /* 비밀번호 로그인을 쓰는 계정인지 — GitHub 전용 계정에는 이메일·비밀번호 변경을 보여주지 않는다. */
  const [hasPassword, setHasPassword] = useState(true);

  const setInitialData = useCallback(
    (email: string, pending: string | null, sentAt: string | null, withPassword: boolean) => {
      setAccountEmail(email);
      setPendingEmail(pending);
      setEmailChangeSentAt(sentAt);
      setHasPassword(withPassword);
    },
    [],
  );

  const handleAccountUpdate = useCallback(async () => {
    if (!accountCurrentPassword) return;
    setAccountSaving(true);
    setAccountMessage("");
    try {
      const body: { currentPassword: string; email?: string; password?: string } = {
        currentPassword: accountCurrentPassword,
      };
      if (accountNewEmail !== accountEmail && accountNewEmail.trim() !== "") body.email = accountNewEmail;
      if (accountPassword) body.password = accountPassword;
      if (!body.email && !body.password) {
        setAccountMessage(t("admin.settings.noChanges"));
        return;
      }
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw errorFromBody(data, res.status);
      if (data.emailConfirmationSent) {
        setAccountMessage(t("admin.settings.emailConfirmationSent"));
        setPendingEmail(accountNewEmail);
        setEmailChangeSentAt(new Date().toISOString());
      } else {
        setAccountMessage(t("admin.settings.updateSuccess"));
      }
      setAccountNewEmail("");
      setAccountCurrentPassword("");
      setAccountPassword("");
      setAccountConfirm("");
      setShowPasswordConfirm(false);
      if (!data.emailConfirmationSent) {
        setTimeout(() => setAccountMessage(""), STATUS_MESSAGE_DISMISS_MS);
      }
    } catch (err) {
      setAccountMessage(errorText(err, t, t("admin.settings.accountUpdateFailed")), true);
    } finally {
      setAccountSaving(false);
    }
  }, [accountCurrentPassword, accountNewEmail, accountEmail, accountPassword, t, setAccountMessage]);

  return {
    accountEmail,
    accountNewEmail,
    setAccountNewEmail,
    accountPassword,
    setAccountPassword,
    accountConfirm,
    setAccountConfirm,
    accountCurrentPassword,
    setAccountCurrentPassword,
    accountMessage: accountStatus.text,
    accountMessageError: accountStatus.error,
    setAccountMessage,
    accountSaving,
    showPasswordConfirm,
    setShowPasswordConfirm,
    pendingEmail,
    setPendingEmail,
    emailChangeSentAt,
    setEmailChangeSentAt,
    hasPassword,
    setInitialData,
    handleAccountUpdate,
  };
}
