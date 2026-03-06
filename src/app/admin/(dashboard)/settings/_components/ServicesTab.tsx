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

      {/* Translation */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Translation</h2>
        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}>Provider</label>
            <Select
              value={config.translation?.provider ?? "deepl"}
              options={[
                { value: "gemini", label: "Gemini 2.0 Flash" },
                { value: "google", label: "Google Cloud Translation" },
                { value: "deepl", label: "DeepL API Free" },
              ]}
              onChange={(v) => update("translation", "provider", v as SiteConfigData["translation"]["provider"])}
            />
          </div>
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
        <EnvVarFields provider={config.emailService.provider} aiProvider={config.aiCover.provider} recaptchaEnabled={config.recaptcha.enabled} translateProvider={config.translation?.provider ?? "deepl"} />
      </section>
    </>
  );
}
