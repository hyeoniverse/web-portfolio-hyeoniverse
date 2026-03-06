"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
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
}: AccountTabProps) {
  const { t } = useLanguage();

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.email" /></h2>
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
        <div className={styles.fields}>
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
      </section>

      {/* Password Confirm Dialog */}
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
                if (e.key === "Enter" && accountCurrentPassword) {
                  handleAccountUpdate();
                }
                if (e.key === "Escape") {
                  setShowPasswordConfirm(false);
                }
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
