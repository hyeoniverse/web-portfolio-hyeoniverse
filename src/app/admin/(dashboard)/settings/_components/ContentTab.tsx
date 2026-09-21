"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import dynamic from "next/dynamic";
import type { LocalizedText } from "@/types/common";
import { X, Trash2, ChevronDown } from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { normalizeCategories } from "@/lib/categoryTree";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import T from "@/components/ui/T";
import { type SiteConfigData } from "@/config/site.config";
import type { ProfileData } from "@/types/profile";
import ProfileGithubEditor from "./ProfileGithubEditor";
import HomeWorksEditor, { type HomeWorksSource } from "./HomeWorksEditor";
import ProfilePanelsEditor from "./ProfilePanelsEditor";
import ProfileSectionActions from "@/components/admin/ProfileSectionActions";
import ProfileSections, { type ProfileExpandState } from "@/components/admin/ProfileSections";
import type { SettingsTabProps } from "../_types";
import Select from "@/components/ui/Select";
import FieldRow from "@/components/ui/FieldRow";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import Field, { UploadField, ServiceItemsEditor } from "./SettingsFormFields";
import CategoriesEditor from "./CategoriesEditor";
import WorksCategoriesEditor from "./WorksCategoriesEditor";
import SeriesManager from "./SeriesManager";
import SocialLinksEditor from "./SocialLinksEditor";
import WorksIntroVideoPicker from "./WorksIntroVideoPicker";
import SectionHeader from "./SectionHeader";
import TagListField from "@/components/ui/TagListField";
import { showToast } from "@/stores/toastStore";
import { fillTemplate } from "@/utils/format";
import { tryRequest, notifyFailures } from "@/lib/sendAction";
import { CodedError } from "@/lib/apiError";
import type { TechItem } from "./AboutTechStackEditor";
import TagDescriptionsEditor from "./TagDescriptionsEditor";
import shared from "../Settings.module.css";
import local from "./ContentTab.module.css";
import Pressable from "@/components/ui/Pressable";
import SettingsSkeleton from "./SettingsSkeleton";

/* 하위 탭의 무거운 편집기는 그 하위 탭을 열 때 받는다. About 스튜디오는 코드 편집기(CodeMirror·Sandpack)·
   ERD 캔버스(xyflow)·About 원본 데이터를, 달력 관리는 에디터의 달력 모델을 싣는다. */
const AboutStudio = dynamic(() => import("./about/AboutStudio"), { loading: () => <SettingsSkeleton /> });
const AboutTechStackEditor = dynamic(() => import("./AboutTechStackEditor"));
const CalendarManager = dynamic(() => import("./CalendarManager"), { loading: () => <SettingsSkeleton /> });
const styles = { ...shared, ...local };

interface ContentTabProps extends SettingsTabProps {
  profileData: ProfileData;
  setProfileData: Dispatch<SetStateAction<ProfileData>>;
  profileExpanded: ProfileExpandState;
  setProfileExpanded: Dispatch<SetStateAction<ProfileExpandState>>;
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
  contentSubTab: "home" | "profile" | "about" | "works" | "posts" | "calendars";
}

/** en/ko 한 쌍의 Field(같은 label, langBadge 만 다름) — fieldPair 레이아웃 + Field ×2. */
function BilingualFieldPair({ label, en, ko, multiline }: {
  label: string;
  en: { value: string; onChange: (v: string) => void };
  ko: { value: string; onChange: (v: string) => void };
  multiline?: boolean;
}) {
  return (
    <div className={styles.fieldPair}>
      <Field label={label} langBadge="en" value={en.value} onChange={en.onChange} multiline={multiline} />
      <Field label={label} langBadge="ko" value={ko.value} onChange={ko.onChange} multiline={multiline} />
    </div>
  );
}

export default function ContentTab({
  config,
  savedConfig,
  update,
  saveSection,
  revertSection,
  resetSection,
  savingPaths,
  validationError,
  profileData,
  setProfileData,
  profileExpanded,
  setProfileExpanded,
  setConfig,
  contentSubTab,
}: ContentTabProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, validationError, titleClassName: styles.sectionTitle };

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
    /* 지우지 못한 태그는 오류 알림으로 따로 알린다 — 예전에는 지운 수만 보여 실패가 드러나지 않았다(#868) */
    const failures: CodedError[] = [];
    for (const tag of tags) {
      const res = await tryRequest("/api/admin/tags/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (res instanceof CodedError) { failures.push(res); continue; }
      okCount++;
      const data = await res.json().catch(() => ({}));
      affected += data.affected ?? 0;
    }
    setTagPendingDeletes(new Set());
    if (okCount > 0) showToast(fillTemplate(t("admin.settings.tagEditor.deletedToast"), { n: okCount, m: affected }), "success");
    notifyFailures(failures, tags.length, t, t("admin.settings.tagEditor.deleteFailed"));
  }, [tagPendingDeletes, t]);

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

  // SeriesManager 로 넘길 2단계 카테고리 트리 — 매 렌더 새 배열이면 자식 memo 가 무의미해지므로 stable 화.
  const seriesCategories = useMemo(() => normalizeCategories(config.posts?.categories ?? []), [config.posts?.categories]);

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
              <BilingualFieldPair
                label={t("admin.settings.heroHeadline")}
                en={{ value: config.hero.headline.join("\n"), onChange: (v) => update("hero", "headline", v.split("\n")) }}
                ko={{ value: config.hero.headline_ko.join("\n"), onChange: (v) => update("hero", "headline_ko", v.split("\n")) }}
                multiline
              />
              <BilingualFieldPair
                label={t("admin.settings.heroSubtext")}
                en={{ value: config.hero.subtext.join("\n"), onChange: (v) => update("hero", "subtext", v.split("\n")) }}
                ko={{ value: config.hero.subtext_ko.join("\n"), onChange: (v) => update("hero", "subtext_ko", v.split("\n")) }}
                multiline
              />
              <BilingualFieldPair
                label={t("admin.settings.scrollLabel")}
                en={{ value: config.hero.scrollLabel, onChange: (v) => update("hero", "scrollLabel", v) }}
                ko={{ value: config.hero.scrollLabel_ko, onChange: (v) => update("hero", "scrollLabel_ko", v) }}
              />
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
              <BilingualFieldPair
                label={t("admin.settings.fieldTagline")}
                en={{ value: config.homeIntro.tagline, onChange: (v) => update("homeIntro", "tagline", v) }}
                ko={{ value: config.homeIntro.tagline_ko, onChange: (v) => update("homeIntro", "tagline_ko", v) }}
                multiline
              />
              <BilingualFieldPair
                label={t("admin.settings.fieldDescription")}
                en={{ value: config.homeIntro.description, onChange: (v) => update("homeIntro", "description", v) }}
                ko={{ value: config.homeIntro.description_ko, onChange: (v) => update("homeIntro", "description_ko", v) }}
                multiline
              />
            </div>
          </section>

          {/* Selected Works — 원 그리드를 무엇으로 채울지(#1047) */}
          <section className={styles.section} style={{ gridRow: "span 2" }}>
            <SectionHeader
              title={t("admin.settings.homeWorksLabel")}
              paths={["homeWorks.source"]}
              extra={<span className={`${styles.sectionHint} ${styles.sectionHintInline}`}><T k="admin.settings.homeWorksHint" /></span>}
              {...sh}
            />
            <HomeWorksEditor
              source={(config.homeWorks?.source ?? "auto") as HomeWorksSource}
              onSourceChange={(v) => update("homeWorks", "source", v)}
            />
          </section>

          {/* Services */}
          <section className={styles.section} style={{ gridRow: "span 2", borderBottom: "none" }}>
            <SectionHeader title={t("admin.settings.servicesLabel")} paths={["services"]} {...sh} />
            <div className={styles.fields}>
              <BilingualFieldPair
                label={t("admin.settings.fieldSectionTitle")}
                en={{ value: config.services.label, onChange: (v) => update("services", "label", v) }}
                ko={{ value: config.services.label_ko, onChange: (v) => update("services", "label_ko", v) }}
              />
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
              <BilingualFieldPair
                label={t("admin.settings.fieldWords")}
                en={{ value: config.marquee.words.join(", "), onChange: (v) => update("marquee", "words", v.split(",").map((s) => s.trim())) }}
                ko={{ value: config.marquee.words_ko.join(", "), onChange: (v) => update("marquee", "words_ko", v.split(",").map((s) => s.trim())) }}
              />
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
              <BilingualFieldPair
                label={t("admin.settings.ctaLabel")}
                en={{ value: config.cta.label, onChange: (v) => update("cta", "label", v) }}
                ko={{ value: config.cta.label_ko, onChange: (v) => update("cta", "label_ko", v) }}
              />
              <BilingualFieldPair
                label={t("admin.settings.ctaTitle")}
                en={{ value: config.cta.title.join("\n"), onChange: (v) => update("cta", "title", v.split("\n")) }}
                ko={{ value: config.cta.title_ko.join("\n"), onChange: (v) => update("cta", "title_ko", v.split("\n")) }}
                multiline
              />
              <BilingualFieldPair
                label={t("admin.settings.ctaButtonText")}
                en={{ value: config.cta.buttonText, onChange: (v) => update("cta", "buttonText", v) }}
                ko={{ value: config.cta.buttonText_ko, onChange: (v) => update("cta", "buttonText_ko", v) }}
              />
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
              <BilingualFieldPair
                label={t("admin.settings.resumeButtonText")}
                en={{ value: config.cta.resumeButtonText, onChange: (v) => update("cta", "resumeButtonText", v) }}
                ko={{ value: config.cta.resumeButtonText_ko, onChange: (v) => update("cta", "resumeButtonText_ko", v) }}
              />
            </div>
          </section>

          {/* Footer */}
          <section className={styles.section}>
            <SectionHeader title="Footer" paths={["footer"]} {...sh} />
            <div className={styles.fields}>
              <BilingualFieldPair
                label={t("admin.settings.footerCopyright")}
                en={{ value: config.footer.copyright, onChange: (v) => update("footer", "copyright", v) }}
                ko={{ value: config.footer.copyright_ko, onChange: (v) => update("footer", "copyright_ko", v) }}
              />
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
        /* 순서는 실제 페이지의 패널 순서를 그대로 따른다 —
           몽이 → Profile 정보 창 → GitHub/Pinned → 경력 → 스킬 → 철학 → 프로세스 → 자격증·수상.
           화면에서 보이는 차례와 설정의 차례가 다르면 어디를 고쳐야 할지 매번 찾아야 한다. */
        <>
          {/* Profile 페이지 동작 — 토글 하나뿐이라 전폭 얇은 바(헤더에 인라인) */}
          <section className={`${styles.section} ${shared.sectionWide}`}>
            <SectionHeader
              title="SCROLL"
              paths={["profile.infiniteScroll"]}
              extra={
                <Switch
                  size="sm"
                  label={t("admin.settings.profileInfiniteScroll")}
                  checked={config.profile?.infiniteScroll !== false}
                  onCheckedChange={(v) => update("profile", "infiniteScroll", v)}
                />
              }
              {...sh}
            />
          </section>

          {/* MEET(몽이)·Profile 패널 문구 — 예전에는 번역 파일과 컴포넌트 상수에만 있어
              설정에서 손댈 수 없었다. */}
          <ProfilePanelsEditor data={profileData} setData={setProfileData} styles={styles} shared={shared} />

          {/* GitHub — 활동 지표는 자동 집계, 카드로 보여줄 저장소(Pinned)만 고른다.
              PROFILE 과 나란히 2열로 앉는다. */}
          <section className={styles.section}>
            <SectionHeader
              title="GitHub"
              paths={[]}
              titleClassName={styles.sectionTitle}
              customActions={<ProfileSectionActions keys={["github"]} />}
            />
            <ProfileGithubEditor data={profileData} setData={setProfileData} styles={styles} />
          </section>

          <ProfileSections data={profileData} setData={setProfileData} expanded={profileExpanded} setExpanded={setProfileExpanded} styles={styles} />
        </>
      )}


      {contentSubTab === "posts" && (
        <>
          {/* Banner Settings — 전폭 얇은 바(셀렉트 3개 한 줄) */}
          <section className={`${styles.section} ${shared.sectionWide}`}>
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

          {/* 목록 카드 레이아웃 — 전폭 얇은 바 */}
          <section className={`${styles.section} ${shared.sectionWide}`}>
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

          {/* Pagination — 전폭 얇은 바 */}
          <section className={`${styles.section} ${shared.sectionWide}`}>
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
              title={t("admin.settings.tagEditor.title")}
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
                  {fillTemplate(t("admin.settings.tagEditor.pendingCount"), { n: tagPendingDeletes.size })}
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
                            <Pressable
                              className={styles.tagPendingDeleteUndo}
                              onClick={() => undoTagPendingDelete(tag)}
                              title={t("admin.settings.tagEditor.undo")}
                              aria-label={fillTemplate(t("admin.settings.tagEditor.undoLabel"), { tag })}
                            >
                              <X size={10} strokeWidth={2.2} />
                            </Pressable>
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
              {...sh}
            />
            <p className={styles.taxonomyHint}>
              {t("admin.settings.tagEditor.hint")}
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
            <p className={styles.taxonomyHint}>
              {t("admin.settings.categoryEditor.hint")}
            </p>
            <div className={styles.fields}>
              <CategoriesEditor
                categories={normalizedPostCats}
                onChange={(cats) => update("posts", "categories", cats as SiteConfigData["posts"]["categories"])}
              />
            </div>
          </section>

          {/* Series — 태그|카테고리(2열) 아래 전폭. SeriesManager 가 자체 API 저장 + 자체 헤더 그림 */}
          <section className={`${styles.section} ${shared.sectionWide}`}>
            <SeriesManager
              title={t("admin.posts.series")}
              // 2단계 트리(children 포함) 그대로 전달 — strip 하면 소분류가 series 픽커에서 사라짐
              categories={seriesCategories}
            />
          </section>

        </>
      )}

      {contentSubTab === "calendars" && <CalendarManager />}

      {contentSubTab === "works" && (
        <>
          {/* Works Layout + Pagination — 전폭 얇은 바. 레이아웃·페이지수 셀렉트 + 무한스크롤 토글은 헤더에 인라인 */}
          <section className={`${styles.section} ${shared.sectionWide}`}>
            <SectionHeader
              title={`${t("admin.settings.worksLayout")} & ${t("admin.settings.pagination")}`}
              paths={["works.layout", "works.adminPerPage", "works.infiniteScroll"]}
              extra={
                <Switch
                  size="sm"
                  label={t("admin.settings.worksInfiniteScroll")}
                  checked={config.works.infiniteScroll !== false}
                  onCheckedChange={(v) => update("works", "infiniteScroll", v)}
                />
              }
              {...sh}
            />
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
              <BilingualFieldPair
                label={t("admin.settings.worksIntroLabel")}
                en={{ value: config.works.introLabel, onChange: (v) => update("works", "introLabel", v) }}
                ko={{ value: config.works.introLabel_ko, onChange: (v) => update("works", "introLabel_ko", v) }}
              />
              <BilingualFieldPair
                label={t("admin.settings.worksIntroTitle")}
                en={{ value: config.works.introTitle, onChange: (v) => update("works", "introTitle", v) }}
                ko={{ value: config.works.introTitle_ko, onChange: (v) => update("works", "introTitle_ko", v) }}
              />
              <BilingualFieldPair
                label={t("admin.settings.worksIntroTagline")}
                en={{ value: config.works.introTagline, onChange: (v) => update("works", "introTagline", v) }}
                ko={{ value: config.works.introTagline_ko, onChange: (v) => update("works", "introTagline_ko", v) }}
              />
              <BilingualFieldPair
                label={t("admin.settings.worksIntroDesc")}
                en={{ value: config.works.introDesc, onChange: (v) => update("works", "introDesc", v) }}
                ko={{ value: config.works.introDesc_ko, onChange: (v) => update("works", "introDesc_ko", v) }}
                multiline
              />
              <BilingualFieldPair
                label={t("admin.settings.worksIntroDetail")}
                en={{ value: config.works.introDetail, onChange: (v) => update("works", "introDetail", v) }}
                ko={{ value: config.works.introDetail_ko, onChange: (v) => update("works", "introDetail_ko", v) }}
                multiline
              />
              <BilingualFieldPair
                label={t("admin.settings.worksIntroQuote")}
                en={{ value: config.works.introQuote, onChange: (v) => update("works", "introQuote", v) }}
                ko={{ value: config.works.introQuote_ko, onChange: (v) => update("works", "introQuote_ko", v) }}
              />
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
              <FieldRow label={t("admin.settings.worksIntroMedia.label")}>
                <WorksIntroVideoPicker
                  value={config.works.introVideoUrl ?? ""}
                  onChange={(v) => update("works", "introVideoUrl", v)}
                />
              </FieldRow>
            </div>
          </section>

          {/* 빈 화면 — 발행한 작업물이 하나도 없을 때 나오는 문구(#1062) */}
          <section className={styles.section}>
            <SectionHeader
              title={language === "ko" ? "빈 화면" : "Empty state"}
              paths={["works.emptyTitle", "works.emptyTitle_ko", "works.emptySub", "works.emptySub_ko"]}
              extra={
                <span className={`${styles.sectionHint} ${styles.sectionHintInline}`}>
                  {language === "ko"
                    ? "발행한 작업물이 하나도 없을 때 은하수 배경과 함께 나옵니다. 비우면 기본 문장이 쓰입니다."
                    : "Shown with the starry background when no works are published. Left blank, the default sentence is used."}
                </span>
              }
              {...sh}
            />
            <div className={styles.fields}>
              <BilingualFieldPair
                label={language === "ko" ? "제목" : "Title"}
                en={{ value: config.works.emptyTitle ?? "", onChange: (v) => update("works", "emptyTitle", v) }}
                ko={{ value: config.works.emptyTitle_ko ?? "", onChange: (v) => update("works", "emptyTitle_ko", v) }}
              />
              <BilingualFieldPair
                label={language === "ko" ? "아래 줄" : "Subtitle"}
                en={{ value: config.works.emptySub ?? "", onChange: (v) => update("works", "emptySub", v) }}
                ko={{ value: config.works.emptySub_ko ?? "", onChange: (v) => update("works", "emptySub_ko", v) }}
              />
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
