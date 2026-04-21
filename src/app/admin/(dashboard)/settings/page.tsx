"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import { SkeletonLine } from "@/components/ui/Skeleton";
import DiffResolver from "./_components/DiffResolver";
import SettingsSkeleton from "./_components/SettingsSkeleton";
import { profileDefaults } from "@/components/admin/ProfileSections";
import type { ProfileData } from "@/types/profile";
import { TAB_IDS, TAB_CONFIG_KEYS, type TabId, deepMerge, deepEqual, computeDelta, extractDefaults, detectConflicts, isDeltaFormat, filterOrphanedKeys, getTabForConfigPath, getContentSubTabForKey, type ConfigConflict } from "./_data/settingsConstants";
import GeneralTab from "./_components/GeneralTab";
import ContentTab from "./_components/ContentTab";
import AppearanceTab from "./_components/AppearanceTab";
import ServicesTab from "./_components/ServicesTab";
import AccountTab from "./_components/AccountTab";
import T from "@/components/ui/T";
import Checkbox from "@/components/ui/Checkbox";
import { useModalStore } from "@/stores/modalStore";
import { useAccountSettings } from "./_hooks/useAccountSettings";
import styles from "./Settings.module.css";

const PROFILE_SECTION_LABELS: Record<string, string> = {
  experiences: "Experience",
  skillGroups: "Skills",
  philosophy: "Philosophy",
  approachSteps: "Approach",
  certifications: "Certifications",
  awards: "Awards",
};


export default function SettingsPage() {
  const { t } = useLanguage();
  const { setInfinite, lenis, stop, start } = useLenis();
  const { openModal, closeModal } = useModalStore();
  const [config, setConfig] = useState<SiteConfigData>(
    structuredClone(siteConfig) as unknown as SiteConfigData
  );
  const [profileData, setProfileData] = useState<ProfileData>(
    structuredClone(profileDefaults)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const savedConfigRef = useRef<SiteConfigData>(structuredClone(siteConfig) as unknown as SiteConfigData);
  const savedProfileRef = useRef<ProfileData>(structuredClone(profileDefaults));
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get("tab");
    return tab && TAB_IDS.includes(tab as TabId) ? (tab as TabId) : "general";
  });
  const [contentSubTab, setContentSubTab] = useState<"home" | "profile" | "works" | "posts">(() => {
    const sub = searchParams.get("sub");
    return sub && ["home", "profile", "works", "posts"].includes(sub)
      ? (sub as "home" | "profile" | "works" | "posts")
      : "home";
  });
  const account = useAccountSettings(t);

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
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);
    return () => { clearTimeout(timer); setInfinite(true); };
  }, [setInfinite, lenis, stop, start]);

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

  const validationError = useMemo(() => {
    if (activeTab === "general") {
      if (!String(config.personal?.name ?? "").trim()) return t("admin.settings.nameRequired");
      if (!String(config.metadata?.title ?? "").trim()) return t("admin.settings.siteTitleRequired");
      const email = String(config.contact?.email ?? "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t("admin.settings.emailInvalid");
    }
    return null;
  }, [activeTab, config, t]);

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
        <h1 className={styles.title}><T k="admin.settings.title" /></h1>
        <div className={styles.headerRight}>
          {activeTab === "account" ? (
            <>
              {account.accountMessage && (
                <span className={`${styles.message} ${account.accountMessage.startsWith("Error") ? styles.messageError : styles.messageSuccess}`}>
                  {account.accountMessage}
                </span>
              )}
              <button
                className={styles.saveBtn}
                disabled={account.accountSaving}
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
              </button>
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
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setConfig(structuredClone(siteConfig) as unknown as SiteConfigData)}
              >
                <T k="admin.settings.reset" />
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !hasChanges || !!validationError}
              >
                {saving ? <T k="admin.settings.saving" /> : <T k="admin.settings.save" />}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Side Nav ── */}
        <nav className={styles.sideNav}>
          {TAB_IDS.map((id) => {
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
                    {(["home", "profile", "works", "posts"] as const).map((sub) => {
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

        {/* ── Panel ── */}
        <div className={styles.panel}>
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
                  <GeneralTab config={config} update={update} styles={styles} />
                </div>
              )}
              {activeTab === "content" && (
                <>
                  <div className={styles.mobileSubNav}>
                    {(["home", "profile", "works", "posts"] as const).map((sub) => {
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
                <ContentTab
                  config={config}
                  update={update}
                  setConfig={setConfig}
                  profileData={profileData}
                  setProfileData={setProfileData}
                  contentSubTab={contentSubTab}
                  styles={styles}
                />
                </>
              )}
              {activeTab === "appearance" && (
                <div className={styles.tabGrid}>
                  <AppearanceTab config={config} update={update} setConfig={setConfig} styles={styles} />
                </div>
              )}
              {activeTab === "services" && (
                <div className={styles.tabGrid}>
                  <ServicesTab config={config} update={update} setConfig={setConfig} styles={styles} />
                </div>
              )}
              {activeTab === "account" && (
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
                  styles={styles}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
