"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import T from "@/components/ui/T";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import styles from "../Settings.module.css";

interface EnvVarFieldsProps {
  provider: string;
  aiProvider: string;
  recaptchaEnabled: boolean;
  translateProvider: string;
  commentEmailNotify: boolean;
  summaryProvider?: string;
}

export default function EnvVarFields({
  provider,
  aiProvider,
  recaptchaEnabled,
  translateProvider,
  commentEmailNotify: _commentEmailNotify,
  summaryProvider = "gemini",
}: EnvVarFieldsProps) {
  const { t } = useLanguage();
  const { openModal, closeModal } = useModalStore();
  const [secrets, setSecrets] = useState<Record<string, { value: string; source: "db" | "env" | "none" }>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/secrets")
      .then((r) => r.json())
      .then((d) => setSecrets(d.secrets ?? {}))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  type FieldRow = { key: string; label: string; show: boolean };

  const groups: { label: string; rows: FieldRow[] }[] = [
    {
      label: "이메일 서비스",
      rows: [
        { key: "NEXT_PUBLIC_WEB3FORMS_KEY", label: "Web3Forms Key", show: provider === "web3forms" },
        { key: "NEXT_PUBLIC_FORMSPREE_ID", label: "Formspree ID", show: provider === "formspree" },
        { key: "NEXT_PUBLIC_EMAILJS_SERVICE_ID", label: "EmailJS Service ID", show: provider === "emailjs" },
        { key: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", label: "EmailJS Template ID", show: provider === "emailjs" },
        { key: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", label: "EmailJS Public Key", show: provider === "emailjs" },
      ],
    },
    {
      label: "보안",
      rows: [
        { key: "NEXT_PUBLIC_RECAPTCHA_SITE_KEY", label: "reCAPTCHA Site Key", show: recaptchaEnabled },
      ],
    },
    {
      label: "게시물 커버",
      rows: [
        { key: "NANOBANANA_API_KEY", label: "NanoBanana API Key", show: aiProvider === "nanobanana" },
        { key: "HUGGINGFACE_API_KEY", label: "Hugging Face Token", show: aiProvider === "huggingface" },
        { key: "UNSPLASH_ACCESS_KEY", label: "Unsplash Access Key", show: true },
      ],
    },
    {
      label: "AI (요약 / 번역)",
      rows: [
        { key: "GEMINI_API_KEY", label: "Gemini API Key", show: translateProvider === "gemini" || summaryProvider === "gemini" },
        { key: "GOOGLE_TRANSLATE_API_KEY", label: "Google Translate API Key", show: translateProvider === "google" },
        { key: "DEEPL_API_KEY", label: "DeepL API Key", show: translateProvider === "deepl" },
        { key: "OPENAI_API_KEY", label: "OpenAI API Key", show: summaryProvider === "openai" },
      ],
    },
    {
      label: "알림",
      rows: [
        { key: "RESEND_API_KEY", label: "Resend API Key", show: true },
      ],
    },
  ];

  const visibleGroups = groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.show) }))
    .filter((g) => g.rows.length > 0);

  const visible = visibleGroups.flatMap((g) => g.rows);

  const hasEdits = Object.keys(edits).length > 0;

  const handleReveal = useCallback(
    (key: string) => {
      if (key in revealed) {
        setRevealed((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return;
      }

      const modalId = "pw-reveal";

      const doReveal = async (password: string) => {
        try {
          const res = await fetch("/api/admin/secrets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, key }),
          });
          if (!res.ok) {
            // Re-open with error
            openModal(
              <ModalPrompt
                placeholder={t("admin.settings.enterPassword")}
                inputType="password"
                cancelText={t("admin.settings.cancel")}
                confirmText={t("admin.settings.confirm")}
                error={t("admin.settings.wrongPassword")}
                closeOnConfirm={false}
                onConfirm={doReveal}
                onCancel={() => closeModal(modalId)}
              />,
              {
                id: modalId,
                header: { title: t("admin.settings.enterPassword") },
                width: "360px",
                closeButton: false,
              }
            );
            return;
          }
          const { value } = await res.json();
          setRevealed((prev) => ({ ...prev, [key]: value }));
          closeModal(modalId);
        } catch {
          closeModal(modalId);
        }
      };

      openModal(
        <ModalPrompt
          placeholder={t("admin.settings.enterPassword")}
          inputType="password"
          cancelText={t("admin.settings.cancel")}
          confirmText={t("admin.settings.confirm")}
          closeOnConfirm={false}
          onConfirm={doReveal}
          onCancel={() => closeModal(modalId)}
        />,
        {
          id: modalId,
          header: { title: t("admin.settings.enterPassword") },
          width: "360px",
          closeButton: false,
        }
      );
    },
    [revealed, openModal, closeModal, t]
  );

  const handleSaveSecrets = async () => {
    if (!hasEdits) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/secrets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: edits }),
      });
      if (!res.ok) throw new Error("Failed");
      setEdits({});
      setMsg(t("admin.settings.envVarSaved"));
      const fresh = await fetch("/api/admin/secrets").then((r) => r.json());
      setSecrets(fresh.secrets ?? {});
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg(t("admin.settings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (visible.length === 0) return null;

  const renderField = (key: string, label: string) => {
    const info = secrets[key];
    const isEditing = key in edits;
    const source = info?.source ?? "none";
    const isRevealed = key in revealed;
    const displayValue = isEditing ? edits[key] : isRevealed ? revealed[key] : "";
    const placeholder = !loaded ? "..." : source !== "none" ? info.value : t("admin.settings.envVarPlaceholder");

    return (
      <div key={key} className={`${styles.fieldRow} ${styles.envFieldRow}`}>
        <label className={`${styles.fieldLabel}${loaded && source === "none" && !isEditing ? ` ${styles.envLabelMissing}` : ""}`}>
          {label}
          {source === "env" && !isEditing && (
            <span className={styles.envSourceBadge}>.env</span>
          )}
          {source === "db" && !isEditing && (
            <span className={styles.envSourceBadge}>DB</span>
          )}
        </label>
        <div className={styles.envInputRow}>
          <input
            className={styles.fieldInput}
            type="text"
            value={displayValue}
            placeholder={placeholder}
            onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
            onBlur={() => {
              if (isEditing && edits[key] === "") {
                setEdits((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              }
            }}
          />
          {source !== "none" && !isEditing && (
            <button
              type="button"
              className={styles.envRevealBtn}
              onClick={() => handleReveal(key)}
              title={isRevealed ? "Hide" : "Reveal"}
            >
              {isRevealed ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
          {isEditing && edits[key] !== "" && (
            <button
              type="button"
              className={styles.envCancelBtn}
              onClick={() => setEdits((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              })}
            >
              &times;
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.fields}>
      {visibleGroups.flatMap((group) => group.rows.map(({ key, label }) => renderField(key, label)))}
      {(hasEdits || msg) && (
        <div className={styles.envActions}>
          {msg && <span className={styles.envMsg}>{msg}</span>}
          {hasEdits && (
            <button
              type="button"
              className={styles.envSaveBtn}
              onClick={handleSaveSecrets}
              disabled={saving}
            >
              {saving ? <T k="admin.settings.saving" /> : <T k="admin.settings.envVarSave" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
