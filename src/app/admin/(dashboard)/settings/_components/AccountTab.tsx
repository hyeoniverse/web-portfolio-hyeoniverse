"use client";

import { useState, useCallback, useEffect } from "react";
import { STATUS_MESSAGE_DISMISS_MS } from "@/constants";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone, Tablet, Check, Trash2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import CloseButton from "@/components/ui/CloseButton";
import Select from "@/components/ui/Select";
import FieldRow from "@/components/ui/FieldRow";
import TextLink from "@/components/ui/TextLink";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { parseUA } from "@/lib/auth/uaParser";
import type { AccountTabProps } from "../_types";
import Field from "./SettingsFormFields";
import styles from "./AccountTab.module.css";
import shared from "../Settings.module.css";

interface DeviceRow {
  id: string;
  user_agent: string;
  ip_address: string;
  approved: boolean;
  first_seen_at: string;
  last_seen_at: string;
  isCurrent: boolean;
}

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
  const { t, language } = useLanguage();
  const router = useRouter();
  const { openModal } = useModalStore();
  const [resending, setResending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const res = await fetch("/api/admin/auth/devices");
      const data = await res.json();
      if (res.ok) setDevices(data.devices ?? []);
    } catch {
      setDevices([]);
    }
    setDevicesLoading(false);
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleRevokeDevice = useCallback(
    (device: DeviceRow) => {
      openModal(
        <ModalConfirm
          desc={t(device.isCurrent ? "admin.settings.revokeCurrentDeviceDesc" : "admin.settings.revokeDeviceDesc")}
          confirmText={t("admin.settings.revokeDevice")}
          danger
          onConfirm={async () => {
            await fetch(`/api/admin/auth/devices/${device.id}`, { method: "DELETE" });
            fetchDevices();
          }}
        />,
        {
          id: "revoke-device",
          header: { title: t("admin.settings.revokeDeviceTitle") },
          closeButton: true,
          width: "420px",
        },
      );
    },
    [t, openModal, fetchDevices],
  );

  const formatRelative = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return language === "ko" ? "방금 전" : "just now";
    if (mins < 60) return language === "ko" ? `${mins}분 전` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return language === "ko" ? `${hours}시간 전` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return language === "ko" ? `${days}일 전` : `${days}d ago`;
    return new Date(iso).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const deviceIcon = (kind: "mobile" | "tablet" | "desktop") => {
    if (kind === "mobile") return <Smartphone size={16} strokeWidth={1.6} />;
    if (kind === "tablet") return <Tablet size={16} strokeWidth={1.6} />;
    return <Monitor size={16} strokeWidth={1.6} />;
  };

  const handleSignOutAll = useCallback(() => {
    openModal(
      <ModalConfirm
        desc={t("admin.settings.signOutAllConfirmDesc")}
        confirmText={t("admin.settings.signOutAllConfirm")}
        danger
        onConfirm={async () => {
          setSigningOutAll(true);
          try {
            const res = await fetch("/api/admin/auth/logout-all", { method: "POST" });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Failed");
            }
            // 현재 세션도 무효화됨 → login 페이지로
            router.push("/admin/login");
            router.refresh();
          } catch (err) {
            setAccountMessage(`Error: ${err instanceof Error ? err.message : "Failed"}`);
            setSigningOutAll(false);
          }
        }}
      />,
      {
        id: "signout-all",
        header: { title: t("admin.settings.signOutAllTitle") },
        closeButton: true,
        width: "420px",
      },
    );
  }, [t, openModal, router, setAccountMessage]);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      const res = await fetch("/api/admin/account", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccountMessage(t("admin.settings.emailResent"));
      setTimeout(() => setAccountMessage(""), STATUS_MESSAGE_DISMISS_MS);
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
      setTimeout(() => setAccountMessage(""), STATUS_MESSAGE_DISMISS_MS);
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
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <div className={shared.sectionTitleRow}>
          <h2 className={shared.sectionTitle}><T k="admin.settings.authSettingsTitle" /></h2>
          <TextLink href="https://supabase.com/docs/guides/auth/passwords" external>
            Supabase Auth Docs
          </TextLink>
        </div>
        <p className={shared.sectionHint}>
          <T k="admin.settings.authSettingsDesc" />
        </p>
        <ul className={shared.sectionHintList}>
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

      <section className={shared.section}>
        <h2 className={shared.sectionTitle}><T k="admin.settings.email" /></h2>
        <ul className={shared.sectionHintList}>
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
              <Button variant="outline" size="md" onClick={handleResend} disabled={resending}>
                {resending ? <T k="admin.settings.resending" /> : <T k="admin.settings.resendEmail" />}
              </Button>
              <Button variant="ghost" size="md" onClick={handleCancelEmailChange} disabled={cancelling}>
                {cancelling ? <T k="admin.settings.cancelling" /> : <T k="admin.settings.cancelChange" />}
              </Button>
            </div>
          </div>
        )}

        <div className={shared.fields}>
          <FieldRow label={<T k="admin.settings.currentEmail" />}>
            <span className={styles.fieldValue}>{accountEmail}</span>
          </FieldRow>
          <Field
            label={t("admin.settings.newEmail")}
            value={accountNewEmail}
            onChange={setAccountNewEmail}
            placeholder={t("admin.settings.newEmailPlaceholder")}
          />
        </div>
      </section>

      <section className={shared.section}>
        <h2 className={shared.sectionTitle}><T k="admin.settings.password" /></h2>
        <ul className={shared.sectionHintList}>
          <li><T k="admin.settings.securePasswordChangeHint" /></li>
          <li>
            {passwordPolicy === "secure"
              ? <T k="admin.settings.passwordRuleSecure" />
              : <T k="admin.settings.passwordRuleDefault" />
            }
          </li>
        </ul>
        <div className={shared.fields}>
          <div className={shared.fieldPair}>
            <FieldRow label={<T k="admin.settings.passwordPolicyLabel" />}>
              <Select
                value={passwordPolicy}
                options={[
                  { value: "secure", label: t("admin.settings.passwordPolicySecure") },
                  { value: "default", label: t("admin.settings.passwordPolicyDefault") },
                ]}
                onChange={onPasswordPolicyChange}
              />
            </FieldRow>
          </div>
          <div className={shared.fieldPair}>
            <FieldRow label={<T k="admin.settings.newPassword" />}>
              <Input
                type="password"
                value={accountPassword}
                onChange={setAccountPassword}
                placeholder={t("admin.settings.leaveBlank")}
              />
            </FieldRow>
            <FieldRow label={<T k="admin.settings.confirmPassword" />}>
              <Input
                type="password"
                value={accountConfirm}
                onChange={setAccountConfirm}
                placeholder={t("admin.settings.confirmPlaceholder")}
              />
            </FieldRow>
          </div>
        </div>
      </section>

      {/* Security — sessions / devices */}
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <h2 className={shared.sectionTitle}><T k="admin.settings.securityTitle" /></h2>
        <ul className={shared.sectionHintList}>
          <li><T k="admin.settings.signOutAllHint" /></li>
        </ul>

        {/* 등록된 기기 목록 — admin_known_devices */}
        <div className={styles.devicesWrap}>
          <div className={styles.devicesHeader}>
            <span className={styles.devicesTitle}>
              <T k="admin.settings.devicesTitle" />
            </span>
            <span className={styles.devicesCount}>{devices.length}</span>
          </div>
          {devicesLoading ? (
            <div className={styles.devicesEmpty}><T k="admin.settings.devicesLoading" /></div>
          ) : devices.length === 0 ? (
            <div className={styles.devicesEmpty}><T k="admin.settings.devicesEmpty" /></div>
          ) : (
            <ul className={styles.devicesList}>
              {devices.map((d) => {
                const p = parseUA(d.user_agent);
                return (
                  <li
                    key={d.id}
                    className={`${styles.deviceRow} ${d.isCurrent ? styles.deviceCurrent : ""} ${!d.approved ? styles.devicePending : ""}`}
                  >
                    <span className={styles.deviceIcon}>{deviceIcon(p.device)}</span>
                    <div className={styles.deviceInfo}>
                      <div className={styles.deviceName}>
                        {p.browser} · {p.os}
                        {d.isCurrent && (
                          <span className={styles.deviceCurrentBadge}>
                            <Check size={10} strokeWidth={2.5} />
                            <T k="admin.settings.deviceCurrentBadge" />
                          </span>
                        )}
                        {!d.approved && (
                          <span className={styles.devicePendingBadge}>
                            <T k="admin.settings.devicePendingBadge" />
                          </span>
                        )}
                      </div>
                      <div className={styles.deviceMeta}>
                        {d.ip_address && <span>{d.ip_address}</span>}
                        <span>{formatRelative(d.last_seen_at)}</span>
                      </div>
                    </div>
                    <button
                      className={styles.deviceRevokeBtn}
                      onClick={() => handleRevokeDevice(d)}
                      aria-label={t("admin.settings.revokeDevice")}
                      title={t("admin.settings.revokeDevice")}
                    >
                      <Trash2 size={13} strokeWidth={1.6} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={shared.fields}>
          <FieldRow label={<T k="admin.settings.signOutAllLabel" />}>
            <Button
              variant="outline"
              size="md"
              tone="danger"
              onClick={handleSignOutAll}
              disabled={signingOutAll}
            >
              {signingOutAll ? <T k="admin.settings.saving" /> : <T k="admin.settings.signOutAllAction" />}
            </Button>
          </FieldRow>
        </div>
      </section>

      {showPasswordConfirm && (() => {
        const closeConfirm = () => {
          setShowPasswordConfirm(false);
          setAccountCurrentPassword("");
          setAccountMessage("");
        };
        return (
          <div className={styles.confirmOverlay} onClick={closeConfirm}>
            <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
              <CloseButton className={styles.confirmClose} size="md" onClick={closeConfirm} ariaLabel={t("admin.settings.cancel")} />
              <h3 className={styles.confirmTitle}><T k="admin.settings.currentPassword" /></h3>
              <p className={styles.confirmDesc}>
                <T k="admin.settings.confirmPasswordDesc" />
              </p>
              <Input
                type="password"
                value={accountCurrentPassword}
                onChange={setAccountCurrentPassword}
                placeholder={t("admin.settings.currentPasswordPlaceholder")}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && accountCurrentPassword) handleAccountUpdate();
                  if (e.key === "Escape") closeConfirm();
                }}
              />
              {accountMessage && (
                <span className={`${shared.message} ${accountMessage.startsWith("Error") ? shared.messageError : shared.messageSuccess}`}>
                  {accountMessage}
                </span>
              )}
              <div className={styles.confirmActions}>
                <Button
                  variant="primary"
                  size="md"
                  disabled={accountSaving || !accountCurrentPassword}
                  loading={accountSaving}
                  onClick={handleAccountUpdate}
                >
                  <T k="admin.settings.confirm" />
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
