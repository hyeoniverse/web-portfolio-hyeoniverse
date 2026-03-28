"use client";

import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { SiteConfigData } from "@/config/site.config";
import Toggle from "@/components/ui/Toggle";
import { Switch } from "@/components/ui/Switch";
import Select from "@/components/ui/Select";
import type { SettingsTabProps } from "../_types";
import EnvVarFields from "./EnvVarFields";
import styles from "../Settings.module.css";

type AICoverProvider = "nanobanana" | "huggingface";
type AISummaryProvider = "gemini" | "openai" | "claude";
type TranslationProvider = "gemini" | "google" | "deepl" | "claude";

const AI_COVER_OPTIONS: { value: AICoverProvider; label: string }[] = [
  { value: "nanobanana", label: "NanoBanana (Gemini)" },
  { value: "huggingface", label: "Hugging Face (FLUX)" },
];

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
  excluded: T[];
  options: { value: T; label: string }[];
  onChange: (next: T[]) => void;
  onExcludedChange: (next: T[]) => void;
}

function PriorityList<T extends string>({ primary, priority, excluded, options, onChange, onExcludedChange }: PriorityListProps<T>) {
  const nonPrimary = options.filter((o) => o.value !== primary);
  const ordered = priority.length
    ? priority.filter((p) => p !== primary)
    : nonPrimary.map((o) => o.value);

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  /* ── HTML5 drag (desktop) ── */
  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = (idx: number) => {
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    dragIdx.current = null;
    setOverIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null); };

  /* ── Touch drag (mobile) ── */
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    dragIdx.current = idx;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIdx.current === null || !listRef.current) return;
    const y = e.touches[0].clientY;
    const items = listRef.current.querySelectorAll<HTMLElement>(`.${styles.priorityItem}`);
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setOverIdx(i);
        return;
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragIdx.current !== null && overIdx !== null && dragIdx.current !== overIdx) {
      const next = [...ordered];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx, 0, moved);
      onChange(next);
    }
    dragIdx.current = null;
    setOverIdx(null);
  };

  return (
    <div className={styles.priorityList} ref={listRef}>
      {ordered.map((val, idx) => {
        const label = options.find((o) => o.value === val)?.label ?? val;
        return (
          <div key={val} className={styles.priorityRow}>
            <div
              className={`${styles.priorityItem}${overIdx === idx ? ` ${styles.priorityItemOver}` : ""}`}
              data-draggable
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <span className={styles.priorityBadge}>{idx + 1}</span>
              <span className={styles.priorityGrip}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" />
                  <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
                  <circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" />
                </svg>
              </span>
              <span className={`${styles.priorityLabel} ${excluded.includes(val) ? styles.priorityLabelDisabled : ""}`}>{label}</span>
            </div>
            <Switch
              checked={!excluded.includes(val)}
              onCheckedChange={(checked) => {
                onExcludedChange(
                  checked
                    ? excluded.filter((e) => e !== val)
                    : [...excluded, val]
                );
              }}
            />
            <div className={styles.priorityBtns}>
              <button
                type="button"
                className={styles.priorityBtn}
                disabled={idx === 0}
                onClick={() => move(idx, -1)}
                aria-label="Move up"
              ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg></button>
              <button
                type="button"
                className={styles.priorityBtn}
                disabled={idx === ordered.length - 1}
                onClick={() => move(idx, 1)}
                aria-label="Move down"
              ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></button>
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
          <Toggle
            label={t("admin.settings.aiCoverEnabled")}
            checked={config.aiCover?.enabled !== false}
            onChange={(v) => setConfig((prev) => ({ ...prev, aiCover: { ...prev.aiCover, enabled: v } }))}
          />
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}><T k="admin.settings.aiCoverProvider" /></label>
            <Select
              value={config.aiCover.provider}
              options={AI_COVER_OPTIONS}
              onChange={(v) => {
                const newProvider = v as AICoverProvider;
                setConfig((prev) => {
                  const oldProvider = (prev.aiCover?.provider ?? "nanobanana") as AICoverProvider;
                  const oldPriority = (prev.aiCover?.fallback?.priority ?? []) as AICoverProvider[];
                  const newPriority = [
                    ...oldPriority.filter((p) => p !== newProvider),
                    ...(oldPriority.includes(oldProvider) ? [] : [oldProvider]),
                  ].filter((p) => p !== newProvider);
                  return {
                    ...prev,
                    aiCover: {
                      ...prev.aiCover,
                      provider: newProvider,
                      fallback: prev.aiCover?.fallback ? { ...prev.aiCover.fallback, priority: newPriority } : prev.aiCover?.fallback,
                    },
                  };
                });
              }}
            />
          </div>
          <Toggle
            label={t("admin.settings.fallbackEnabled")}
            checked={config.aiCover?.fallback?.enabled ?? false}
            onChange={(v) => {
              const defaultPriority = AI_COVER_OPTIONS
                .filter((o) => o.value !== (config.aiCover?.provider ?? "nanobanana"))
                .map((o) => o.value) as AICoverProvider[];
              setConfig((prev) => ({
                ...prev,
                aiCover: {
                  ...prev.aiCover,
                  fallback: {
                    enabled: v,
                    priority: prev.aiCover?.fallback?.priority?.length
                      ? prev.aiCover.fallback.priority
                      : defaultPriority,
                  },
                },
              }));
            }}
          />
          {(config.aiCover?.fallback?.enabled) && (
            <div className={styles.fallbackSection}>
              <PriorityList<AICoverProvider>
                primary={(config.aiCover?.provider ?? "nanobanana") as AICoverProvider}
                priority={(config.aiCover?.fallback?.priority ?? []) as AICoverProvider[]}
                excluded={(config.aiCover?.fallback?.excluded ?? []) as AICoverProvider[]}
                options={AI_COVER_OPTIONS}
                onChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiCover: {
                      ...prev.aiCover,
                      fallback: { ...prev.aiCover?.fallback, enabled: true, priority: next },
                    },
                  }))
                }
                onExcludedChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiCover: {
                      ...prev.aiCover,
                      fallback: { ...prev.aiCover?.fallback, enabled: true, excluded: next },
                    },
                  }))
                }
              />
            </div>
          )}
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
              onChange={(v) => {
                const newProvider = v as AISummaryProvider;
                setConfig((prev) => {
                  const oldProvider = (prev.aiSummary?.provider ?? "gemini") as AISummaryProvider;
                  const oldPriority = (prev.aiSummary?.fallback?.priority ?? []) as AISummaryProvider[];
                  const newPriority = [
                    ...oldPriority.filter((p) => p !== newProvider),
                    ...(oldPriority.includes(oldProvider) ? [] : [oldProvider]),
                  ].filter((p) => p !== newProvider);
                  return {
                    ...prev,
                    aiSummary: {
                      ...prev.aiSummary,
                      provider: newProvider,
                      fallback: prev.aiSummary?.fallback ? { ...prev.aiSummary.fallback, priority: newPriority } : prev.aiSummary?.fallback,
                    },
                  };
                });
              }}
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
              <PriorityList<AISummaryProvider>
                primary={(config.aiSummary?.provider ?? "gemini") as AISummaryProvider}
                priority={(config.aiSummary?.fallback?.priority ?? []) as AISummaryProvider[]}
                excluded={(config.aiSummary?.fallback?.excluded ?? []) as AISummaryProvider[]}
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
                onExcludedChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiSummary: {
                      ...prev.aiSummary,
                      fallback: { ...prev.aiSummary?.fallback, enabled: true, excluded: next },
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
              onChange={(v) => {
                const newProvider = v as TranslationProvider;
                setConfig((prev) => {
                  const oldProvider = (prev.translation?.provider ?? "deepl") as TranslationProvider;
                  const oldPriority = (prev.translation?.fallback?.priority ?? []) as TranslationProvider[];
                  const newPriority = [
                    ...oldPriority.filter((p) => p !== newProvider),
                    ...(oldPriority.includes(oldProvider) ? [] : [oldProvider]),
                  ].filter((p) => p !== newProvider);
                  return {
                    ...prev,
                    translation: {
                      ...prev.translation,
                      provider: newProvider,
                      fallback: prev.translation?.fallback ? { ...prev.translation.fallback, priority: newPriority } : prev.translation?.fallback,
                    },
                  };
                });
              }}
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
              <PriorityList<TranslationProvider>
                primary={(config.translation?.provider ?? "deepl") as TranslationProvider}
                priority={(config.translation?.fallback?.priority ?? []) as TranslationProvider[]}
                excluded={(config.translation?.fallback?.excluded ?? []) as TranslationProvider[]}
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
                onExcludedChange={(next) =>
                  setConfig((prev) => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      fallback: { ...prev.translation?.fallback, enabled: true, excluded: next },
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
        <EnvVarFields
          provider={config.emailService.provider}
          aiProvider={config.aiCover.provider}
          aiProviderFallbacks={config.aiCover?.fallback?.enabled ? (config.aiCover.fallback.priority ?? []) as string[] : []}
          recaptchaEnabled={config.recaptcha.enabled}
          translateProvider={config.translation?.provider ?? "deepl"}
          translateFallbacks={config.translation?.fallback?.enabled ? (config.translation.fallback.priority ?? []) as string[] : []}
          commentEmailNotify={config.commentEmailNotify ?? false}
          summaryProvider={config.aiSummary?.provider ?? "gemini"}
          summaryFallbacks={config.aiSummary?.fallback?.enabled ? (config.aiSummary.fallback.priority ?? []) as string[] : []}
        />
      </section>
    </>
  );
}
