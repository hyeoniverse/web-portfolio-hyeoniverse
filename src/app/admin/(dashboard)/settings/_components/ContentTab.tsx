"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import type { LocalizedText } from "@/types/common";
import type { SortDirection } from "@/types";
import { Plus, Check, X, Trash2, Filter, ChevronDown } from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { normalizeCategories } from "@/lib/categoryTree";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import T from "@/components/ui/T";
import { siteConfig, type SiteConfigData } from "@/config/site.config";
import type { ProfileData } from "@/types/profile";
import ProfileSections, { type ProfileExpandState } from "@/components/admin/ProfileSections";
import type { SettingsTabProps, AdminPostUsageInfo, PostMetaInfo } from "../_types";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import FieldRow from "@/components/ui/FieldRow";
import AboutStudio from "./about/AboutStudio";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import Field, { UploadField, ServiceItemsEditor } from "./SettingsFormFields";
import CategoriesEditor from "./CategoriesEditor";
import WorksCategoriesEditor from "./WorksCategoriesEditor";
import SeriesManager from "./SeriesManager";
import SocialLinksEditor from "./SocialLinksEditor";
import CalendarManager from "./CalendarManager";
import WorksIntroVideoPicker from "./WorksIntroVideoPicker";
import SectionHeader from "./SectionHeader";
import TagListField from "@/components/ui/TagListField";
import Pagination from "@/components/ui/Pagination";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import { List, ListItem } from "@/app/admin/(dashboard)/components";
import { normalizeTagMeta, type TagMeta, type StoredTagMeta } from "@/lib/tagMeta";
import { showToast } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import { findDuplicate } from "@/lib/dedupe";
import { matchesSearch } from "@/lib/koSearch";
import { getInitial, KO_INITIALS, EN_INITIALS } from "@/lib/initial";
import LetterFilter from "@/components/ui/LetterFilter";
import AboutTechStackEditor, { type TechItem } from "./AboutTechStackEditor";
import shared from "../Settings.module.css";
import local from "./ContentTab.module.css";
const styles = { ...shared, ...local };

/* About 페이지 패널 목록 — 표시여부 토글 + 전체선택 계산에 공용 */


interface ContentTabProps extends SettingsTabProps {
  profileData: ProfileData;
  setProfileData: Dispatch<SetStateAction<ProfileData>>;
  profileExpanded: ProfileExpandState;
  setProfileExpanded: Dispatch<SetStateAction<ProfileExpandState>>;
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
  contentSubTab: "home" | "profile" | "about" | "works" | "posts" | "calendars";
}

export default function ContentTab({
  config,
  savedConfig,
  update,
  saveSection,
  revertSection,
  resetSection,
  savingPaths,
  profileData,
  setProfileData,
  profileExpanded,
  setProfileExpanded,
  setConfig,
  contentSubTab,
}: ContentTabProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, titleClassName: styles.sectionTitle };

  /* Hero 배경 color picker 빈 값 fallback — 실제 패널 표면색 (테마 변수) 를 표시. */
  const [themeBg, setThemeBg] = useState<{ primary: string; secondary: string; accent: string }>({ primary: "#ffffff", secondary: "#f5f5f5", accent: "#d01046" });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cs = getComputedStyle(document.documentElement);
    const primary = cs.getPropertyValue("--bg-primary").trim() || "#ffffff";
    const secondary = cs.getPropertyValue("--bg-secondary").trim() || "#f5f5f5";
    const accent = cs.getPropertyValue("--color-accent").trim() || "#d01046";
    setThemeBg({ primary, secondary, accent });
  }, [theme]);

  /* 태그 deferred 삭제 — pending list. UI 에선 즉시 숨김, 섹션 저장 클릭 시 일괄 API 처리 */
  const [tagPendingDeletes, setTagPendingDeletes] = useState<Set<string>>(new Set());
  /* 태그 섹션 "기본값" 버튼 — 에디터가 리포트한 정보(기본 세트 밖 태그 존재 여부 + 초기화 실행 함수)로 제어.
     ref 는 항상 최신 초기화 함수 보관(리렌더 없이), state 는 버튼 활성 여부만. */
  const tagResetRef = useRef<(() => void) | null>(null);
  const [tagHasNonDefault, setTagHasNonDefault] = useState(false);
  const handleTagResetInfo = useCallback((info: { hasNonDefault: boolean; resetToDefault: () => void }) => {
    tagResetRef.current = info.resetToDefault;
    setTagHasNonDefault((prev) => (prev !== info.hasNonDefault ? info.hasNonDefault : prev));
  }, []);
  const [tagPendingExpanded, setTagPendingExpanded] = useState(false);
  const undoTagPendingDelete = useCallback((tag: string) => {
    setTagPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  }, []);
  const commitTagDeletes = useCallback(async () => {
    if (tagPendingDeletes.size === 0) return;
    const tags = Array.from(tagPendingDeletes);
    let okCount = 0;
    let affected = 0;
    for (const tag of tags) {
      try {
        const res = await fetch("/api/admin/tags/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag }),
        });
        if (res.ok) {
          okCount++;
          const data = await res.json().catch(() => ({}));
          affected += data.affected ?? 0;
        }
      } catch { /* swallow */ }
    }
    setTagPendingDeletes(new Set());
    showToast(`태그 ${okCount}개 삭제됨 (게시물 ${affected}건 업데이트)`, "success");
  }, [tagPendingDeletes]);

  /* config.socialLinks 가 매 렌더마다 새 array 가 되면 deps 가 매번 바뀜 → useMemo 로 stable. */
  const socialLinks = useMemo(() => config.socialLinks ?? [], [config.socialLinks]);

  // Normalize: support both old string[] and new { ko, en, description? }[] (description 은 legacy string 또는 bilingual {ko,en})
  const normalizedPostCats = useMemo(() => {
    const raw = config.posts?.categories ?? [];
    return (raw as unknown[]).map((item) =>
      typeof item === "string"
        ? { ko: item, en: item, description: undefined as LocalizedText | string | undefined }
        : (item as { ko: string; en: string; description?: LocalizedText | string }),
    );
  }, [config.posts?.categories]);

  const normalizedWorksCats = useMemo(() => {
    const raw = config.works?.categories ?? [];
    return (raw as unknown[]).map((item) =>
      typeof item === "string"
        ? { ko: item, en: item, description: undefined as LocalizedText | string | undefined }
        : (item as { ko: string; en: string; description?: LocalizedText | string }),
    );
  }, [config.works?.categories]);

  return (
    <>
      {contentSubTab === "home" && (
        <>
          {/* Hero */}
          <section className={styles.section}>
            <SectionHeader
              title={t("admin.settings.hero")}
              paths={["hero"]}
              extra={<span className={`${styles.sectionHint} ${styles.sectionHintInline}`}><T k="admin.settings.multilineHint" /></span>}
              {...sh}
            />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field
                  label={t("admin.settings.heroHeadline")}
                  langBadge="en"
                  value={config.hero.headline.join("\n")}
                  onChange={(v) => update("hero", "headline", v.split("\n"))}
                  multiline
                />
                <Field
                  label={t("admin.settings.heroHeadline")}
                  langBadge="ko"
                  value={config.hero.headline_ko.join("\n")}
                  onChange={(v) => update("hero", "headline_ko", v.split("\n"))}
                  multiline
                />
              </div>
              <div className={styles.fieldPair}>
                <Field
                  label={t("admin.settings.heroSubtext")}
                  langBadge="en"
                  value={config.hero.subtext.join("\n")}
                  onChange={(v) => update("hero", "subtext", v.split("\n"))}
                  multiline
                />
                <Field
                  label={t("admin.settings.heroSubtext")}
                  langBadge="ko"
                  value={config.hero.subtext_ko.join("\n")}
                  onChange={(v) => update("hero", "subtext_ko", v.split("\n"))}
                  multiline
                />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.scrollLabel")} langBadge="en" value={config.hero.scrollLabel} onChange={(v) => update("hero", "scrollLabel", v)} />
                <Field label={t("admin.settings.scrollLabel")} langBadge="ko" value={config.hero.scrollLabel_ko} onChange={(v) => update("hero", "scrollLabel_ko", v)} />
              </div>
            </div>
          </section>

          {/* 3D Objects */}
          <section className={styles.section}>
            <SectionHeader
              title={t("admin.settings.home3dLabel")}
              paths={["home3d"]}
              extra={<span className={`${styles.sectionHint} ${styles.sectionHintInline}`}><T k="admin.settings.home3dHint" /></span>}
              {...sh}
            />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Switch
                  size="md"
                  label={t("admin.settings.home3dScrollTorus")}
                  checked={config.home3d?.scrollTorus !== false}
                  onCheckedChange={(v) => update("home3d", "scrollTorus", v)}
                />
                <Switch
                  size="md"
                  label={t("admin.settings.home3dCoffeeCup")}
                  checked={config.home3d?.coffeeCup !== false}
                  onCheckedChange={(v) => update("home3d", "coffeeCup", v)}
                />
              </div>
            </div>
          </section>

          {/* Home Intro */}
          <section className={styles.section}>
            <SectionHeader
              title={t("admin.settings.homeIntroLabel")}
              paths={["homeIntro"]}
              extra={<span className={`${styles.sectionHint} ${styles.sectionHintInline}`}><T k="admin.settings.highlightHint" /></span>}
              {...sh}
            />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.fieldTagline")} langBadge="en" value={config.homeIntro.tagline} onChange={(v) => update("homeIntro", "tagline", v)} multiline />
                <Field label={t("admin.settings.fieldTagline")} langBadge="ko" value={config.homeIntro.tagline_ko} onChange={(v) => update("homeIntro", "tagline_ko", v)} multiline />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.fieldDescription")} langBadge="en" value={config.homeIntro.description} onChange={(v) => update("homeIntro", "description", v)} multiline />
                <Field label={t("admin.settings.fieldDescription")} langBadge="ko" value={config.homeIntro.description_ko} onChange={(v) => update("homeIntro", "description_ko", v)} multiline />
              </div>
            </div>
          </section>

          {/* Services */}
          <section className={styles.section} style={{ gridRow: "span 2", borderBottom: "none" }}>
            <SectionHeader title={t("admin.settings.servicesLabel")} paths={["services"]} {...sh} />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.fieldSectionTitle")} langBadge="en" value={config.services.label} onChange={(v) => update("services", "label", v)} />
                <Field label={t("admin.settings.fieldSectionTitle")} langBadge="ko" value={config.services.label_ko} onChange={(v) => update("services", "label_ko", v)} />
              </div>
            </div>
            <hr className={styles.sectionDivider} />
            <ServiceItemsEditor
              items={config.services.items}
              onChange={(items) => update("services", "items", items as SiteConfigData["services"]["items"])}
            />
          </section>

          {/* Marquee */}
          <section className={styles.section}>
            <SectionHeader
              title={t("admin.settings.marqueeWords")}
              paths={["marquee"]}
              extra={<span className={`${styles.sectionHint} ${styles.sectionHintInline}`}><T k="admin.settings.commaHint" /></span>}
              {...sh}
            />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field
                  label={t("admin.settings.fieldWords")}
                  langBadge="en"
                  value={config.marquee.words.join(", ")}
                  onChange={(v) => update("marquee", "words", v.split(",").map((s) => s.trim()))}
                />
                <Field
                  label={t("admin.settings.fieldWords")}
                  langBadge="ko"
                  value={config.marquee.words_ko.join(", ")}
                  onChange={(v) => update("marquee", "words_ko", v.split(",").map((s) => s.trim()))}
                />
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className={styles.section}>
            <SectionHeader
              title="CTA"
              paths={["cta"]}
              extra={<span className={`${styles.sectionHint} ${styles.sectionHintInline}`}><T k="admin.settings.multilineHint" /></span>}
              {...sh}
            />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.ctaLabel")} langBadge="en" value={config.cta.label} onChange={(v) => update("cta", "label", v)} />
                <Field label={t("admin.settings.ctaLabel")} langBadge="ko" value={config.cta.label_ko} onChange={(v) => update("cta", "label_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field
                  label={t("admin.settings.ctaTitle")}
                  langBadge="en"
                  value={config.cta.title.join("\n")}
                  onChange={(v) => update("cta", "title", v.split("\n"))}
                  multiline
                />
                <Field
                  label={t("admin.settings.ctaTitle")}
                  langBadge="ko"
                  value={config.cta.title_ko.join("\n")}
                  onChange={(v) => update("cta", "title_ko", v.split("\n"))}
                  multiline
                />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.ctaButtonText")} langBadge="en" value={config.cta.buttonText} onChange={(v) => update("cta", "buttonText", v)} />
                <Field label={t("admin.settings.ctaButtonText")} langBadge="ko" value={config.cta.buttonText_ko} onChange={(v) => update("cta", "buttonText_ko", v)} />
              </div>
              <UploadField
                kind="resume"
                label={t("admin.settings.resumeFile")}
                hint={t("admin.settings.resumeUploadHint")}
                url={config.cta.resumeUrl}
                uploadLabel={t("admin.settings.uploadResume")}
                removeLabel={t("admin.settings.removeLogo")}
                onUploaded={(url) => update("cta", "resumeUrl", url)}
                onRemove={() => update("cta", "resumeUrl", "")}
              />
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.resumeButtonText")} langBadge="en" value={config.cta.resumeButtonText} onChange={(v) => update("cta", "resumeButtonText", v)} />
                <Field label={t("admin.settings.resumeButtonText")} langBadge="ko" value={config.cta.resumeButtonText_ko} onChange={(v) => update("cta", "resumeButtonText_ko", v)} />
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className={styles.section}>
            <SectionHeader title="Footer" paths={["footer"]} {...sh} />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.footerCopyright")} langBadge="en" value={config.footer.copyright} onChange={(v) => update("footer", "copyright", v)} />
                <Field label={t("admin.settings.footerCopyright")} langBadge="ko" value={config.footer.copyright_ko} onChange={(v) => update("footer", "copyright_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.musicCreditTitle")} value={config.footer.musicCreditTitle} onChange={(v) => update("footer", "musicCreditTitle", v)} placeholder="Ghost Duet" />
                <Field label={t("admin.settings.musicCreditArtist")} value={config.footer.musicCreditArtist} onChange={(v) => update("footer", "musicCreditArtist", v)} placeholder="Louie Zong" />
              </div>
              <Field label={t("admin.settings.musicCreditUrl")} value={config.footer.musicCreditUrl} onChange={(v) => update("footer", "musicCreditUrl", v)} placeholder="https://youtube.com/..." maxHint={null} />
            </div>
          </section>

          {/* Social Links */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.socialLinks")} paths={["socialLinks"]} {...sh} />
            <p className={styles.sectionHint}><T k="admin.settings.socialHint" /></p>
            <SocialLinksEditor
              links={socialLinks}
              onChange={(links) => setConfig((prev) => ({ ...prev, socialLinks: links }))}
              max={6}
            />
          </section>
        </>
      )}

      {contentSubTab === "profile" && (
        <>
          {/* Profile 페이지 동작 */}
          <section className={styles.section}>
            <SectionHeader title="Profile" paths={["profile.infiniteScroll"]} {...sh} />
            <div className={styles.fields}>
              <Switch
                size="md"
                label={t("admin.settings.profileInfiniteScroll")}
                checked={config.profile?.infiniteScroll !== false}
                onCheckedChange={(v) => update("profile", "infiniteScroll", v)}
              />
            </div>
          </section>
          <ProfileSections data={profileData} setData={setProfileData} expanded={profileExpanded} setExpanded={setProfileExpanded} styles={styles} />
        </>
      )}


      {contentSubTab === "posts" && (
        <>
          {/* Banner Settings — 내부 3-col */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.banner")} paths={["posts.bannerLayout", "posts.bannerStyle", "posts.bannerTransition"]} {...sh} />
            <div className={`${styles.fields} ${styles.fieldsGrid3}`}>
              <FieldRow label={<T k="admin.settings.bannerLayout" />}>
                <Select
                  value={config.posts.bannerLayout ?? "fullwidth"}
                  options={[
                    { value: "fullwidth", label: "Fullwidth" },
                    { value: "split", label: "Split" },
                    { value: "cards", label: "Cards" },
                    { value: "ticker", label: "Ticker" },
                  ]}
                  onChange={(v) => update("posts", "bannerLayout", v as SiteConfigData["posts"]["bannerLayout"])}
                />
              </FieldRow>
              <FieldRow label={<T k="admin.settings.bannerStyle" />}>
                <Select
                  value={config.posts.bannerStyle ?? "editorial"}
                  options={[
                    { value: "editorial", label: "Editorial" },
                    { value: "minimal", label: "Minimal" },
                    { value: "cinematic", label: "Cinematic" },
                    { value: "magazine", label: "Magazine" },
                  ]}
                  onChange={(v) => update("posts", "bannerStyle", v as SiteConfigData["posts"]["bannerStyle"])}
                />
              </FieldRow>
              <FieldRow label={<T k="admin.settings.bannerTransition" />}>
                <Select
                  value={config.posts.bannerTransition ?? "default"}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "cylinder", label: "Cylinder" },
                  ]}
                  onChange={(v) => update("posts", "bannerTransition", v as SiteConfigData["posts"]["bannerTransition"])}
                />
              </FieldRow>
            </div>
          </section>

          {/* 목록 카드 레이아웃 */}
          <section className={styles.section}>
            <SectionHeader title={language === "ko" ? "카드 레이아웃" : "Card layout"} paths={["posts.layout"]} {...sh} />
            <div className={styles.fields}>
              <FieldRow label={language === "ko" ? "목록 배치" : "Grid style"}>
                <Select
                  value={config.posts.layout ?? "magazine"}
                  options={[
                    { value: "magazine", label: language === "ko" ? "Magazine (사이즈 변주)" : "Magazine (mixed sizes)" },
                    { value: "grid", label: language === "ko" ? "Grid (균일·이미지 우선)" : "Grid (image-first)" },
                    { value: "list", label: language === "ko" ? "List (수평 목록)" : "List (rows)" },
                    { value: "compact", label: language === "ko" ? "Compact (텍스트형)" : "Compact (text-only)" },
                    { value: "masonry", label: language === "ko" ? "Masonry (가변 높이)" : "Masonry (variable height)" },
                    { value: "featured", label: language === "ko" ? "Featured (대형 1 + 그리드)" : "Featured (hero + grid)" },
                  ]}
                  onChange={(v) => update("posts", "layout", v as SiteConfigData["posts"]["layout"])}
                />
              </FieldRow>
            </div>
          </section>

          {/* Pagination — 내부 2-col */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.pagination")} paths={["posts.perPage", "posts.adminPerPage"]} {...sh} />
            <div className={`${styles.fields} ${styles.fieldsGrid2}`}>
              <FieldRow label={<T k="admin.settings.postsPerPage" />}>
                <Select
                  className={styles.fitSelect}
                  value={String(config.posts.perPage ?? 10)}
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  onChange={(v) => update("posts", "perPage", Number(v))}
                />
              </FieldRow>
              <FieldRow label={<T k="admin.settings.adminPerPage" />}>
                <Select
                  className={styles.fitSelect}
                  value={String(config.posts.adminPerPage ?? 20)}
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  onChange={(v) => update("posts", "adminPerPage", Number(v))}
                />
              </FieldRow>
            </div>
          </section>

          {/* 태그 — 모든 게시물의 태그 목록 + 각 설명. /posts/tags/[tag] hero 에 표시 */}
          <section className={styles.section}>
            <SectionHeader
              title="태그"
              paths={["tagDescriptions"]}
              extraDirty={tagPendingDeletes.size > 0}
              resetForceEnabled={tagHasNonDefault}
              onResetOverride={() => tagResetRef.current?.()}
              beforeSave={commitTagDeletes}
              extraRevert={() => setTagPendingDeletes(new Set())}
              spacerExtra={tagPendingDeletes.size > 0 ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon={<Trash2 size={11} strokeWidth={2} />}
                  onClick={() => setTagPendingExpanded((v) => !v)}
                  aria-expanded={tagPendingExpanded}
                >
                  삭제 대기 {tagPendingDeletes.size}개
                  <ChevronDown
                    size={11}
                    style={{ marginLeft: 4, transform: tagPendingExpanded ? "rotate(180deg)" : undefined, transition: "transform 0.18s" }}
                  />
                </Button>
              ) : undefined}
              below={(
                <AnimatePresence initial={false}>
                  {tagPendingDeletes.size > 0 && tagPendingExpanded && (
                    <motion.div
                      key="tag-pending-list"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className={styles.tagPendingDeleteList}>
                        {Array.from(tagPendingDeletes).map((tag) => (
                          <span key={tag} className={styles.tagPendingDeleteChip}>
                            <span>{tag}</span>
                            <button
                              type="button"
                              className={styles.tagPendingDeleteUndo}
                              onClick={() => undoTagPendingDelete(tag)}
                              title="삭제 취소 (다시 표시)"
                              aria-label={`${tag} 삭제 취소`}
                            >
                              <X size={10} strokeWidth={2.2} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
              {...sh}
            />
            <p className={styles.sectionHint}>
              모든 게시물에 사용된 태그 목록과 각 태그별 설명입니다. 설명은 /posts/tags/[tag] 페이지의 hero 영역에 표시됩니다.
            </p>
            <TagDescriptionsEditor
              value={config.tagDescriptions ?? {}}
              onChange={(v) => setConfig((prev) => ({ ...prev, tagDescriptions: v }))}
              pendingDeletes={tagPendingDeletes}
              onPendingDeletesChange={setTagPendingDeletes}
              onResetInfoChange={handleTagResetInfo}
            />
          </section>

          {/* Post Categories */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.postCategories")} paths={["posts.categories"]} {...sh} />
            <div className={styles.fields}>
              <CategoriesEditor
                categories={normalizedPostCats}
                onChange={(cats) => update("posts", "categories", cats as SiteConfigData["posts"]["categories"])}
              />
            </div>
          </section>

          {/* Series — SeriesManager 가 자체 API 저장 + 자체 헤더(title + search) 그림 */}
          <section className={styles.section}>
            <SeriesManager
              title={t("admin.posts.series")}
              // 2단계 트리(children 포함) 그대로 전달 — strip 하면 소분류가 series 픽커에서 사라짐
              categories={normalizeCategories(config.posts?.categories ?? [])}
            />
          </section>

        </>
      )}

      {contentSubTab === "calendars" && <CalendarManager />}

      {contentSubTab === "works" && (
        <>
          {/* Works Layout + Pagination — 단일 column 으로 stack */}
          <section className={styles.section}>
            <SectionHeader title={`${t("admin.settings.worksLayout")} & ${t("admin.settings.pagination")}`} paths={["works.layout", "works.adminPerPage", "works.infiniteScroll"]} {...sh} />
            <div className={`${styles.fields} ${styles.fieldsGrid2}`}>
              <FieldRow label={<T k="admin.settings.worksLayout" />}>
                <Select
                  value={config.works.layout ?? "flow"}
                  options={[
                    { value: "flow", label: "Flow" },
                    { value: "fullscreen", label: "Fullscreen" },
                    { value: "cinematic", label: "Cinematic" },
                    { value: "grid", label: "Grid" },
                    { value: "split", label: "Split" },
                    { value: "cylinder", label: "Cylinder" },
                  ]}
                  onChange={(v) => update("works", "layout", v)}
                />
              </FieldRow>
              <FieldRow label={<T k="admin.settings.adminPerPage" />}>
                <Select
                  className={styles.fitSelect}
                  value={String(config.works.adminPerPage ?? 20)}
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  onChange={(v) => update("works", "adminPerPage", Number(v))}
                />
              </FieldRow>
            </div>
            <hr className={styles.sectionDivider} />
            <div className={styles.fields}>
              <Switch
                size="md"
                label={t("admin.settings.worksInfiniteScroll")}
                checked={config.works.infiniteScroll !== false}
                onCheckedChange={(v) => update("works", "infiniteScroll", v)}
              />
            </div>
          </section>

          {/* Works Intro */}
          <section className={styles.section}>
            <SectionHeader
              title={t("admin.settings.worksIntro")}
              paths={[
                "works.introLabel", "works.introLabel_ko",
                "works.introTitle", "works.introTitle_ko",
                "works.introTagline", "works.introTagline_ko",
                "works.introDesc", "works.introDesc_ko",
                "works.introDetail", "works.introDetail_ko",
                "works.introQuote", "works.introQuote_ko",
                "works.introScope", "works.introScope_ko",
                "works.introVideoUrl",
              ]}
              {...sh}
            />
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.worksIntroLabel")} langBadge="en" value={config.works.introLabel} onChange={(v) => update("works", "introLabel", v)} />
                <Field label={t("admin.settings.worksIntroLabel")} langBadge="ko" value={config.works.introLabel_ko} onChange={(v) => update("works", "introLabel_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.worksIntroTitle")} langBadge="en" value={config.works.introTitle} onChange={(v) => update("works", "introTitle", v)} />
                <Field label={t("admin.settings.worksIntroTitle")} langBadge="ko" value={config.works.introTitle_ko} onChange={(v) => update("works", "introTitle_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.worksIntroTagline")} langBadge="en" value={config.works.introTagline} onChange={(v) => update("works", "introTagline", v)} />
                <Field label={t("admin.settings.worksIntroTagline")} langBadge="ko" value={config.works.introTagline_ko} onChange={(v) => update("works", "introTagline_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.worksIntroDesc")} langBadge="en" value={config.works.introDesc} onChange={(v) => update("works", "introDesc", v)} multiline />
                <Field label={t("admin.settings.worksIntroDesc")} langBadge="ko" value={config.works.introDesc_ko} onChange={(v) => update("works", "introDesc_ko", v)} multiline />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.worksIntroDetail")} langBadge="en" value={config.works.introDetail} onChange={(v) => update("works", "introDetail", v)} multiline />
                <Field label={t("admin.settings.worksIntroDetail")} langBadge="ko" value={config.works.introDetail_ko} onChange={(v) => update("works", "introDetail_ko", v)} multiline />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.worksIntroQuote")} langBadge="en" value={config.works.introQuote} onChange={(v) => update("works", "introQuote", v)} />
                <Field label={t("admin.settings.worksIntroQuote")} langBadge="ko" value={config.works.introQuote_ko} onChange={(v) => update("works", "introQuote_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <TagListField
                  label={t("admin.settings.worksIntroScope")}
                  langBadge="en"
                  value={config.works.introScope}
                  onChange={(v) => update("works", "introScope", v)}
                  placeholder={t("admin.settings.tagPlaceholder")}
                  separator=" · "
                  commaAsAdd
                  size="md"
                />
                <TagListField
                  label={t("admin.settings.worksIntroScope")}
                  langBadge="ko"
                  value={config.works.introScope_ko}
                  onChange={(v) => update("works", "introScope_ko", v)}
                  placeholder={t("admin.settings.tagPlaceholder")}
                  separator=" · "
                  commaAsAdd
                  size="md"
                />
              </div>
              {/* Intro 미디어 picker — public/cover/{videos,images} 공용 풀 + 업로드 + cover picker (이미지/영상 모두) */}
              <FieldRow label="Intro 미디어">
                <WorksIntroVideoPicker
                  value={config.works.introVideoUrl ?? ""}
                  onChange={(v) => update("works", "introVideoUrl", v)}
                />
              </FieldRow>
            </div>
          </section>

          {/* Works Categories — Intro 아래로 위치 변경 */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.worksCategories")} paths={["works.categories"]} {...sh} />
            <div className={styles.fields}>
              <WorksCategoriesEditor
                categories={normalizedWorksCats}
                onChange={(cats) => update("works", "categories", cats as SiteConfigData["works"]["categories"])}
              />
            </div>
          </section>

        </>
      )}

      {contentSubTab === "about" && (
        <AboutStudio
          config={config}
          setConfig={setConfig}
          update={update}
          savedConfig={savedConfig}
          saveSection={saveSection}
          revertSection={revertSection}
          resetSection={resetSection}
          savingPaths={savingPaths}
          t={t}
          themeBg={themeBg}
          techStackSlot={
            <AboutTechStackEditor
              items={(config.about.techStack ?? []) as TechItem[]}
              onChange={(v) => update("about", "techStack", v as SiteConfigData["about"]["techStack"])}
              t={t}
            />
          }
        />
      )}
    </>
  );
}

/* ── Tag editor — bilingual 이름 + bilingual 설명, search/sort/pagination ──
   저장 키 = canonical (post.tags 와 매칭). value 는 lib/tagMeta 의 StoredTagMeta 형식.
   write 시 항상 새 포맷 ({ ko, en, description }) 로 저장. */
type TagSortBy = "freq" | "name";
type NameLang = "ko" | "en";
type UsageFilter = "all" | "in-use" | "unused";
type DescFilter = "all" | "with" | "without";
/* 페이지당 항목 수 — 설명 있는 항목이 절반 이상이면 6 (각 행이 길어짐 → 스크롤 부담),
   아니면 20 (compact 행). filtered 기준으로 동적 산정. */
const TAGS_PER_PAGE_COMPACT = 20;
const TAGS_PER_PAGE_DENSE = 8;

/** TagMeta → 저장용 객체. 빈 필드 정리. 모두 비어있으면 null 반환 (entry 자체 삭제).
 *  CRITICAL: description 키는 항상 포함 — read 시 legacy {ko,en} 형식 (= 설명만 있던 시절)
 *  과 구분하는 disambiguation marker. 빈 description 이라도 객체 형태 유지. */
function metaToStored(m: TagMeta): { ko?: string; en?: string; description: LocalizedText } | null {
  const ko = m.ko.trim();
  const en = m.en.trim();
  const dko = m.description.ko.trim();
  const den = m.description.en.trim();
  if (!ko && !en && !dko && !den) return null;
  const out: { ko?: string; en?: string; description: LocalizedText } = {
    description: { ko: dko, en: den },
  };
  if (ko) out.ko = ko;
  if (en) out.en = en;
  return out;
}

type TagDescValue = Record<string, StoredTagMeta>;
type SavedTagMeta = NonNullable<ReturnType<typeof metaToStored>>;
type SavedTagValue = Record<string, SavedTagMeta>;

/* WorksCategoriesEditor 와 동일 패턴 — TagNotesEditor (chip + drag) + 하단 add/edit box.
   tag canonical key 는 post.tags 와 매칭되는 string. 편집은 표시이름(ko/en) + 설명(ko/en) 만. */
/** 게시물 리스트 row 의 메타 데이터 (발행상태 / 날짜 / 조회수) */
function PostMeta({ p }: { p: PostMetaInfo }) {
  const date = p.published_at || p.created_at;
  const dateStr = date ? new Date(date).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).replace(/\.\s/g, ".").replace(/\.$/, "") : "";
  return (
    <span className={styles.tagRelatedMeta}>
      {!p.published && <span className={styles.tagRelatedMetaDraft}>draft</span>}
      {dateStr && <span>{dateStr}</span>}
      {typeof p.view_count === "number" && p.view_count > 0 && <span>{p.view_count} views</span>}
    </span>
  );
}

/* 태그 "기본값으로 초기화" 확인 모달 본문 — chip 클릭 시 해당 태그 사용 게시물 목록 노출. */
function TagResetConfirmBody({ inUse, tagCounts, tagPosts, affectedCount, onConfirm }: {
  inUse: string[];
  tagCounts: Record<string, number>;
  tagPosts: AdminPostUsageInfo[];
  affectedCount: number;
  onConfirm: () => void;
}) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const selectedPosts = selectedTag ? tagPosts.filter((p) => p.tags.includes(selectedTag)) : [];
  return (
    <div className={styles.tagDeleteConfirmBody}>
      <p className={styles.tagDeleteConfirmDesc}>
        기본 세트에 없는 태그 <strong>{inUse.length}개</strong>가 게시물 <strong>{affectedCount}건</strong>에서 사용 중입니다. 정말 기본값으로 초기화할까요?
        <br />
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>
          이 태그들은 삭제 대기열에 추가됩니다. 섹션 저장 시 모든 게시물의 tags 에서 제거됩니다. 되돌리기로 취소할 수 있습니다.
        </span>
      </p>
      <div className={styles.tagResetChipRow}>
        {inUse.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tagResetChip} ${selectedTag === t ? styles.tagResetChipActive : ""}`}
            onClick={() => setSelectedTag((cur) => (cur === t ? null : t))}
          >
            #{t}
            <span className={styles.tagResetChipCount}>{tagCounts[t] ?? 0}</span>
          </button>
        ))}
      </div>
      {selectedTag && (
        <List className={styles.tagRelatedPosts} data-lenis-prevent>
          {selectedPosts.length === 0 ? (
            <ListItem className={styles.tagRelatedEmpty}>이 태그를 사용하는 게시물이 없습니다.</ListItem>
          ) : (
            selectedPosts.map((p) => (
              <ListItem key={p.id} layout="column">
                <a href={`/admin/posts/${p.id}/edit`} target="_blank" rel="noopener noreferrer" className={styles.tagRelatedItem}>
                  <span className={styles.tagRelatedTitle}>{p.title || p.title_en || "(no title)"}</span>
                  <PostMeta p={p} />
                </a>
              </ListItem>
            ))
          )}
        </List>
      )}
      <div className={styles.tagDeleteConfirmActions}>
        <Button variant="primary" size="md" tone="danger" onClick={onConfirm}>
          기본값으로 초기화
        </Button>
      </div>
    </div>
  );
}

function TagDescriptionsEditor({ value, onChange, pendingDeletes, onPendingDeletesChange, onResetInfoChange }: {
  value: TagDescValue;
  onChange: (v: SavedTagValue) => void;
  pendingDeletes: Set<string>;
  onPendingDeletesChange: (next: Set<string>) => void;
  /** 기본값(reset) 버튼용 정보 리포트 — hasNonDefault(기본 세트에 없는 태그 존재 여부) + resetToDefault 실행 함수 */
  onResetInfoChange?: (info: { hasNonDefault: boolean; resetToDefault: () => void }) => void;
}) {
  const [postTags, setPostTags] = useState<string[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [tagPosts, setTagPosts] = useState<AdminPostUsageInfo[]>([]);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "ok" | "error">("loading");
  const [fetchError, setFetchError] = useState<string>("");

  useEffect(() => {
    setFetchStatus("loading");
    fetch("/api/admin/tags")
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          console.error("[/api/admin/tags] HTTP", r.status, txt);
          setFetchStatus("error");
          setFetchError(`HTTP ${r.status} ${txt.slice(0, 200)}`);
          return { tags: [], counts: {}, posts: [] };
        }
        setFetchStatus("ok");
        return r.json();
      })
      .then((d) => {
        console.log("[/api/admin/tags] response:", d);
        setPostTags(d.tags ?? []);
        setTagCounts(d.counts ?? {});
        setTagPosts(d.posts ?? []);
      })
      .catch((e) => {
        console.error("[/api/admin/tags] fetch error:", e);
        setFetchStatus("error");
        setFetchError(String(e?.message ?? e));
        setPostTags([]); setTagCounts({}); setTagPosts([]);
      });
  }, []);

  const postTagSet = useMemo(() => new Set(postTags), [postTags]);

  const allTags = useMemo(() => {
    const set = new Set<string>([...postTags, ...Object.keys(value)]);
    // pending 삭제 태그는 UI 에서 즉시 숨김 (실제 DB 삭제는 섹션 저장 시)
    return Array.from(set).filter((t) => !pendingDeletes.has(t));
  }, [postTags, value, pendingDeletes]);

  /* 검색 / 정렬 / 필터 / 페이지네이션 */
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "name" | "desc">("all");
  const [sortBy, setSortBy] = useState<TagSortBy>("freq");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [nameLang, setNameLang] = useState<NameLang>("ko");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [descFilter, setDescFilter] = useState<DescFilter>("all");
  const [letterFilters, setLetterFilters] = useState<Set<string>>(new Set());
  const [filterExpanded, setFilterExpanded] = useState(false);
  /* nameLang 바뀌면 letter 매칭 초기화 */
  useEffect(() => { setLetterFilters(new Set()); }, [nameLang]);
  /* sortBy 가 name 이 아니면 letter 자동 해제 */
  useEffect(() => { if (sortBy !== "name") setLetterFilters(new Set()); }, [sortBy]);
  const toggleLetter = (l: string) => setLetterFilters((prev) => {
    const next = new Set(prev);
    if (next.has(l)) next.delete(l); else next.add(l);
    return next;
  });
  /* 항목이 존재하는 letter 만 enable — 없는 chip 은 disabled */
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const tag of allTags) {
      const m = normalizeTagMeta(value[tag]);
      const name = ((nameLang === "ko" ? m.ko : m.en).trim() || tag);
      set.add(getInitial(name, nameLang));
    }
    return set;
  }, [allTags, value, nameLang]);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, searchType, sortBy, sortDir, nameLang, usageFilter, descFilter, letterFilters]);

  /* 활성 필터 개수 — 토글 버튼에 표시 */
  const activeFilterCount = (usageFilter !== "all" ? 1 : 0) + (descFilter !== "all" ? 1 : 0);

  /* segmented onChange — 같은 item 다시 클릭하면 dir 토글, 다른 item 이면 dimension 의 default dir */
  const handleSortByChange = (next: TagSortBy) => {
    if (next === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(next);
      // 빈도 = desc 가 자연스러움 (많은 것 먼저), 이름 = asc 가 자연스러움 (A→Z)
      setSortDir(next === "name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let list = allTags;
    if (usageFilter === "in-use") list = list.filter((tag) => postTagSet.has(tag));
    else if (usageFilter === "unused") list = list.filter((tag) => !postTagSet.has(tag));
    if (descFilter !== "all") {
      list = list.filter((tag) => {
        const m = normalizeTagMeta(value[tag]);
        const hasDesc = !!(m.description.ko.trim() || m.description.en.trim());
        return descFilter === "with" ? hasDesc : !hasDesc;
      });
    }
    /* letterFilters — sortBy=name 일 때만. 다중 선택 — Set 안에 있는 자음/이니셜 중 하나 매칭. */
    if (sortBy === "name" && letterFilters.size > 0) {
      list = list.filter((tag) => {
        const m = normalizeTagMeta(value[tag]);
        const name = ((nameLang === "ko" ? m.ko : m.en).trim() || tag);
        return letterFilters.has(getInitial(name, nameLang));
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((tag) => {
        const m = normalizeTagMeta(value[tag]);
        const inName = matchesSearch(q, tag, m.ko, m.en);
        const inDesc = matchesSearch(q, m.description.ko, m.description.en);
        if (searchType === "name") return inName;
        if (searchType === "desc") return inDesc;
        return inName || inDesc;
      });
    }
    const sorted = [...list];
    const dirSign = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortBy === "freq") {
        const ac = tagCounts[a] ?? 0;
        const bc = tagCounts[b] ?? 0;
        if (ac !== bc) return (ac - bc) * dirSign;
        return a.localeCompare(b, "ko"); // tiebreak 가나다
      }
      // name — nameLang(ko/en) 기준. 빈 값이면 tag canonical 폴백
      const am = normalizeTagMeta(value[a]);
      const bm = normalizeTagMeta(value[b]);
      const aName = (nameLang === "ko" ? am.ko : am.en).trim() || a;
      const bName = (nameLang === "ko" ? bm.ko : bm.en).trim() || b;
      return aName.localeCompare(bName, nameLang === "ko" ? "ko" : "en") * dirSign;
    });
    return sorted;
  }, [allTags, search, searchType, sortBy, sortDir, nameLang, usageFilter, descFilter, letterFilters, value, postTagSet, tagCounts]);

  const perPage = useMemo(() => {
    if (filtered.length === 0) return TAGS_PER_PAGE_COMPACT;
    const withDesc = filtered.filter((tag) => {
      const m = normalizeTagMeta(value[tag]);
      return !!(m.description.ko.trim() || m.description.en.trim());
    }).length;
    return withDesc >= filtered.length / 2 ? TAGS_PER_PAGE_DENSE : TAGS_PER_PAGE_COMPACT;
  }, [filtered, value]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageStart = (page - 1) * perPage;
  const pageTags = filtered.slice(pageStart, pageStart + perPage);

  /* 기존 entries 전체 normalize → write 시 항상 new format. */
  const buildBase = useCallback((): SavedTagValue => {
    const out: SavedTagValue = {};
    for (const k of Object.keys(value)) {
      const stored = metaToStored(normalizeTagMeta(value[k]));
      if (stored) out[k] = stored;
    }
    return out;
  }, [value]);

  /* TagNotesEditor items = canonical key 배열. notes = {[key]: bilingual description}.
     description 만 TagNotesEditor 의 onNotesChange 로 직접 편집 가능 (drawer).
     이름 ko/en 은 별도 하단 박스에서 편집. */
  const notesForEditor = useMemo<Record<string, LocalizedText>>(() => {
    const map: Record<string, LocalizedText> = {};
    for (const tag of allTags) {
      const m = normalizeTagMeta(value[tag]);
      /* 빈 description 은 제외 — entry 없음 으로 인식돼야 + 설명추가 / drawer 미생성 */
      if (m.description.ko.trim() || m.description.en.trim()) map[tag] = m.description;
    }
    return map;
  }, [allTags, value]);

  /* TagNotesEditor 가 items 재정렬 / 제거 시 호출. 페이지 안 items 만 들어옴 → 전체 allTags 와 비교해서
     post-derived 제거 방지 (canonical 이 post.tags 에서 오므로 강제로 다시 등장).
     순서 변경은 admin 저장 의미 없음 (정렬은 sort 옵션이 결정) — 무시. */
  const openModal = useModalStore((s) => s.openModal);

  /* deferred 삭제 — pendingDeletes 에만 추가, 실제 API 호출은 섹션 저장 시.
     description 도 같이 제거 (저장 시 commit). 새로고침/되돌리기로 복구 가능. */
  const performDeleteTag = (tag: string) => {
    const next = new Set(pendingDeletes);
    next.add(tag);
    onPendingDeletesChange(next);
    // description 이 있었다면 같이 제거 (저장 시 함께 반영)
    if (value[tag]) {
      const base = buildBase();
      delete base[tag];
      onChange(base);
    }
    if (editingTag === tag) setEditingTag(null);
    showToast(`태그 "${tag}" 삭제 대기 (섹션 저장 시 반영)`, "info");
  };

  /* 삭제 confirm 모달 — 사용 중 게시물 chip 목록 + 삭제 버튼 */
  const confirmDeleteTag = (tag: string) => {
    const inUse = tagPosts.filter((p) => p.tags.includes(tag));
    if (inUse.length === 0) {
      performDeleteTag(tag);
      return;
    }
    const id = `tag-delete-confirm-${tag}`;
    openModal(
      <div className={styles.tagDeleteConfirmBody}>
        <p className={styles.tagDeleteConfirmDesc}>
          이 태그를 사용 중인 게시물 <strong>{inUse.length}건</strong>이 있습니다. 정말 삭제할까요?
          <br />
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>
            삭제 대기열에 추가됩니다. 섹션 저장 시 모든 게시물의 tags 에서 함께 제거됩니다. 되돌리기로 취소할 수 있습니다.
          </span>
        </p>
        <List className={styles.tagRelatedPosts} data-lenis-prevent>
          {inUse.map((p) => (
            <ListItem key={p.id} layout="column">
              <a
                href={`/admin/posts/${p.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.tagRelatedItem}
              >
                <span className={styles.tagRelatedTitle}>
                  {p.title || p.title_en || "(no title)"}
                </span>
                <PostMeta p={p} />
              </a>
            </ListItem>
          ))}
        </List>
        <div className={styles.tagDeleteConfirmActions}>
          <Button
            variant="primary"
            size="md"
            tone="danger"
            onClick={() => {
              performDeleteTag(tag);
              useModalStore.getState().closeModal(id);
            }}
          >
            삭제
          </Button>
        </div>
      </div>,
      {
        id,
        header: { title: `#${tag} 삭제 확인` },
        closeButton: true,
        width: "min(520px, 90vw)",
      },
    );
  };

  const handleItemsChange = (next: string[]) => {
    const nextSet = new Set(next);
    const removed = pageTags.filter((t) => !nextSet.has(t));
    if (removed.length === 0) return; // 순서 변경 — ignore
    /* TagNotesEditor 의 × 는 항목 단위 — 첫 번째 (보통 유일한) 제거 대상에 대해 confirm 모달 */
    confirmDeleteTag(removed[0]);
  };

  /* ── 기본값으로 초기화 (SectionHeader 의 "기본값" 버튼) ──
     config 설명을 기본 세트로 되돌리고, 기본 세트에 없는 태그는 (게시물에서 사용 중이면 확인 후)
     삭제 대기열에 추가 → 섹션 저장 시 게시물 tags 에서 제거(휴지통 복구 가능). */
  const buildDefaults = useCallback((): SavedTagValue => {
    const out: SavedTagValue = {};
    const defaults = siteConfig.tagDescriptions as unknown as TagDescValue;
    for (const k of Object.keys(defaults)) {
      const stored = metaToStored(normalizeTagMeta(defaults[k]));
      if (stored) out[k] = stored;
    }
    return out;
  }, []);
  const defaultKeySet = useMemo(() => new Set(Object.keys(siteConfig.tagDescriptions)), []);
  const nonDefaultTags = useMemo(() => allTags.filter((t) => !defaultKeySet.has(t)), [allTags, defaultKeySet]);

  const resetToDefault = useCallback(() => {
    const defaults = buildDefaults();
    // 기본 세트에 없는 태그 중 게시물이 실제 사용하는 것 → 확인 후 삭제 대기. (커스텀 설명만 있고 미사용인 건 config 초기화로 자동 제거)
    const inUse = nonDefaultTags.filter((t) => postTagSet.has(t));
    if (inUse.length === 0) {
      onChange(defaults);
      showToast("태그 설명을 기본값으로 초기화했습니다", "success");
      return;
    }
    const affected = new Set<string>();
    for (const p of tagPosts) if (p.tags.some((t) => inUse.includes(t))) affected.add(p.id);
    const id = "tag-reset-confirm";
    openModal(
      <TagResetConfirmBody
        inUse={inUse}
        tagCounts={tagCounts}
        tagPosts={tagPosts}
        affectedCount={affected.size}
        onConfirm={() => {
          onChange(defaults);
          const next = new Set(pendingDeletes);
          for (const t of inUse) next.add(t);
          onPendingDeletesChange(next);
          useModalStore.getState().closeModal(id);
          showToast(`기본값 초기화 — 태그 ${inUse.length}개 삭제 대기 (섹션 저장 시 반영)`, "info");
        }}
      />,
      { id, header: { title: "기본값으로 초기화" }, closeButton: true, width: "min(520px, 90vw)" },
    );
  }, [buildDefaults, nonDefaultTags, postTagSet, onChange, pendingDeletes, onPendingDeletesChange, tagPosts, tagCounts, openModal]);

  useEffect(() => {
    onResetInfoChange?.({ hasNonDefault: nonDefaultTags.length > 0, resetToDefault });
  }, [nonDefaultTags, resetToDefault, onResetInfoChange]);

  /* TagNotesEditor 의 내부 drawer 는 onEditClick prop 으로 모두 외부 위임됐고,
     description 편집도 하단 box 에서 처리. 따라서 onNotesChange 는 noop —
     remove× 클릭 시 TagNotesEditor 가 setEntry(null) → onNotesChange 까지 부르는데,
     allTags iterate 하다 직전 onItemsChange 가 삭제한 entry 가 다시 부활하는 race 방지. */
  const handleNotesChange = () => {};

  /* ── 하단 통합 add/edit box ──
     canonical key (post.tags 매칭용) 는 신규 추가 시 EN (없으면 KO) 에서 자동 도출 — 별도 입력 X. */
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [pairNames, setPairNames] = useState<LocalizedText>({ ko: "", en: "" });
  const [pairDesc, setPairDesc] = useState<LocalizedText>({ ko: "", en: "" });
  const [isShaking, setIsShaking] = useState(false);
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const isEdit = editingTag !== null;

  useEffect(() => {
    if (editingTag !== null) {
      const m = normalizeTagMeta(value[editingTag]);
      /* override 비어있으면 canonical 을 그대로 input 텍스트로 채움 — 언어 감지로 ko/en 슬롯 분기.
         user 가 그대로 두고 저장하면 submit 단계에서 canonical 과 같은 값은 override 처리 안 함 */
      const hasKorean = /[가-힯ᄀ-ᇿ㄰-㆏]/.test(editingTag);
      const koSeed = m.ko || (hasKorean ? editingTag : "");
      const enSeed = m.en || (!hasKorean ? editingTag : "");
      setPairNames({ ko: koSeed, en: enSeed });
      setPairDesc(m.description);
    } else {
      setPairNames({ ko: "", en: "" });
      setPairDesc({ ko: "", en: "" });
    }
  }, [editingTag, value]);

  const cancelEdit = () => setEditingTag(null);

  /* 중복 발견 시 — 해당 chip 페이지로 이동 + 편집 모드 + 화면에 scroll */
  const focusDuplicate = (dup: string) => {
    const idx = filtered.indexOf(dup);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / perPage) + 1;
      if (targetPage !== page) setPage(targetPage);
    }
    setEditingTag(dup);
    // 페이지 / 편집 state 적용된 다음 frame 에서 scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-tag-item="${window.CSS.escape(dup)}"]`) as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  /* 편집 중인 tag 삭제 — 동일한 confirm 흐름 사용 (chip × 와 통일) */
  const deleteEditingTag = () => {
    if (!editingTag) return;
    confirmDeleteTag(editingTag);
  };

  /* add 모드 — canonical = EN 우선, 없으면 KO */
  const newCanonical = (pairNames.en.trim() || pairNames.ko.trim());

  const submit = () => {
    if (isEdit) {
      const tag = editingTag!;
      const base = buildBase();
      const stored = metaToStored({ ...normalizeTagMeta(value[tag]), ko: pairNames.ko, en: pairNames.en, description: pairDesc });
      if (stored) base[tag] = stored;
      else delete base[tag];
      onChange(base);
      setEditingTag(null);
    } else {
      if (!newCanonical) return;
      /* 중복 비교 — 대소문자 + 공백 무시 (lib/dedupe) */
      const dup = findDuplicate(allTags, [newCanonical], (t) => [t]);
      if (dup) {
        showToast(`"${dup}" 과 같은 태그입니다`, "warning");
        triggerShake();
        focusDuplicate(dup);
        return;
      }
      const base = buildBase();
      const stored = metaToStored({ ko: pairNames.ko, en: pairNames.en, description: pairDesc });
      /* metaToStored 가 null 인 경우 = 입력 다 비어있음 — 빈 entry 도 description 키 포함 */
      base[newCanonical] = stored ?? { description: { ko: "", en: "" } };
      onChange(base);
      setPairNames({ ko: "", en: "" });
      setPairDesc({ ko: "", en: "" });
    }
  };

  /* 중복은 disabled 대신 submit 시 toast + shake 로 알림 — 버튼은 비어있을 때만 disabled */
  const submitEnabled = isEdit || !!newCanonical;

  const sortItems = [
    { value: "freq" as const, label: "빈도순" },
    {
      value: "name" as const,
      label: "이름순",
      subItems: [
        { value: "ko" as const, label: "한글" },
        { value: "en" as const, label: "영어" },
      ] as const,
    },
  ];

  /* chip 라벨 — ko · en + 사용 카운트 (n). 0 도 항상 표시. */
  const renderItemLabel = (tag: string) => {
    const m = normalizeTagMeta(value[tag]);
    const ko = m.ko.trim() || tag;
    const en = m.en.trim() || tag;
    const count = tagCounts[tag] ?? 0;
    return (
      <span className={styles.worksCatChipLabel}>
        <span>{ko}</span>
        {ko !== en && <span className={styles.worksCatChipSep}>·</span>}
        {ko !== en && <span>{en}</span>}
        <span className={styles.tagCountBadge}>({count})</span>
      </span>
    );
  };

  /* 편집 중인 태그의 관련 게시물 */
  const editingPosts = useMemo<AdminPostUsageInfo[]>(() => {
    if (!editingTag) return [];
    return tagPosts.filter((p) => p.tags.includes(editingTag));
  }, [editingTag, tagPosts]);

  return (
    <div className={styles.worksCatEditor}>
      {/* Toolbar 묶음 — filterRow + filterDrawer 한 컨테이너 안 stack */}
      <div className={styles.tagDescToolbarWrap}>
      {/* Toolbar — 필터 토글 + 정렬 + 검색 (한 줄). 필터 chip 들은 펼침 영역에. */}
      <div className={styles.tagDescFilterRow}>
        <Button
          variant={filterExpanded || activeFilterCount > 0 ? "primary" : "outline"}
          size="sm"
          icon={<Filter size={12} />}
          onClick={() => setFilterExpanded((e) => !e)}
        >
          필터
          {activeFilterCount > 0 && (
            <span className={styles.filterBtnCount}>{activeFilterCount}</span>
          )}
          <ChevronDown
            size={12}
            className={`${styles.filterBtnChevron} ${filterExpanded ? styles.filterBtnChevronOpen : ""}`}
          />
        </Button>
        <SegmentedControl
          items={sortItems}
          value={sortBy}
          onChange={handleSortByChange}
          sortDir={sortDir}
          subValue={nameLang}
          onSubChange={(v) => setNameLang(v as NameLang)}
          subVariant="nested"
          onBack={() => setSortBy("freq")}
          size="sm"
        />
        <span className={styles.tagDescCount}>{filtered.length} / {allTags.length}</span>
        <div className={styles.tagDescSearchEnd}>
          <SearchCapsule
            typeSelector={{
              value: searchType,
              options: [
                { value: "all", label: "이름+설명" },
                { value: "name", label: "이름" },
                { value: "desc", label: "설명" },
              ],
              onChange: (v) => setSearchType(v as "all" | "name" | "desc"),
            }}
            search={search}
            onSearchChange={setSearch}
            placeholder="태그의 이름·설명 검색"
            align="left"
            size="sm"
          />
        </div>
      </div>

      {/* 펼친 상태에서만 필터 chip group 노출 — height + opacity 애니메이션 */}
      <AnimatePresence initial={false}>
        {filterExpanded && (
          <motion.div
            key="filter-drawer"
            className={styles.tagDescFilterDrawerWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className={styles.tagDescFilterDrawer}>
              <div className={styles.tagDescFilterGroup}>
                <span className={styles.tagDescFilterGroupLabel}>사용</span>
                <SegmentedControl
                  items={[
                    { value: "all", label: "전체" },
                    { value: "in-use", label: "사용중" },
                    { value: "unused", label: "미사용" },
                  ]}
                  value={usageFilter}
                  onChange={(v) => setUsageFilter(v as UsageFilter)}
                  size="sm"
                />
              </div>
              <div className={styles.tagDescFilterGroup}>
                <span className={styles.tagDescFilterGroupLabel}>설명</span>
                <SegmentedControl
                  items={[
                    { value: "all", label: "전체" },
                    { value: "with", label: "있음" },
                    { value: "without", label: "없음" },
                  ]}
                  value={descFilter}
                  onChange={(v) => setDescFilter(v as DescFilter)}
                  size="sm"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* letter drawer — sortBy === "name" 일 때만. nameLang 따라 한글 자음 / 영어 알파벳 chip */}
      <AnimatePresence initial={false}>
        {sortBy === "name" && (
          <motion.div
            key="letter-drawer"
            className={styles.tagDescFilterDrawerWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <LetterFilter
              letters={nameLang === "ko" ? [...KO_INITIALS] : [...EN_INITIALS]}
              active={letterFilters}
              onToggle={toggleLetter}
              onClear={() => setLetterFilters(new Set())}
              hasLetter={(l) => availableLetters.has(l)}
              className={styles.tagDescLetterDrawer}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* chip 영역 + count 묶음 — count 는 chip block 끝에 시각적으로 붙음 */}
      <div className={styles.tagDescChipsBlock}>
        {pageTags.length === 0 ? (
          <div className={styles.tagDescEmpty}>
            {search
              ? "검색 결과 없음"
              : fetchStatus === "loading"
              ? "불러오는 중…"
              : fetchStatus === "error"
              ? `태그 로드 실패: ${fetchError}`
              : "태그 없음"}
          </div>
        ) : (
          <TagNotesEditor
            items={pageTags}
            notes={notesForEditor}
            onItemsChange={handleItemsChange}
            onNotesChange={handleNotesChange}
            prefix=""
            notePlaceholder="설명"
            addLabel="편집"
            cancelLabel="취소"
            editLabel="편집"
            removeTitle="태그 삭제"
            renderItemLabel={renderItemLabel}
            onItemClick={(tag) => setEditingTag(tag === editingTag ? null : tag)}
            onEditClick={(tag) => setEditingTag(tag === editingTag ? null : tag)}
            activeItem={editingTag}
            disableReorder
            showIndex
            startIndex={pageStart}
            /* 태그는 사용자 정의 순서가 없음 — filtered 내 위치(1-based) 표시.
               sortDir === "desc" 면 역순 번호 (n, n-1, ..., 1) 로 표시해 정렬 방향과 일치시킴. */
            getDisplayIndex={(_, idx) => {
              const pos = pageStart + idx;
              return sortDir === "desc" ? filtered.length - pos : pos + 1;
            }}
          />
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        size="sm"
        className={styles.tagDescPagination}
      />

      {/* 하단 통합 add/edit box — editingTag 있으면 편집 모드, 아니면 추가 모드 */}
      <div className={`${styles.worksCatAddBox} ${isEdit ? styles.worksCatAddBoxEdit : ""} ${isShaking ? styles.shakeAlert : ""}`}>
        <div className={styles.worksCatAddLabel}>
          {isEdit ? `편집 — #${editingTag}` : "새 태그 추가"}
          <div className={styles.worksCatAddActions}>
            {isEdit && (
              <>
                <Button
                  variant="outline"
                  size="xs"
                  tone="danger"
                  onClick={deleteEditingTag}
                  icon={<Trash2 size={12} strokeWidth={2} />}
                >
                  삭제
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={cancelEdit}
                  icon={<X size={12} strokeWidth={2.5} />}
                >
                  취소
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={submit}
              disabled={!submitEnabled}
              icon={isEdit ? <Check size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2} />}
            >
              {isEdit ? "저장" : "추가"}
            </Button>
          </div>
        </div>
        <div className={styles.worksCatAddRow}>
          <span className={styles.worksCatAddRowLabel}>이름</span>
          <BilingualInputPair
            value={pairNames}
            onChange={setPairNames}
            onEnter={submit}
            placeholder={isEdit ? "" : "태그 이름"}
          />
        </div>
        <div className={styles.worksCatAddRow}>
          <span className={styles.worksCatAddRowLabel}>설명</span>
          <BilingualInputPair value={pairDesc} onChange={setPairDesc} onEnter={submit} placeholder="설명" />
        </div>
        {/* 편집 모드 — 관련 게시물 (ul/li 리스트, count 항상 표시 even 0) */}
        {isEdit && (
          <div className={styles.worksCatAddRow}>
            <span className={styles.worksCatAddRowLabel}>게시물 ({editingPosts.length})</span>
            <List className={styles.tagRelatedPosts} data-lenis-prevent>
              {editingPosts.length === 0 ? (
                <ListItem className={styles.tagRelatedEmpty}>이 태그를 사용하는 게시물 없음</ListItem>
              ) : (
                editingPosts.map((p) => (
                  <ListItem key={p.id} layout="column">
                    <a
                      href={`/admin/posts/${p.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.tagRelatedItem}
                    >
                      <span className={styles.tagRelatedTitle}>
                        {p.title || p.title_en || "(no title)"}
                      </span>
                      <PostMeta p={p} />
                    </a>
                  </ListItem>
                ))
              )}
            </List>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── About panel inline editors ─────────────────────────────────────────
 * features/process/security 항목을 inline UI (Field + Input + 카드) 로 편집.
 * 각 row 는 카드 박스 안에 필드 stack + 우상단 삭제 버튼. 하단 + 버튼으로 추가. */


