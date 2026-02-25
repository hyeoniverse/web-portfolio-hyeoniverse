"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import { SkeletonLine } from "@/components/ui/Skeleton";
import Toggle from "@/components/ui/Toggle";
import Select from "@/components/ui/Select";
import type { Series } from "@/types/post";
import ProfileSections, { profileDefaults } from "@/components/admin/ProfileSections";
import CategoryReassignModal from "@/components/admin/CategoryReassignModal";
import type { ProfileData } from "@/types/profile";
import { loadGoogleFont, validateGoogleFont } from "@/lib/loadGoogleFont";
import styles from "./Settings.module.css";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const TAB_IDS = ["general", "content", "appearance", "services", "account"] as const;

type TabId = (typeof TAB_IDS)[number];

const THEME_PRESETS: { name: string; theme: SiteConfigData["theme"] }[] = [
  {
    name: "Default",
    theme: { accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" },
  },
  {
    name: "Petal",
    theme: { accentColor: "#fb6f92", lightBg: "#ffe5ec", lightText: "#5c1a30", darkBg: "#1a0810", darkText: "#ffc2d1" },
  },
  {
    name: "Honey",
    theme: { accentColor: "#f6bd60", lightBg: "#f7ede2", lightText: "#3d2e1e", darkBg: "#1c130e", darkText: "#f5cac3" },
  },
  {
    name: "Blush",
    theme: { accentColor: "#f4acb7", lightBg: "#ffe5d9", lightText: "#5a3340", darkBg: "#1a0e14", darkText: "#d8e2dc" },
  },
  {
    name: "Sand",
    theme: { accentColor: "#d8a48f", lightBg: "#efebce", lightText: "#3e3c28", darkBg: "#18170e", darkText: "#d6ce93" },
  },
  {
    name: "Dusk",
    theme: { accentColor: "#68a691", lightBg: "#ffe5d4", lightText: "#3d2b33", darkBg: "#101c16", darkText: "#efc7c2" },
  },
  {
    name: "Forest",
    theme: { accentColor: "#588157", lightBg: "#dad7cd", lightText: "#344e41", darkBg: "#1a2e1f", darkText: "#a3b18a" },
  },
  {
    name: "Harvest",
    theme: { accentColor: "#dda15e", lightBg: "#fefae0", lightText: "#283618", darkBg: "#1a1e0e", darkText: "#fefae0" },
  },
  {
    name: "Meadow",
    theme: { accentColor: "#bc4749", lightBg: "#f2e8cf", lightText: "#386641", darkBg: "#141f12", darkText: "#a7c957" },
  },
  {
    name: "Arctic",
    theme: { accentColor: "#5fa8d3", lightBg: "#cae9ff", lightText: "#1b4965", darkBg: "#0c1e2e", darkText: "#bee9e8" },
  },
];

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
        setConfig((prev) => deepMerge(prev, settingsRes.config));
      }
      if (profileRes?.config) {
        const c = profileRes.config as Partial<ProfileData>;
        setProfileData({
          experiences: c.experiences ?? profileDefaults.experiences,
          skillGroups: c.skillGroups ?? profileDefaults.skillGroups,
          philosophy: c.philosophy ?? profileDefaults.philosophy,
          approachSteps: c.approachSteps ?? profileDefaults.approachSteps,
          certifications: c.certifications ?? profileDefaults.certifications,
          awards: c.awards ?? profileDefaults.awards,
        });
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
      const [settingsRes, profileRes] = await Promise.all([
        fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        }),
        fetch("/api/admin/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData),
        }),
      ]);
      if (!settingsRes.ok) {
        const body = await settingsRes.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${settingsRes.status}`);
      }
      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => null);
        throw new Error(body?.error ?? `Profile save: HTTP ${profileRes.status}`);
      }
      setMessage(t("admin.settings.saveSuccess"));
      // 서버 컴포넌트 재실행 → siteConfig 갱신 → ThemeProvider 반영
      router.refresh();
      // 다른 탭/페이지에 설정 변경 알림
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
  }, [config, profileData, t, router]);

  const update = <S extends keyof SiteConfigData>(
    section: S,
    key: keyof SiteConfigData[S],
    value: SiteConfigData[S][keyof SiteConfigData[S]]
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const updateSocial = (key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      social: { ...prev.social, [key]: value },
    }));
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
        <h1 className={styles.title}>{t("admin.settings.title")}</h1>
        <div className={styles.headerRight}>
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
            {t("admin.settings.reset")}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("admin.settings.saving") : t("admin.settings.save")}
          </button>
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
                      onClick={() => { setActiveTab("content"); setContentSubTab(sub); }}
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
            <>
              {/* Personal */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.personal")}</h2>
                <div className={styles.fields}>
                  <Field label={t("admin.settings.name")} value={config.personal.name} onChange={(v) => update("personal", "name", v)} />
                  <Field label={t("admin.settings.nickname")} value={config.personal.nickname} onChange={(v) => update("personal", "nickname", v)} />
                  <Field label={t("admin.settings.role")} value={config.personal.role} onChange={(v) => update("personal", "role", v)} />
                  <Field label={t("admin.settings.location")} value={config.personal.location} onChange={(v) => update("personal", "location", v)} />
                  <Field label={t("admin.settings.status")} value={config.personal.status} onChange={(v) => update("personal", "status", v)} />
                </div>
              </section>

              {/* Brand */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.brand")}</h2>
                <div className={styles.fields}>
                  <Field label={t("admin.settings.brandName")} value={config.brand.name} onChange={(v) => update("brand", "name", v)} />
                  <Field
                    label={t("admin.settings.splitName")}
                    value={config.brand.splitName.join(", ")}
                    onChange={(v) =>
                      update("brand", "splitName", v.split(",").map((s) => s.trim()) as string[] & SiteConfigData["brand"]["splitName"])
                    }
                  />
                  <Field label={t("admin.settings.tagline")} value={config.brand.tagline} onChange={(v) => update("brand", "tagline", v)} />
                  <LogoUpload
                    label={t("admin.settings.logoShort")}
                    url={config.brand.logoShortUrl}
                    uploadLabel={t("admin.settings.uploadLogo")}
                    removeLabel={t("admin.settings.removeLogo")}
                    onUploaded={(url) => update("brand", "logoShortUrl", url)}
                    onRemove={() => update("brand", "logoShortUrl", "")}
                  />
                  <LogoUpload
                    label={t("admin.settings.logoFull")}
                    url={config.brand.logoFullUrl}
                    uploadLabel={t("admin.settings.uploadLogo")}
                    removeLabel={t("admin.settings.removeLogo")}
                    onUploaded={(url) => update("brand", "logoFullUrl", url)}
                    onRemove={() => update("brand", "logoFullUrl", "")}
                  />
                </div>
              </section>

              {/* Contact & Social */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.contactSocial")}</h2>
                <div className={styles.fields}>
                  <Field label={t("admin.settings.email")} value={config.contact.email} onChange={(v) => update("contact", "email", v)} />
                  <Field label={t("admin.settings.github")} value={config.social.github ?? ""} onChange={(v) => updateSocial("github", v)} />
                  <Field label={t("admin.settings.linkedin")} value={config.social.linkedin ?? ""} onChange={(v) => updateSocial("linkedin", v)} />
                  <Field label={t("admin.settings.blog")} value={config.social.blog ?? ""} onChange={(v) => updateSocial("blog", v)} />
                </div>
              </section>

              {/* SEO / Metadata */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.seoMetadata")}</h2>
                <div className={styles.fields}>
                  <Field label={t("admin.settings.siteTitle")} value={config.metadata.title} onChange={(v) => update("metadata", "title", v)} />
                  <Field label={t("admin.settings.description")} value={config.metadata.description} onChange={(v) => update("metadata", "description", v)} multiline />
                  <Field label={t("admin.settings.keywords")} value={config.metadata.keywords} onChange={(v) => update("metadata", "keywords", v)} />
                  <Field label={t("admin.settings.author")} value={config.metadata.author} onChange={(v) => update("metadata", "author", v)} />
                </div>
              </section>

            </>
          )}

          {activeTab === "content" && (
            <>
              {contentSubTab === "home" && (
                <>
                  {/* Hero */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.hero")}</h2>
                    <div className={styles.fields}>
                      <div className={styles.fieldPair}>
                        <Field
                          label={`${t("admin.settings.heroHeadline")} (EN)`}
                          value={config.hero.headline.join("\n")}
                          onChange={(v) => update("hero", "headline", v.split("\n") as string[] & SiteConfigData["hero"]["headline"])}
                          multiline
                        />
                        <Field
                          label={`${t("admin.settings.heroHeadline")} (KO)`}
                          value={config.hero.headline_ko.join("\n")}
                          onChange={(v) => update("hero", "headline_ko", v.split("\n") as string[] & SiteConfigData["hero"]["headline_ko"])}
                          multiline
                        />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field
                          label={`${t("admin.settings.heroSubtext")} (EN)`}
                          value={config.hero.subtext.join("\n")}
                          onChange={(v) => update("hero", "subtext", v.split("\n") as string[] & SiteConfigData["hero"]["subtext"])}
                          multiline
                        />
                        <Field
                          label={`${t("admin.settings.heroSubtext")} (KO)`}
                          value={config.hero.subtext_ko.join("\n")}
                          onChange={(v) => update("hero", "subtext_ko", v.split("\n") as string[] & SiteConfigData["hero"]["subtext_ko"])}
                          multiline
                        />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label={`${t("admin.settings.scrollLabel")} (EN)`} value={config.hero.scrollLabel} onChange={(v) => update("hero", "scrollLabel", v)} />
                        <Field label={`${t("admin.settings.scrollLabel")} (KO)`} value={config.hero.scrollLabel_ko} onChange={(v) => update("hero", "scrollLabel_ko", v)} />
                      </div>
                    </div>
                  </section>

                  {/* Home About */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.homeAboutIntro")}</h2>
                    <p className={styles.sectionHint}>{t("admin.settings.highlightHint")}</p>
                    <div className={styles.fields}>
                      <div className={styles.fieldPair}>
                        <Field label="Intro (EN)" value={config.homeAbout.intro} onChange={(v) => update("homeAbout", "intro", v)} multiline />
                        <Field label="Intro (KO)" value={config.homeAbout.intro_ko} onChange={(v) => update("homeAbout", "intro_ko", v)} multiline />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Description (EN)" value={config.homeAbout.description} onChange={(v) => update("homeAbout", "description", v)} multiline />
                        <Field label="Description (KO)" value={config.homeAbout.description_ko} onChange={(v) => update("homeAbout", "description_ko", v)} multiline />
                      </div>
                    </div>
                  </section>

                  {/* Services */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.servicesLabel")}</h2>
                    <div className={styles.fields}>
                      <div className={styles.fieldPair}>
                        <Field label="Label (EN)" value={config.services.label} onChange={(v) => update("services", "label", v)} />
                        <Field label="Label (KO)" value={config.services.label_ko} onChange={(v) => update("services", "label_ko", v)} />
                      </div>
                    </div>
                    <ServiceItemsEditor
                      items={config.services.items}
                      onChange={(items) => update("services", "items", items as SiteConfigData["services"]["items"])}
                    />
                  </section>

                  {/* Marquee */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.marqueeWords")}</h2>
                    <div className={styles.fields}>
                      <div className={styles.fieldPair}>
                        <Field
                          label="Words (EN)"
                          value={config.marquee.words.join(", ")}
                          onChange={(v) => update("marquee", "words", v.split(",").map((s) => s.trim()) as string[] & SiteConfigData["marquee"]["words"])}
                        />
                        <Field
                          label="Words (KO)"
                          value={config.marquee.words_ko.join(", ")}
                          onChange={(v) => update("marquee", "words_ko", v.split(",").map((s) => s.trim()) as string[] & SiteConfigData["marquee"]["words_ko"])}
                        />
                      </div>
                    </div>
                  </section>

                  {/* CTA & Footer */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.ctaFooter")}</h2>
                    <div className={styles.fields}>
                      <div className={styles.fieldPair}>
                        <Field label={`${t("admin.settings.ctaLabel")} (EN)`} value={config.cta.label} onChange={(v) => update("cta", "label", v)} />
                        <Field label={`${t("admin.settings.ctaLabel")} (KO)`} value={config.cta.label_ko} onChange={(v) => update("cta", "label_ko", v)} />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field
                          label={`${t("admin.settings.ctaTitle")} (EN)`}
                          value={config.cta.title.join("\n")}
                          onChange={(v) => update("cta", "title", v.split("\n") as string[] & SiteConfigData["cta"]["title"])}
                          multiline
                        />
                        <Field
                          label={`${t("admin.settings.ctaTitle")} (KO)`}
                          value={config.cta.title_ko.join("\n")}
                          onChange={(v) => update("cta", "title_ko", v.split("\n") as string[] & SiteConfigData["cta"]["title_ko"])}
                          multiline
                        />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label={`${t("admin.settings.ctaButtonText")} (EN)`} value={config.cta.buttonText} onChange={(v) => update("cta", "buttonText", v)} />
                        <Field label={`${t("admin.settings.ctaButtonText")} (KO)`} value={config.cta.buttonText_ko} onChange={(v) => update("cta", "buttonText_ko", v)} />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label={`${t("admin.settings.footerCopyright")} (EN)`} value={config.footer.copyright} onChange={(v) => update("footer", "copyright", v)} />
                        <Field label={`${t("admin.settings.footerCopyright")} (KO)`} value={config.footer.copyright_ko} onChange={(v) => update("footer", "copyright_ko", v)} />
                      </div>
                      <Field label={t("admin.settings.loadingDisplayName")} value={config.loading.displayName} onChange={(v) => update("loading", "displayName", v)} />
                    </div>
                  </section>
                </>
              )}

              {contentSubTab === "profile" && (
                <ProfileSections data={profileData} setData={setProfileData} styles={styles} />
              )}

              {contentSubTab === "posts" && (
                <>
                  {/* Post Categories */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.postCategories")}</h2>
                    <div className={styles.fields}>
                      <CategoriesEditor
                        categories={config.posts?.categories ?? []}
                        onChange={(cats) => update("posts", "categories", cats as SiteConfigData["posts"]["categories"])}
                      />
                    </div>
                  </section>

                  {/* Series */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.posts.series")}</h2>
                    <SeriesManager categories={config.posts?.categories ?? []} />
                  </section>
                </>
              )}

              {contentSubTab === "works" && (
                <>
                  {/* Works Intro */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.worksIntro")}</h2>
                    <div className={styles.fields}>
                      <div className={styles.fieldPair}>
                        <Field label="Label (EN)" value={config.works.introLabel} onChange={(v) => update("works", "introLabel", v)} />
                        <Field label="Label (KO)" value={config.works.introLabel_ko} onChange={(v) => update("works", "introLabel_ko", v)} />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Title (EN)" value={config.works.introTitle} onChange={(v) => update("works", "introTitle", v)} />
                        <Field label="Title (KO)" value={config.works.introTitle_ko} onChange={(v) => update("works", "introTitle_ko", v)} />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Tagline (EN)" value={config.works.introTagline} onChange={(v) => update("works", "introTagline", v)} />
                        <Field label="Tagline (KO)" value={config.works.introTagline_ko} onChange={(v) => update("works", "introTagline_ko", v)} />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Description (EN)" value={config.works.introDesc} onChange={(v) => update("works", "introDesc", v)} multiline />
                        <Field label="Description (KO)" value={config.works.introDesc_ko} onChange={(v) => update("works", "introDesc_ko", v)} multiline />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Detail (EN)" value={config.works.introDetail} onChange={(v) => update("works", "introDetail", v)} multiline />
                        <Field label="Detail (KO)" value={config.works.introDetail_ko} onChange={(v) => update("works", "introDetail_ko", v)} multiline />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Quote (EN)" value={config.works.introQuote} onChange={(v) => update("works", "introQuote", v)} />
                        <Field label="Quote (KO)" value={config.works.introQuote_ko} onChange={(v) => update("works", "introQuote_ko", v)} />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Scope (EN)" value={config.works.introScope} onChange={(v) => update("works", "introScope", v)} />
                        <Field label="Scope (KO)" value={config.works.introScope_ko} onChange={(v) => update("works", "introScope_ko", v)} />
                      </div>
                    </div>
                  </section>

                  {/* Works Stats */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t("admin.settings.worksStats")}</h2>
                    <div className={styles.fields}>
                      <div className={styles.fieldPair}>
                        <Field label="Projects Label (EN)" value={config.works.statsProjects} onChange={(v) => update("works", "statsProjects", v)} />
                        <Field label="Projects Label (KO)" value={config.works.statsProjects_ko} onChange={(v) => update("works", "statsProjects_ko", v)} />
                      </div>
                      <div className={styles.fieldPair}>
                        <Field label="Clients Label (EN)" value={config.works.statsClients} onChange={(v) => update("works", "statsClients", v)} />
                        <Field label="Clients Label (KO)" value={config.works.statsClients_ko} onChange={(v) => update("works", "statsClients_ko", v)} />
                      </div>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {activeTab === "appearance" && (
            <>
              {/* Theme Presets */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.presets")}</h2>
                <div className={styles.presetGrid}>
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className={`${styles.presetCard} ${
                        config.theme.accentColor === preset.theme.accentColor &&
                        config.theme.lightBg === preset.theme.lightBg &&
                        config.theme.darkBg === preset.theme.darkBg
                          ? styles.presetCardActive
                          : ""
                      }`}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          theme: { ...preset.theme },
                        }))
                      }
                    >
                      <div className={styles.presetSwatches}>
                        <span
                          className={styles.presetSwatch}
                          style={{ background: preset.theme.darkBg }}
                        />
                        <span
                          className={styles.presetSwatch}
                          style={{ background: preset.theme.accentColor }}
                        />
                        <span
                          className={styles.presetSwatch}
                          style={{ background: preset.theme.lightBg }}
                        />
                      </div>
                      <span className={styles.presetName}>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Theme Colors */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.themeColors")}</h2>
                <div className={styles.fields}>
                  <ColorField label={t("admin.settings.accentColor")} value={config.theme.accentColor} onChange={(v) => update("theme", "accentColor", v)} />
                  <ColorField label={t("admin.settings.lightBg")} value={config.theme.lightBg} onChange={(v) => update("theme", "lightBg", v)} />
                  <ColorField label={t("admin.settings.lightText")} value={config.theme.lightText} onChange={(v) => update("theme", "lightText", v)} />
                  <ColorField label={t("admin.settings.darkBg")} value={config.theme.darkBg} onChange={(v) => update("theme", "darkBg", v)} />
                  <ColorField label={t("admin.settings.darkText")} value={config.theme.darkText} onChange={(v) => update("theme", "darkText", v)} />
                </div>
              </section>

              {/* Typography */}
              <section className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h2 className={styles.sectionTitle}>{t("admin.settings.typography")}</h2>
                  <a
                    href="https://fonts.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.hintLink}
                  >
                    Google Fonts ↗
                  </a>
                </div>
                <p className={styles.sectionHint}>
                  프리셋에서 선택하거나, 직접 입력란에 Google Fonts 이름을 입력하세요. (예: Roboto, Nanum Gothic)
                </p>
                <div className={styles.fields}>
                  <FontSelect
                    label={t("admin.settings.headingFont")}
                    value={config.typography?.headingFont ?? "Instrument Serif"}
                    options={["Instrument Serif", "Noto Serif KR", "Nanum Myeongjo", "Gowun Batang", "Hahmlet", "Playfair Display", "Cormorant Garamond", "Lora", "EB Garamond", "Merriweather"]}
                    onChange={(v) => update("typography", "headingFont", v)}
                  />
                  <FontSelect
                    label={t("admin.settings.bodyFont")}
                    value={config.typography?.bodyFont ?? "Space Grotesk"}
                    options={["Space Grotesk", "Noto Sans KR", "Gothic A1", "IBM Plex Sans KR", "Nanum Gothic", "Gowun Dodum", "Inter", "DM Sans", "Poppins", "Nunito"]}
                    onChange={(v) => update("typography", "bodyFont", v)}
                  />
                  <FontSelect
                    label={t("admin.settings.monoFont")}
                    value={config.typography?.monoFont ?? "JetBrains Mono"}
                    options={["JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Roboto Mono", "Inconsolata", "Nanum Gothic Coding", "Ubuntu Mono", "DM Mono", "Courier Prime"]}
                    onChange={(v) => update("typography", "monoFont", v)}
                  />
                </div>
              </section>

            </>
          )}

          {activeTab === "services" && (
            <>
              {/* Email Service */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.emailSettings")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.emailServiceProvider")}</label>
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
                <h2 className={styles.sectionTitle}>{t("admin.settings.aiSettings")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.aiCoverProvider")}</label>
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

              {/* Security */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.securitySettings")}</h2>
                <div className={styles.fields}>
                  <Toggle
                    label={t("admin.settings.recaptchaEnabled")}
                    checked={config.recaptcha.enabled}
                    onChange={(v) => update("recaptcha", "enabled", v)}
                  />
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.recaptchaVersion")}</label>
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
                <h2 className={styles.sectionTitle}>{t("admin.settings.envVars")}</h2>
                <EnvVarFields provider={config.emailService.provider} aiProvider={config.aiCover.provider} recaptchaEnabled={config.recaptcha.enabled} translateProvider={config.translation?.provider ?? "deepl"} />
              </section>
            </>
          )}

          {activeTab === "account" && (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.email")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.currentEmail")}</label>
                    <span className={styles.fieldValue}>{accountEmail}</span>
                  </div>
                  <Field
                    label={t("admin.settings.newEmail")}
                    value={accountNewEmail}
                    onChange={setAccountNewEmail}
                  />
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.password")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.newPassword")}</label>
                    <input
                      className={styles.fieldInput}
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder={t("admin.settings.leaveBlank")}
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.confirmPassword")}</label>
                    <input
                      className={styles.fieldInput}
                      type="password"
                      value={accountConfirm}
                      onChange={(e) => setAccountConfirm(e.target.value)}
                      placeholder={t("admin.settings.confirmPlaceholder")}
                    />
                  </div>
                </div>
              </section>

              <div className={styles.accountActions}>
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
                  {accountSaving ? t("admin.settings.saving") : t("admin.settings.updateAccount")}
                </button>
              </div>

              {/* Password Confirm Dialog */}
              {showPasswordConfirm && (
                <div className={styles.confirmOverlay} onClick={() => setShowPasswordConfirm(false)}>
                  <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                    <h3 className={styles.confirmTitle}>{t("admin.settings.currentPassword")}</h3>
                    <p className={styles.confirmDesc}>
                      {t("admin.settings.confirmPasswordDesc")}
                    </p>
                    <input
                      className={styles.fieldInput}
                      type="password"
                      value={accountCurrentPassword}
                      onChange={(e) => setAccountCurrentPassword(e.target.value)}
                      placeholder={t("admin.settings.currentPasswordPlaceholder")}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && accountCurrentPassword) {
                          handleAccountUpdate();
                        }
                        if (e.key === "Escape") {
                          setShowPasswordConfirm(false);
                        }
                      }}
                    />
                    {accountMessage && (
                      <span className={`${styles.message} ${accountMessage.startsWith("Error") ? styles.messageError : styles.messageSuccess}`}>
                        {accountMessage}
                      </span>
                    )}
                    <div className={styles.confirmActions}>
                      <button
                        type="button"
                        className={styles.confirmCancelBtn}
                        onClick={() => {
                          setShowPasswordConfirm(false);
                          setAccountCurrentPassword("");
                          setAccountMessage("");
                        }}
                      >
                        {t("admin.settings.cancel")}
                      </button>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        disabled={accountSaving || !accountCurrentPassword}
                        onClick={handleAccountUpdate}
                      >
                        {accountSaving ? t("admin.settings.saving") : t("admin.settings.confirm")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      {multiline ? (
        <textarea
          className={styles.fieldTextarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          className={styles.fieldInput}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.colorField}>
        <input
          type="color"
          className={styles.colorPicker}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className={styles.colorText}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
        />
      </div>
    </div>
  );
}

function LogoUpload({
  label,
  url,
  uploadLabel,
  removeLabel,
  onUploaded,
  onRemove,
}: {
  label: string;
  url: string;
  uploadLabel: string;
  removeLabel: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "logos");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded(data.url);
    } catch {
      // silent fail
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.logoUpload}>
        {url && (
          <div className={styles.logoPreview}>
            <Image src={url} alt="Logo" width={80} height={32} unoptimized className={styles.logoPreviewImage} />
          </div>
        )}
        <div className={styles.logoActions}>
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "..." : uploadLabel}
          </button>
          {url && (
            <button type="button" className={styles.logoBtnRemove} onClick={onRemove}>
              {removeLabel}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ServiceItemsEditor({
  items,
  onChange,
}: {
  items: SiteConfigData["services"]["items"];
  onChange: (items: SiteConfigData["services"]["items"]) => void;
}) {
  const updateItem = (index: number, key: string, value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange(next);
  };

  return (
    <div className={styles.serviceItems}>
      {items.map((item, i) => (
        <div key={i} className={styles.serviceItem}>
          <span className={styles.serviceItemNum}>{item.num}</span>
          <div className={styles.serviceItemFields}>
            <div className={styles.fieldPair}>
              <Field label="Title (EN)" value={item.title} onChange={(v) => updateItem(i, "title", v)} />
              <Field label="Title (KO)" value={item.title_ko} onChange={(v) => updateItem(i, "title_ko", v)} />
            </div>
            <div className={styles.fieldPair}>
              <Field label="Desc (EN)" value={item.desc} onChange={(v) => updateItem(i, "desc", v)} />
              <Field label="Desc (KO)" value={item.desc_ko} onChange={(v) => updateItem(i, "desc_ko", v)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** font display name → CSS variable for preview rendering */
const FONT_CSS_VARS: Record<string, string> = {
  "Instrument Serif": "var(--font-instrument)",
  "Noto Serif KR": "var(--font-noto-serif-kr)",
  "Nanum Myeongjo": "var(--font-nanum-myeongjo)",
  "Gowun Batang": "var(--font-gowun-batang)",
  "Hahmlet": "var(--font-hahmlet)",
  "Space Grotesk": "var(--font-space-grotesk)",
  "Noto Sans KR": "var(--font-noto-sans-kr)",
  "Gothic A1": "var(--font-gothic-a1)",
  "IBM Plex Sans KR": "var(--font-ibm-plex-sans-kr)",
  "Gowun Dodum": "var(--font-gowun-dodum)",
  "Nanum Gothic": "var(--font-nanum-gothic)",
  "JetBrains Mono": "var(--font-jetbrains)",
  "Fira Code": "var(--font-fira-code)",
  "Source Code Pro": "var(--font-source-code-pro)",
  "IBM Plex Mono": "var(--font-ibm-plex-mono)",
  "Roboto Mono": "var(--font-roboto-mono)",
  "Inconsolata": "var(--font-inconsolata)",
  "Nanum Gothic Coding": "var(--font-nanum-gothic-coding)",
  "Playfair Display": "var(--font-playfair)",
  "Cormorant Garamond": "var(--font-cormorant)",
  "Lora": "var(--font-lora)",
  "EB Garamond": "var(--font-eb-garamond)",
  "Merriweather": "var(--font-merriweather)",
  "Inter": "var(--font-inter)",
  "DM Sans": "var(--font-dm-sans)",
  "Poppins": "var(--font-poppins)",
  "Nunito": "var(--font-nunito)",
  "Ubuntu Mono": "var(--font-ubuntu-mono)",
  "DM Mono": "var(--font-dm-mono)",
  "Courier Prime": "var(--font-courier-prime)",
};

/** 프리셋이면 CSS var, 커스텀이면 폰트명 그대로 */
function getFontFamily(name: string) {
  return FONT_CSS_VARS[name] ?? `"${name}", sans-serif`;
}

function FontSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const isCustom = !!value && !options.includes(value);
  const [customInput, setCustomInput] = useState(isCustom ? value : "");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const effectiveOptions = isCustom
    ? [{ value, label: value }, ...options.map((f) => ({ value: f, label: f }))]
    : options.map((f) => ({ value: f, label: f }));

  // Debounced font search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = customInput.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fonts/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.fonts ?? []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [customInput]);

  const handlePresetChange = (v: string) => {
    setCustomInput("");
    setValidationError("");
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(v);
  };

  const handleSuggestionClick = (fontName: string) => {
    setCustomInput(fontName);
    setValidationError("");
    setSuggestions([]);
    setShowSuggestions(false);
    loadGoogleFont(fontName);
    onChange(fontName);
  };

  const handleCustomApply = async () => {
    setShowSuggestions(false);
    const trimmed = customInput.trim();
    if (!trimmed) {
      if (!options.includes(value)) onChange(options[0]);
      setValidationError("");
      return;
    }
    if (trimmed === value) return;

    // Case-insensitive preset match
    const presetMatch = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
    if (presetMatch) {
      setCustomInput(presetMatch);
      onChange(presetMatch);
      setValidationError("");
      return;
    }

    // Normalize: title case each word
    const normalized = trimmed.replace(/\b\w/g, (c) => c.toUpperCase());

    setValidating(true);
    setValidationError("");
    const valid = await validateGoogleFont(normalized);
    setValidating(false);

    if (valid) {
      setCustomInput(normalized);
      loadGoogleFont(normalized);
      onChange(normalized);
    } else {
      setValidationError("Google Fonts에 없는 폰트입니다");
    }
  };

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.fontSelectGroup}>
        <Select
          value={value}
          options={effectiveOptions}
          onChange={handlePresetChange}
          renderValue={(opt) => (
            <span style={{ fontFamily: getFontFamily(opt?.value ?? "") }}>
              {opt?.label ?? ""}
            </span>
          )}
          renderOption={(opt) => (
            <div className={styles.fontOption}>
              <span
                className={styles.fontSample}
                style={{ fontFamily: getFontFamily(opt.value) }}
              >
                가나다 Abc
              </span>
              <span className={styles.fontName}>{opt.label}</span>
            </div>
          )}
        />
        <div className={styles.fontCustomWrap}>
          <input
            type="text"
            className={`${styles.fontCustomInput} ${validationError ? styles.fontCustomInputError : ""}`}
            placeholder="직접 입력"
            value={customInput}
            onChange={(e) => { setCustomInput(e.target.value); setValidationError(""); }}
            onBlur={handleCustomApply}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (suggestions.length > 0) {
                  handleSuggestionClick(suggestions[0]);
                } else {
                  (e.target as HTMLInputElement).blur();
                }
              }
            }}
            style={customInput && !validationError ? { fontFamily: getFontFamily(customInput) } : undefined}
            disabled={validating}
          />
          {validating && <span className={styles.fontValidating}>확인 중…</span>}
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.fontSuggestions} data-lenis-prevent>
              {suggestions.map((font) => (
                <button
                  key={font}
                  type="button"
                  className={styles.fontSuggestionItem}
                  onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(font); }}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
        </div>
        {validationError && <p className={styles.fontValidationMsg}>{validationError}</p>}
      </div>
    </div>
  );
}

function CategoriesEditor({
  categories,
  onChange,
}: {
  categories: string[];
  onChange: (cats: string[]) => void;
}) {
  const { t } = useLanguage();
  const [newCat, setNewCat] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);

  const addCategory = () => {
    const cat = newCat.trim();
    if (cat && !categories.includes(cat)) {
      onChange([...categories, cat]);
    }
    setNewCat("");
  };

  const removeCategory = (cat: string) => {
    const remaining = categories.filter((c) => c !== cat);
    if (remaining.length === 0) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    setReassignTarget(cat);
  };

  const handleReassignConfirm = async (
    assignments: { id: string; category: string }[],
    newCategories: string[],
  ) => {
    if (assignments.length > 0) {
      await fetch("/api/posts/reassign-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
    }
    const remaining = categories.filter((c) => c !== reassignTarget);
    const merged = [...remaining, ...newCategories.filter((c) => !remaining.includes(c))];
    onChange(merged);
    setReassignTarget(null);
  };

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...categories];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div>
      <div className={styles.catList}>
        {categories.map((cat, i) => (
          <span
            key={cat}
            className={`${styles.catTag} ${dragIdx === i ? styles.catTagDragging : ""} ${overIdx === i && dragIdx !== i ? styles.catTagOver : ""}`}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
            onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          >
            <svg className={styles.catGrip} width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
              <circle cx="1.5" cy="1.5" r="1" /><circle cx="4.5" cy="1.5" r="1" />
              <circle cx="1.5" cy="5" r="1" /><circle cx="4.5" cy="5" r="1" />
              <circle cx="1.5" cy="8.5" r="1" /><circle cx="4.5" cy="8.5" r="1" />
            </svg>
            {cat}
            <button
              type="button"
              className={styles.catRemove}
              onClick={() => removeCategory(cat)}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className={styles.catInput}>
        <input
          className={styles.fieldInput}
          type="text"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCategory();
            }
          }}
          placeholder={t("admin.settings.newCategoryPlaceholder")}
        />
        <button
          type="button"
          className={styles.catAddBtn}
          onClick={addCategory}
          disabled={!newCat.trim()}
        >
          {t("admin.settings.addCategory")}
        </button>
      </div>
      {reassignTarget && (
        <CategoryReassignModal
          category={reassignTarget}
          availableCategories={categories.filter((c) => c !== reassignTarget)}
          onConfirm={handleReassignConfirm}
          onCancel={() => setReassignTarget(null)}
        />
      )}
    </div>
  );
}

function SeriesManager({ categories }: { categories: string[] }) {
  const { t } = useLanguage();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const newFormRef = useRef<HTMLDivElement>(null);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch("/api/series?all=true");
      const data = await res.json();
      setSeriesList(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  if (loading) return <p className={styles.fieldValue}>{t("common.loading")}</p>;

  return (
    <div className={styles.seriesList}>
      {seriesList.map((s) => {
        const expanded = expandedId === s.id;
        return (
          <div key={s.id}>
            <button
              type="button"
              className={`${styles.seriesCardHead} ${expanded ? styles.seriesCardHeadExpanded : ""}`}
              onClick={() => setExpandedId(expanded ? null : s.id)}
            >
              <div className={styles.seriesCardInfo}>
                <p className={styles.seriesCardName}>{s.title || t("admin.posts.untitled")}</p>
                <div className={styles.seriesCardMeta}>
                  {s.category && <span>{s.category}</span>}
                  <span>{s.post_count ?? 0} {t("admin.posts.postsCount")}</span>
                  <span className={`${styles.seriesBadge} ${s.published ? styles.seriesBadgePublished : styles.seriesBadgeDraft}`}>
                    {s.published ? t("admin.posts.published") : t("admin.posts.draft")}
                  </span>
                </div>
              </div>
              <svg className={`${styles.seriesChevron} ${expanded ? styles.seriesChevronOpen : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {expanded && (
              <SeriesInlineEditor
                series={s}
                categories={categories}
                onSave={() => { setExpandedId(null); fetchSeries(); }}
                onCancel={() => setExpandedId(null)}
                onDelete={async () => {
                  if (!confirm(`"${s.title}" — ${t("admin.posts.seriesDeleteConfirm")}`)) return;
                  await fetch(`/api/series/${s.id}`, { method: "DELETE" });
                  setExpandedId(null);
                  fetchSeries();
                }}
              />
            )}
          </div>
        );
      })}
      {creatingNew && (
        <div ref={newFormRef}>
          <SeriesInlineEditor
            series={null}
            categories={categories}
            onSave={() => { setCreatingNew(false); fetchSeries(); }}
            onCancel={() => setCreatingNew(false)}
          />
        </div>
      )}
      {!creatingNew && (
        <button
          type="button"
          className={styles.profileAddBtn}
          onClick={() => {
            setCreatingNew(true);
            setExpandedId(null);
            requestAnimationFrame(() => {
              newFormRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            });
          }}
        >
          {t("admin.posts.newSeries")}
        </button>
      )}
    </div>
  );
}

interface SeriesPostItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  series_order: number;
}

function SeriesInlineEditor({
  series,
  categories,
  onSave,
  onCancel,
  onDelete,
}: {
  series: Series | null;
  categories: string[];
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { t } = useLanguage();
  const ts = (key: string) => t(`admin.posts.seriesModal.${key}`);
  const isEdit = !!series;

  const [form, setForm] = useState({
    title: series?.title ?? "",
    title_en: series?.title_en ?? "",
    description: series?.description ?? "",
    description_en: series?.description_en ?? "",
    category: series?.category ?? "",
    cover_image: series?.cover_image ?? "",
    published: series?.published ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<SeriesPostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (!series?.id) return;
    setPostsLoading(true);
    fetch(`/api/series/${series.id}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(
          (data.posts ?? []).sort(
            (a: SeriesPostItem, b: SeriesPostItem) => a.series_order - b.series_order
          )
        );
      })
      .finally(() => setPostsLoading(false));
  }, [series?.id]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        updateField("cover_image", data.url);
      } catch {
        setError(ts("uploadFailed"));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleRemovePost = async (postId: string) => {
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series_id: null, series_order: 0 }),
    });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleReorder = async (index: number, direction: -1 | 1) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= posts.length) return;
    const updated = [...posts];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    updated.forEach((p, i) => (p.series_order = i));
    setPosts(updated);
    await Promise.all([
      fetch(`/api/posts/${updated[index].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ series_order: updated[index].series_order }),
      }),
      fetch(`/api/posts/${updated[swapIndex].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ series_order: updated[swapIndex].series_order }),
      }),
    ]);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError(ts("titleRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = isEdit && series ? `/api/series/${series.id}` : "/api/series";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(ts("saveFailed"));
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : ts("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.seriesCardBody}>
      <div className={styles.fieldPair}>
        <Field label={ts("titleKO")} value={form.title} onChange={(v) => updateField("title", v)} />
        <Field label={ts("titleEN")} value={form.title_en} onChange={(v) => updateField("title_en", v)} />
      </div>
      <div className={styles.fieldPair}>
        <Field label={ts("descriptionKO")} value={form.description} onChange={(v) => updateField("description", v)} multiline />
        <Field label={ts("descriptionEN")} value={form.description_en} onChange={(v) => updateField("description_en", v)} multiline />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>{ts("category")}</label>
        <Select
          value={form.category}
          options={[
            { value: "", label: ts("categoryNone") },
            ...categories.map((cat) => ({ value: cat, label: cat })),
          ]}
          onChange={(v) => updateField("category", v)}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>{ts("published")}</label>
        <Toggle
          label={form.published ? ts("publishedLabel") : ts("draftLabel")}
          checked={form.published}
          onChange={(v) => updateField("published", v)}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>{ts("coverImage")}</label>
        {form.cover_image ? (
          <div className={styles.logoUpload}>
            <div className={styles.logoPreview}>
              <Image src={form.cover_image} alt="" width={120} height={75} className={styles.logoPreviewImage} unoptimized />
            </div>
            <button type="button" className={styles.logoBtnRemove} onClick={() => updateField("cover_image", "")}>
              {ts("remove")}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.logoBtn} onClick={handleImageUpload} disabled={uploading}>
            {uploading ? ts("uploading") : ts("uploadCover")}
          </button>
        )}
      </div>

      {isEdit && (
        <div className={styles.seriesPostsSection}>
          <label className={styles.fieldLabel}>{ts("posts")} ({posts.length})</label>
          {postsLoading ? (
            <p className={styles.seriesPostsEmpty}>{ts("postsLoading")}</p>
          ) : posts.length === 0 ? (
            <p className={styles.seriesPostsEmpty}>{ts("postsEmpty")}</p>
          ) : (
            <div className={styles.seriesPostsList}>
              {posts.map((post, idx) => (
                <div key={post.id} className={styles.seriesPostItem}>
                  <div className={styles.seriesPostOrder}>
                    <button
                      type="button"
                      className={styles.seriesPostOrderBtn}
                      disabled={idx === 0}
                      onClick={() => handleReorder(idx, -1)}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 6.5 L5 3.5 L8 6.5" />
                      </svg>
                    </button>
                    <span className={styles.seriesPostOrderNum}>{idx + 1}</span>
                    <button
                      type="button"
                      className={styles.seriesPostOrderBtn}
                      disabled={idx === posts.length - 1}
                      onClick={() => handleReorder(idx, 1)}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 3.5 L5 6.5 L8 3.5" />
                      </svg>
                    </button>
                  </div>
                  <span className={styles.seriesPostTitle}>{post.title || ts("untitled")}</span>
                  <span className={`${styles.seriesPostStatus} ${post.published ? styles.seriesPostPublished : styles.seriesPostDraft}`}>
                    {post.published ? "P" : "D"}
                  </span>
                  <button
                    type="button"
                    className={styles.seriesPostRemove}
                    onClick={() => handleRemovePost(post.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className={styles.sectionHint} style={{ color: "var(--color-accent)" }}>{error}</p>}

      <div className={styles.seriesCardActions}>
        {onDelete && (
          <button type="button" className={styles.logoBtnRemove} onClick={onDelete}>
            {t("admin.posts.delete")}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className={styles.resetBtn} onClick={onCancel}>
          {ts("cancel")}
        </button>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "..." : isEdit ? ts("save") : ts("create")}
        </button>
      </div>
    </div>
  );
}

function EnvVarFields({
  provider,
  aiProvider,
  recaptchaEnabled,
  translateProvider,
}: {
  provider: string;
  aiProvider: string;
  recaptchaEnabled: boolean;
  translateProvider: string;
}) {
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
      // 다시 로드
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
              {saving ? t("admin.settings.saving") : t("admin.settings.envVarSave")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Deep merge ── */
/* eslint-disable @typescript-eslint/no-explicit-any */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>
): T {
  const result = { ...target } as any;
  for (const key of Object.keys(source)) {
    const val = (source as any)[key];
    if (val === undefined || val === null) continue;
    if (
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
