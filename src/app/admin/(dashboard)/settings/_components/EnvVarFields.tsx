"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { STATUS_MESSAGE_DISMISS_MS } from "@/constants";
import { Trash2, Eye, EyeOff, Info, ExternalLink, ClipboardPaste, AlertTriangle, Lock, Database, Mail, Shield, Image as ImageIcon, Sparkles, Languages, Bell, Check, GitFork, type LucideIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { showToast } from "@/stores/toastStore";
import T from "@/components/ui/T";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ModalPrompt, ModalConfirm } from "@/components/ui/ModalTemplates";
import Tooltip from "@/components/ui/Tooltip";
import SectionHeader from "./SectionHeader";
import type { SiteConfigData } from "@/config/site.config";
import styles from "./EnvVarFields.module.css";
import shared from "../Settings.module.css";
import Pressable from "@/components/ui/Pressable";
import { errorText } from "@/lib/apiError";

/* env var 메타 — 발급 docs URL / value prefix (typo 감지용). 설명은 번역 키 admin.settings.envVarDesc.<키 이름>.
   prefix 가 정의된 키만 prefix mismatch 경고. 없는 키는 검증 skip. */
const ENV_VAR_META: Record<string, { docsUrl?: string; prefix?: string }> = {
  // 인프라
  NEXT_PUBLIC_SUPABASE_URL: { docsUrl: "https://supabase.com/dashboard/project/_/settings/api", prefix: "https://" },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: { docsUrl: "https://supabase.com/dashboard/project/_/settings/api", prefix: "eyJ" },
  SUPABASE_SERVICE_ROLE_KEY: { docsUrl: "https://supabase.com/dashboard/project/_/settings/api", prefix: "eyJ" },
  // 이메일
  NEXT_PUBLIC_WEB3FORMS_KEY: { docsUrl: "https://web3forms.com/" },
  NEXT_PUBLIC_FORMSPREE_ID: { docsUrl: "https://formspree.io/forms" },
  NEXT_PUBLIC_EMAILJS_SERVICE_ID: { docsUrl: "https://dashboard.emailjs.com/admin", prefix: "service_" },
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: { docsUrl: "https://dashboard.emailjs.com/admin/templates", prefix: "template_" },
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: { docsUrl: "https://dashboard.emailjs.com/admin/account" },
  // 보안
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: { docsUrl: "https://www.google.com/recaptcha/admin" },
  // AI / 번역
  NANOBANANA_API_KEY: { docsUrl: "https://aistudio.google.com/apikey", prefix: "AIza" },
  HUGGINGFACE_API_KEY: { docsUrl: "https://huggingface.co/settings/tokens", prefix: "hf_" },
  GEMINI_API_KEY: { docsUrl: "https://aistudio.google.com/apikey", prefix: "AIza" },
  OPENAI_API_KEY: { docsUrl: "https://platform.openai.com/api-keys", prefix: "sk-" },
  ANTHROPIC_API_KEY: { docsUrl: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-" },
  GOOGLE_TRANSLATE_API_KEY: { docsUrl: "https://console.cloud.google.com/apis/credentials", prefix: "AIza" },
  DEEPL_API_KEY: { docsUrl: "https://www.deepl.com/account/summary" },
  UNSPLASH_ACCESS_KEY: { docsUrl: "https://unsplash.com/oauth/applications" },
  PEXELS_API_KEY: { docsUrl: "https://www.pexels.com/api/new/" },
  // 알림
  RESEND_API_KEY: { docsUrl: "https://resend.com/api-keys", prefix: "re_" },
  // 댓글 (giscus)
  GITHUB_TOKEN: { docsUrl: "https://github.com/settings/tokens" },
  // cron 시스템
  CRON_SECRET: {},
};

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
  /** SectionHeader 를 EnvVarFields 안에서 직접 렌더하기 위한 props. 액션 버튼이 title 옆 spacer 자리로 가도록 customActions 로 꽂음. */
  sectionHeader?: {
    title: React.ReactNode;
    config: SiteConfigData;
    savedConfig: SiteConfigData;
    saveSection: (paths: string[]) => Promise<unknown>;
    savingPaths: string[] | null;
    titleClassName?: string;
  };
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
  sectionHeader,
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

  /* optional — 기능을 쓸 때만 넣는 키. 비어 있어도 "누락"이 아니고 통계에서도 빠진다 */
  type FieldRow = { key: string; label: string; optional?: boolean };

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

  const groups: { id: string; rows: FieldRow[]; icon: LucideIcon }[] = [
    { id: "infra", rows: infraRows, icon: Database },
    { id: "email", rows: emailRows, icon: Mail },
    { id: "security", rows: recaptchaEnabled ? [{ key: "NEXT_PUBLIC_RECAPTCHA_SITE_KEY", label: "reCAPTCHA Site Key" }] : [], icon: Shield },
    { id: "cover", rows: [
      ...toRows(coverProviders),
      { key: "UNSPLASH_ACCESS_KEY", label: "Unsplash Access Key" },
      { key: "PEXELS_API_KEY", label: "Pexels API Key" },
    ], icon: ImageIcon },
    { id: "summary", rows: toRows(sumProviders), icon: Sparkles },
    { id: "translate", rows: toRows(transProviders), icon: Languages },
    { id: "notify", rows: [{ key: "RESEND_API_KEY", label: "Resend API Key" }], icon: Bell },
    /* GITHUB_TOKEN 은 giscus 만이 아니라 프로필·홈의 GitHub 연동(저장소 목록·잔디)도 쓴다 —
       giscus 조건부로 두면 그쪽을 쓰는 사람이 토큰 적을 곳을 못 찾는다. 항상 노출 */
    { id: "github", rows: [{ key: "GITHUB_TOKEN", label: "GitHub Token" }], icon: GitFork },
    /* CRON_SECRET 은 외부 크론 트리거를 쓸 때만 필요 — 비어 있는 게 기본 상태다 */
    { id: "system", rows: [{ key: "CRON_SECRET", label: "Cron Secret", optional: true }], icon: Shield },
  ];

  const visibleGroups = groups.filter((g) => g.rows.length > 0);

  const visible = visibleGroups.flatMap((g) => g.rows);

  const hasEdits = Object.keys(edits).length > 0;

  /* 각 var 의 "현재 상태" — edits / db / env / none. 통계 + 그룹별 progress 계산 */
  type RowStatus = "edit" | "db" | "env" | "none";
  const rowStatusOf = useCallback((key: string): RowStatus => {
    if (key in edits) return "edit";
    const src = secrets[key]?.source ?? "none";
    return src;
  }, [edits, secrets]);

  const stats = useMemo(() => {
    let total = 0, env = 0, db = 0, missing = 0, edit = 0;
    for (const { key, optional } of visible) {
      const s = rowStatusOf(key);
      /* 선택 키는 비어 있는 게 기본 상태 — 누락도, 분모도 아니다. 값을 넣으면 그때부터 센다 */
      if (s === "none" && optional) continue;
      total++;
      if (s === "edit") edit++;
      else if (s === "env") env++;
      else if (s === "db") db++;
      else missing++;
    }
    const set = env + db + edit;
    return { total, set, env, db, edit, missing };
  }, [visible, rowStatusOf]);

  /* .env paste 모달 — textarea 파싱 후 매칭되는 visible key 만 edits 로 흡수 */
  const openPasteModal = () => {
    const modalId = "env-paste";
    let text = "";
    const apply = () => {
      const matched: Record<string, string> = {};
      const visibleSet = new Set(visible.map((v) => v.key));
      const seen = new Set<string>();
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const k = trimmed.slice(0, eq).trim();
        let v = trimmed.slice(eq + 1).trim();
        /* 양쪽 quote 제거 */
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (visibleSet.has(k) && !seen.has(k)) {
          matched[k] = v;
          seen.add(k);
        }
      }
      const count = Object.keys(matched).length;
      if (count === 0) {
        showToast(t("admin.settings.envPasteNoMatch"), "error");
        return;
      }
      setEdits((prev) => ({ ...prev, ...matched }));
      showToast(t("admin.settings.envPasteApplied").replace("{n}", String(count)), "success");
      closeModal(modalId);
    };
    openModal(
      <div className={styles.envPasteModal}>
        <p className={styles.envPasteHint}>{t("admin.settings.envPasteHint")}</p>
        <textarea
          className={styles.envPasteTextarea}
          placeholder={"KEY=value\nKEY2=\"value with spaces\"\n# comment lines are ignored"}
          autoFocus
          onChange={(e) => { text = e.target.value; }}
          rows={10}
        />
        <div className={styles.envPasteActions}>
          <Button variant="outline" size="sm" onClick={() => closeModal(modalId)}>
            {t("admin.settings.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={apply}>
            {t("admin.settings.envPasteApply")}
          </Button>
        </div>
      </div>,
      {
        id: modalId,
        header: { title: t("admin.settings.envPasteTitle") },
        width: "520px",
        closeButton: true,
      },
    );
  };

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
            // 서버가 준 실제 사유를 노출 (자격증명 오류 외에 이메일 미확인·rate limit 등도 구분)
            const data = await res.json().catch(() => null);
            openModal(
              <ModalPrompt
                placeholder={t("admin.settings.enterPassword")}
                inputType="password"
                confirmText={t("admin.settings.confirm")}
                error={errorText(data, t, t("admin.settings.wrongPassword"))}
                closeOnConfirm={false}
                onConfirm={doReveal}
              />,
              {
                id: modalId,
                header: { title: t("admin.settings.enterPassword") },
                width: "360px",
                closeButton: true,
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
          confirmText={t("admin.settings.confirm")}
          closeOnConfirm={false}
          onConfirm={doReveal}
        />,
        {
          id: modalId,
          header: { title: t("admin.settings.enterPassword") },
          width: "360px",
          closeButton: true,
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
          confirmText={t("admin.settings.envVarDelete")}
          danger
          onConfirm={doDelete}
        />,
        {
          id: modalId,
          header: { title: t("admin.settings.envVarDeleteConfirm") },
          width: "360px",
          closeButton: true,
        }
      );
    },
    [openModal, t]
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
      setTimeout(() => setMsg(""), STATUS_MESSAGE_DISMISS_MS);
    } catch {
      setMsg(t("admin.settings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  /* 단일 row 저장 — 저장 후 edits 에서 해당 key 만 제거 */
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const handleSaveOne = useCallback(async (key: string) => {
    if (!(key in edits)) return;
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/secrets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: { [key]: edits[key] } }),
      });
      if (!res.ok) throw new Error("Failed");
      setEdits((prev) => { const next = { ...prev }; delete next[key]; return next; });
      const fresh = await fetch("/api/admin/secrets").then((r) => r.json());
      setSecrets(fresh.secrets ?? {});
      showToast(t("admin.settings.envVarSaved"), "success");
    } catch {
      showToast(t("admin.settings.saveError"), "error");
    } finally {
      setSavingKey(null);
    }
  }, [edits, t]);

  /* 기본값 (전체 .env 로 복원) — 모든 DB override 삭제 → .env fallback 으로 회귀 */
  const dbOverrideKeys = useMemo(
    () => visible.filter(({ key }) => secrets[key]?.source === "db").map(({ key }) => key),
    [visible, secrets],
  );

  const handleResetAllToEnv = useCallback(() => {
    if (dbOverrideKeys.length === 0) return;
    const modalId = "env-reset-all";
    openModal(
      <ModalConfirm
        desc={t("admin.settings.envResetAllDesc").replace("{n}", String(dbOverrideKeys.length))}
        confirmText={t("admin.settings.envResetAllConfirm")}
        danger
        onConfirm={async () => {
          try {
            await Promise.all(dbOverrideKeys.map((key) =>
              fetch("/api/admin/secrets", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key }),
              }),
            ));
            const fresh = await fetch("/api/admin/secrets").then((r) => r.json());
            setSecrets(fresh.secrets ?? {});
            setRevealed({});
            showToast(t("admin.settings.envResetAllDone"), "success");
          } catch {
            showToast(t("admin.settings.saveError"), "error");
          }
        }}
      />,
      {
        id: modalId,
        header: { title: t("admin.settings.envResetAllTitle") },
        width: "420px",
        closeButton: true,
      },
    );
  }, [dbOverrideKeys, openModal, t]);

  if (visible.length === 0) return null;

  const renderField = (key: string, label: string, optional?: boolean) => {
    const info = secrets[key];
    const isReadOnly = info?.readOnly === true;
    const isEditing = !isReadOnly && key in edits;
    const source = info?.source ?? "none";
    const isRevealed = key in revealed;
    const displayValue = isEditing ? edits[key] : isRevealed ? revealed[key] : "";
    const meta = ENV_VAR_META[key];
    const placeholder = !loaded
      ? "..."
      : source !== "none"
        ? info.value
        : meta?.prefix
          ? `${meta.prefix}…`
          : t("admin.settings.envVarPlaceholder");
    /* prefix mismatch — 사용자가 편집 중이고 prefix 정의돼 있고 value 가 prefix 로 시작 안 할 때만 */
    const prefixMismatch = isEditing && meta?.prefix && edits[key] && !edits[key].startsWith(meta.prefix);

    /* row 상태 — missing 강조 (left border) 용. 선택 키는 비어 있어도 정상이라 경고하지 않는다 */
    const rowMissing = loaded && source === "none" && !isEditing && !optional;
    const sourceForBadge = isEditing ? "edit" : source;
    return (
      <div
        key={key}
        id={`env-${key}`}
        className={`${shared.fieldRow} ${shared.envFieldRow} ${rowMissing ? styles.envFieldRowMissing : ""}`}
      >
        <label className={`${shared.fieldLabel}${rowMissing ? ` ${styles.envLabelMissing}` : ""}`}>
          <span className={styles.envFieldLabelText}>{label}</span>
          {/* 메타(소스 배지·경고·info)를 우측 정렬 슬롯에 모아 라벨 길이와 무관하게 정렬.
             info(ⓘ)는 맨 끝(최우측)에 둬 모든 행에서 같은 x 에 오게 한다. 배지는 그 왼쪽에서 정렬. */}
          <span className={styles.envBadgeSlot}>
            {/* 칩은 모든 행에 — read-only 도 소스는 보여주고, 미설정이면 "누락".
               칩이 있다 없다 하면 행마다 슬롯 폭이 달라져 줄이 어긋나 보인다 */}
            {loaded && (
              <span
                className={styles.envSourceBadge}
                data-source={sourceForBadge === "none" && optional ? "optional" : sourceForBadge}
              >
                {sourceForBadge === "env" && ".env"}
                {sourceForBadge === "db" && "DB"}
                {sourceForBadge === "edit" && t("admin.settings.envSourceEdit")}
                {sourceForBadge === "none" &&
                  (optional ? t("admin.settings.envOptional") : t("admin.settings.envStatMissing"))}
              </span>
            )}
            {isReadOnly && (
              <Tooltip content={t("admin.settings.envVarReadOnlyHint")} placement="top">
                <span className={styles.envMetaIcon} role="button" tabIndex={0} aria-label="Read-only">
                  <Lock size={11} />
                </span>
              </Tooltip>
            )}
            {prefixMismatch && (
              <Tooltip
                content={t("admin.settings.envVarPrefixMismatch").replace("{prefix}", meta!.prefix!)}
                placement="top"
              >
                <span className={styles.envMetaWarn} role="button" tabIndex={0}>
                  <AlertTriangle size={12} />
                </span>
              </Tooltip>
            )}
            {meta && (
              <Tooltip
                content={
                  <span>
                    {t(`admin.settings.envVarDesc.${key}`)}
                    {meta.docsUrl && (
                      <>
                        {" · "}
                        <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer" className={styles.envMetaLink}>
                          {t("admin.settings.envVarDocs")} <ExternalLink size={10} />
                        </a>
                      </>
                    )}
                  </span>
                }
                placement="top"
                interactive={!!meta.docsUrl}
              >
                <span className={styles.envMetaIcon} role="button" tabIndex={0}>
                  <Info size={12} />
                </span>
              </Tooltip>
            )}
          </span>
        </label>

        {/* 입력 셀 — grid 2번째 열. min-width 로 최소 너비 보장, 시작·너비 항상 일정 */}
        <div className={styles.envInputCell}>
          <Input
            value={isReadOnly ? "" : displayValue}
            placeholder={placeholder}
            onChange={(v) => {
              if (isReadOnly) return;
              setEdits((prev) => {
                const next = { ...prev };
                // 빈 값 = 편집 취소 (저장된 값으로 되돌리기) — Input clearable 의 Eraser 도 이 경로
                if (v === "") delete next[key];
                else next[key] = v;
                return next;
              });
            }}
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
          {source === "env" && !isEditing && (
            <span className={styles.envHintMobile}>{t("admin.settings.envVarEnvHint")}</span>
          )}
        </div>

        {/* 액션 셀 — grid 3번째 열. 버튼 유무와 무관하게 항상 예약(고정폭)돼 입력 너비·버튼 시작 위치가 일정 */}
        <div className={styles.envActionCol}>
          {/* 개별 row 저장 — 편집 중일 때만 노출 */}
          {isEditing && (
            <Tooltip content={t("admin.settings.envSaveOne")} placement="top">
              <Pressable
                className={styles.envRowSaveBtn}
                onClick={() => handleSaveOne(key)}
                disabled={savingKey === key}
                aria-label={t("admin.settings.envSaveOne")}
              >
                <Check size={14} strokeWidth={2.5} />
              </Pressable>
            </Tooltip>
          )}
          {/* 삭제 버튼 — read-only 키는 삭제 불가라 미렌더. 나머지는 항상 렌더하되
             비활성 조건: editing / env source / none */}
          {!isReadOnly && (() => {
            const deleteDisabled = isEditing || source === "env" || source === "none";
            const tooltipContent = source === "env" ? t("admin.settings.envVarEnvHint") : undefined;
            return (
              <Tooltip content={tooltipContent} disabled={!tooltipContent} placement="top">
                <Pressable
                  className={`${styles.envDeleteBtn}${deleteDisabled ? ` ${styles.envDeleteBtnDisabled}` : ""}`}
                  onClick={deleteDisabled ? undefined : () => handleDelete(key)}
                  disabled={deleteDisabled}
                  title={deleteDisabled ? undefined : t("admin.settings.envVarDelete")}
                  aria-disabled={deleteDisabled}
                >
                  <Trash2 size={14} />
                </Pressable>
              </Tooltip>
            );
          })()}
          {/* reveal (눈) 버튼 — read-only 키는 값 확인 불가라 미렌더. 편집 중엔 어차피 비활성이라 숨김 */}
          {!isReadOnly && !isEditing && (
            <Pressable
              className={styles.envRevealBtn}
              onClick={() => handleReveal(key)}
              disabled={source === "none"}
              title={isRevealed ? t("admin.settings.envHide") : t("admin.settings.envReveal")}
              aria-label={isRevealed ? t("admin.settings.envHide") : t("admin.settings.envReveal")}
            >
              {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </Pressable>
          )}
        </div>
      </div>
    );
  };

  /* SectionHeader 의 customActions 자리로 들어갈 액션 버튼 그룹 — 기본값(env override 해제) + 섹션 저장 */
  const envActions = (
    <>
      <Button
        variant="outline"
        size="2xs"
        disabled={dbOverrideKeys.length === 0}
        onClick={handleResetAllToEnv}
        title={t("admin.settings.envResetAllTooltip")}
      >
        {t("admin.settings.envResetAll")}
      </Button>
      <Button
        variant="outline"
        size="2xs"
        disabled={!hasEdits}
        loading={saving}
        loadingVariant="wave"
        onClick={handleSaveSecrets}
      >
        {t("admin.settings.saveSection")}
      </Button>
    </>
  );

  return (
    /* SectionHeader 는 .fields 밖(fragment) — .title/.spacer 는 grid-row:1 로 부모 .section 그리드를
       전제하므로, .fields(flex column) 안에 넣으면 배치가 무효화돼 버튼이 제목 아랫줄로 떨어진다 */
    <>
      {sectionHeader && (
        <SectionHeader
          title={sectionHeader.title}
          paths={[]}
          config={sectionHeader.config}
          savedConfig={sectionHeader.savedConfig}
          saveSection={sectionHeader.saveSection}
          savingPaths={sectionHeader.savingPaths}
          titleClassName={sectionHeader.titleClassName}
          customActions={envActions}
        />
      )}

    <div className={shared.fields}>
      {/* ── 상단 status overview — 상태줄과 진행바는 한 단위. .fields 의 gap(12) 위에
          개별 margin 이 더 얹히면 아래 그룹과의 간격이 두 배로 벌어진다 ── */}
      <div className={styles.envStatus}>
      <div className={styles.envStatusBar}>
        <div className={styles.envStatusSummary}>
          <span className={styles.envStatusCount}>
            <strong>{stats.set}</strong>/{stats.total} <T k="admin.settings.envStatSet" />
          </span>
          {stats.env > 0 && (
            <span className={styles.envStatusChip}><span className={styles.envSourceDot} data-source="env" />{stats.env} .env</span>
          )}
          {stats.db > 0 && (
            <span className={styles.envStatusChip}><span className={styles.envSourceDot} data-source="db" />{stats.db} DB</span>
          )}
          {stats.edit > 0 && (
            <span className={styles.envStatusChip}><span className={styles.envSourceDot} data-source="edit" />{stats.edit} <T k="admin.settings.envSourceEdit" /></span>
          )}
          {stats.missing > 0 && (
            <span className={styles.envStatusChip} data-warn>
              <span className={styles.envSourceDot} data-source="none" />
              {stats.missing} <T k="admin.settings.envStatMissing" />
            </span>
          )}
        </div>
        <Button variant="outline" icon={<ClipboardPaste size={12} />} onClick={openPasteModal}>
          <T k="admin.settings.envPasteBtn" />
        </Button>
      </div>
      {/* progress 바 — set ratio 시각화 */}
      <div className={styles.envProgressBar}>
        <div className={styles.envProgressFill} style={{ width: `${stats.total ? (stats.set / stats.total) * 100 : 0}%` }} />
      </div>
      </div>

      {/* 그룹을 2열로 균형 분배(행 수 가중치 greedy) — full-width 섹션 폭을 채운다.
         각 열은 container 라, 열이 좁아지면 필드 행이 컨테이너 쿼리로 스스로 접힌다(라벨 위로).
         태블릿/모바일은 CSS 로 1열. */}
      {(() => {
        const cols: (typeof visibleGroups)[] = [[], []];
        const colWeight = [0, 0];
        for (const g of visibleGroups) {
          const i = colWeight[0] <= colWeight[1] ? 0 : 1;
          cols[i].push(g);
          colWeight[i] += g.rows.length + 1;
        }
        return (
          <div className={styles.envGroupCols}>
            {cols.map((colGroups, ci) => (
              <div className={styles.envGroupCol} key={ci}>
                {colGroups.map((group) => {
                  /* 비어 있는 선택 키는 그룹 분모에서도 뺀다 — "0/1" 이 미완처럼 읽히면 안 된다 */
                  const counted = group.rows.filter((r) => !(r.optional && rowStatusOf(r.key) === "none"));
                  const grpSet = counted.filter((r) => rowStatusOf(r.key) !== "none").length;
                  const grpTotal = counted.length;
                  const GroupIcon = group.icon;
                  return (
                    <div className={styles.envGroup} key={group.id}>
                      <h3 className={styles.envGroupLabel}>
                        <GroupIcon size={14} strokeWidth={2} />
                        <span>{t(`admin.settings.envGroups.${group.id}`)}</span>
                        {grpTotal > 0 && (
                          <span className={styles.envGroupCount} data-ok={grpSet === grpTotal || undefined}>
                            {grpSet}/{grpTotal}
                          </span>
                        )}
                      </h3>
                      {group.rows.map(({ key, label, optional }) => renderField(key, label, optional))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })()}
      {msg && <div className={styles.envActions}><span className={styles.envMsg}>{msg}</span></div>}
    </div>
    </>
  );
}
