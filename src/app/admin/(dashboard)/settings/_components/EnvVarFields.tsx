"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import T from "@/components/ui/T";
import { ModalPrompt, ModalConfirm } from "@/components/ui/ModalTemplates";
import Tooltip from "@/components/ui/Tooltip";
import styles from "../Settings.module.css";

interface EnvVarFieldsProps {
  provider: string;
  aiProvider: string;
  aiProviderFallbacks?: string[];
  recaptchaEnabled: boolean;
  translateProvider: string;
  translateFallbacks?: string[];
  commentEmailNotify: boolean;
  summaryProvider?: string;
  summaryFallbacks?: string[];
}

export default function EnvVarFields({
  provider,
  aiProvider,
  aiProviderFallbacks = [],
  recaptchaEnabled,
  translateProvider,
  translateFallbacks = [],
  commentEmailNotify: _commentEmailNotify,
  summaryProvider = "gemini",
  summaryFallbacks = [],
}: EnvVarFieldsProps) {
  const { t } = useLanguage();
  const { openModal, closeModal } = useModalStore();
  const [secrets, setSecrets] = useState<Record<string, { value: string; source: "db" | "env" | "none"; readOnly?: boolean }>>({});
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

  type FieldRow = { key: string; label: string };

  const PROVIDER_KEYS: Record<string, { key: string; label: string }[]> = {
    nanobanana: [{ key: "NANOBANANA_API_KEY", label: "NanoBanana API Key" }],
    huggingface: [{ key: "HUGGINGFACE_API_KEY", label: "Hugging Face Token" }],
    gemini: [{ key: "GEMINI_API_KEY", label: "Gemini API Key" }],
    google: [{ key: "GOOGLE_TRANSLATE_API_KEY", label: "Google Translate API Key" }],
    deepl: [{ key: "DEEPL_API_KEY", label: "DeepL API Key" }],
    openai: [{ key: "OPENAI_API_KEY", label: "OpenAI API Key" }],
    claude: [{ key: "ANTHROPIC_API_KEY", label: "Anthropic API Key" }],
  };

  const toRows = (providers: string[]): FieldRow[] => {
    const seen = new Set<string>();
    const rows: FieldRow[] = [];
    for (const p of providers) {
      for (const r of PROVIDER_KEYS[p] ?? []) {
        if (!seen.has(r.key)) { seen.add(r.key); rows.push(r); }
      }
    }
    return rows;
  };

  const coverProviders = [aiProvider, ...aiProviderFallbacks];
  const sumProviders = [summaryProvider, ...summaryFallbacks];
  const transProviders = [translateProvider, ...translateFallbacks];

  const emailRows: FieldRow[] = [
    provider === "web3forms" && { key: "NEXT_PUBLIC_WEB3FORMS_KEY", label: "Web3Forms Key" },
    provider === "formspree" && { key: "NEXT_PUBLIC_FORMSPREE_ID", label: "Formspree ID" },
    ...(provider === "emailjs" ? [
      { key: "NEXT_PUBLIC_EMAILJS_SERVICE_ID", label: "EmailJS Service ID" },
      { key: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", label: "EmailJS Template ID" },
      { key: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", label: "EmailJS Public Key" },
    ] : []),
  ].filter(Boolean) as FieldRow[];

  const infraRows: FieldRow[] = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase Anon Key" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key" },
  ];

  const groups: { label: string; rows: FieldRow[] }[] = [
    { label: "인프라", rows: infraRows },
    { label: "이메일 서비스", rows: emailRows },
    { label: "보안", rows: recaptchaEnabled ? [{ key: "NEXT_PUBLIC_RECAPTCHA_SITE_KEY", label: "reCAPTCHA Site Key" }] : [] },
    { label: "커버 이미지", rows: [...toRows(coverProviders), { key: "UNSPLASH_ACCESS_KEY", label: "Unsplash Access Key" }] },
    { label: "AI 요약", rows: toRows(sumProviders) },
    { label: "번역", rows: toRows(transProviders) },
    { label: "알림", rows: [{ key: "RESEND_API_KEY", label: "Resend API Key" }] },
  ];

  const visibleGroups = groups.filter((g) => g.rows.length > 0);

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

  const handleDelete = useCallback(
    (key: string) => {
      const modalId = "delete-secret";

      const doDelete = async () => {
        const res = await fetch("/api/admin/secrets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (res.ok) {
          setSecrets((prev) => ({
            ...prev,
            [key]: { value: "", source: "none" },
          }));
          setRevealed((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      };

      openModal(
        <ModalConfirm
          desc={t("admin.settings.envVarDeleteDesc")}
          cancelText={t("admin.settings.cancel")}
          confirmText={t("admin.settings.envVarDelete")}
          danger
          onConfirm={doDelete}
          onCancel={() => closeModal(modalId)}
        />,
        {
          id: modalId,
          header: { title: t("admin.settings.envVarDeleteConfirm") },
          width: "360px",
          closeButton: false,
        }
      );
    },
    [openModal, closeModal, t]
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
    const isReadOnly = info?.readOnly === true;
    const isEditing = !isReadOnly && key in edits;
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
          {isReadOnly && (
            <span className={styles.envSourceBadge}>Read-only</span>
          )}
        </label>
        <div className={styles.envFieldRight}>
        <div className={styles.envInputRow}>
          <input
            className={styles.fieldInput}
            type="text"
            value={isReadOnly ? "" : displayValue}
            placeholder={placeholder}
            onChange={isReadOnly ? undefined : (e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
            readOnly={isReadOnly}
            disabled={isReadOnly}
            onBlur={isReadOnly ? undefined : () => {
              if (isEditing && edits[key] === "") {
                setEdits((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              }
            }}
          />
          {!isReadOnly && (source === "db" || source === "env") && !isEditing && (
            <Tooltip
              content={source === "env" ? t("admin.settings.envVarEnvHint") : undefined}
              disabled={source !== "env"}
              placement="top"
            >
              <button
                type="button"
                className={`${styles.envDeleteBtn}${source === "env" ? ` ${styles.envDeleteBtnDisabled}` : ""}`}
                onClick={source === "env" ? undefined : () => handleDelete(key)}
                disabled={source === "env"}
                title={source === "env" ? undefined : t("admin.settings.envVarDelete")}
                aria-disabled={source === "env"}
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          )}
          {source !== "none" && !isEditing && (
            <button
              type="button"
              className={styles.envRevealBtn}
              onClick={() => handleReveal(key)}
              title={isRevealed ? "Hide" : "Reveal"}
            >
              {isRevealed ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
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
        {source === "env" && !isEditing && (
          <span className={styles.envHintMobile}>{t("admin.settings.envVarEnvHint")}</span>
        )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.fields}>
      {visibleGroups.map((group) => (
        <div key={group.label} className={styles.envGroup}>
          <p className={styles.envGroupLabel}>{group.label}</p>
          {group.rows.map(({ key, label }) => renderField(key, label))}
        </div>
      ))}
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
