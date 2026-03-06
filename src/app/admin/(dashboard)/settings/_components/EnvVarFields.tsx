"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import styles from "../Settings.module.css";

interface EnvVarFieldsProps {
  provider: string;
  aiProvider: string;
  recaptchaEnabled: boolean;
  translateProvider: string;
}

export default function EnvVarFields({
  provider,
  aiProvider,
  recaptchaEnabled,
  translateProvider,
}: EnvVarFieldsProps) {
  const { t } = useLanguage();
  const [secrets, setSecrets] = useState<Record<string, { value: string; source: "db" | "env" | "none" }>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/secrets")
      .then((r) => r.json())
      .then((d) => setSecrets(d.secrets ?? {}))
      .catch(() => {});
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
  ];

  const visible = rows.filter((r) => r.show);
  if (visible.length === 0) return null;

  const hasEdits = Object.keys(edits).length > 0;

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
      // reload
      const fresh = await fetch("/api/admin/secrets").then((r) => r.json());
      setSecrets(fresh.secrets ?? {});
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg(t("admin.settings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.fields}>
      {visible.map(({ key, label }) => {
        const info = secrets[key];
        const isEditing = key in edits;
        const source = info?.source ?? "none";
        const displayValue = isEditing ? edits[key] : (source === "db" ? info.value : "");
        const placeholder = source === "env" ? info.value : t("admin.settings.envVarPlaceholder");

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
              />
              {isEditing && (
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
