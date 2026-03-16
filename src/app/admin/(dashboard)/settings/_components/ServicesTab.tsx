"use client";

import type { Dispatch, SetStateAction } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { SiteConfigData } from "@/config/site.config";
import Toggle from "@/components/ui/Toggle";
import Select from "@/components/ui/Select";
import type { SettingsTabProps } from "../_types";
import EnvVarFields from "./EnvVarFields";
import styles from "../Settings.module.css";

type AISummaryProvider = "gemini" | "openai" | "claude";
type TranslationProvider = "gemini" | "google" | "deepl" | "claude";

const AI_SUMMARY_OPTIONS: { value: AISummaryProvider; label: string }[] = [
  { value: "gemini", label: "Gemini 2.0 Flash" },
  { value: "openai", label: "OpenAI GPT-4o mini" },
  { value: "claude", label: "Claude Haiku 4.5" },
];

const TRANSLATION_OPTIONS: { value: TranslationProvider; label: string }[] = [
  { value: "gemini", label: "Gemini 2.0 Flash" },
  { value: "google", label: "Google Cloud Translation" },
  { value: "deepl", label: "DeepL API Free" },
  { value: "claude", label: "Claude Haiku 4.5" },
];

interface PriorityListProps<T extends string> {
  primary: T;
  priority: T[];
  options: { value: T; label: string }[];
  onChange: (next: T[]) => void;
}

function PriorityList<T extends string>({ primary, priority, options, onChange }: PriorityListProps<T>) {
  const nonPrimary = options.filter((o) => o.value !== primary);
  const ordered = priority.length
    ? priority.filter((p) => p !== primary)
    : nonPrimary.map((o) => o.value);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className={styles.priorityList}>
      {ordered.map((val, idx) => {
        const label = options.find((o) => o.value === val)?.label ?? val;
        return (
          <div key={val} className={styles.priorityItem}>
            <span className={styles.priorityBadge}>{idx + 1}</span>
            <span className={styles.priorityLabel}>{label}</span>
            <div className={styles.priorityBtns}>
              <button
                type="button"
                className={styles.priorityBtn}
                disabled={idx === 0}
                onClick={() => move(idx, -1)}
                aria-label="Move up"
              >▲</button>
              <button
                type="button"
                className={styles.priorityBtn}
                disabled={idx === ordered.length - 1}
                onClick={() => move(idx, 1)}
                aria-label="Move down"
              >▼</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ServicesTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

export default function ServicesTab({ config, update, setConfig }: ServicesTabProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Email Service */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.emailSettings" /></h2>
        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.emailServiceProvider" /></label>
            <Select
              value={config.emailService.provider}
              options={[
                { value: "formspree", label: "Formspree" },
                { value: "web3forms", label: "Web3Forms" },
                { value: "emailjs", label: "EmailJS" },
              ]}
              onChange={(v) => update("emailService", "provider", v as SiteConfigData["emailService"]["provider"])}
            />
          </div>
          <Toggle
            label={t("admin.settings.emailFileUpload")}
            checked={config.emailService.enableFileUpload}
            onChange={(v) => update("emailService", "enableFileUpload", v)}
          />
        </div>
      </section>

      {/* AI Cover */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.aiSettings" /></h2>
        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.aiCoverProvider" /></label>
            <Select
              value={config.aiCover.provider}
              options={[
                { value: "nanobanana", label: "NanoBanana (Gemini)" },
                { value: "huggingface", label: "Hugging Face (FLUX)" },
              ]}
              onChange={(v) => update("aiCover", "provider", v as SiteConfigData["aiCover"]["provider"])}
            />
          </div>
        </div>
      </section>

      {/* AI Summary */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.aiSummarySettings" /></h2>
        <div className={styles.fields}>
          <Toggle
            label={t("admin.settings.aiSummaryEnabled")}
            checked={config.aiSummary?.enabled !== false}
            onChange={(v) => setConfig((prev) => ({ ...prev, aiSummary: { ...prev.aiSummary, enabled: v } }))}
          />
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.aiSummaryProvider" /></label>
            <Select
              value={config.aiSummary?.provider ?? "gemini"}
              options={AI_SUMMARY_OPTIONS}
              onChange={(v) => update("aiSummary", "provider", v as SiteConfigData["aiSummary"]["provider"])}
            />
          </div>
          <Toggle
            label={t("admin.settings.fallbackEnabled")}
            checked={config.aiSummary?.fallback?.enabled ?? false}
            onChange={(v) => {
              const defaultPriority = AI_SUMMARY_OPTIONS
                .filter((o) => o.value !== (config.aiSummary?.provider ?? "gemini"))
                .map((o) => o.value) as AISummaryProvider[];
              setConfig((prev) => ({
                ...prev,
                aiSummary: {
                  ...prev.aiSummary,
                  fallback: {
                    enabled: v,
                    priority: prev.aiSummary?.fallback?.priority?.length
                      ? prev.aiSummary.fallback.priority
                      : defaultPriority,
                  },
                },
              }));
            }}
          />
          {(config.aiSummary?.fallback?.enabled) && (
            <div className={styles.fallbackSection}>
              <p className={styles.fallbackLabel}><T k="admin.settings.fallbackPriority" /></p>
              <PriorityList<AISummaryProvider>
                primary={(config.aiSummary?.provider ?? "gemini") as AISummaryProvider}
                priority={(config.aiSummary?.fallback?.priority ?? []) as AISummaryProvider[]}
                options={AI_SUMMARY_OPTIONS}
                onChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiSummary: {
                      ...prev.aiSummary,
                      fallback: { ...prev.aiSummary?.fallback, enabled: true, priority: next },
                    },
                  }))
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* Translation */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.translationSettings" /></h2>
        <div className={styles.fields}>
          <Toggle
            label={t("admin.settings.translationEnabled")}
            checked={config.translation?.enabled !== false}
            onChange={(v) => setConfig((prev) => ({ ...prev, translation: { ...prev.translation, enabled: v } }))}
          />
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.translationProvider" /></label>
            <Select
              value={config.translation?.provider ?? "deepl"}
              options={TRANSLATION_OPTIONS}
              onChange={(v) => update("translation", "provider", v as SiteConfigData["translation"]["provider"])}
            />
          </div>
          <Toggle
            label={t("admin.settings.fallbackEnabled")}
            checked={config.translation?.fallback?.enabled ?? false}
            onChange={(v) => {
              const defaultPriority = TRANSLATION_OPTIONS
                .filter((o) => o.value !== (config.translation?.provider ?? "deepl"))
                .map((o) => o.value) as TranslationProvider[];
              setConfig((prev) => ({
                ...prev,
                translation: {
                  ...prev.translation,
                  fallback: {
                    enabled: v,
                    priority: prev.translation?.fallback?.priority?.length
                      ? prev.translation.fallback.priority
                      : defaultPriority,
                  },
                },
              }));
            }}
          />
          {(config.translation?.fallback?.enabled) && (
            <div className={styles.fallbackSection}>
              <p className={styles.fallbackLabel}><T k="admin.settings.fallbackPriority" /></p>
              <PriorityList<TranslationProvider>
                primary={(config.translation?.provider ?? "deepl") as TranslationProvider}
                priority={(config.translation?.fallback?.priority ?? []) as TranslationProvider[]}
                options={TRANSLATION_OPTIONS}
                onChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      fallback: { ...prev.translation?.fallback, enabled: true, priority: next },
                    },
                  }))
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* Comment Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.commentNotifications" /></h2>
        <div className={styles.fields}>
          <Toggle
            label={t("admin.settings.commentEmailNotify")}
            checked={config.commentEmailNotify ?? false}
            onChange={(v) => setConfig((prev) => ({ ...prev, commentEmailNotify: v }))}
          />
          <p className={styles.fieldHint}><T k="admin.settings.commentEmailNotifyDesc" /></p>
        </div>
      </section>

      {/* Security */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.securitySettings" /></h2>
        <div className={styles.fields}>
          <Toggle
            label={t("admin.settings.recaptchaEnabled")}
            checked={config.recaptcha.enabled}
            onChange={(v) => update("recaptcha", "enabled", v)}
          />
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.recaptchaVersion" /></label>
            <Select
              value={config.recaptcha.version}
              options={[
                { value: "v2", label: "v2 (Checkbox)" },
                { value: "v3", label: "v3 (Invisible)" },
              ]}
              onChange={(v) => update("recaptcha", "version", v as SiteConfigData["recaptcha"]["version"])}
            />
          </div>
        </div>
      </section>

      {/* Environment Variables */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.envVars" /></h2>
        <EnvVarFields provider={config.emailService.provider} aiProvider={config.aiCover.provider} recaptchaEnabled={config.recaptcha.enabled} translateProvider={config.translation?.provider ?? "deepl"} commentEmailNotify={config.commentEmailNotify ?? false} summaryProvider={config.aiSummary?.provider ?? "gemini"} />
      </section>
    </>
  );
}
