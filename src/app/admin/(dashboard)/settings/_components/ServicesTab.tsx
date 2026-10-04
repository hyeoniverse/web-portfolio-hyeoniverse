"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import {
  AI_COVER_OPTIONS, AI_SUMMARY_OPTIONS, TRANSLATION_OPTIONS, TTS_OPTIONS,
  type AICoverProvider, type AISummaryProvider, type TranslationProvider, type TtsProviderOption,
} from "../_data/servicesUploadConfig";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { SiteConfigData } from "@/config/site.config";
import { Switch } from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type { SettingsTabProps } from "../_types";
import type { SelectOption } from "@/types";
import Field, { FieldHelp } from "./SettingsFormFields";
import EnvVarFields from "./EnvVarFields";
import LexiconManager from "./LexiconManager";
import AiHealthPanel from "./AiHealthPanel";
import ServiceLogLink from "./ServiceLogLink";
import { ENV_SECTION_ID, HintLines, envKeyLine } from "./EnvKeyHint";
import { CONTACT_KEYS } from "@/lib/contactSend";
import { AI_PROVIDER_INFO } from "@/lib/ai/providers";
import { DEFAULT_AI_MODELS, type AiModelProvider } from "@/lib/ai/models";
import { useAiHealth, type ProviderState } from "./useAiHealth";
import type { AiProvider } from "@/lib/ai/providers";
import SectionHeader from "./SectionHeader";
import GiscusHelp from "./GiscusHelp";
import { PriorityList } from "./PriorityList";
import { MediaLimitsEditor } from "./MediaLimitsEditor";
import FieldRow from "@/components/ui/FieldRow";
import FormGroup from "@/components/ui/FormGroup";
import { showToast } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import Checkbox from "@/components/ui/Checkbox";
import styles from "./ServicesTab.module.css";
import shared from "../Settings.module.css";
import { errorText } from "@/lib/apiError";
import { sendAction } from "@/lib/sendAction";
import { fillTemplate } from "@/utils/format";


/* 발행 글 자동 cover 일괄 배정 — 발행됐고 커버가 비어 있는 글에 키워드로 찾은 Unsplash/Pexels 이미지를 넣는다.
   바로 돌리지 않고 확인 창에서 대상 글과 검색 키워드를 먼저 보여 주고, 고른 글에만 적용한다(POST /api/posts/auto-cover). */
const AUTO_COVER_MODAL_ID = "auto-cover-preview";

type AutoCoverItem = { id: string; slug: string; title: string; category: string; keywords: string[] };

function AutoCoverPreview({ t, onDone }: { t: TFunction; onDone: (r: { processed: number; succeeded: number; failed: number }) => void }) {
  const { closeModal } = useModalStore();
  const [items, setItems] = useState<AutoCoverItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch("/api/posts/auto-cover").then((r) => (r.ok ? r.json() : Promise.reject())).then((d: { items: AutoCoverItem[] }) => {
      if (!alive) return;
      setItems(d.items);
      setPicked(new Set(d.items.map((i) => i.id)));
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allOn = !!items && items.length > 0 && picked.size === items.length;

  const apply = async () => {
    setRunning(true);
    const res = await sendAction("/api/posts/auto-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...picked] }),
    }, t, t("admin.settings.saveError"));
    setRunning(false);
    if (!res) return;
    const data = await res.json().catch(() => null);
    closeModal(AUTO_COVER_MODAL_ID);
    if (data) onDone(data);
  };

  return (
    <div className={styles.autoCoverModal}>
      <p className={shared.fieldHint}>{t("admin.settings.autoCoverPreviewHint")}</p>
      {items === null ? (
        <p className={shared.fieldHint}>{failed ? t("admin.settings.autoCoverPreviewFailed") : t("admin.settings.autoCoverPreviewLoading")}</p>
      ) : items.length === 0 ? (
        <p className={shared.fieldHint}>{t("admin.settings.autoCoverPreviewEmpty")}</p>
      ) : (
        <>
          <div className={styles.autoCoverBar}>
            <Checkbox
              checked={allOn}
              onChange={(v) => setPicked(v ? new Set(items.map((i) => i.id)) : new Set())}
              label={fillTemplate(t("admin.settings.autoCoverPreviewCount"), { n: picked.size, total: items.length })}
            />
          </div>
          <ul className={styles.autoCoverList} data-lenis-prevent>
            {items.map((it) => (
              <li key={it.id} className={styles.autoCoverRow}>
                <Checkbox checked={picked.has(it.id)} onChange={() => toggle(it.id)} label={it.title || it.slug} />
                {/* 실제로 검색하는 말 — 앞의 두 키워드(lib/autoCoverImage) */}
                <span className={styles.autoCoverQuery}>{it.keywords.slice(0, 2).join(" ") || "—"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={styles.autoCoverActions}>
        <Button variant="outline" size="sm" shape="capsule" onClick={() => closeModal(AUTO_COVER_MODAL_ID)} disabled={running} soundDisabled>
          {t("admin.settings.autoCoverCancel")}
        </Button>
        <Button variant="primary" size="sm" shape="capsule" onClick={() => void apply()} loading={running} disabled={picked.size === 0} soundDisabled>
          {fillTemplate(t("admin.settings.autoCoverApply"), { n: picked.size })}
        </Button>
      </div>
    </div>
  );
}

function AutoCoverMigrator({ t }: { t: TFunction }) {
  const { openModal } = useModalStore();
  const [lastResult, setLastResult] = useState<{ processed: number; succeeded: number; failed: number } | null>(null);
  const onDone = (data: { processed: number; succeeded: number; failed: number }) => {
    setLastResult(data);
    showToast(
      t("admin.settings.autoCoverDone")
        .replace("{processed}", String(data.processed))
        .replace("{succeeded}", String(data.succeeded))
        .replace("{failed}", String(data.failed)),
      data.failed > 0 ? "error" : "success",
    );
  };
  return (
    <div className={styles.autoCover}>
      {/* 설명과 필요한 키는 섹션 설명 자리(extraHints)에 — 여기에는 실행 단추만 */}
      <div className={styles.autoCoverRunRow}>
        <Button
          variant="outline"
          onClick={() => openModal(<AutoCoverPreview t={t} onDone={onDone} />, {
            id: AUTO_COVER_MODAL_ID,
            header: { title: t("admin.settings.autoCoverPreviewTitle") },
            width: "min(640px, 94vw)",
            closeButton: true,
          })}
        >
          {t("admin.settings.autoCoverRun")}
        </Button>
        {lastResult && (
          <span className={shared.fieldHint}>
            {t("admin.settings.autoCoverResult")
              .replace("{processed}", String(lastResult.processed))
              .replace("{succeeded}", String(lastResult.succeeded))
              .replace("{failed}", String(lastResult.failed))}
          </span>
        )}
      </div>
    </div>
  );
}

/* 문의 폼 파일 첨부가 이어 실패해 저절로 꺼졌는지(/api/contact/attachment) — 스위치는 켜져 있어도 꺼질 수 있어
   그 상태와 다시 켜기를 스위치 아래에 보인다. 이어진 실패가 있으면 몇 번째인지도 */
function AttachmentHealthNote({ t }: { t: TFunction }) {
  const [state, setState] = useState<{ fails: number; disabled: { at: string; reason?: string } | null; reason: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetch("/api/contact/attachment").then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d) setState(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!state || (!state.disabled && state.fails === 0)) return null;
  const reenable = async () => {
    setBusy(true);
    const res = await sendAction("/api/contact/attachment", { method: "DELETE" }, t, t("admin.settings.attachmentReenableFailed"));
    setBusy(false);
    if (res) setState({ fails: 0, disabled: null, reason: null });
  };
  const reason = state.disabled?.reason ?? state.reason;
  return (
    <div className={styles.attachmentNote}>
      <p className={styles.providerWarn}>
        {state.disabled ? t("admin.settings.attachmentAutoOff") : fillTemplate(t("admin.settings.attachmentFailing"), { n: state.fails })}
        {reason ? ` ${fillTemplate(t("admin.settings.attachmentReason"), { reason })}` : ""}
      </p>
      {state.disabled && (
        <Button variant="outline" size="sm" shape="capsule" onClick={() => void reenable()} loading={busy} soundDisabled>
          {t("admin.aiHealth.reenable")}
        </Button>
      )}
    </div>
  );
}

interface ServicesTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

/** giscus 내장 테마 프리셋 (고정 목록). 이 외 값은 커스텀 CSS URL 로 간주. */
const GISCUS_THEME_PRESETS = [
  "light", "light_high_contrast", "light_tritanopia", "light_protanopia",
  "dark", "dark_dimmed", "dark_high_contrast", "dark_tritanopia", "dark_protanopia",
  "preferred_color_scheme", "transparent_dark", "noborder_light", "noborder_dark",
  "cobalt", "purple_dark", "catppuccin_latte", "catppuccin_mocha",
];

/** 테마 = 프리셋 Select + "커스텀" 선택 시 CSS URL 직접 입력. value 는 프리셋 이름 또는 URL 문자열. */
function GiscusThemeField({ label, value, defaultPreset, customLabel, urlPlaceholder, defaultCustomFile, onChange, help }: {
  label: string; value: string; defaultPreset: string; customLabel: string; urlPlaceholder: string; defaultCustomFile: string;
  onChange: (v: string) => void; help?: React.ReactNode;
}) {
  const isPreset = value === "" || GISCUS_THEME_PRESETS.includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const selectValue = custom ? "__custom__" : (value || defaultPreset);
  return (
    <>
      <FieldRow label={label} help={help}>
        <Select
          width="full"
          value={selectValue}
          options={[
            ...GISCUS_THEME_PRESETS.map((p) => ({ value: p, label: p })),
            { value: "__custom__", label: customLabel },
          ]}
          onChange={(v) => {
            if (v === "__custom__") {
              setCustom(true);
              // 프리셋→커스텀 전환 시 우리가 만들어둔 테마 CSS 절대 URL 로 기본값 채움 (현재 도메인 기준)
              if (GISCUS_THEME_PRESETS.includes(value)) {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                onChange(`${origin}/${defaultCustomFile}`);
              }
            } else {
              setCustom(false);
              onChange(v);
            }
          }}
        />
      </FieldRow>
      {custom && (
        <Field label={customLabel} value={value} onChange={onChange} placeholder={urlPlaceholder} maxHint={null} />
      )}
    </>
  );
}

/** provider + fallback 우선순위 config 슬라이스 공통 형태 (aiCover·aiSummary·translation) */
type ProviderFallback<P extends string> = {
  enabled?: boolean;
  provider?: P;
  fallback?: { enabled?: boolean; priority?: P[]; excluded?: P[] };
};

/** SectionHeader 로 그대로 전달하는 저장/타이틀 공통 props(sh 번들) */
type SectionShared = {
  config: SiteConfigData;
  savedConfig: SiteConfigData;
  saveSection: (paths: string[]) => Promise<unknown>;
  revertSection?: (paths: string[]) => void;
  resetSection?: (paths: string[]) => void;
  savingPaths: string[] | null;
  titleClassName?: string;
};

/**
 * provider 선택 + fallback 우선순위 리스트 섹션 — aiCover·aiSummary·translation 이 동일 구조라 하나로.
 * provider 를 바꾸면 이전 provider 를 fallback priority 로 편입(reconcile), fallback 켜면 나머지 provider 로 기본 우선순위 구성.
 * onChange 는 setConfig 처럼 updater(prev)→next 를 받아 최신 슬라이스 기준으로 갱신한다.
 */
function ProviderFallbackSection<P extends string>({
  t, sh, title, paths, providerLabelKey, options, defaultProvider, value, onChange, borderless, children, stateOf, hint, keyOf, extraHints, logProviders,
}: {
  t: TFunction;
  sh: SectionShared;
  title: string;
  paths: string[];
  providerLabelKey: string;
  options: SelectOption<P>[];
  defaultProvider: P;
  value: ProviderFallback<P> | undefined;
  onChange: (updater: (prev: ProviderFallback<P> | undefined) => ProviderFallback<P>) => void;
  borderless?: boolean;
  children?: React.ReactNode;
  /** 공급자 상태(설정 › 서비스의 AI 상태) — 키 없음·꺼짐·실패 중이면 고르는 자리에서 보인다 */
  stateOf?: (p: P) => ProviderState | null;
  /** 제목 아래 한 줄 설명 */
  hint?: string;
  /** 공급자 → 그 공급자가 쓰는 키 이름(없으면 키가 필요 없는 공급자) — "필요한 키" 바로가기에 쓴다 */
  keyOf?: (p: P) => string | undefined;
  /** 설명 자리에 더할 줄(섹션 안 부가 기능의 설명 등) — 섹션 설명 다음, 공급자 키 줄 앞 */
  extraHints?: React.ReactNode[];
  /** 이 기능의 호출 기록을 거를 공급자 이름(lib/ai/providers) — 제목 줄의 기록 단추가 쓴다 */
  logProviders?: string[];
}) {
  const provider = value?.provider ?? defaultProvider;
  const fallbackEnabled = value?.fallback?.enabled ?? false;
  const stateText = (p: P) => {
    const st = stateOf?.(p);
    return st && st !== "ok" ? t(`admin.aiHealth.badge.${st}`) : "";
  };
  /* 목록에는 상태를 이름 뒤에 붙여 고를 때 보이게 */
  const labelled = options.map((o) => {
    const st = stateText(o.value);
    return st ? { ...o, label: `${o.label} · ${st}` } : o;
  });
  const primaryState = stateOf?.(provider);
  /* fallback 을 켜 두었는데 실제로 시도할 공급자가 없다(모두 제외했거나 키 없음·꺼짐) */
  const usableFallbacksAll = (value?.fallback?.priority ?? options.map((o) => o.value))
    .filter((p) => p !== provider && !(value?.fallback?.excluded ?? []).includes(p));
  const usableFallbacks = usableFallbacksAll
    .filter((p) => { const st = stateOf?.(p); return st !== "nokey" && st !== "off"; });
  return (
    <section className={shared.section} style={borderless ? { borderBottom: "none" } : undefined}>
      <SectionHeader
        title={title}
        paths={paths}
        spacerExtra={logProviders?.length ? <ServiceLogLink query={{ category: "ai", provider: logProviders }} /> : undefined}
        extra={
          <Switch
            size="sm"
            showStateText
            checked={value?.enabled !== false}
            onCheckedChange={(v) => onChange((prev) => ({ ...prev, enabled: v }))}
          />
        }
        {...sh}
      />
      {/* 설명 — 제목 바로 아래, 다른 섹션과 같은 자리. 섹션 설명과 필요한 키(기본 공급자와, 자동 전환을 켰으면
          순서에 든 공급자의 키. 키 없는 것은 강조색)를 한 자리에 두고, 두 줄이면 글머리 목록 */}
      <HintLines lines={[
        hint,
        ...(extraHints ?? []),
        keyOf && (() => {
          const used = [provider, ...(fallbackEnabled ? usableFallbacksAll : [])];
          const keys = used.map((p) => keyOf(p)).filter((k): k is string => !!k);
          const missing = used.filter((p) => stateOf?.(p) === "nokey").map((p) => keyOf(p)).filter((k): k is string => !!k);
          return envKeyLine(keys, t, { missing });
        })(),
      ]} />
      <div className={`${shared.fields} ${shared.fieldPair}`}>
        <FieldRow label={<T k={providerLabelKey} />}>
          <Select
            value={provider}
            options={labelled}
            onChange={(v) => {
              const newProvider = v as P;
              onChange((prev) => {
                const oldProvider = prev?.provider ?? defaultProvider;
                const oldPriority = prev?.fallback?.priority ?? [];
                const newPriority = [
                  ...oldPriority.filter((p) => p !== newProvider),
                  ...(oldPriority.includes(oldProvider) ? [] : [oldProvider]),
                ].filter((p) => p !== newProvider);
                return {
                  ...prev,
                  provider: newProvider,
                  fallback: prev?.fallback ? { ...prev.fallback, priority: newPriority } : prev?.fallback,
                };
              });
            }}
          />
        </FieldRow>
        <Switch
          showStateText
          label={t("admin.settings.fallbackEnabled")}
          labelPosition="top"
          checked={fallbackEnabled}
          onCheckedChange={(v) => {
            const defaultPriority = options.filter((o) => o.value !== provider).map((o) => o.value);
            onChange((prev) => ({
              ...prev,
              fallback: {
                enabled: v,
                priority: prev?.fallback?.priority?.length ? prev.fallback.priority : defaultPriority,
                excluded: prev?.fallback?.excluded ?? [],
              },
            }));
          }}
        />
        {/* 첫 공급자가 쓸 수 없는 상태면 여기서 바로 알린다 — 모르고 두면 요청마다 실패하고 fallback 으로만 돈다 */}
        {primaryState && primaryState !== "ok" && (
          <p className={styles.providerWarn}>
            {t(`admin.settings.providerWarn.${primaryState}`)}
          </p>
        )}
        {fallbackEnabled && usableFallbacks.length === 0 && (
          <p className={styles.providerWarn}>{t("admin.settings.providerWarn.noFallback")}</p>
        )}
        {fallbackEnabled && (
          <div className={shared.fallbackSection}>
            <PriorityList<P>
              primary={provider}
              priority={value?.fallback?.priority ?? []}
              excluded={value?.fallback?.excluded ?? []}
              options={options}
              badgeOf={(p) => {
                const st = stateOf?.(p);
                return st && st !== "ok" ? <span className={styles.providerBadge} data-state={st}>{stateText(p)}</span> : null;
              }}
              onChange={(next) => onChange((prev) => ({ ...prev, fallback: { ...prev?.fallback, enabled: true, priority: next } }))}
              onExcludedChange={(next) => onChange((prev) => ({ ...prev, fallback: { ...prev?.fallback, enabled: true, excluded: next } }))}
            />
          </div>
        )}
        {children}
      </div>

    </section>
  );
}

export default function ServicesTab({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths, setConfig, validationError }: ServicesTabProps) {
  const { t, language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en); // giscus 필드 툴팁 inline 다국어

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, validationError, titleClassName: shared.sectionTitle };
  /* AI 상태 — 상태 패널과 각 fallback 섹션이 같이 쓴다. 설정 이름 → 상태를 세는 공급자 이름(google 만 기능마다 다르다) */
  const aiHealth = useAiHealth();
  const stateFor = (map: (p: string) => AiProvider) => (p: string) => aiHealth.stateOf(map(p));

  const giscus = config.comments?.giscus ?? { repo: "", repoId: "", category: "", categoryId: "", mapping: "pathname", reactionsEnabled: true, inputPosition: "bottom", strict: false, emitMetadata: false, lazyLoading: true, themeLight: "", themeDark: "" };
  /* comments.giscus 는 2단계 중첩이라 update("comments","giscus", 전체객체) 로 갱신 */
  const updateGiscus = <K extends keyof SiteConfigData["comments"]["giscus"]>(
    key: K,
    value: SiteConfigData["comments"]["giscus"][K],
  ) => {
    update("comments", "giscus", { ...giscus, [key]: value } as SiteConfigData["comments"]["giscus"]);
  };

  // 저장소 불러오기 — GitHub API 로 repoId + Discussion 카테고리 목록 획득 (카테고리 select 용)
  const [giscusCats, setGiscusCats] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [giscusLoading, setGiscusLoading] = useState(false);
  const [giscusErr, setGiscusErr] = useState("");
  const [needsToken, setNeedsToken] = useState(false);
  const loadGiscusRepo = async () => {
    const repo = giscus.repo?.trim();
    if (!repo) return;
    setGiscusLoading(true); setGiscusErr(""); setNeedsToken(false);
    try {
      const res = await fetch(`/api/admin/giscus-repo?repo=${encodeURIComponent(repo)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGiscusCats([]);
        if (data.needsToken) { setNeedsToken(true); setGiscusErr(""); }
        else setGiscusErr(errorText(data, t, t("admin.settings.giscusLoadFailed")));
        return;
      }
      setGiscusCats(data.categories ?? []);
      update("comments", "giscus", { ...giscus, repoId: data.repoId } as SiteConfigData["comments"]["giscus"]);
      if (!data.discussionsEnabled) setGiscusErr(t("admin.settings.giscusNoDiscussions"));
    } catch {
      setGiscusErr(t("admin.settings.giscusLoadFailed"));
    } finally {
      setGiscusLoading(false);
    }
  };
  const selectGiscusCategory = (name: string) => {
    const cat = giscusCats.find((c) => c.name === name);
    update("comments", "giscus", { ...giscus, category: name, categoryId: cat?.id ?? giscus.categoryId } as SiteConfigData["comments"]["giscus"]);
  };
  // GITHUB_TOKEN env 필드로 스크롤 + 포커스 (토큰 없어 불러오기 실패했을 때)
  const goToGithubTokenField = () => {
    const el = document.getElementById("env-GITHUB_TOKEN");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLInputElement>("input")?.focus();
  };

  // 카테고리 help — Select/Field 두 케이스 공용
  const categoryHelp = L(
    "댓글 스레드가 생성될 Discussion 카테고리입니다. 관리자만 새 글을 만들 수 있는 'Announcements' 유형을 권장합니다.",
    "The Discussion category for comment threads. An 'Announcements'-type (maintainers only) is recommended.",
  );
  // 테마 help — light/dark 두 필드 공용
  const themeHelp = L(
    "giscus 프리셋을 고르거나 '커스텀 (CSS URL)'로 사이트에 맞춥니다. 커스텀 URL 은 배포된 공개 https 주소여야 합니다.",
    "Pick a giscus preset, or 'Custom (CSS URL)'. A custom URL must be a deployed public https address.",
  );

  return (
    <>
      {/* Email Service */}
      <section className={shared.section}>
        {/* 문의 메일은 브라우저가 공급자로 바로 보내 서버가 결과를 모른다 — 기록은 첨부 결과(contact) */}
        <SectionHeader title={t("admin.settings.emailSettings")} paths={["emailService"]} spacerExtra={<ServiceLogLink query={{ category: "contact" }} />} {...sh} />
        <div className={`${shared.fields} ${shared.fieldPair}`}>
          <HintLines lines={[
            /* 공급자 이름은 각 사이트로 — 요금제·첨부 조건을 바로 확인하게 */
            (() => {
              const [before, after = ""] = t("admin.settings.emailFileUploadHint").split("{{providers}}");
              const sites = [
                ["Formspree", "https://formspree.io/"],
                ["Web3Forms", "https://web3forms.com/"],
                ["EmailJS", "https://www.emailjs.com/"],
              ] as const;
              return (
                <>
                  {before}
                  {sites.map(([name, href], i) => (
                    <span key={name}>
                      {i > 0 && " · "}
                      <a className={styles.hintLink} href={href} target="_blank" rel="noopener noreferrer">{name}</a>
                    </span>
                  ))}
                  {after}
                </>
              );
            })(),
            envKeyLine([...(CONTACT_KEYS[config.emailService.provider as keyof typeof CONTACT_KEYS] ?? [])], t),
          ]} />
          <FieldRow label={<T k="admin.settings.emailServiceProvider" />}>
            <Select
              value={config.emailService.provider}
              options={[
                { value: "formspree", label: "Formspree" },
                { value: "web3forms", label: "Web3Forms" },
                { value: "emailjs", label: "EmailJS" },
              ]}
              onChange={(v) => update("emailService", "provider", v as SiteConfigData["emailService"]["provider"])}
            />
          </FieldRow>
          <Switch
            label={t("admin.settings.emailFileUpload")}
            labelPosition="top"
            checked={config.emailService.enableFileUpload}
            onCheckedChange={(v) => update("emailService", "enableFileUpload", v)}
          />
          {config.emailService.enableFileUpload && <AttachmentHealthNote t={t} />}
        </div>
      </section>

      {/* Comment Notifications */}
      <section className={shared.section}>
        <SectionHeader
          title={t("admin.settings.commentNotifications")}
          spacerExtra={<ServiceLogLink query={{ category: "mail" }} />}
          paths={["commentEmailNotify"]}
          extra={
            <Switch
              size="sm"
              showStateText
              checked={config.commentEmailNotify ?? false}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, commentEmailNotify: v }))}
            />
          }
          {...sh}
        />
        <div className={shared.fields}>
          <HintLines lines={[t("admin.settings.commentEmailNotifyDesc"), envKeyLine(["RESEND_API_KEY"], t)]} />
        </div>
      </section>

      {/* Comment System — 내장 커스텀 vs giscus */}
      <section className={shared.section}>
        <SectionHeader
          title={t("admin.settings.commentSystem")}
          paths={["comments"]}
          spacerExtra={config.comments?.provider === "giscus" ? <ServiceLogLink query={{ category: "github" }} /> : undefined}
          {...sh}
        />
        <div className={shared.fields}>
          {/* 설명 — giscus 일 때만. GITHUB_TOKEN 은 저장소·카테고리 조회에 쓴다(없으면 익명 조회, 시간당 60회) */}
          {config.comments?.provider === "giscus" && (
            <HintLines lines={[t("admin.settings.giscusHint"), envKeyLine(["GITHUB_TOKEN"], t, { optional: true })]} />
          )}
          <div className={styles.providerRow}>
          <FieldRow label={<T k="admin.settings.commentProvider" />}>
            <SegmentedControl<"system" | "giscus">
              items={[
                { value: "system", label: t("admin.settings.commentProviderSystem") },
                { value: "giscus", label: "giscus" },
              ]}
              value={config.comments?.provider === "giscus" ? "giscus" : "system"}
              onChange={(v) => update("comments", "provider", v as SiteConfigData["comments"]["provider"])}
            />
          </FieldRow>
          {config.comments?.provider === "giscus" && <GiscusHelp />}
          </div>

          {config.comments?.provider !== "giscus" && (
            <FieldRow label={t("admin.settings.giscusInputPosition")}>
              <SegmentedControl<"top" | "bottom">
                items={[
                  { value: "top", label: t("admin.settings.giscusInputTop") },
                  { value: "bottom", label: t("admin.settings.giscusInputBottom") },
                ]}
                value={config.comments?.systemInputPosition === "top" ? "top" : "bottom"}
                onChange={(v) => update("comments", "systemInputPosition", v as SiteConfigData["comments"]["systemInputPosition"])}
              />
            </FieldRow>
          )}

          {config.comments?.provider === "giscus" && (
            <>
              {/* 저장소 — 입력칸 옆에 불러오기. 불러오면 저장소 ID·카테고리 목록이 채워진다 */}
              <FormGroup title={t("admin.settings.giscusGroupRepo")}>
                <div className={styles.repoRow}>
                  <div className={styles.repoField}>
              <Field
                label={t("admin.settings.giscusRepo")}
                value={giscus.repo}
                onChange={(v) => updateGiscus("repo", v)}
                placeholder="owner/name"
                maxHint={null}
                help={L(
                  "댓글(Discussion)이 저장될 공개 GitHub 저장소를 owner/name 형식으로 지정합니다.",
                  "The public GitHub repo (owner/name) where comments are stored as Discussions.",
                )}
              />
                  </div>
                  <Button variant="outline" onClick={loadGiscusRepo} disabled={giscusLoading || !giscus.repo.trim()}>
                    {giscusLoading ? t("admin.settings.giscusLoading") : t("admin.settings.giscusLoadRepo")}
                  </Button>
                </div>
                {(needsToken || giscusErr || giscusCats.length > 0) && (
                  <div className={styles.repoStatus}>
                    {needsToken
                      ? <Button variant="link" size="xs" onClick={goToGithubTokenField}>
                          {t("admin.settings.giscusNeedsToken")}
                        </Button>
                      : giscusErr
                        ? <span className={styles.repoStatusError}>{giscusErr}</span>
                        : giscusCats.length > 0
                          ? <span className={styles.repoStatusOk}>{t("admin.settings.giscusLoaded")}</span>
                          : null}
                  </div>
                )}
              {giscusCats.length > 0 ? (
                <FieldRow label={t("admin.settings.giscusCategory")} help={categoryHelp}>
                  <Select
                    value={giscus.category || ""}
                    placeholder={t("admin.settings.giscusCategoryPick")}
                    options={giscusCats.map((c) => ({ value: c.name, label: `${c.emoji ? c.emoji + " " : ""}${c.name}` }))}
                    onChange={selectGiscusCategory}
                  />
                </FieldRow>
              ) : (
                <Field
                  label={t("admin.settings.giscusCategory")}
                  value={giscus.category}
                  onChange={(v) => updateGiscus("category", v)}
                  placeholder="Announcements"
                  maxHint={null}
                  help={categoryHelp}
                />
              )}
              </FormGroup>

              {/* 식별자 — 불러오기로 자동으로 채워진다(giscus.app 스크립트 값을 붙여 넣어도 된다) */}
              <FormGroup title={t("admin.settings.giscusGroupIds")} description={t("admin.settings.giscusGroupIdsHint")} cols={2}>
                <Field
                  label={t("admin.settings.giscusRepoId")}
                  value={giscus.repoId}
                  onChange={(v) => updateGiscus("repoId", v)}
                  placeholder="R_kgD..."
                  maxHint={null}
                  help={L(
                    "GitHub이 저장소에 부여하는 내부 식별자(R_…)입니다. GITHUB_TOKEN 을 설정하고 위 '저장소 불러오기'를 누르면 자동으로 채워집니다. (또는 giscus.app 스크립트의 data-repo-id 값을 직접 붙여넣어도 됩니다.)",
                    "GitHub's internal repo ID (R_…). It fills in automatically after you set GITHUB_TOKEN and click 'Load repository' above. (Or paste the data-repo-id from the giscus.app script.)",
                  )}
                />
                <Field
                  label={t("admin.settings.giscusCategoryId")}
                  value={giscus.categoryId}
                  onChange={(v) => updateGiscus("categoryId", v)}
                  placeholder="DIC_kwD..."
                  maxHint={null}
                  help={L(
                    "카테고리의 내부 식별자(DIC_…)입니다. '저장소 불러오기' 후 위에서 카테고리를 선택하면 자동으로 채워집니다. (또는 giscus.app 스크립트의 data-category-id 값을 직접 붙여넣어도 됩니다.)",
                    "The category's internal ID (DIC_…). It fills in when you pick a category above after loading the repository. (Or paste the data-category-id from the giscus.app script.)",
                  )}
                />
              </FormGroup>

              {/* 표시 — 연결 방식 · 입력창 위치, 그리고 켜고 끄는 네 가지 */}
              {/* 스위치 라벨 칸을 같은 폭으로 — 라벨 길이와 상관없이 스위치가 같은 자리에서 시작한다 */}
              <FormGroup title={t("admin.settings.giscusGroupDisplay")} cols={2} switchLabelWidth="10em">
              <FieldRow label={<T k="admin.settings.giscusMapping" />} help={L(
                "페이지와 Discussion 을 연결하는 방식입니다. pathname(경로)을 권장하며, 글 제목을 바꿔도 댓글이 유지됩니다.",
                "How pages map to Discussions. pathname is recommended — comments survive title edits.",
              )}>
                <Select
                  width="full"
                  value={giscus.mapping || "pathname"}
                  options={[
                    { value: "pathname", label: "pathname" },
                    { value: "url", label: "url" },
                    { value: "title", label: "title" },
                    { value: "og:title", label: "og:title" },
                  ]}
                  onChange={(v) => updateGiscus("mapping", v as SiteConfigData["comments"]["giscus"]["mapping"])}
                />
              </FieldRow>
              <FieldRow label={<T k="admin.settings.giscusInputPosition" />} help={L(
                "댓글 입력창을 목록 위/아래 중 어디에 둘지 선택합니다.",
                "Whether the comment box sits above or below the list.",
              )}>
                <SegmentedControl<"top" | "bottom">
                  items={[
                    { value: "top", label: t("admin.settings.giscusInputTop") },
                    { value: "bottom", label: t("admin.settings.giscusInputBottom") },
                  ]}
                  value={giscus.inputPosition === "top" ? "top" : "bottom"}
                  onChange={(v) => updateGiscus("inputPosition", v as SiteConfigData["comments"]["giscus"]["inputPosition"])}
                />
              </FieldRow>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusReactions")}
                  checked={giscus.reactionsEnabled !== false}
                  onCheckedChange={(v) => updateGiscus("reactionsEnabled", v)}
                />
                <FieldHelp content={L(
                  "Discussion 메인 글의 이모지 반응을 댓글 위에 표시합니다.",
                  "Shows the main post's emoji reactions above comments.",
                )} />
              </div>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusStrict")}
                  checked={giscus.strict === true}
                  onCheckedChange={(v) => updateGiscus("strict", v)}
                />
                <FieldHelp content={L(
                  "비슷한 경로가 섞이지 않도록 페이지와 Discussion 을 더 엄격하게 매칭합니다.",
                  "Matches pages and Discussions more strictly to avoid collisions.",
                )} />
              </div>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusEmitMetadata")}
                  checked={giscus.emitMetadata === true}
                  onCheckedChange={(v) => updateGiscus("emitMetadata", v)}
                />
                <FieldHelp content={L(
                  "Discussion 메타데이터를 부모 페이지로 전달합니다. 보통 꺼 두어도 됩니다.",
                  "Sends Discussion metadata to the parent page. Usually fine to leave off.",
                )} />
              </div>
              <div className={styles.switchHelpRow}>
                <Switch
                  size="md"
                  label={t("admin.settings.giscusLazyLoading")}
                  checked={giscus.lazyLoading !== false}
                  onCheckedChange={(v) => updateGiscus("lazyLoading", v)}
                />
                <FieldHelp content={L(
                  "댓글 영역이 화면에 들어올 때 로드하여 초기 로딩을 아낍니다. 켜 두기를 권장합니다.",
                  "Loads comments when scrolled into view, saving initial load. Recommended on.",
                )} />
              </div>
              </FormGroup>

              {/* 테마 — 라이트 · 다크 두 칸. 커스텀이면 각 칸 아래에 CSS 주소 */}
              <FormGroup title={t("admin.settings.giscusGroupTheme")} cols={2}>
                <div className={styles.themeCol}>
              <GiscusThemeField
                label={t("admin.settings.giscusThemeLight")}
                value={giscus.themeLight ?? ""}
                defaultPreset="light"
                customLabel={t("admin.settings.giscusThemeCustom")}
                urlPlaceholder="https://.../giscus-theme-light.css"
                defaultCustomFile="giscus-theme-light.css"
                onChange={(v) => updateGiscus("themeLight", v)}
                help={themeHelp}
              />
                </div>
                <div className={styles.themeCol}>
              <GiscusThemeField
                label={t("admin.settings.giscusThemeDark")}
                value={giscus.themeDark ?? ""}
                defaultPreset="dark"
                customLabel={t("admin.settings.giscusThemeCustom")}
                urlPlaceholder="https://.../giscus-theme-dark.css"
                defaultCustomFile="giscus-theme-dark.css"
                onChange={(v) => updateGiscus("themeDark", v)}
                help={themeHelp}
              />
                </div>
              </FormGroup>
            </>
          )}
        </div>
      </section>

      {/* Security */}
      <section className={shared.section}>
        <SectionHeader
          title={t("admin.settings.securitySettings")}
          paths={["recaptcha"]}
          extra={
            <Switch
              size="sm"
              showStateText
              checked={config.recaptcha.enabled}
              onCheckedChange={(v) => update("recaptcha", "enabled", v)}
            />
          }
          {...sh}
        />
        <div className={shared.fields}>
          <HintLines lines={[envKeyLine(["NEXT_PUBLIC_RECAPTCHA_SITE_KEY"], t)]} />
          <FieldRow label={<T k="admin.settings.recaptchaVersion" />}>
            <Select
              value={config.recaptcha.version}
              options={[
                { value: "v2", label: "v2 (Checkbox)" },
                { value: "v3", label: "v3 (Invisible)" },
              ]}
              onChange={(v) => update("recaptcha", "version", v as SiteConfigData["recaptcha"]["version"])}
            />
          </FieldRow>
        </div>
      </section>

      {/* Media Upload — 드래그앤드롭 버킷은 넓은 폭이 필요해 전폭으로. AI 섹션들은 아래로 흐른다. */}
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <SectionHeader title={t("admin.settings.mediaUpload")} paths={["media"]} {...sh} />
        <ul className={shared.sectionHintList}>
          <li>{t("admin.settings.mediaUploadHint")}</li>
          <li>{t("admin.settings.mediaUploadDescDnD")}</li>
        </ul>
        <MediaLimitsEditor config={config} setConfig={setConfig} t={t} />
      </section>

      {/* AI 상태·사용량 — 공급자별 실패 원인·차단·이번 달 사용량. 자체 API 로 바로 반영된다(탭 저장과 상관없음) */}
      <AiHealthPanel health={aiHealth} />

      {/* AI Cover */}
      <ProviderFallbackSection<AICoverProvider>
        t={t}
        sh={sh}
        title={t("admin.settings.aiSettings")}
        paths={["aiCover"]}
        providerLabelKey="admin.settings.aiCoverProvider"
        options={AI_COVER_OPTIONS}
        defaultProvider="nanobanana"
        value={config.aiCover as ProviderFallback<AICoverProvider>}
        onChange={(u) => setConfig((prev) => ({ ...prev, aiCover: u(prev.aiCover as ProviderFallback<AICoverProvider>) as typeof prev.aiCover }))}
        /* 자동 커버(아래 단추)는 Unsplash → Pexels 순서로 찾는다 — 키는 하나만 있어도 된다 */
        extraHints={[t("admin.settings.autoCoverHint"), envKeyLine(["UNSPLASH_ACCESS_KEY", "PEXELS_API_KEY"], t, { any: true })]}
        logProviders={["nanobanana", "huggingface", "unsplash", "pexels"]}
        keyOf={(p) => AI_PROVIDER_INFO[p as keyof typeof AI_PROVIDER_INFO]?.key}
        stateOf={stateFor((p) => p as AiProvider)}
      >
        {/* 자동 cover (Unsplash/Pexels 키워드 기반) — 기존 발행 글 일괄 적용 */}
        <AutoCoverMigrator t={t} />
      </ProviderFallbackSection>

      {/* AI Summary */}
      <ProviderFallbackSection<AISummaryProvider>
        t={t}
        sh={sh}
        title={t("admin.settings.aiSummarySettings")}
        paths={["aiSummary"]}
        providerLabelKey="admin.settings.aiSummaryProvider"
        options={AI_SUMMARY_OPTIONS}
        defaultProvider="gemini"
        value={config.aiSummary as ProviderFallback<AISummaryProvider>}
        onChange={(u) => setConfig((prev) => ({ ...prev, aiSummary: u(prev.aiSummary as ProviderFallback<AISummaryProvider>) as typeof prev.aiSummary }))}
        logProviders={["gemini", "openai", "claude"]}
        keyOf={(p) => AI_PROVIDER_INFO[p as keyof typeof AI_PROVIDER_INFO]?.key}
        stateOf={stateFor((p) => p as AiProvider)}
      />

      {/* AI 모델 — 요약 · 번역이 부르는 모델 이름. 비우면 기본 별칭(latest)이라 공급자가 모델을 은퇴시켜도 코드를 안 고친다 */}
      <section className={shared.section}>
        <SectionHeader title={t("admin.settings.aiModels")} paths={["aiModels"]} {...sh} />
        <HintLines lines={[t("admin.settings.aiModelsHint")]} />
        <div className={shared.fields}>
          {(["gemini", "openai", "claude"] as AiModelProvider[]).map((p) => (
            <Field
              key={p}
              label={AI_PROVIDER_INFO[p].label}
              value={config.aiModels?.[p] ?? ""}
              onChange={(v) => setConfig((prev) => ({ ...prev, aiModels: { ...prev.aiModels, [p]: v } }))}
              placeholder={DEFAULT_AI_MODELS[p]}
              maxHint={null}
            />
          ))}
        </div>
      </section>

      {/* Translation */}
      <ProviderFallbackSection<TranslationProvider>
        t={t}
        sh={sh}
        title={t("admin.settings.translationSettings")}
        paths={["translation"]}
        providerLabelKey="admin.settings.translationProvider"
        options={TRANSLATION_OPTIONS}
        defaultProvider="deepl"
        value={config.translation as ProviderFallback<TranslationProvider>}
        onChange={(u) => setConfig((prev) => ({ ...prev, translation: u(prev.translation as ProviderFallback<TranslationProvider>) as typeof prev.translation }))}
        logProviders={["deepl", "google_translate", "gemini", "claude"]}
        keyOf={(p) => AI_PROVIDER_INFO[p === "google" ? "google_translate" : (p as "deepl")]?.key}
        stateOf={stateFor((p) => (p === "google" ? "google_translate" : p) as AiProvider)}
        borderless
      />

      {/* 슬라이드 음성 — 편집 화면에서 고른 목소리의 제공자부터, 실패하면 이 순서로 같은 성별의 목소리로 넘어간다.
          기본 제공자는 편집 화면 목소리 목록의 처음 값이다 */}
      <ProviderFallbackSection<TtsProviderOption>
        t={t}
        sh={sh}
        title={t("admin.settings.ttsSettings")}
        hint={t("admin.settings.ttsHint")}
        paths={["tts"]}
        providerLabelKey="admin.settings.ttsProvider"
        options={TTS_OPTIONS}
        defaultProvider="fish"
        value={config.tts as ProviderFallback<TtsProviderOption>}
        onChange={(u) => setConfig((prev) => ({ ...prev, tts: u(prev.tts as ProviderFallback<TtsProviderOption>) as typeof prev.tts }))}
        logProviders={["fish", "google_tts", "edge"]}
        keyOf={(p) => AI_PROVIDER_INFO[p === "google" ? "google_tts" : (p as "fish")]?.key}
        stateOf={stateFor((p) => (p === "google" ? "google_tts" : p) as AiProvider)}
        borderless
      />

      {/* 슬라이드 음성 읽기 사전 — 자체 API 로 바로 저장한다(탭 저장과 상관없음). 편집 화면의 창에서 #tts-lexicon 으로 온다 */}
      <LexiconManager />

      {/* Environment Variables — 자체 PATCH API 로 별도 저장. SectionHeader 는 EnvVarFields 내부에서 customActions 로 렌더 → 액션 버튼이 title 라인에 위치.
          id — 위 섹션들의 "필요한 키" 바로가기가 칸이 없을 때 여기로 온다 */}
      <section id={ENV_SECTION_ID} className={`${shared.section} ${shared.sectionWide}`}>
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
          sectionHeader={{
            title: t("admin.settings.envVars"),
            config: sh.config,
            savedConfig: sh.savedConfig,
            saveSection: sh.saveSection,
            savingPaths: sh.savingPaths,
            titleClassName: shared.sectionTitle,
          }}
        />
      </section>
    </>
  );
}
