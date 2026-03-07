"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import styles from "../Settings.module.css";

interface EnvVarFieldsProps {
  provider: string;
  aiProvider: string;
  recaptchaEnabled: boolean;
  translateProvider: string;
  commentEmailNotify: boolean;
}

/** Password prompt rendered inside the global Modal */
function PasswordPrompt({
  onSubmit,
  onCancel,
  error,
}: {
  onSubmit: (pw: string) => void;
  onCancel: () => void;
  error: string;
}) {
  const { t } = useLanguage();
  const [pw, setPw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className={styles.pwPrompt}
      onSubmit={(e) => {
        e.preventDefault();
        if (pw) onSubmit(pw);
      }}
    >
      <input
        ref={inputRef}
        className={styles.fieldInput}
        type="password"
        value={pw}
        placeholder={t("admin.settings.enterPassword")}
        onChange={(e) => setPw(e.target.value)}
        autoComplete="current-password"
      />
      {error && <p className={styles.pwError}>{error}</p>}
      <div className={styles.pwActions}>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <T k="admin.settings.cancel" />
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!pw}>
          <T k="admin.settings.confirm" />
        </Button>
      </div>
    </form>
  );
}

export default function EnvVarFields({
  provider,
  aiProvider,
  recaptchaEnabled,
  translateProvider,
  commentEmailNotify: _commentEmailNotify,
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

  const rows: { key: string; label: string; show: boolean }[] = [
    { key: "NEXT_PUBLIC_WEB3FORMS_KEY", label: "Web3Forms Key", show: provider === "web3forms" },
    { key: "NEXT_PUBLIC_FORMSPREE_ID", label: "Formspree ID", show: provider === "formspree" },
    { key: "NEXT_PUBLIC_EMAILJS_SERVICE_ID", label: "EmailJS Service ID", show: provider === "emailjs" },
    { key: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", label: "EmailJS Template ID", show: provider === "emailjs" },
    { key: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", label: "EmailJS Public Key", show: provider === "emailjs" },
    { key: "NEXT_PUBLIC_RECAPTCHA_SITE_KEY", label: "reCAPTCHA Site Key", show: recaptchaEnabled },
    { key: "NANOBANANA_API_KEY", label: "NanoBanana API Key", show: aiProvider === "nanobanana" },
    { key: "HUGGINGFACE_API_KEY", label: "Hugging Face Token", show: aiProvider === "huggingface" },
    { key: "GEMINI_API_KEY", label: "Gemini API Key", show: translateProvider === "gemini" },
    { key: "GOOGLE_TRANSLATE_API_KEY", label: "Google Translate API Key", show: translateProvider === "google" },
    { key: "DEEPL_API_KEY", label: "DeepL API Key", show: translateProvider === "deepl" },
    { key: "RESEND_API_KEY", label: "Resend API Key", show: true },
  ];

  const visible = rows.filter((r) => r.show);

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
              <PasswordPrompt
                onSubmit={doReveal}
                onCancel={() => closeModal(modalId)}
                error={t("admin.settings.wrongPassword")}
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
        <PasswordPrompt
          onSubmit={doReveal}
          onCancel={() => closeModal(modalId)}
          error=""
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

  return (
    <div className={styles.fields}>
      {visible.map(({ key, label }) => {
        const info = secrets[key];
        const isEditing = key in edits;
        const source = info?.source ?? "none";
        const isRevealed = key in revealed;
        const displayValue = isEditing ? edits[key] : isRevealed ? revealed[key] : "";
        const placeholder = !loaded ? "..." : source !== "none" ? info.value : t("admin.settings.envVarPlaceholder");

        return (
          <div key={key} className={styles.fieldRow}>
            <label className={styles.fieldLabel}>
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
      })}
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
