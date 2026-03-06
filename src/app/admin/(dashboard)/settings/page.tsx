"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { profileDefaults } from "@/components/admin/ProfileSections";
import type { ProfileData } from "@/types/profile";
import { TAB_IDS, TAB_CONFIG_KEYS, type TabId, deepMerge } from "./_data/settingsConstants";
import GeneralTab from "./_components/GeneralTab";
import ContentTab from "./_components/ContentTab";
import AppearanceTab from "./_components/AppearanceTab";
import ServicesTab from "./_components/ServicesTab";
import AccountTab from "./_components/AccountTab";
import T from "@/components/ui/T";
import styles from "./Settings.module.css";

export default function SettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { setInfinite, lenis, stop, start } = useLenis();
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
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "general";
    const p = new URLSearchParams(window.location.search);
    const tab = p.get("tab");
    return tab && TAB_IDS.includes(tab as TabId) ? (tab as TabId) : "general";
  });
  const [contentSubTab, setContentSubTab] = useState<"home" | "profile" | "works" | "posts">(() => {
    if (typeof window === "undefined") return "home";
    const p = new URLSearchParams(window.location.search);
    const sub = p.get("sub");
    return sub && ["home", "profile", "works", "posts"].includes(sub)
      ? (sub as "home" | "profile" | "works" | "posts")
      : "home";
  });
  const [accountEmail, setAccountEmail] = useState("");
  const [accountNewEmail, setAccountNewEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [accountCurrentPassword, setAccountCurrentPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleAccountUpdate = useCallback(async () => {
    if (!accountCurrentPassword) return;
    setAccountSaving(true);
    setAccountMessage("");
    try {
      const body: { currentPassword: string; email?: string; password?: string } = {
        currentPassword: accountCurrentPassword,
      };
      if (accountNewEmail !== accountEmail && accountNewEmail.trim() !== "") body.email = accountNewEmail;
      if (accountPassword) body.password = accountPassword;
      if (!body.email && !body.password) {
        setAccountMessage(t("admin.settings.noChanges"));
        return;
      }
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccountMessage(t("admin.settings.updateSuccess"));
      if (body.email) setAccountEmail(body.email);
      setAccountCurrentPassword("");
      setAccountPassword("");
      setAccountConfirm("");
      setShowPasswordConfirm(false);
      setTimeout(() => setAccountMessage(""), 3000);
    } catch (err) {
      setAccountMessage(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setAccountSaving(false);
    }
  }, [accountCurrentPassword, accountNewEmail, accountEmail, accountPassword, t]);

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
      if (settingsRes?.config && Object.keys(settingsRes.config).length > 0) {
        setConfig((prev) => {
          const merged = deepMerge(prev, settingsRes.config);
          savedConfigRef.current = structuredClone(merged) as SiteConfigData;
          return merged;
        });
      }
      if (profileRes?.config) {
        const c = profileRes.config as Partial<ProfileData>;
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
      }
      if (accountRes?.email) {
        setAccountEmail(accountRes.email);
        setAccountNewEmail(accountRes.email);
      }
    }).finally(() => setLoading(false));
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
      const mergedConfig = merged as unknown as SiteConfigData;

      const promises: Promise<Response>[] = [
        fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: mergedConfig }),
        }),
      ];
      if (activeTab === "content") {
        promises.push(
          fetch("/api/admin/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profileData),
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
      if (activeTab === "content") {
        savedProfileRef.current = structuredClone(profileData);
      }

      setMessage(t("admin.settings.saveSuccess"));
      router.refresh();
      try {
        const bc = new BroadcastChannel("settings-updated");
        bc.postMessage({ type: "settings-updated", timestamp: Date.now() });
        bc.close();
      } catch {}
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
    } finally {
      setSaving(false);
    }
  }, [activeTab, config, profileData, t, router]);

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
              {accountMessage && (
                <span className={`${styles.message} ${accountMessage.startsWith("Error") ? styles.messageError : styles.messageSuccess}`}>
                  {accountMessage}
                </span>
              )}
              <button
                className={styles.saveBtn}
                disabled={accountSaving}
                onClick={() => {
                  if (accountPassword && accountPassword !== accountConfirm) {
                    setAccountMessage(t("admin.settings.passwordMismatch"));
                    return;
                  }
                  const hasEmailChange = accountNewEmail !== accountEmail && accountNewEmail.trim() !== "";
                  const hasPasswordChange = !!accountPassword;
                  if (!hasEmailChange && !hasPasswordChange) {
                    setAccountMessage(t("admin.settings.noChanges"));
                    return;
                  }
                  setAccountMessage("");
                  setShowPasswordConfirm(true);
                }}
              >
                {accountSaving ? <T k="admin.settings.saving" /> : <T k="admin.settings.updateAccount" />}
              </button>
            </>
          ) : (
            <>
              {message && (
                <span
                  className={`${styles.message} ${message === t("admin.settings.saveError") ? styles.messageError : styles.messageSuccess}`}
                >
                  {message}
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
                disabled={saving}
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
          {TAB_IDS.map((id) => (
            <div key={id}>
              <button
                type="button"
                className={`${styles.navItem} ${activeTab === id ? styles.navItemActive : ""}`}
                onClick={() => {
                  setActiveTab(id);
                  if (id === "content") setContentSubTab("home");
                  setConfig(structuredClone(savedConfigRef.current));
                  setProfileData(structuredClone(savedProfileRef.current));
                }}
              >
                {t(`admin.settings.tabs.${id}`)}
              </button>
              {id === "content" && (
                <div className={styles.navSub}>
                  {(["home", "profile", "works", "posts"] as const).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      className={`${styles.navSubItem} ${activeTab === "content" && contentSubTab === sub ? styles.navSubItemActive : ""}`}
                      onClick={() => {
                        setActiveTab("content");
                        setContentSubTab(sub);
                        setConfig(structuredClone(savedConfigRef.current));
                        setProfileData(structuredClone(savedProfileRef.current));
                      }}
                    >
                      {t(`admin.settings.contentSub.${sub}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* ── Panel ── */}
        <div className={styles.panel}>
          {activeTab === "general" && (
            <GeneralTab config={config} update={update} styles={styles} />
          )}
          {activeTab === "content" && (
            <ContentTab
              config={config}
              update={update}
              setConfig={setConfig}
              profileData={profileData}
              setProfileData={setProfileData}
              contentSubTab={contentSubTab}
              styles={styles}
            />
          )}
          {activeTab === "appearance" && (
            <AppearanceTab config={config} update={update} setConfig={setConfig} styles={styles} />
          )}
          {activeTab === "services" && (
            <ServicesTab config={config} update={update} setConfig={setConfig} styles={styles} />
          )}
          {activeTab === "account" && (
            <AccountTab
              accountEmail={accountEmail}
              accountNewEmail={accountNewEmail}
              setAccountNewEmail={setAccountNewEmail}
              accountPassword={accountPassword}
              setAccountPassword={setAccountPassword}
              accountConfirm={accountConfirm}
              setAccountConfirm={setAccountConfirm}
              accountCurrentPassword={accountCurrentPassword}
              setAccountCurrentPassword={setAccountCurrentPassword}
              accountMessage={accountMessage}
              setAccountMessage={setAccountMessage}
              accountSaving={accountSaving}
              showPasswordConfirm={showPasswordConfirm}
              setShowPasswordConfirm={setShowPasswordConfirm}
              handleAccountUpdate={handleAccountUpdate}
              styles={styles}
            />
          )}
        </div>
      </div>
    </div>
  );
}
