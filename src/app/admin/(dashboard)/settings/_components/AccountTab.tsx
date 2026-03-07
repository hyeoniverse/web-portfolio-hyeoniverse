"use client";

import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import TextLink from "@/components/ui/TextLink";
import type { AccountTabProps } from "../_types";
import Field from "./SettingsFormFields";
import styles from "../Settings.module.css";

export default function AccountTab({
  accountEmail,
  accountNewEmail,
  setAccountNewEmail,
  accountPassword,
  setAccountPassword,
  accountConfirm,
  setAccountConfirm,
  accountCurrentPassword,
  setAccountCurrentPassword,
  accountMessage,
  setAccountMessage,
  accountSaving,
  showPasswordConfirm,
  setShowPasswordConfirm,
  handleAccountUpdate,
  pendingEmail,
  emailChangeSentAt,
  onCancelPendingEmail,
  passwordPolicy,
  onPasswordPolicyChange,
}: AccountTabProps) {
  const { t } = useLanguage();
  const [resending, setResending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      const res = await fetch("/api/admin/account", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccountMessage(t("admin.settings.emailResent"));
      setTimeout(() => setAccountMessage(""), 3000);
    } catch (err) {
      setAccountMessage(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setResending(false);
    }
  }, [t, setAccountMessage]);

  const handleCancelEmailChange = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/admin/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCancelPendingEmail();
      setAccountMessage(t("admin.settings.emailChangeCancelled"));
      setTimeout(() => setAccountMessage(""), 3000);
    } catch (err) {
      setAccountMessage(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setCancelling(false);
    }
  }, [t, setAccountMessage, onCancelPendingEmail]);

  // 만료 감지 시 자동 취소
  useEffect(() => {
    if (!pendingEmail || !emailChangeSentAt) return;
    const sent = new Date(emailChangeSentAt).getTime();
    const remaining = sent + 3600 * 1000 - Date.now();
    if (remaining <= 0) {
      // 이미 만료됨 — 즉시 취소
      fetch("/api/admin/account", { method: "DELETE" }).then(() => onCancelPendingEmail());
      return;
    }
    // 만료 시점에 자동 취소
    const timer = setTimeout(() => {
      fetch("/api/admin/account", { method: "DELETE" }).then(() => onCancelPendingEmail());
    }, remaining);
    return () => clearTimeout(timer);
  }, [pendingEmail, emailChangeSentAt, onCancelPendingEmail]);

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  const getTimeRemaining = (iso: string) => {
    const sent = new Date(iso).getTime();
    const expires = sent + 3600 * 1000; // 1시간
    const remaining = expires - Date.now();
    if (remaining <= 0) return t("admin.settings.linkExpired");
    const mins = Math.ceil(remaining / 60000);
    return mins >= 60
      ? `${Math.floor(mins / 60)}${t("admin.settings.timeHour")} ${mins % 60}${t("admin.settings.timeMin")}`
      : `${mins}${t("admin.settings.timeMin")}`;
  };

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}><T k="admin.settings.authSettingsTitle" /></h2>
          <TextLink href="https://supabase.com/docs/guides/auth/passwords" external>
            Supabase Auth Docs ↗
          </TextLink>
        </div>
        <p className={styles.sectionHint}>
          <T k="admin.settings.authSettingsDesc" />
        </p>
        <ul className={styles.sectionHintList}>
          <li>
            <span className={styles.hintLabel}>Secure email change, Secure password change, Email OTP Expiration</span>
            <br />
            <T k="admin.settings.authSettingsPath1" />
          </li>
          <li>
            <span className={styles.hintLabel}><T k="admin.settings.emailTemplateLabel" /></span>
            <br />
            <T k="admin.settings.authSettingsPath2" />
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.email" /></h2>
        <ul className={styles.sectionHintList}>
          <li><T k="admin.settings.secureEmailChangeHint1" /></li>
          <li><T k="admin.settings.secureEmailChangeHint2" /></li>
        </ul>

        {pendingEmail && (
          <div className={styles.pendingEmailBanner}>
            <div className={styles.pendingEmailInfo}>
              <span className={styles.pendingEmailLabel}>
                <T k="admin.settings.pendingEmailChange" />
                {emailChangeSentAt && (
                  <span className={styles.pendingEmailExpiry}>
                    {getTimeRemaining(emailChangeSentAt)}
                  </span>
                )}
              </span>
              <span className={styles.pendingEmailValue}>{pendingEmail}</span>
              {emailChangeSentAt && (
                <span className={styles.pendingEmailDate}>
                  {formatDate(emailChangeSentAt)}
                </span>
              )}
            </div>
            <div className={styles.pendingEmailActions}>
              <Button variant="outline" size="xs" onClick={handleResend} disabled={resending}>
                {resending ? <T k="admin.settings.resending" /> : <T k="admin.settings.resendEmail" />}
              </Button>
              <Button variant="ghost" size="xs" onClick={handleCancelEmailChange} disabled={cancelling}>
                {cancelling ? <T k="admin.settings.cancelling" /> : <T k="admin.settings.cancelChange" />}
              </Button>
            </div>
          </div>
        )}

        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.currentEmail" /></label>
            <span className={styles.fieldValue}>{accountEmail}</span>
          </div>
          <Field
            label={t("admin.settings.newEmail")}
            value={accountNewEmail}
            onChange={setAccountNewEmail}
            placeholder={t("admin.settings.newEmailPlaceholder")}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.password" /></h2>
        <ul className={styles.sectionHintList}>
          <li><T k="admin.settings.securePasswordChangeHint" /></li>
          <li>
            {passwordPolicy === "secure"
              ? <T k="admin.settings.passwordRuleSecure" />
              : <T k="admin.settings.passwordRuleDefault" />
            }
          </li>
        </ul>
        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.passwordPolicyLabel" /></label>
            <Select
              value={passwordPolicy}
              options={[
                { value: "secure", label: t("admin.settings.passwordPolicySecure") },
                { value: "default", label: t("admin.settings.passwordPolicyDefault") },
              ]}
              onChange={onPasswordPolicyChange}
            />
          </div>
          <div className={styles.fieldGroup}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}><T k="admin.settings.newPassword" /></label>
              <input
                className={styles.fieldInput}
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder={t("admin.settings.leaveBlank")}
              />
            </div>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}><T k="admin.settings.confirmPassword" /></label>
              <input
                className={styles.fieldInput}
                type="password"
                value={accountConfirm}
                onChange={(e) => setAccountConfirm(e.target.value)}
                placeholder={t("admin.settings.confirmPlaceholder")}
              />
            </div>
          </div>
        </div>
      </section>

      {showPasswordConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setShowPasswordConfirm(false)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}><T k="admin.settings.currentPassword" /></h3>
            <p className={styles.confirmDesc}>
              <T k="admin.settings.confirmPasswordDesc" />
            </p>
            <input
              className={styles.fieldInput}
              type="password"
              value={accountCurrentPassword}
              onChange={(e) => setAccountCurrentPassword(e.target.value)}
              placeholder={t("admin.settings.currentPasswordPlaceholder")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && accountCurrentPassword) handleAccountUpdate();
                if (e.key === "Escape") setShowPasswordConfirm(false);
              }}
            />
            {accountMessage && (
              <span className={`${styles.message} ${accountMessage.startsWith("Error") ? styles.messageError : styles.messageSuccess}`}>
                {accountMessage}
              </span>
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancelBtn}
                onClick={() => {
                  setShowPasswordConfirm(false);
                  setAccountCurrentPassword("");
                  setAccountMessage("");
                }}
              >
                <T k="admin.settings.cancel" />
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                disabled={accountSaving || !accountCurrentPassword}
                onClick={handleAccountUpdate}
              >
                {accountSaving ? <T k="admin.settings.saving" /> : <T k="admin.settings.confirm" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
