"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Settings as SettingsIcon } from "@/components/icons";
import { useStaticPageScroll } from "@/hooks/useStaticPageScroll";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { FAVICON_REFRESH_EVENT } from "@/components/layout/FaviconSync";
import DiffResolver from "./_components/DiffResolver";
import SettingsSkeleton from "./_components/SettingsSkeleton";
import { profileDefaults, isProfileAllOpen, toggleProfileAll, type ProfileExpandState } from "@/components/admin/ProfileSections";
import type { ProfileData } from "@/types/profile";
import { TAB_IDS, TAB_CONFIG_KEYS, type TabId, CONTENT_SUBTABS, type ContentSubTab, deepMerge, deepEqual, computeDelta, extractDefaults, detectConflicts, isDeltaFormat, filterOrphanedKeys, getTabForConfigPath, getContentSubTabForKey, getByPath, setByPath, type ConfigConflict } from "./_data/settingsConstants";
import GeneralTab from "./_components/GeneralTab";
import ContentTab from "./_components/ContentTab";
import AppearanceTab from "./_components/AppearanceTab";
import ServicesTab from "./_components/ServicesTab";
import AccountTab from "./_components/AccountTab";
import SectionHeader from "./_components/SectionHeader";
import SectionJumpNav from "./_components/SectionJumpNav";
import AuthorsEditor from "./_components/AuthorsEditor";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { useModalStore } from "@/stores/modalStore";
import { useAccountSettings } from "./_hooks/useAccountSettings";
import shared from "./Settings.module.css";
import local from "./page.module.css";
const styles = { ...shared, ...local };

const PROFILE_SECTION_LABELS: Record<string, string> = {
  experiences: "Experience",
  skillGroups: "Skills",
  philosophy: "Philosophy",
  approachSteps: "Approach",
  certifications: "Certifications",
  awards: "Awards",
};


export default function SettingsPage() {
  const { t, language } = useLanguage();
  useStaticPageScroll();
  const { openModal, closeModal } = useModalStore();
  const [config, setConfig] = useState<SiteConfigData>(
    structuredClone(siteConfig) as unknown as SiteConfigData
  );
  const [profileData, setProfileData] = useState<ProfileData>(
    structuredClone(profileDefaults)
  );
  // Profile sub-tab — expanded state lifted up so the header can render
  // the global "전체 펼치기/접기" button.
  const [profileExpanded, setProfileExpanded] = useState<ProfileExpandState>({
    experiences: { 0: true },
    skillGroups: {},
    philosophy: {},
    approach: {},
    certifications: {},
    awards: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPaths, setSavingPaths] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const savedConfigRef = useRef<SiteConfigData>(structuredClone(siteConfig) as unknown as SiteConfigData);
  const savedProfileRef = useRef<ProfileData>(structuredClone(profileDefaults));
  // 섹션 바로가기(SectionJumpNav) 가 스캔할 패널 컨테이너 ref.
  const panelRef = useRef<HTMLDivElement>(null);
  // 탭바가 고정(pin)됐는지 — sentinel 이 사이트 nav 밑으로 사라지면 스크롤한 것.
  // 고정되면 상단(nav 영역 포함)에 frost blur 를 깐다 (edit 페이지와 같은 방식).
  const navSentinelRef = useRef<HTMLDivElement>(null);
  const [navPinned, setNavPinned] = useState(false);
  useEffect(() => {
    const el = navSentinelRef.current;
    if (!el) return; // 로딩 스켈레톤 동안엔 sentinel 이 없다 — loading 이 풀리면 재실행된다
    const io = new IntersectionObserver(
      ([e]) => setNavPinned(!e.isIntersecting),
      /* 고정선 = 사이트 nav 높이(--header-height, 64px). 그 위로 sentinel 이 넘어가면 pin */
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get("tab");
    return tab && TAB_IDS.includes(tab as TabId) ? (tab as TabId) : "general";
  });
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>(() => {
    const sub = searchParams.get("sub");
    return sub && (CONTENT_SUBTABS as readonly string[]).includes(sub)
      ? (sub as ContentSubTab)
      : "home";
  });
  // 권한 게이팅 — 사이트 설정 탭은 소유자 전용, 비owner 는 account(본인 계정/프로필)만
  const [isOwnerUser, setIsOwnerUser] = useState<boolean | null>(null); // null=확인 전
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsOwnerUser(!!d?.isOwner))
      .catch(() => setIsOwnerUser(false));
  }, []);
  const allowedTabs: TabId[] = isOwnerUser === false ? ["account"] : [...TAB_IDS];
  // 비owner 가 허용 안 된 탭에 있으면 account 로 강제
  useEffect(() => {
    if (isOwnerUser === false && activeTab !== "account") setActiveTab("account");
  }, [isOwnerUser, activeTab]);
  /* 탭/서브탭 → URL 동기화 — 새로고침/북마크/공유 가능. push 아닌 replace 라 history 안 늘어남.
     첫 mount 는 skip (초기화 그대로 두기). */
  const tabSyncedRef = useRef(false);
  useEffect(() => {
    if (!tabSyncedRef.current) { tabSyncedRef.current = true; return; }
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    if (activeTab === "content") url.searchParams.set("sub", contentSubTab);
    else url.searchParams.delete("sub");
    window.history.replaceState(null, "", url.toString());
  }, [activeTab, contentSubTab]);
  const account = useAccountSettings(t);

  // ── 현재 탭/서브탭을 URL 쿼리에 반영 (새로고침·북마크·딥링크 유지) ──
  // replaceState 라 history 를 오염시키지 않음. content 탭일 때만 sub 노출.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (activeTab === "content") params.set("sub", contentSubTab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeTab, contentSubTab]);

  // ── 통합 충돌 상태 ──
  const [allConflicts, setAllConflicts] = useState<ConfigConflict[]>([]);
  const [checkedConflicts, setCheckedConflicts] = useState<Set<string>>(new Set());
  const [conflictExpanded, setConflictExpanded] = useState(false);

  // 현재 탭/서브탭에 해당하는 충돌만 필터
  const tabConflicts = useMemo(() => {
    if (activeTab === "content") {
      return allConflicts.filter((c) => c.tab === "content" && c.subTab === contentSubTab);
    }
    return allConflicts.filter((c) => c.tab === activeTab);
  }, [allConflicts, activeTab, contentSubTab]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/profile").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/account").then((r) => r.json()).catch(() => null),
    ]).then(([settingsRes, profileRes, accountRes]) => {
      const foundConflicts: ConfigConflict[] = [];

      // ── siteConfig 충돌 감지 ──
      if (settingsRes?.config && Object.keys(settingsRes.config).length > 0) {
        const defaults = structuredClone(siteConfig) as unknown as SiteConfigData;
        let dbDelta: Record<string, unknown>;

        if (isDeltaFormat(settingsRes.config)) {
          dbDelta = filterOrphanedKeys(settingsRes.config.delta, defaults);
          const found = detectConflicts(
            dbDelta,
            settingsRes.config.savedDefaults,
            defaults
          );
          for (const c of found) {
            const tab = getTabForConfigPath(c.path);
            foundConflicts.push({
              ...c, source: "siteConfig", tab,
              subTab: tab === "content" ? getContentSubTabForKey(c.path.split(".")[0]) : undefined,
            });
          }
        } else {
          dbDelta = filterOrphanedKeys(settingsRes.config, defaults);
          const diff = computeDelta(dbDelta, defaults);
          if (Object.keys(diff).length > 0) {
            const found = detectConflicts(diff, diff, defaults);
            for (const c of found) {
              const tab = getTabForConfigPath(c.path);
              foundConflicts.push({
                ...c, source: "siteConfig", tab,
                subTab: tab === "content" ? getContentSubTabForKey(c.path.split(".")[0]) : undefined,
              });
            }
          }
        }

        setConfig((prev) => {
          const merged = deepMerge(prev, dbDelta);
          savedConfigRef.current = structuredClone(merged) as SiteConfigData;
          return merged;
        });
      }

      // ── profile 충돌 감지 ──
      if (profileRes?.config) {
        const raw = profileRes.config;
        const isNewFormat = raw.data && raw.savedDefaults;
        const c = (isNewFormat ? raw.data : raw) as Partial<ProfileData>;
        const loaded: ProfileData = {
          experiences: c.experiences ?? profileDefaults.experiences,
          skillGroups: c.skillGroups ?? profileDefaults.skillGroups,
          philosophy: c.philosophy ?? profileDefaults.philosophy,
          approachSteps: c.approachSteps ?? profileDefaults.approachSteps,
          certifications: c.certifications ?? profileDefaults.certifications,
          awards: c.awards ?? profileDefaults.awards,
        };
        setProfileData(loaded);
        savedProfileRef.current = structuredClone(loaded);

        if (isNewFormat) {
          const savedDefs = raw.savedDefaults as Partial<ProfileData>;
          for (const key of Object.keys(profileDefaults) as (keyof ProfileData)[]) {
            if (savedDefs[key] !== undefined &&
              !deepEqual(savedDefs[key], profileDefaults[key])) {
              foundConflicts.push({
                path: key,
                dbValue: c[key],
                codeDefault: profileDefaults[key],
                oldDefault: savedDefs[key],
                source: "profile",
                tab: "content",
                subTab: "profile",
              });
            }
          }
        } else {
          for (const key of Object.keys(profileDefaults) as (keyof ProfileData)[]) {
            if (c[key] !== undefined &&
              !deepEqual(c[key], profileDefaults[key])) {
              foundConflicts.push({
                path: key,
                dbValue: c[key],
                codeDefault: profileDefaults[key],
                oldDefault: c[key],
                source: "profile",
                tab: "content",
                subTab: "profile",
              });
            }
          }
        }
      }

      if (foundConflicts.length > 0) setAllConflicts(foundConflicts);

      if (accountRes?.email) {
        account.setInitialData(
          accountRes.email,
          accountRes.pendingEmail ?? null,
          accountRes.emailChangeSentAt ?? null,
        );
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDelta = useCallback(async (fullConfig: SiteConfigData) => {
    const defaults = structuredClone(siteConfig) as unknown as SiteConfigData;
    const delta = computeDelta(fullConfig, defaults);
    const savedDefaults = extractDefaults(delta, defaults);
    return fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { delta, savedDefaults } }),
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage("");
    try {
      const keys = TAB_CONFIG_KEYS[activeTab] ?? [];
      const merged = { ...savedConfigRef.current } as Record<string, unknown>;
      for (const key of keys) {
        merged[key] = config[key];
      }

      // ── 체크된 siteConfig 충돌을 머지 ──
      const checkedItems = allConflicts.filter((c) => checkedConflicts.has(`${c.source}:${c.path}`));
      const siteConfigConflicts = checkedItems.filter((c) => c.source === "siteConfig");
      const profileConflicts = checkedItems.filter((c) => c.source === "profile");

      if (siteConfigConflicts.length > 0) {
        const defaults = structuredClone(siteConfig) as unknown as Record<string, unknown>;
        for (const c of siteConfigConflicts) {
          const parts = c.path.split(".");
          if (parts.length === 1) {
            merged[parts[0]] = defaults[parts[0]];
          } else {
            const section = { ...(merged[parts[0]] as Record<string, unknown>) };
            const defSection = defaults[parts[0]] as Record<string, unknown>;
            if (section && defSection) {
              section[parts[1]] = defSection[parts[1]];
              merged[parts[0]] = section;
            }
          }
        }
      }

      const mergedConfig = merged as unknown as SiteConfigData;

      // ── 체크된 profile 충돌을 머지 ──
      let mergedProfile = profileData;
      if (profileConflicts.length > 0) {
        mergedProfile = { ...profileData };
        for (const c of profileConflicts) {
          (mergedProfile as unknown as Record<string, unknown>)[c.path] =
            structuredClone((profileDefaults as unknown as Record<string, unknown>)[c.path]);
        }
      }

      // profile: content 탭이거나, profile 충돌이 체크됐을 때 저장
      const shouldSaveProfile = activeTab === "content" || profileConflicts.length > 0;

      const promises: Promise<Response>[] = [saveDelta(mergedConfig)];
      if (shouldSaveProfile) {
        promises.push(
          fetch("/api/admin/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: mergedProfile,
              savedDefaults: profileDefaults,
            }),
          }),
        );
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
      }

      savedConfigRef.current = structuredClone(mergedConfig);
      if (shouldSaveProfile) {
        savedProfileRef.current = structuredClone(mergedProfile);
        setProfileData(structuredClone(mergedProfile));
      }
      setConfig(structuredClone(mergedConfig));

      // 저장 완료 → savedDefaults 갱신됨 → 모든 충돌 해소
      setAllConflicts([]);
      setCheckedConflicts(new Set());

      setMessage(t("admin.settings.saveSuccess"));
      // 탭 favicon 즉시 갱신 (reload 전에도 최신 반영)
      try { window.dispatchEvent(new Event(FAVICON_REFRESH_EVENT)); } catch {}
      try {
        const bc = new BroadcastChannel("settings-updated");
        bc.postMessage({ type: "settings-updated", timestamp: Date.now() });
        bc.close();
      } catch {}
      // full reload로 서버 config 반영 (router.refresh()는 hydration mismatch 유발)
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
    } finally {
      setSaving(false);
    }
  }, [activeTab, config, profileData, allConflicts, checkedConflicts, t, saveDelta]);

  /** 특정 dot-path 들만 savedConfig 로 되돌리기 — 섹션 헤더의 되돌리기 버튼이 호출 */
  const revertSection = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setConfig((prev) => {
      let next = structuredClone(prev);
      for (const p of paths) {
        next = setByPath(next, p, getByPath(savedConfigRef.current, p));
      }
      return next;
    });
  }, []);

  /** 특정 dot-path 들만 siteConfig 기본값으로 재설정 — 섹션 헤더의 기본값 버튼 */
  const resetSection = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setConfig((prev) => {
      let next = structuredClone(prev);
      for (const p of paths) {
        next = setByPath(next, p, getByPath(siteConfig as unknown as SiteConfigData, p));
      }
      return next;
    });
  }, []);

  /* 필수값 검사 — 현재 탭 기준. 빈값이면 전역 "저장" 버튼 disable + 섹션 저장도 차단(아래 saveSection).
     하드 강제는 API(validateRequiredSettings) · DB CHECK 가 담당하고, 여기선 UX 용 사전 차단. */
  const validationError = useMemo(() => {
    if (activeTab === "general") {
      if (!String(config.personal?.name ?? "").trim()) return t("admin.settings.nameRequired");
      if (!String(config.metadata?.title ?? "").trim()) return t("admin.settings.siteTitleRequired");
      const email = String(config.contact?.email ?? "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t("admin.settings.emailInvalid");
    }
    if (activeTab === "appearance") {
      const th = (config.theme ?? {}) as Record<string, unknown>;
      const colors: Array<[string, string]> = [
        ["accentColor", "액센트 색상"], ["lightBg", "라이트 배경색"], ["lightText", "라이트 텍스트색"],
        ["darkBg", "다크 배경색"], ["darkText", "다크 텍스트색"],
      ];
      for (const [k, label] of colors) {
        if (!String(th[k] ?? "").trim()) return `${label}을(를) 비워둘 수 없습니다.`;
      }
    }
    if (activeTab === "services") {
      if (config.comments?.provider === "giscus") {
        const g = (config.comments?.giscus ?? {}) as Record<string, unknown>;
        const req: Array<[string, string]> = [["repo", "repo"], ["repoId", "repoId"], ["category", "category"], ["categoryId", "categoryId"]];
        for (const [k, label] of req) {
          if (!String(g[k] ?? "").trim()) return `giscus ${label}을(를) 입력해야 합니다. (giscus 사용 시 필수)`;
        }
      }
    }
    return null;
  }, [activeTab, config, t]);

  /** 특정 dot-path 들만 부분 저장 — 섹션 헤더의 저장 버튼이 호출 */
  const saveSection = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    // 빈 필수값이면 섹션 저장도 막는다 (전역 저장 버튼과 동일 규칙 — 섹션 저장이 검증을 우회하던 버그 차단).
    // validationError 메시지는 이미 화면에 표시 중이라 여기선 조용히 중단만 한다.
    if (validationError) return;
    setSavingPaths(paths);
    setMessage("");
    try {
      let merged = structuredClone(savedConfigRef.current);
      for (const p of paths) {
        merged = setByPath(merged, p, getByPath(config, p));
      }
      const res = await saveDelta(merged);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      savedConfigRef.current = structuredClone(merged);
      setConfig(structuredClone(merged));
      setMessage(t("admin.settings.saveSuccess"));
      try {
        const bc = new BroadcastChannel("settings-updated");
        bc.postMessage({ type: "settings-updated", timestamp: Date.now() });
        bc.close();
      } catch {}
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
    } finally {
      setSavingPaths(null);
    }
  }, [config, saveDelta, t, validationError]);

  // 단일 충돌 resolve (머지 결과 적용)
  const resolveConflict = useCallback(async (c: ConfigConflict, mergedValue: unknown) => {
    if (c.source === "siteConfig") {
      const updated = { ...savedConfigRef.current } as Record<string, unknown>;
      const parts = c.path.split(".");
      if (parts.length === 1) {
        updated[parts[0]] = mergedValue;
      } else {
        const section = { ...(updated[parts[0]] as Record<string, unknown>) };
        section[parts[1]] = mergedValue;
        updated[parts[0]] = section;
      }
      const mergedConfig = updated as unknown as SiteConfigData;
      setConfig(structuredClone(mergedConfig));
      savedConfigRef.current = structuredClone(mergedConfig);
      await saveDelta(savedConfigRef.current);
    } else if (c.source === "profile") {
      setProfileData((prev) => {
        const next = { ...prev };
        (next as Record<string, unknown>)[c.path] = structuredClone(mergedValue);
        return next;
      });
    }
    setAllConflicts((prev) => prev.filter((x) => !(x.source === c.source && x.path === c.path)));
    closeModal();
    setTimeout(() => window.location.reload(), 600);
  }, [saveDelta, closeModal]);

  const openDiffModal = useCallback((c: ConfigConflict) => {
    const label = c.source === "profile" ? (PROFILE_SECTION_LABELS[c.path] ?? c.path) : c.path;

    openModal(
      <DiffResolver
        conflict={c}
        label={label}
        onResolve={(merged) => resolveConflict(c, merged)}
        onDismiss={() => closeModal()}
      />,
      {
        width: "min(90vw, 700px)",
        closeButton: false,
      },
    );
  }, [openModal, resolveConflict, closeModal]);

  const getConflictKey = (c: ConfigConflict) => `${c.source}:${c.path}`;
  const getConflictLabel = (c: ConfigConflict) =>
    c.source === "profile" ? (PROFILE_SECTION_LABELS[c.path] ?? c.path) : c.path;

  const hasChanges = useMemo(() => {
    const keys = TAB_CONFIG_KEYS[activeTab] ?? [];
    for (const key of keys) {
      if (!deepEqual(config[key as keyof SiteConfigData], savedConfigRef.current[key as keyof SiteConfigData])) return true;
    }
    if (activeTab === "content" && !deepEqual(profileData, savedProfileRef.current)) return true;
    return false;
  }, [activeTab, config, profileData]);

  const update = <S extends keyof SiteConfigData>(
    section: S,
    key: keyof SiteConfigData[S],
    value: SiteConfigData[S][keyof SiteConfigData[S]]
  ) => {
    setConfig((prev) => {
      const sectionData = prev[section];
      if (typeof sectionData === "object" && sectionData !== null) {
        return { ...prev, [section]: { ...sectionData, [key]: value } };
      }
      return prev;
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <SkeletonLine width={120} height={32} />
          <SkeletonLine width={80} height={36} />
        </div>
        <div className={styles.layout}>
          <div className={`${styles.sideNav} ${styles.skeletonNav}`}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonLine key={i} width={120} height={36} />
            ))}
          </div>
          <div className={styles.panel}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={styles.skeletonSection}>
                <SkeletonLine width={140} height={16} />
                <div className={styles.skeletonFields}>
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="60%" height={36} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <SettingsIcon size={26} strokeWidth={1.6} aria-hidden className={styles.titleIcon} />
          <T k="admin.settings.title" />
        </h1>
        <div className={styles.headerRight}>
          {activeTab === "account" ? (
            <>
              {account.accountMessage && (
                <span className={`${styles.message} ${account.accountMessage.startsWith("Error") ? styles.messageError : styles.messageSuccess}`}>
                  {account.accountMessage}
                </span>
              )}
              <Button
                variant="primary"
                size="md"
                disabled={
                  account.accountSaving ||
                  !(
                    (account.accountNewEmail.trim() !== "" && account.accountNewEmail !== account.accountEmail) ||
                    account.accountPassword !== ""
                  )
                }
                onClick={() => {
                  if (account.accountPassword && account.accountPassword !== account.accountConfirm) {
                    account.setAccountMessage(t("admin.settings.passwordMismatch"));
                    return;
                  }
                  const hasEmailChange = account.accountNewEmail !== account.accountEmail && account.accountNewEmail.trim() !== "";
                  const hasPasswordChange = !!account.accountPassword;
                  if (!hasEmailChange && !hasPasswordChange) {
                    account.setAccountMessage(t("admin.settings.noChanges"));
                    return;
                  }
                  account.setAccountMessage("");
                  account.setShowPasswordConfirm(true);
                }}
              >
                {account.accountSaving ? <T k="admin.settings.saving" /> : <T k="admin.settings.updateAccount" />}
              </Button>
            </>
          ) : (
            <>
              {(message || (hasChanges && validationError)) && (
                <span
                  className={`${styles.message} ${message.startsWith(t("admin.settings.saveError")) || validationError ? styles.messageError : styles.messageSuccess}`}
                >
                  {message || validationError}
                </span>
              )}
              {activeTab === "content" && contentSubTab === "profile" && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setProfileExpanded(toggleProfileAll(profileData, !isProfileAllOpen(profileData, profileExpanded)))}
                >
                  <T k={isProfileAllOpen(profileData, profileExpanded) ? "admin.settings.profile.collapseAll" : "admin.settings.profile.expandAll"} />
                </Button>
              )}
              <Tooltip content={t("admin.settings.resetDefaultsTooltip")} placement="bottom" delay={250}>
                <Button
                  variant="outline"
                  size="md"
                  tone="danger"
                  onClick={() => {
                    openModal(
                      <ModalConfirm
                        desc={t("admin.settings.resetDefaultsConfirm")}
                        confirmText={t("admin.settings.resetDefaults")}
                        danger
                        onConfirm={() => setConfig(structuredClone(siteConfig) as unknown as SiteConfigData)}
                      />,
                      { width: "min(90vw, 480px)" },
                    );
                  }}
                >
                  <T k="admin.settings.resetDefaults" />
                </Button>
              </Tooltip>
              <Tooltip content={t("admin.settings.revertTooltip")} placement="bottom" delay={250}>
                <Button
                  variant="outline"
                  size="md"
                  disabled={!hasChanges}
                  onClick={() => setConfig(structuredClone(savedConfigRef.current))}
                >
                  <T k="admin.settings.revert" />
                </Button>
              </Tooltip>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={saving || !hasChanges || !!validationError}
              >
                {saving ? <T k="admin.settings.saving" /> : <T k="admin.settings.save" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 탭바 고정 감지용 sentinel — 탭바 자연 위치에 두는 0 높이 마커 */}
      <div ref={navSentinelRef} aria-hidden />
      <div className={styles.layout}>
        {/* ── Side Nav ── edit 페이지 topBar 처럼, sticky+frost 는 이 래퍼가 맡고
            가로 스크롤(overflow)은 안쪽 nav 가 맡는다 (overflow 가 ::before frost 를 안 자르게). */}
        <div className={`${styles.tabBarSticky} ${navPinned ? styles.tabBarPinned : ""}`}>
        <nav className={styles.sideNav}>
          {TAB_IDS.filter((id) => allowedTabs.includes(id)).map((id) => {
            const tabCount = allConflicts.filter((c) => c.tab === id).length;
            return (
              <div key={id}>
                <button
                  type="button"
                  className={`${styles.navItem} ${activeTab === id ? styles.navItemActive : ""}`}
                  onClick={() => {
                    setActiveTab(id);
                    if (id === "content") setContentSubTab("home");
                    setConfig(structuredClone(savedConfigRef.current));
                    setProfileData(structuredClone(savedProfileRef.current));
                    setConflictExpanded(false);
                    setCheckedConflicts(new Set());
                  }}
                >
                  {t(`admin.settings.tabs.${id}`)}
                  {tabCount > 0 && <span className={styles.navConflictBadge} />}
                </button>
                {id === "content" && (
                  <div className={styles.navSub}>
                    {CONTENT_SUBTABS.map((sub) => {
                      const subCount = allConflicts.filter((c) => c.tab === "content" && c.subTab === sub).length;
                      return (
                        <button
                          key={sub}
                          type="button"
                          className={`${styles.navSubItem} ${activeTab === "content" && contentSubTab === sub ? styles.navSubItemActive : ""}`}
                          onClick={() => {
                            setActiveTab("content");
                            setContentSubTab(sub);
                            setConfig(structuredClone(savedConfigRef.current));
                            setProfileData(structuredClone(savedProfileRef.current));
                            setConflictExpanded(false);
                            setCheckedConflicts(new Set());
                          }}
                        >
                          {t(`admin.settings.contentSub.${sub}`)}
                          {subCount > 0 && <span className={styles.navConflictBadge} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        </div>

        {/* ── Panel ── */}
        <div className={styles.panel} ref={panelRef}>
          {/* Content 하위탭(HOME/PROFILE/ABOUT/…) — 태블릿 이하에서만 보이는 가로 줄.
              섹션 바로가기(SectionJumpNav)는 이 하위탭 "아래"에 와야 계층이 맞다. */}
          {activeTab === "content" && (
            <div className={styles.mobileSubNav}>
              {CONTENT_SUBTABS.map((sub) => {
                const subCount = allConflicts.filter((c) => c.tab === "content" && c.subTab === sub).length;
                return (
                  <button
                    key={sub}
                    type="button"
                    className={`${styles.mobileSubItem} ${contentSubTab === sub ? styles.mobileSubItemActive : ""}`}
                    onClick={() => {
                      setContentSubTab(sub);
                      setConflictExpanded(false);
                      setCheckedConflicts(new Set());
                    }}
                  >
                    {t(`admin.settings.contentSub.${sub}`)}
                    {subCount > 0 && <span className={styles.navConflictBadge} />}
                  </button>
                );
              })}
            </div>
          )}
          {/* 섹션 바로가기 — 섹션이 여럿이면 하위탭 아래 가로 점프 링크. 탭으로 감추지 않고 이동만. */}
          <SectionJumpNav panelRef={panelRef} scanKey={`${activeTab}:${contentSubTab}`} pinned={navPinned} />
          {/* ── 통합 충돌 배너 (탭별 필터) ── */}
          {tabConflicts.length > 0 && (() => {
            const PREVIEW_COUNT = 3;
            const _previewItems = tabConflicts.slice(0, PREVIEW_COUNT);
            const allChecked = checkedConflicts.size === tabConflicts.length;
            const someChecked = checkedConflicts.size > 0 && !allChecked;

            return (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <T k="admin.settings.conflictTitle" /> ({tabConflicts.length})
                </h2>
                <p className={styles.conflictDesc}><T k="admin.settings.conflictDesc" /></p>

                <div
                  className={`${styles.conflictListClip} ${conflictExpanded ? styles.conflictListExpanded : ""}`}
                  ref={(el) => {
                    if (!el) return;
                    const selectAll = el.querySelector(`.${styles.conflictSelectAll}`) as HTMLElement | null;
                    const items = el.querySelectorAll(`.${styles.conflictPreviewItem}`);
                    const list = el.querySelector(`.${styles.conflictList}`) as HTMLElement | null;
                    if (!list) return;
                    // preview 높이: 전체선택 + 처음 PREVIEW_COUNT개 항목
                    let previewH = selectAll ? selectAll.offsetHeight : 0;
                    items.forEach((item, i) => {
                      if (i < PREVIEW_COUNT) previewH += (item as HTMLElement).offsetHeight;
                    });
                    el.style.setProperty("--_clip-h", `${previewH}px`);
                    el.style.setProperty("--_list-height", `${(selectAll?.offsetHeight ?? 0) + list.scrollHeight}px`);
                  }}
                >
                  <div className={styles.conflictSelectAll}>
                    <Checkbox
                      shape="square"
                      checked={allChecked}
                      indeterminate={someChecked}
                      onChange={(checked) => {
                        setCheckedConflicts(
                          checked ? new Set(tabConflicts.map(getConflictKey)) : new Set()
                        );
                      }}
                    />
                    <span className={styles.conflictSelectAllLabel}><T k="admin.settings.conflictSelectAll" /></span>
                  </div>
                  <div className={styles.conflictList}>
                    {tabConflicts.map((c) => {
                      const key = getConflictKey(c);
                      const label = getConflictLabel(c);
                      const dbStr = typeof c.dbValue === "object" ? JSON.stringify(c.dbValue, null, 2) : String(c.dbValue);
                      const codeStr = typeof c.codeDefault === "object" ? JSON.stringify(c.codeDefault, null, 2) : String(c.codeDefault);
                      return (
                        <div key={key} className={styles.conflictPreviewItem} onClick={() => openDiffModal(c)}>
                          <span style={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              shape="square"
                              checked={checkedConflicts.has(key)}
                              onChange={(checked) => {
                                setCheckedConflicts((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(key); else next.delete(key);
                                  return next;
                                });
                              }}
                            />
                          </span>
                          <code className={styles.conflictPath}>{label}</code>
                          <div className={styles.conflictValues}>
                            <span className={styles.conflictValueDB} title={dbStr}>{dbStr}</span>
                            <span className={styles.conflictValueCode} title={codeStr}>{codeStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.conflictFooter}>
                  {!conflictExpanded && tabConflicts.length > PREVIEW_COUNT ? (
                    <button
                      type="button"
                      className={styles.conflictToggle}
                      onClick={() => setConflictExpanded(true)}
                    >
                      + {tabConflicts.length - PREVIEW_COUNT}건 더 보기
                    </button>
                  ) : conflictExpanded ? (
                    <button
                      type="button"
                      className={styles.conflictToggle}
                      onClick={() => setConflictExpanded(false)}
                    >
                      <T k="admin.settings.conflictCollapse" />
                    </button>
                  ) : null}
                </div>
              </section>
            );
          })()}

          {loading ? (
            <SettingsSkeleton />
          ) : (
            <>
              {activeTab === "general" && (
                <div className={styles.tabGrid}>
                  <GeneralTab config={config} savedConfig={savedConfigRef.current} update={update} saveSection={saveSection} revertSection={revertSection} resetSection={resetSection} savingPaths={savingPaths} validationError={validationError} />
                </div>
              )}
              {activeTab === "content" && (
                <>
                <div className={`${styles.tabGrid} ${contentSubTab === "home" ? styles.tabGridSingle : ""}`}>
                  <ContentTab
                    config={config}
                    savedConfig={savedConfigRef.current}
                    update={update}
                    saveSection={saveSection}
                    revertSection={revertSection} resetSection={resetSection}
                    savingPaths={savingPaths}
                    validationError={validationError}
                    setConfig={setConfig}
                    profileData={profileData}
                    setProfileData={setProfileData}
                    profileExpanded={profileExpanded}
                    setProfileExpanded={setProfileExpanded}
                    contentSubTab={contentSubTab}
                  />
                </div>
                </>
              )}
              {activeTab === "appearance" && (
                <div className={styles.tabGrid}>
                  <AppearanceTab config={config} savedConfig={savedConfigRef.current} update={update} saveSection={saveSection} revertSection={revertSection} resetSection={resetSection} savingPaths={savingPaths} setConfig={setConfig} validationError={validationError} />
                </div>
              )}
              {activeTab === "services" && (
                <div className={styles.tabGrid}>
                  <ServicesTab config={config} savedConfig={savedConfigRef.current} update={update} saveSection={saveSection} revertSection={revertSection} resetSection={resetSection} savingPaths={savingPaths} setConfig={setConfig} validationError={validationError} />
                </div>
              )}
              {activeTab === "account" && (
                <div className={styles.tabGrid}>
                {/* 멤버 — 작성자 프로필 + 로그인 계정 관리. owner=전체 관리 / 비owner=목록 + 본인 프로필만 수정 (이슈 #334) */}
                <section className={`${styles.section} ${styles.sectionWide}`}>
                  <SectionHeader
                    title={language === "ko" ? "멤버" : "Members"}
                    paths={["authors"]}
                    config={config}
                    savedConfig={savedConfigRef.current}
                    saveSection={saveSection}
                    revertSection={revertSection}
                    resetSection={resetSection}
                    savingPaths={savingPaths}
                    titleClassName={styles.sectionTitle}
                  />
                  <p className={styles.sectionHint}>
                    {language === "ko"
                      ? "작성자 프로필과 로그인 권한을 함께 관리합니다. 이메일로 초대하면 동일한 GitHub 계정으로 로그인 시 권한이 부여됩니다."
                      : "Manage author profiles and login access together. Invite by email — access is granted when they sign in with the matching GitHub account."}
                  </p>
                  <AuthorsEditor
                    authors={config.authors ?? []}
                    onChange={(authors) => setConfig((prev) => ({ ...prev, authors }))}
                  />
                </section>
                <AccountTab
                  accountEmail={account.accountEmail}
                  accountNewEmail={account.accountNewEmail}
                  setAccountNewEmail={account.setAccountNewEmail}
                  accountPassword={account.accountPassword}
                  setAccountPassword={account.setAccountPassword}
                  accountConfirm={account.accountConfirm}
                  setAccountConfirm={account.setAccountConfirm}
                  accountCurrentPassword={account.accountCurrentPassword}
                  setAccountCurrentPassword={account.setAccountCurrentPassword}
                  accountMessage={account.accountMessage}
                  setAccountMessage={account.setAccountMessage}
                  accountSaving={account.accountSaving}
                  showPasswordConfirm={account.showPasswordConfirm}
                  setShowPasswordConfirm={account.setShowPasswordConfirm}
                  handleAccountUpdate={account.handleAccountUpdate}
                  pendingEmail={account.pendingEmail}
                  emailChangeSentAt={account.emailChangeSentAt}
                  onCancelPendingEmail={() => { account.setPendingEmail(null); account.setEmailChangeSentAt(null); }}
                  passwordPolicy={config.passwordPolicy ?? "secure"}
                  onPasswordPolicyChange={async (v: string) => {
                    const next = { ...config, passwordPolicy: v as "secure" | "default" };
                    setConfig(next);
                    const merged = { ...savedConfigRef.current, passwordPolicy: v } as unknown as SiteConfigData;
                    savedConfigRef.current = structuredClone(merged);
                    await saveDelta(merged);
                  }}
                />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
