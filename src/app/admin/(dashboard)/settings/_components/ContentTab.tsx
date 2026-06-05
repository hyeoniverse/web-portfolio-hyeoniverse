"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { Upload, Plus, Check, X, Trash2, Filter, ChevronDown, Sliders } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import T from "@/components/ui/T";
import Input from "@/components/ui/Input";
import type { SiteConfigData } from "@/config/site.config";
import type { ProfileData } from "@/types/profile";
import ProfileSections, { type ProfileExpandState } from "@/components/admin/ProfileSections";
import type { SettingsTabProps } from "../_types";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import Popover from "@/components/ui/Popover";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import { Switch } from "@/components/ui/Switch";
import Checkbox from "@/components/ui/Checkbox";
import Field, { ColorField, ResumeUpload, ServiceItemsEditor } from "./SettingsFormFields";
import CategoriesEditor from "./CategoriesEditor";
import WorksCategoriesEditor from "./WorksCategoriesEditor";
import SeriesManager from "./SeriesManager";
import WorksIntroVideoPicker from "./WorksIntroVideoPicker";
import SectionHeader from "./SectionHeader";
import TagListField from "@/components/ui/TagListField";
import Pagination from "@/components/ui/Pagination";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import { List, ListItem } from "@/app/admin/(dashboard)/components";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import { normalizeTagMeta, type TagMeta, type StoredTagMeta } from "@/lib/tagMeta";
import { showToast } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import { findDuplicate } from "@/lib/dedupe";
import { matchesSearch } from "@/lib/koSearch";
import { getInitial, KO_INITIALS, EN_INITIALS } from "@/lib/initial";
import LetterFilter from "@/components/ui/LetterFilter";
import styles from "../Settings.module.css";

/* About 페이지 패널 목록 — 표시여부 토글 + 전체선택 계산에 공용 */
const ABOUT_PANELS = [
  { key: "hero", label: "Hero" },
  { key: "overview", label: "Overview" },
  { key: "architecture", label: "Architecture" },
  { key: "userflow", label: "User Flow" },
  { key: "features", label: "Features" },
  { key: "designSystem", label: "Design System" },
  { key: "process", label: "Process" },
  { key: "visualBreak", label: "Break Image" },
  { key: "techStack", label: "Tech Stack" },
  { key: "backend", label: "Backend" },
  { key: "erd", label: "ERD" },
  { key: "codeHighlights", label: "Code Highlights" },
  { key: "troubleshooting", label: "Troubleshooting" },
  { key: "security", label: "Security" },
  { key: "credits", label: "Credits" },
] as const;

/* simple-icons slug 또는 이미지 URL → 렌더용 src. slug 면 simpleicons CDN 으로 해석. */
function techIconSrc(icon?: string): string {
  if (!icon) return "";
  return /^https?:\/\//.test(icon) || icon.startsWith("/") ? icon : `https://cdn.simpleicons.org/${icon}`;
}

/* Tech stack 프리셋 — slug(아이콘) + 이름 + 카테고리 + ko(한글 별칭, 초성/한글 검색용) */
type TechPreset = { slug: string; name: string; category: string; ko?: string };
const TECH_PRESETS: TechPreset[] = [
  { slug: "nextdotjs", name: "Next.js", category: "Framework", ko: "넥스트" },
  { slug: "react", name: "React", category: "Library", ko: "리액트" },
  { slug: "vuedotjs", name: "Vue.js", category: "Framework", ko: "뷰" },
  { slug: "svelte", name: "Svelte", category: "Framework", ko: "스벨트" },
  { slug: "typescript", name: "TypeScript", category: "Language", ko: "타입스크립트" },
  { slug: "javascript", name: "JavaScript", category: "Language", ko: "자바스크립트" },
  { slug: "python", name: "Python", category: "Language", ko: "파이썬" },
  { slug: "nodedotjs", name: "Node.js", category: "Runtime", ko: "노드" },
  { slug: "greensock", name: "GSAP", category: "Animation", ko: "지샙" },
  { slug: "framer", name: "Framer Motion", category: "Animation", ko: "프레이머모션" },
  { slug: "tailwindcss", name: "Tailwind CSS", category: "Styling", ko: "테일윈드" },
  { slug: "css", name: "CSS", category: "Styling", ko: "씨에스에스" },
  { slug: "sass", name: "Sass", category: "Styling", ko: "사스" },
  { slug: "threedotjs", name: "Three.js", category: "3D Graphics", ko: "쓰리" },
  { slug: "supabase", name: "Supabase", category: "Backend", ko: "슈파베이스" },
  { slug: "firebase", name: "Firebase", category: "Backend", ko: "파이어베이스" },
  { slug: "postgresql", name: "PostgreSQL", category: "Database", ko: "포스트그레" },
  { slug: "mongodb", name: "MongoDB", category: "Database", ko: "몽고디비" },
  { slug: "prisma", name: "Prisma", category: "ORM", ko: "프리즈마" },
  { slug: "redux", name: "Redux", category: "State Management", ko: "리덕스" },
  { slug: "vite", name: "Vite", category: "Build", ko: "비트" },
  { slug: "webpack", name: "Webpack", category: "Build", ko: "웹팩" },
  { slug: "vitest", name: "Vitest", category: "Testing", ko: "비테스트" },
  { slug: "jest", name: "Jest", category: "Testing", ko: "제스트" },
  { slug: "playwright", name: "Playwright", category: "Testing", ko: "플레이라이트" },
  { slug: "storybook", name: "Storybook", category: "UI", ko: "스토리북" },
  { slug: "vercel", name: "Vercel", category: "Deployment", ko: "버셀" },
  { slug: "netlify", name: "Netlify", category: "Deployment", ko: "넷리파이" },
  { slug: "docker", name: "Docker", category: "DevOps", ko: "도커" },
  { slug: "git", name: "Git", category: "VCS", ko: "깃" },
  { slug: "github", name: "GitHub", category: "VCS", ko: "깃허브" },
  { slug: "figma", name: "Figma", category: "Design", ko: "피그마" },
  { slug: "openai", name: "OpenAI", category: "AI", ko: "오픈에이아이" },
  { slug: "huggingface", name: "Hugging Face", category: "AI", ko: "허깅페이스" },
  { slug: "tiptap", name: "Tiptap", category: "Rich Text Editor", ko: "팁탭" },
  { slug: "", name: "Plate", category: "Rich Text Editor", ko: "플레이트" },
  { slug: "slate", name: "Slate", category: "Rich Text Editor", ko: "슬레이트" },
  { slug: "graphql", name: "GraphQL", category: "API", ko: "그래프큐엘" },
  { slug: "stripe", name: "Stripe", category: "Payments", ko: "스트라이프" },
  { slug: "zod", name: "Zod", category: "Validation", ko: "조드" },
  // ── 언어 ──
  { slug: "html5", name: "HTML", category: "Markup", ko: "에이치티엠엘" },
  { slug: "rust", name: "Rust", category: "Language", ko: "러스트" },
  { slug: "go", name: "Go", category: "Language", ko: "고" },
  { slug: "cplusplus", name: "C++", category: "Language", ko: "씨쁠쁠" },
  { slug: "c", name: "C", category: "Language", ko: "씨" },
  { slug: "openjdk", name: "Java", category: "Language", ko: "자바" },
  { slug: "kotlin", name: "Kotlin", category: "Language", ko: "코틀린" },
  { slug: "swift", name: "Swift", category: "Language", ko: "스위프트" },
  { slug: "ruby", name: "Ruby", category: "Language", ko: "루비" },
  { slug: "php", name: "PHP", category: "Language", ko: "피에이치피" },
  { slug: "dart", name: "Dart", category: "Language", ko: "다트" },
  // ── 프레임워크 (프론트) ──
  { slug: "angular", name: "Angular", category: "Framework", ko: "앵귤러" },
  { slug: "solid", name: "Solid", category: "Framework", ko: "솔리드" },
  { slug: "qwik", name: "Qwik", category: "Framework", ko: "퀵" },
  { slug: "astro", name: "Astro", category: "Framework", ko: "아스트로" },
  { slug: "nuxtdotjs", name: "Nuxt", category: "Framework", ko: "넉스트" },
  { slug: "remix", name: "Remix", category: "Framework", ko: "리믹스" },
  { slug: "preact", name: "Preact", category: "Framework", ko: "프리액트" },
  // ── 백엔드 ──
  { slug: "express", name: "Express", category: "Backend", ko: "익스프레스" },
  { slug: "nestjs", name: "NestJS", category: "Backend", ko: "네스트" },
  { slug: "fastify", name: "Fastify", category: "Backend", ko: "패스티파이" },
  { slug: "django", name: "Django", category: "Backend", ko: "장고" },
  { slug: "flask", name: "Flask", category: "Backend", ko: "플라스크" },
  { slug: "fastapi", name: "FastAPI", category: "Backend", ko: "패스트에이피아이" },
  { slug: "laravel", name: "Laravel", category: "Backend", ko: "라라벨" },
  { slug: "spring", name: "Spring", category: "Backend", ko: "스프링" },
  { slug: "dotnet", name: ".NET", category: "Backend", ko: "닷넷" },
  // ── 모바일 / 데스크탑 / 런타임 ──
  { slug: "flutter", name: "Flutter", category: "Mobile", ko: "플러터" },
  { slug: "electron", name: "Electron", category: "Desktop", ko: "일렉트론" },
  { slug: "tauri", name: "Tauri", category: "Desktop", ko: "타우리" },
  { slug: "expo", name: "Expo", category: "Mobile", ko: "엑스포" },
  { slug: "deno", name: "Deno", category: "Runtime", ko: "디노" },
  { slug: "bun", name: "Bun", category: "Runtime", ko: "번" },
  // ── 상태 / 스타일 ──
  { slug: "mobx", name: "MobX", category: "State Management", ko: "몹엑스" },
  { slug: "reactquery", name: "React Query", category: "State Management", ko: "리액트쿼리" },
  { slug: "styledcomponents", name: "styled-components", category: "Styling", ko: "스타일드컴포넌츠" },
  { slug: "mui", name: "MUI", category: "Styling", ko: "엠유아이" },
  { slug: "chakraui", name: "Chakra UI", category: "Styling", ko: "차크라" },
  { slug: "radixui", name: "Radix UI", category: "Styling", ko: "라딕스" },
  { slug: "bootstrap", name: "Bootstrap", category: "Styling", ko: "부트스트랩" },
  { slug: "postcss", name: "PostCSS", category: "Styling", ko: "포스트씨에스에스" },
  // ── 빌드 / 도구 / 패키지 ──
  { slug: "rollupdotjs", name: "Rollup", category: "Build", ko: "롤업" },
  { slug: "esbuild", name: "esbuild", category: "Build", ko: "이에스빌드" },
  { slug: "babel", name: "Babel", category: "Build", ko: "바벨" },
  { slug: "turborepo", name: "Turborepo", category: "Build", ko: "터보레포" },
  { slug: "eslint", name: "ESLint", category: "Lint", ko: "이에스린트" },
  { slug: "prettier", name: "Prettier", category: "Lint", ko: "프리티어" },
  { slug: "npm", name: "npm", category: "Package", ko: "엔피엠" },
  { slug: "pnpm", name: "pnpm", category: "Package", ko: "피엔피엠" },
  { slug: "yarn", name: "Yarn", category: "Package", ko: "얀" },
  // ── 테스트 ──
  { slug: "cypress", name: "Cypress", category: "Testing", ko: "사이프러스" },
  { slug: "testinglibrary", name: "Testing Library", category: "Testing", ko: "테스팅라이브러리" },
  // ── DB / API ──
  { slug: "mysql", name: "MySQL", category: "Database", ko: "마이에스큐엘" },
  { slug: "redis", name: "Redis", category: "Database", ko: "레디스" },
  { slug: "sqlite", name: "SQLite", category: "Database", ko: "에스큐엘라이트" },
  { slug: "planetscale", name: "PlanetScale", category: "Database", ko: "플래닛스케일" },
  { slug: "apollographql", name: "Apollo", category: "API", ko: "아폴로" },
  // ── DevOps / Cloud ──
  { slug: "kubernetes", name: "Kubernetes", category: "DevOps", ko: "쿠버네티스" },
  { slug: "githubactions", name: "GitHub Actions", category: "CI", ko: "깃허브액션" },
  { slug: "gitlab", name: "GitLab", category: "VCS", ko: "깃랩" },
  { slug: "googlecloud", name: "Google Cloud", category: "Cloud", ko: "구글클라우드" },
  { slug: "cloudflare", name: "Cloudflare", category: "Cloud", ko: "클라우드플레어" },
  { slug: "nginx", name: "Nginx", category: "DevOps", ko: "엔진엑스" },
  // ── AI / 디자인 / 도구 ──
  { slug: "anthropic", name: "Anthropic", category: "AI", ko: "앤트로픽" },
  { slug: "ollama", name: "Ollama", category: "AI", ko: "올라마" },
  { slug: "googlegemini", name: "Gemini", category: "AI", ko: "제미나이" },
  { slug: "adobephotoshop", name: "Photoshop", category: "Design", ko: "포토샵" },
  { slug: "blender", name: "Blender", category: "Design", ko: "블렌더" },
  { slug: "notion", name: "Notion", category: "Tool", ko: "노션" },
  { slug: "jira", name: "Jira", category: "Tool", ko: "지라" },
  { slug: "markdown", name: "Markdown", category: "Markup", ko: "마크다운" },
];

/* 카테고리 프리셋 — TECH_PRESETS 의 distinct 카테고리 (입력 자동완성용) */
const CATEGORY_PRESETS = Array.from(new Set(TECH_PRESETS.map((p) => p.category))).sort((a, b) => a.localeCompare(b));

/* tech 아이콘 렌더 — slug/URL 이미지, 로드 실패하거나 비어있으면 이니셜 폴백 */
function TechIcon({ icon, name, styles }: { icon?: string; name: string; styles: Record<string, string> }) {
  const src = techIconSrc(icon);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  if (src && brokenSrc !== src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setBrokenSrc(src)} />;
  }
  return <span className={styles.techIconInitial}>{(name || "?").slice(0, 1).toUpperCase()}</span>;
}

/* 카테고리 입력 — 공통 Select combobox. 제안 = 기존 항목 카테고리 우선 + 프리셋 (대소문자 무시 dedupe) */
function CategoryInput({ value, onChange, currentCats, t }: {
  value: string;
  onChange: (v: string) => void;
  currentCats: string[];
  t: (key: string) => string;
}) {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const c of [...currentCats, ...CATEGORY_PRESETS]) {
    const key = c.trim().toLowerCase();
    if (!c.trim() || seen.has(key)) continue;
    seen.add(key);
    options.push({ value: c, label: c });
  }
  return (
    <Select
      combobox
      bubble
      size="sm"
      value={value}
      inputValue={value}
      onChange={onChange}
      onInputChange={onChange}
      onAdd={onChange}
      options={options}
      placeholder={t("admin.settings.aboutTechStackCategory")}
    />
  );
}

/* 변형 검색(영문 부분일치 + 한글 + 초성)은 공용 util matchesSearch 사용 */
function matchTech(p: TechPreset, query: string): boolean {
  return matchesSearch(query, p.name, p.slug, p.category, p.ko ?? "");
}

type TechItem = { name: string; category: string; icon?: string };

/* social platform select option — 라벨 옆에 brand SVG icon */
function SocialIconSvg({ name }: { name: string }) {
  const icon = SOCIAL_ICONS[name];
  if (!icon) return null;
  return icon.stroke ? (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon.path} /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width={14} height={14}><path d={icon.path} fill="currentColor" /></svg>
  );
}

const SOCIAL_PLATFORM_OPTIONS_WITH_ICON = Object.entries(SOCIAL_ICONS).map(([value, { label }]) => ({
  value,
  label,
  icon: <SocialIconSvg name={value} />,
}));

type SocialLink = { platform: string; url: string; label?: string; icon?: string };

const MAX_SOCIAL_LINKS = 6;

interface ContentTabProps extends SettingsTabProps {
  profileData: ProfileData;
  setProfileData: Dispatch<SetStateAction<ProfileData>>;
  profileExpanded: ProfileExpandState;
  setProfileExpanded: Dispatch<SetStateAction<ProfileExpandState>>;
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
  contentSubTab: "home" | "profile" | "works" | "posts" | "about";
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
  const { t } = useLanguage();
  const { theme } = useTheme();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, titleClassName: styles.sectionTitle };
  const [showAboutCover, setShowAboutCover] = useState(false);
  const [showHeroBgCover, setShowHeroBgCover] = useState(false);
  const aboutVisualBreak = config.about?.visualBreakImage ?? "";

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
  const socialLinks = useMemo<SocialLink[]>(() => config.socialLinks ?? [], [config.socialLinks]);

  const updateSocialLinks = useCallback(
    (fn: (prev: SocialLink[]) => SocialLink[]) => {
      setConfig((prev) => ({ ...prev, socialLinks: fn(prev.socialLinks ?? []) }));
    },
    [setConfig],
  );

  const socialIds = useMemo(() => socialLinks.map((_, i) => `social-${i}`), [socialLinks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleSocialDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = socialIds.indexOf(String(active.id));
      const newIdx = socialIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      updateSocialLinks((prev) => arrayMove([...prev], oldIdx, newIdx));
    },
    [socialIds, updateSocialLinks],
  );

  const updateSocialItem = useCallback(
    (idx: number, field: keyof SocialLink, value: string) => {
      updateSocialLinks((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
      );
    },
    [updateSocialLinks],
  );

  const addSocialLink = useCallback(() => {
    updateSocialLinks((prev) => {
      if (prev.length >= MAX_SOCIAL_LINKS) return prev;
      return [...prev, { platform: "custom", url: "", label: "" }];
    });
  }, [updateSocialLinks]);

  const removeSocialLink = useCallback(
    (idx: number) => {
      updateSocialLinks((prev) => prev.filter((_, i) => i !== idx));
    },
    [updateSocialLinks],
  );

  // Normalize: support both old string[] and new { ko, en, description? }[] (description 은 legacy string 또는 bilingual {ko,en})
  const normalizedPostCats = useMemo(() => {
    const raw = config.posts?.categories ?? [];
    return (raw as unknown[]).map((item) =>
      typeof item === "string"
        ? { ko: item, en: item, description: undefined as { ko: string; en: string } | string | undefined }
        : (item as { ko: string; en: string; description?: { ko: string; en: string } | string }),
    );
  }, [config.posts?.categories]);

  const normalizedWorksCats = useMemo(() => {
    const raw = config.works?.categories ?? [];
    return (raw as unknown[]).map((item) =>
      typeof item === "string"
        ? { ko: item, en: item, description: undefined as { ko: string; en: string } | string | undefined }
        : (item as { ko: string; en: string; description?: { ko: string; en: string } | string }),
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
              <ResumeUpload
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSocialDragEnd}>
              <SortableContext items={socialIds} strategy={verticalListSortingStrategy}>
            <div className={styles.socialEditor}>
              {socialLinks.map((link, idx) => (
                <SortableSocialItem key={socialIds[idx]} id={socialIds[idx]}>
                  <SocialIconArea
                    link={link}
                    isCustom={link.platform === "custom"}
                    onUploaded={(url) => updateSocialItem(idx, "icon", url)}
                  />
                  <div className={styles.socialItemFields}>
                    <Select
                      value={link.platform}
                      options={SOCIAL_PLATFORM_OPTIONS_WITH_ICON}
                      onChange={(v) => updateSocialItem(idx, "platform", v)}
                    />
                    {link.platform === "custom" && (
                      <>
                        <Input
                          placeholder={t("admin.settings.socialLabelPlaceholder")}
                          value={link.label ?? ""}
                          onChange={(v) => updateSocialItem(idx, "label", v)}
                        />
                        <SocialIconUploadRow
                          icon={link.icon ?? ""}
                          onIconChange={(v) => updateSocialItem(idx, "icon", v)}
                          onUploaded={(url) => updateSocialItem(idx, "icon", url)}
                          placeholder={t("admin.settings.socialIconPlaceholder")}
                        />
                      </>
                    )}
                    <Input
                      placeholder={t("admin.settings.socialUrlPlaceholder")}
                      value={link.url}
                      onChange={(v) => updateSocialItem(idx, "url", v)}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.socialRemoveBtn}
                    onClick={() => removeSocialLink(idx)}
                    aria-label="Remove"
                  >
                    <span className={styles.socialRemoveLine} />
                    <span className={styles.socialRemoveLine} />
                  </button>
                </SortableSocialItem>
              ))}
              <Button
                variant="outline"
                size="md"
                fullWidth
                icon={<Plus size={14} strokeWidth={2} />}
                onClick={addSocialLink}
                disabled={socialLinks.length >= MAX_SOCIAL_LINKS}
                className={styles.profileAddBtn}
              >
                <T k="admin.settings.addSocial" /> ({socialLinks.length}/{MAX_SOCIAL_LINKS})
              </Button>
            </div>
              </SortableContext>
            </DndContext>
          </section>
        </>
      )}

      {contentSubTab === "profile" && (
        <ProfileSections data={profileData} setData={setProfileData} expanded={profileExpanded} setExpanded={setProfileExpanded} styles={styles} />
      )}

      {contentSubTab === "posts" && (
        <>
          {/* Banner Settings — 내부 3-col */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.banner")} paths={["posts.bannerLayout", "posts.bannerStyle", "posts.bannerTransition"]} {...sh} />
            <div className={`${styles.fields} ${styles.fieldsGrid3}`}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.bannerLayout" /></label>
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
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.bannerStyle" /></label>
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
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.bannerTransition" /></label>
                <Select
                  value={config.posts.bannerTransition ?? "default"}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "cylinder", label: "Cylinder" },
                  ]}
                  onChange={(v) => update("posts", "bannerTransition", v as SiteConfigData["posts"]["bannerTransition"])}
                />
              </div>
            </div>
          </section>

          {/* Pagination — 내부 2-col */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.pagination")} paths={["posts.perPage", "posts.adminPerPage"]} {...sh} />
            <div className={`${styles.fields} ${styles.fieldsGrid2}`}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.postsPerPage" /></label>
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
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.adminPerPage" /></label>
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
              </div>
            </div>
          </section>

          {/* 태그 — 모든 게시물의 태그 목록 + 각 설명. /posts/tags/[tag] hero 에 표시 */}
          <section className={styles.section}>
            <SectionHeader
              title="태그"
              paths={["tagDescriptions"]}
              extraDirty={tagPendingDeletes.size > 0}
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
              categories={normalizedPostCats.map((c) => ({
                ko: c.ko,
                en: c.en,
                description: typeof c.description === "string" ? c.description : c.description?.ko,
              }))}
            />
          </section>
        </>
      )}

      {contentSubTab === "works" && (
        <>
          {/* Works Layout + Pagination — 단일 column 으로 stack */}
          <section className={styles.section}>
            <SectionHeader title={`${t("admin.settings.worksLayout")} & ${t("admin.settings.pagination")}`} paths={["works.layout", "works.adminPerPage"]} {...sh} />
            <div className={styles.fields}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.worksLayout" /></label>
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
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.adminPerPage" /></label>
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
              </div>
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
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldLabelText}>Intro 미디어</span>
                </label>
                <WorksIntroVideoPicker
                  value={config.works.introVideoUrl ?? ""}
                  onChange={(v) => update("works", "introVideoUrl", v)}
                />
              </div>
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
        <>
          {/* About 시각적 구분선 (visualBreakImage) — CoverImagePicker 로 선택 */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.aboutVisualBreak")} paths={["about.visualBreakImage"]} {...sh} />
            <p className={styles.sectionHint}>{t("admin.settings.aboutVisualBreakHint")}</p>
            <div className={styles.fields}>
              <div className={styles.aboutMediaRow}>
                {aboutVisualBreak && (
                  <div className={styles.aboutMediaThumb}>
                    <img src={aboutVisualBreak} alt="" />
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowAboutCover((v) => !v)}>
                  {showAboutCover ? t("admin.posts.seriesModal.closePicker") : t("admin.posts.seriesModal.chooseCover")}
                </Button>
              </div>
              {showAboutCover && (
                <CoverImagePicker
                  onSelect={(url) => {
                    setConfig((prev) => ({ ...prev, about: { ...prev.about, visualBreakImage: url } }));
                    setShowAboutCover(false);
                  }}
                  onClose={() => setShowAboutCover(false)}
                  currentUrl={aboutVisualBreak}
                  postContext={{ title: "About page visual break", tags: ["abstract", "minimal"], excerpt: "" }}
                />
              )}
            </div>
          </section>

          {/* Hero 패널 — 시각적 구분선 옆 (1행 우측). bilingual 입력은 BilingualInputPair 로 ko/en 한 라벨 아래 묶음 */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.aboutHero")} paths={["about.heroLine1", "about.heroLine1_ko", "about.heroLine2", "about.heroLine2_ko", "about.heroWatermark", "about.heroWatermark_ko", "about.heroLine1Color", "about.heroLine1FontSize", "about.heroLine1FontWeight", "about.heroLine1FontFamily", "about.heroLine2Color", "about.heroLine2FontSize", "about.heroLine2FontWeight", "about.heroLine2FontFamily", "about.heroSubtitleColor", "about.heroSubtitleFontSize", "about.heroSubtitleFontWeight", "about.heroSubtitleFontFamily", "about.heroWatermarkColor", "about.heroWatermarkFontSize", "about.heroWatermarkFontWeight", "about.heroWatermarkFontFamily", "about.heroBackground", "about.heroBgColor", "about.heroBgGradientFrom", "about.heroBgGradientTo", "about.heroBgGradientAngle", "about.heroBgOpacity", "about.heroVideoOverlayColor", "about.heroVideoOverlayStrength"]} {...sh} />
            <div className={styles.fields}>
              <p className={styles.fieldGroupTitle}>{t("admin.settings.aboutHeroTextGroup")}</p>
              {/* Line 1 — ko/en + ⚙ style 버튼 (popover 안 색/크기/굵기/폰트) */}
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroLine1")}</label>
                <div className={styles.aboutHeroField}>
                  <div className={styles.aboutHeroFieldMain}>
                    <BilingualInputPair
                      layout="row"
                      value={{ ko: config.about.heroLine1_ko ?? "", en: config.about.heroLine1 ?? "" }}
                      onChange={(v) => { update("about", "heroLine1", v.en); update("about", "heroLine1_ko", v.ko); }}
                    />
                  </div>
                  <TextStyleButton sheetTitle={`${t("admin.settings.aboutHeroLine1")} · ${t("admin.settings.aboutHeroStylePopoverTitle")}`}>
                    <TextStyleControls
                      t={t}
                      themeFallback={themeBg.primary}
                      color={config.about.heroLine1Color ?? ""}
                      onColorChange={(v) => update("about", "heroLine1Color", v)}
                      fontSize={config.about.heroLine1FontSize ?? ""}
                      onFontSizeChange={(v) => update("about", "heroLine1FontSize", v)}
                      fontWeight={config.about.heroLine1FontWeight ?? ""}
                      onFontWeightChange={(v) => update("about", "heroLine1FontWeight", v)}
                      fontFamily={config.about.heroLine1FontFamily ?? ""}
                      onFontFamilyChange={(v) => update("about", "heroLine1FontFamily", v)}
                      fontSizeMin={2}
                      fontSizeMax={20}
                      fontSizeStep={0.25}
                    />
                  </TextStyleButton>
                </div>
              </div>

              {/* Line 2 (accent) */}
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroLine2")}</label>
                <div className={styles.aboutHeroField}>
                  <div className={styles.aboutHeroFieldMain}>
                    <BilingualInputPair
                      layout="row"
                      value={{ ko: config.about.heroLine2_ko ?? "", en: config.about.heroLine2 ?? "" }}
                      onChange={(v) => { update("about", "heroLine2", v.en); update("about", "heroLine2_ko", v.ko); }}
                    />
                  </div>
                  <TextStyleButton sheetTitle={`${t("admin.settings.aboutHeroLine2")} · ${t("admin.settings.aboutHeroStylePopoverTitle")}`}>
                    <TextStyleControls
                      t={t}
                      themeFallback={themeBg.accent}
                      color={config.about.heroLine2Color ?? ""}
                      onColorChange={(v) => update("about", "heroLine2Color", v)}
                      fontSize={config.about.heroLine2FontSize ?? ""}
                      onFontSizeChange={(v) => update("about", "heroLine2FontSize", v)}
                      fontWeight={config.about.heroLine2FontWeight ?? ""}
                      onFontWeightChange={(v) => update("about", "heroLine2FontWeight", v)}
                      fontFamily={config.about.heroLine2FontFamily ?? ""}
                      onFontFamilyChange={(v) => update("about", "heroLine2FontFamily", v)}
                      fontSizeMin={2}
                      fontSizeMax={20}
                      fontSizeStep={0.25}
                    />
                  </TextStyleButton>
                </div>
              </div>

              {/* 서브타이틀 — 인풋 없음 (i18n aboutPage.description), 스타일 버튼만 */}
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroSubtitle")}</label>
                <div className={`${styles.aboutHeroField} ${styles.aboutHeroFieldCenter}`}>
                  <span className={styles.aboutHeroSubtitleHint}>
                    {t("admin.settings.aboutHeroSubtitleHint")}
                  </span>
                  <TextStyleButton sheetTitle={`${t("admin.settings.aboutHeroSubtitle")} · ${t("admin.settings.aboutHeroStylePopoverTitle")}`}>
                    <TextStyleControls
                      t={t}
                      themeFallback={themeBg.primary}
                      color={config.about.heroSubtitleColor ?? ""}
                      onColorChange={(v) => update("about", "heroSubtitleColor", v)}
                      fontSize={config.about.heroSubtitleFontSize ?? ""}
                      onFontSizeChange={(v) => update("about", "heroSubtitleFontSize", v)}
                      fontWeight={config.about.heroSubtitleFontWeight ?? ""}
                      onFontWeightChange={(v) => update("about", "heroSubtitleFontWeight", v)}
                      fontFamily={config.about.heroSubtitleFontFamily ?? ""}
                      onFontFamilyChange={(v) => update("about", "heroSubtitleFontFamily", v)}
                      fontSizeMin={0.75}
                      fontSizeMax={3}
                      fontSizeStep={0.05}
                    />
                  </TextStyleButton>
                </div>
              </div>

              {/* Watermark */}
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroWatermark")}</label>
                <div className={styles.aboutHeroField}>
                  <div className={styles.aboutHeroFieldMain}>
                    <BilingualInputPair
                      layout="row"
                      value={{ ko: config.about.heroWatermark_ko ?? "", en: config.about.heroWatermark ?? "" }}
                      onChange={(v) => { update("about", "heroWatermark", v.en); update("about", "heroWatermark_ko", v.ko); }}
                    />
                  </div>
                  <TextStyleButton sheetTitle={`${t("admin.settings.aboutHeroWatermark")} · ${t("admin.settings.aboutHeroStylePopoverTitle")}`}>
                    <TextStyleControls
                      t={t}
                      themeFallback={themeBg.primary}
                      color={config.about.heroWatermarkColor ?? ""}
                      onColorChange={(v) => update("about", "heroWatermarkColor", v)}
                      fontSize={config.about.heroWatermarkFontSize ?? ""}
                      onFontSizeChange={(v) => update("about", "heroWatermarkFontSize", v)}
                      fontWeight={config.about.heroWatermarkFontWeight ?? ""}
                      onFontWeightChange={(v) => update("about", "heroWatermarkFontWeight", v)}
                      fontFamily={config.about.heroWatermarkFontFamily ?? ""}
                      onFontFamilyChange={(v) => update("about", "heroWatermarkFontFamily", v)}
                      fontSizeMin={3}
                      fontSizeMax={20}
                      fontSizeStep={0.5}
                    />
                  </TextStyleButton>
                </div>
              </div>

              <hr className={styles.sectionDivider} />
              {/* 패널 배경 — media (cover picker) + solid color + gradient + video opacity, 전부 UI 컨트롤 */}
              <div className={styles.aboutBgGroup}>
                <p className={styles.fieldGroupTitle}>{t("admin.settings.aboutHeroBackground")}</p>

                {/* media row — preview + picker toggle + remove. preview 는 동영상이면 <video>, 아니면 <img>. */}
                {(() => {
                  const bg = (config.about.heroBackground ?? "").trim();
                  const mediaUrl = bg.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? (bg.match(/^(\S+)/)?.[1] ?? "");
                  const isVideo = !!mediaUrl && /\.(mp4|webm|mov|ogv)(\?|#|$)/i.test(mediaUrl);
                  return (
                    <div className={styles.aboutMediaRow}>
                      {mediaUrl && (
                        <div className={styles.aboutMediaThumb}>
                          {isVideo ? (
                            <video src={mediaUrl} autoPlay muted loop playsInline />
                          ) : (
                            <img src={mediaUrl} alt="" />
                          )}
                        </div>
                      )}
                      <div className={styles.aboutMediaActions}>
                        <Button variant="outline" size="sm" onClick={() => setShowHeroBgCover((v) => !v)}>
                          {showHeroBgCover ? t("admin.posts.seriesModal.closePicker") : t("admin.posts.seriesModal.chooseCover")}
                        </Button>
                        {mediaUrl && (
                          <Button variant="outline" size="sm" onClick={() => update("about", "heroBackground", "")}>
                            {t("admin.settings.aboutHeroBgClear")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {showHeroBgCover && (
                  <CoverImagePicker
                    onSelect={(url) => {
                      update("about", "heroBackground", url);
                      setShowHeroBgCover(false);
                    }}
                    onClose={() => setShowHeroBgCover(false)}
                    currentUrl={(config.about.heroBackground ?? "").match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? (config.about.heroBackground ?? "")}
                    postContext={{ title: "About hero panel background", tags: ["hero", "abstract"], excerpt: "" }}
                  />
                )}

                {/* 배경 (이미지/동영상) opacity + overlay color/strength — 미디어 선택됐을 때만 활성 */}
                {(() => {
                  const bg = (config.about.heroBackground ?? "").trim();
                  const mediaUrl = bg.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? (bg.match(/^(\S+)/)?.[1] ?? "");
                  if (!mediaUrl) return null;
                  const op = config.about.heroBgOpacity ?? 0.8;
                  const ovStrength = config.about.heroVideoOverlayStrength ?? 0.5;
                  return (
                    <>
                      <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroBgOpacity")}</label>
                        <div className={styles.aboutSliderRow}>
                          <div className={styles.aboutSliderTrack}>
                            <Slider
                              min={0}
                              max={1}
                              step={0.01}
                              value={[op]}
                              onValueChange={([n]) => update("about", "heroBgOpacity", Math.round(n * 100) / 100)}
                            />
                          </div>
                          <EditableSliderValue
                            value={op}
                            display={(v) => `${Math.round(v * 100)}%`}
                            parse={{ toDraft: (v) => String(Math.round(v * 100)), fromDraft: (s) => parseFloat(s) / 100 }}
                            onCommit={(n) => update("about", "heroBgOpacity", n)}
                            min={0}
                            max={1}
                            step={0.01}
                            width={48}
                          />
                        </div>
                      </div>
                      <ColorField
                        label={t("admin.settings.aboutHeroVideoOverlayColor")}
                        value={config.about.heroVideoOverlayColor || themeBg.accent}
                        onChange={(v) => update("about", "heroVideoOverlayColor", v)}
                      />
                      <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroVideoOverlayStrength")}</label>
                        <div className={styles.aboutSliderRow}>
                          <div className={styles.aboutSliderTrack}>
                            <Slider
                              min={0}
                              max={1}
                              step={0.01}
                              value={[ovStrength]}
                              onValueChange={([n]) => update("about", "heroVideoOverlayStrength", Math.round(n * 100) / 100)}
                            />
                          </div>
                          <EditableSliderValue
                            value={ovStrength}
                            display={(v) => `${Math.round(v * 100)}%`}
                            parse={{ toDraft: (v) => String(Math.round(v * 100)), fromDraft: (s) => parseFloat(s) / 100 }}
                            onCommit={(n) => update("about", "heroVideoOverlayStrength", n)}
                            min={0}
                            max={1}
                            step={0.01}
                            width={48}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* solid background color — 빈 값이면 현재 테마 패널 색 표시 */}
                <ColorField
                  label={t("admin.settings.aboutHeroBgColor")}
                  value={config.about.heroBgColor || themeBg.primary}
                  onChange={(v) => update("about", "heroBgColor", v)}
                />

                {/* gradient — from/to 빈 값이면 테마 표면 색을 fallback 으로 표시 */}
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroBgGradient")}</label>
                  <div className={styles.aboutGradientGrid}>
                    <ColorField
                      label={t("admin.settings.aboutHeroBgGradientFrom")}
                      value={config.about.heroBgGradientFrom || themeBg.primary}
                      onChange={(v) => update("about", "heroBgGradientFrom", v)}
                    />
                    <ColorField
                      label={t("admin.settings.aboutHeroBgGradientTo")}
                      value={config.about.heroBgGradientTo || themeBg.secondary}
                      onChange={(v) => update("about", "heroBgGradientTo", v)}
                    />
                  </div>
                  <div className={styles.aboutGradientAngle}>
                    <span className={styles.aboutGradientAngleLabel}>
                      {t("admin.settings.aboutHeroBgGradientAngle")}
                    </span>
                    <div className={styles.aboutSliderTrack}>
                      <Slider
                        min={0}
                        max={360}
                        step={1}
                        value={[config.about.heroBgGradientAngle ?? 135]}
                        onValueChange={([n]) => update("about", "heroBgGradientAngle", n)}
                      />
                    </div>
                    <EditableSliderValue
                      value={config.about.heroBgGradientAngle ?? 135}
                      display={(v) => `${v}°`}
                      parse={{ toDraft: (v) => String(v), fromDraft: (s) => parseInt(s, 10) }}
                      onCommit={(n) => update("about", "heroBgGradientAngle", n)}
                      min={0}
                      max={360}
                      step={1}
                      width={48}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 무한 스크롤 (좌) + 패널 표시 여부 (우) — 2행에 위치 */}
          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.aboutInfiniteScroll")} paths={["about.infiniteScroll"]} {...sh} />
            <div className={styles.fields}>
              <label className={styles.aboutCheckRow}>
                <Checkbox
                  shape="square"
                  checked={config.about.infiniteScroll ?? false}
                  onChange={(v) => update("about", "infiniteScroll", v)}
                />
                <span>{t("admin.settings.aboutInfiniteScrollLabel")}</span>
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader title={t("admin.settings.aboutPanelVisibility")} paths={["about.hiddenPanels"]} {...sh} />
            <p className={styles.sectionHint}>{t("admin.settings.aboutPanelVisibilityHint")}</p>
            <div className={styles.fields}>
              {(() => {
                const hiddenList = config.about.hiddenPanels ?? [];
                const shownCount = ABOUT_PANELS.filter((p) => !hiddenList.includes(p.key)).length;
                const allShown = shownCount === ABOUT_PANELS.length;
                const allHidden = shownCount === 0;
                return (
                  <div className={styles.aboutPanelHeader}>
                    <label className={styles.aboutPanelToggle}>
                      <Checkbox
                        shape="square"
                        checked={allShown}
                        indeterminate={!allShown && !allHidden}
                        onChange={(v) =>
                          update("about", "hiddenPanels", (v ? [] : ABOUT_PANELS.map((p) => p.key)) as SiteConfigData["about"]["hiddenPanels"])
                        }
                      />
                      <span>{allShown ? t("admin.settings.aboutPanelHideAll") : t("admin.settings.aboutPanelShowAll")}</span>
                    </label>
                    <span className={styles.sectionHint}>{shownCount} / {ABOUT_PANELS.length}</span>
                  </div>
                );
              })()}
              <div className={styles.aboutPanelGrid}>
                {ABOUT_PANELS.map(({ key, label }) => {
                  const hidden = (config.about.hiddenPanels ?? []).includes(key);
                  return (
                    <label key={key} className={styles.aboutPanelToggle}>
                      <Checkbox
                        shape="square"
                        checked={!hidden}
                        onChange={(v) => {
                          const list = new Set(config.about.hiddenPanels ?? []);
                          if (v) list.delete(key); else list.add(key);
                          update("about", "hiddenPanels", Array.from(list) as SiteConfigData["about"]["hiddenPanels"]);
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Overview 패널 항목 — description + highlights 칩 + stats 카드 */}
          <AboutOverviewEditor
            descriptionKo={config.about.overview_description_ko ?? ""}
            descriptionEn={config.about.overview_description_en ?? ""}
            highlights={config.about.overview_highlights ?? ""}
            stats={config.about.overview_stats ?? []}
            onChange={(patch) => {
              for (const [k, v] of Object.entries(patch)) {
                update("about", k as keyof SiteConfigData["about"], v as SiteConfigData["about"][keyof SiteConfigData["about"]]);
              }
            }}
            t={t}
            sh={sh}
            styles={styles}
          />

          {/* Architecture 패널 항목 — path + ko/en description + indent (0/1/2 계층) */}
          <AboutArchitectureEditor
            value={(config.about as { architectureItems?: ArchitectureItem[] }).architectureItems ?? []}
            onChange={(v) => update("about", "architectureItems" as keyof SiteConfigData["about"], v as unknown as SiteConfigData["about"][keyof SiteConfigData["about"]])}
            t={t}
            sh={sh}
            styles={styles}
          />

          {/* Features 패널 항목 — 카드별 inline 편집 */}
          <AboutFeaturesEditor
            value={config.about.features ?? []}
            onChange={(v) => update("about", "features", v as SiteConfigData["about"]["features"])}
            t={t}
            sh={sh}
            styles={styles}
          />

          {/* Process 패널 항목 */}
          <AboutProcessEditor
            value={config.about.process ?? []}
            onChange={(v) => update("about", "process", v as SiteConfigData["about"]["process"])}
            t={t}
            sh={sh}
            styles={styles}
          />

          {/* Security 패널 항목 */}
          <AboutSecurityEditor
            value={config.about.security ?? []}
            onChange={(v) => update("about", "security", v as SiteConfigData["about"]["security"])}
            t={t}
            sh={sh}
            styles={styles}
          />

          {/* Tech stack 편집 — chip + 프리셋(아이콘) + 아이콘 편집 */}
          <section className={`${styles.section} ${styles.sectionWide}`}>
            <SectionHeader title={t("admin.settings.aboutTechStack")} paths={["about.techStack"]} {...sh} />
            <p className={styles.sectionHint}>{t("admin.settings.aboutTechStackHint")}</p>
            <AboutTechStackEditor
              items={(config.about.techStack ?? []) as TechItem[]}
              onChange={(v) => update("about", "techStack", v as SiteConfigData["about"]["techStack"])}
              t={t}
              styles={styles}
            />
          </section>
        </>
      )}
    </>
  );
}

/* ── Tag editor — bilingual 이름 + bilingual 설명, search/sort/pagination ──
   저장 키 = canonical (post.tags 와 매칭). value 는 lib/tagMeta 의 StoredTagMeta 형식.
   write 시 항상 새 포맷 ({ ko, en, description }) 로 저장. */
type TagSortBy = "freq" | "name";
type SortDir = "asc" | "desc";
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
function metaToStored(m: TagMeta): { ko?: string; en?: string; description: { ko: string; en: string } } | null {
  const ko = m.ko.trim();
  const en = m.en.trim();
  const dko = m.description.ko.trim();
  const den = m.description.en.trim();
  if (!ko && !en && !dko && !den) return null;
  const out: { ko?: string; en?: string; description: { ko: string; en: string } } = {
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
interface TagPostInfo {
  id: string;
  title: string;
  title_en: string;
  tags: string[];
  slug: string;
  category: string;
  published: boolean;
  published_at: string | null;
  created_at: string | null;
  view_count: number;
}

/** 게시물 리스트 row 의 메타 데이터 (발행상태 / 날짜 / 조회수) */
function PostMeta({ p }: { p: { published: boolean; published_at: string | null; created_at: string | null; view_count?: number } }) {
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

function TagDescriptionsEditor({ value, onChange, pendingDeletes, onPendingDeletesChange }: {
  value: TagDescValue;
  onChange: (v: SavedTagValue) => void;
  pendingDeletes: Set<string>;
  onPendingDeletesChange: (next: Set<string>) => void;
}) {
  const [postTags, setPostTags] = useState<string[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [tagPosts, setTagPosts] = useState<TagPostInfo[]>([]);
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
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
  const notesForEditor = useMemo<Record<string, { ko: string; en: string }>>(() => {
    const map: Record<string, { ko: string; en: string }> = {};
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
            삭제 대기열에 추가됩니다 — 섹션 저장 시 모든 게시물의 tags 에서 함께 제거. 되돌리기로 취소 가능.
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

  /* TagNotesEditor 의 내부 drawer 는 onEditClick prop 으로 모두 외부 위임됐고,
     description 편집도 하단 box 에서 처리. 따라서 onNotesChange 는 noop —
     remove× 클릭 시 TagNotesEditor 가 setEntry(null) → onNotesChange 까지 부르는데,
     allTags iterate 하다 직전 onItemsChange 가 삭제한 entry 가 다시 부활하는 race 방지. */
  const handleNotesChange = () => {};

  /* ── 하단 통합 add/edit box ──
     canonical key (post.tags 매칭용) 는 신규 추가 시 EN (없으면 KO) 에서 자동 도출 — 별도 입력 X. */
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [pairNames, setPairNames] = useState<{ ko: string; en: string }>({ ko: "", en: "" });
  const [pairDesc, setPairDesc] = useState<{ ko: string; en: string }>({ ko: "", en: "" });
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
        showToast(`"${dup}" 과 같은 태그입니다`, "error");
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
  const editingPosts = useMemo<TagPostInfo[]>(() => {
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
          필터{activeFilterCount > 0 && ` (${activeFilterCount})`}
          <ChevronDown
            size={12}
            style={{
              marginLeft: 2,
              transform: filterExpanded ? "rotate(180deg)" : undefined,
              transition: "transform 0.2s",
            }}
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
                <Button
                  variant={usageFilter === "in-use" ? "primary" : "outline"}
                  size="md"
                  onClick={() => setUsageFilter((u) => u === "in-use" ? "all" : "in-use")}
                >사용중</Button>
                <Button
                  variant={usageFilter === "unused" ? "primary" : "outline"}
                  size="md"
                  onClick={() => setUsageFilter((u) => u === "unused" ? "all" : "unused")}
                >미사용</Button>
              </div>
              <div className={styles.tagDescFilterGroup}>
                <span className={styles.tagDescFilterGroupLabel}>설명</span>
                <Button
                  variant={descFilter === "with" ? "primary" : "outline"}
                  size="md"
                  onClick={() => setDescFilter((d) => d === "with" ? "all" : "with")}
                >설명 있음</Button>
                <Button
                  variant={descFilter === "without" ? "primary" : "outline"}
                  size="md"
                  onClick={() => setDescFilter((d) => d === "without" ? "all" : "without")}
                >설명 없음</Button>
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

/* ── Sortable social link item ── */
function SortableSocialItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.socialItem} ${isDragging ? styles.socialItemDragging : ""}`}
      {...attributes}
    >
      <button type="button" className={styles.socialDragHandle} {...listeners} aria-label="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      {children}
    </div>
  );
}

/* ── Clickable social icon area with upload ── */
function SocialIconArea({ link, isCustom, onUploaded }: {
  link: SocialLink;
  isCustom: boolean;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "icons");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      onUploaded(data.url);
    } catch {
      // upload failed
    } finally {
      setUploading(false);
    }
  };

  const icon = SOCIAL_ICONS[link.platform];

  return (
    <>
      <span
        className={`${styles.socialIcon} ${isCustom ? styles.socialIconClickable : ""}`}
        onClick={isCustom ? () => fileRef.current?.click() : undefined}
        title={isCustom ? "Click to upload icon" : undefined}
      >
        {uploading ? (
          <span className={styles.socialIconSpinner}>…</span>
        ) : link.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.icon} alt="" className={styles.socialIconImg} />
        ) : icon?.stroke ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon.path} /></svg>
        ) : icon ? (
          <svg viewBox="0 0 24 24"><path d={icon.path} fill="currentColor" /></svg>
        ) : null}
      </span>
      {isCustom && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      )}
    </>
  );
}

/* ── Social icon upload row (input + button + error as placeholder) ── */
function SocialIconUploadRow({ icon, onIconChange, onUploaded, placeholder }: {
  icon: string;
  onIconChange: (v: string) => void;
  onUploaded: (url: string) => void;
  placeholder: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "icons");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Upload failed");
        return;
      }
      const data = await res.json();
      onUploaded(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.socialIconUpload}>
      <Input
        className={error ? styles.fieldInputError : undefined}
        placeholder={error || placeholder}
        value={icon}
        onChange={(v) => { onIconChange(v); if (error) setError(""); }}
      />
      <Button
        variant="outline"
        shape="circle"
        size="md"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        loading={uploading}
        aria-label="Upload"
        icon={<Upload size={14} strokeWidth={2} />}
        className={styles.socialIconUploadBtn}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

/* ─── About panel inline editors ─────────────────────────────────────────
 * features/process/security 항목을 inline UI (Field + Input + 카드) 로 편집.
 * 각 row 는 카드 박스 안에 필드 stack + 우상단 삭제 버튼. 하단 + 버튼으로 추가. */

type CardEditorShared = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sh: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
};

/* Hero text 줄별 스타일 컨트롤 — color / fontSize / fontWeight / fontFamily.
   ⚙ 버튼 안 Popover (desktop dropdown / mobile bottom sheet 자동 전환) 안에 렌더. */
function TextStyleControls({
  t,
  themeFallback,
  color, onColorChange,
  fontSize, onFontSizeChange,
  fontWeight, onFontWeightChange,
  fontFamily, onFontFamilyChange,
  fontSizeMin = 1,
  fontSizeMax = 20,
  fontSizeStep = 0.25,
}: {
  t: (k: string) => string;
  themeFallback: string;
  color: string;
  onColorChange: (v: string) => void;
  fontSize: string;
  onFontSizeChange: (v: string) => void;
  fontWeight: string;
  onFontWeightChange: (v: string) => void;
  fontFamily: string;
  onFontFamilyChange: (v: string) => void;
  fontSizeMin?: number;
  fontSizeMax?: number;
  fontSizeStep?: number;
}) {
  const sizeNum = parseFloat(fontSize) || (fontSizeMin + fontSizeMax) / 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)", minWidth: "280px" }}>
      <ColorField
        label={t("admin.settings.aboutHeroStyleColor")}
        value={color || themeFallback}
        onChange={onColorChange}
      />
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroStyleSize")}</label>
        <div style={{ display: "flex", gap: "var(--spacing-sm)", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <Slider
              min={fontSizeMin}
              max={fontSizeMax}
              step={fontSizeStep}
              value={[sizeNum]}
              onValueChange={([n]) => onFontSizeChange(`${Math.round(n * 100) / 100}rem`)}
            />
          </div>
          <EditableSliderValue
            value={sizeNum}
            display={(v) => `${v}rem`}
            parse={{ toDraft: (v) => String(v), fromDraft: (s) => parseFloat(s) }}
            onCommit={(n) => onFontSizeChange(`${n}rem`)}
            min={fontSizeMin}
            max={fontSizeMax}
            step={fontSizeStep}
            width={64}
          />
        </div>
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroStyleWeight")}</label>
        <Select
          value={fontWeight || "400"}
          onChange={onFontWeightChange}
          options={[
            { value: "100", label: "100 · Thin" },
            { value: "200", label: "200 · ExtraLight" },
            { value: "300", label: "300 · Light" },
            { value: "400", label: "400 · Regular" },
            { value: "500", label: "500 · Medium" },
            { value: "600", label: "600 · SemiBold" },
            { value: "700", label: "700 · Bold" },
            { value: "800", label: "800 · ExtraBold" },
            { value: "900", label: "900 · Black" },
          ]}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>{t("admin.settings.aboutHeroStyleFamily")}</label>
        <Select
          value={fontFamily || ""}
          onChange={onFontFamilyChange}
          options={[
            { value: "", label: t("admin.settings.aboutHeroDefault") },
            { value: "var(--font-display)", label: "Display (Playfair)" },
            { value: "var(--font-grotesk)", label: "Grotesk (Space Grotesk)" },
            { value: "var(--font-sans)", label: "Sans" },
            { value: "var(--font-serif)", label: "Serif" },
            { value: "var(--font-mono)", label: "Mono" },
            { value: "var(--font-instrument)", label: "Instrument (Italic)" },
          ]}
        />
      </div>
    </div>
  );
}

/* ⚙ 버튼 + Popover wrapper — TextStyleControls 를 안에 렌더.
   Popover trigger span 이 inline-flex 라 부모 flex 안에서 shrink 될 수 있어 className 으로 flex-shrink 0 강제. */
function TextStyleButton({ sheetTitle, children }: { sheetTitle: string; children: React.ReactNode }) {
  return (
    <Popover
      placement="bottom-end"
      sheetTitle={sheetTitle}
      className={styles.textStyleTrigger}
      contentClassName={styles.textStylePopover}
      trigger={
        <button
          type="button"
          className={styles.textStyleBtn}
          aria-label={sheetTitle}
          title={sheetTitle}
        >
          <Sliders size={14} strokeWidth={2} />
        </button>
      }
    >
      {children}
    </Popover>
  );
}

/* 슬라이더 옆 값 표시 — 더블클릭 시 직접 입력 가능. */
function EditableSliderValue({
  value,
  display,
  parse,
  onCommit,
  min,
  max,
  step,
  width = 56,
}: {
  value: number;
  /** 표시용 포맷 (e.g., (v) => `${v}rem`, (v) => `${Math.round(v*100)}%`) */
  display: (v: number) => string;
  /** 입력 시작 시 보여줄 raw 값 + 입력 문자열을 value 단위로 역변환. ([initialDraft, parseFn]) */
  parse: { toDraft: (v: number) => string; fromDraft: (s: string) => number };
  onCommit: (v: number) => void;
  min: number;
  max: number;
  step: number;
  width?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = () => {
    const n = parse.fromDraft(draft);
    if (!isNaN(n)) {
      const clamped = Math.max(min, Math.min(max, n));
      const snapped = Math.round(clamped / step) * step;
      onCommit(Math.round(snapped * 1e6) / 1e6);
    }
    setEditing(false);
  };
  /* span / input 모두 같은 높이 / padding / box-sizing 으로 통일 — 전환 시 행 높이 변동 없음.
     높이는 control-h-xs (24px), 모양은 capsule radius. */
  const shared: React.CSSProperties = {
    width: `${width}px`,
    height: "var(--control-h-xs)",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 var(--spacing-xs)",
    borderRadius: "var(--radius-capsule)",
    fontFamily: "var(--font-space-grotesk)",
    fontSize: "var(--font-size-sm)",
    lineHeight: 1,
  };
  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        style={{
          ...shared,
          textAlign: "right",
          color: "var(--text-primary)",
          border: "var(--border-light)",
          background: "transparent",
          outline: "none",
        }}
      />
    );
  }
  return (
    <span
      onDoubleClick={() => {
        setDraft(parse.toDraft(value));
        setEditing(true);
      }}
      style={{
        ...shared,
        /* span 은 border 없음 → 정렬 맞추려고 1px 투명 border 로 box-size 동일하게 */
        border: "1px solid transparent",
        color: "var(--text-secondary)",
        cursor: "text",
        userSelect: "none",
      }}
      title="더블클릭으로 직접 입력"
    >
      {display(value)}
    </span>
  );
}

function ItemCard({
  children,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div style={{ position: "relative", border: "var(--border-light)", borderRadius: "var(--radius-2xl)", padding: "var(--spacing-md)", display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
      <div style={{ position: "absolute", top: "var(--spacing-sm)", right: "var(--spacing-sm)" }}>
        <Button variant="outline" size="2xs" onClick={onRemove}>{removeLabel}</Button>
      </div>
      {children}
    </div>
  );
}

type OverviewStat = NonNullable<SiteConfigData["about"]["overview_stats"]>[number];

function AboutOverviewEditor({
  descriptionKo,
  descriptionEn,
  highlights,
  stats,
  onChange,
  t,
  sh,
  styles,
}: {
  descriptionKo: string;
  descriptionEn: string;
  highlights: string;
  stats: OverviewStat[];
  onChange: (patch: Partial<{ overview_description_ko: string; overview_description_en: string; overview_highlights: string; overview_stats: OverviewStat[] }>) => void;
} & CardEditorShared) {
  return (
    <section className={`${styles.section} ${styles.sectionWide}`}>
      <SectionHeader title={t("admin.settings.aboutOverview")} paths={["about.overview_description_ko","about.overview_description_en","about.overview_highlights","about.overview_stats"]} {...sh} />
      <p className={styles.sectionHint}>{t("admin.settings.aboutOverviewHint")}</p>
      <div className={styles.fields}>
        <div className={styles.fieldPair}>
          <Field label={t("admin.settings.aboutOverviewDesc")} langBadge="en" value={descriptionEn} onChange={(v) => onChange({ overview_description_en: v })} multiline />
          <Field label={t("admin.settings.aboutOverviewDesc")} langBadge="ko" value={descriptionKo} onChange={(v) => onChange({ overview_description_ko: v })} multiline />
        </div>
        <TagListField
          label={t("admin.settings.aboutOverviewHighlights")}
          value={highlights}
          onChange={(v) => onChange({ overview_highlights: v })}
          placeholder={t("admin.settings.tagPlaceholder")}
          separator=", "
          commaAsAdd
          size="md"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
          <span className={styles.fieldLabel}>{t("admin.settings.aboutOverviewStats")}</span>
          {/* compact row 레이아웃 — [value] [EN label] [KO label] [×]. ItemCard 6개로 늘리지 않고 한 줄씩. */}
          {stats.map((stat, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(80px, 0.6fr) 2fr 2fr auto", gap: "var(--spacing-xs)", alignItems: "center" }}>
              <Input
                value={stat.value}
                onChange={(v) => { const next = [...stats]; next[idx] = { ...next[idx], value: v }; onChange({ overview_stats: next }); }}
                placeholder="50+"
              />
              <Input
                value={stat.label_en}
                onChange={(v) => { const next = [...stats]; next[idx] = { ...next[idx], label_en: v }; onChange({ overview_stats: next }); }}
                placeholder="EN label"
              />
              <Input
                value={stat.label_ko}
                onChange={(v) => { const next = [...stats]; next[idx] = { ...next[idx], label_ko: v }; onChange({ overview_stats: next }); }}
                placeholder="KO 라벨"
              />
              <Button
                variant="outline"
                size="2xs"
                onClick={() => onChange({ overview_stats: stats.filter((_, i) => i !== idx) })}
                aria-label="remove"
              >×</Button>
            </div>
          ))}
          <div>
            <Button variant="outline" size="sm" onClick={() => onChange({ overview_stats: [...stats, { value: "", label_ko: "", label_en: "" }] })}>
              + {t("admin.settings.aboutTechStackAdd")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

type ArchitectureItem = { path: string; description_ko: string; description_en: string; indent: number };

function AboutArchitectureEditor({ value, onChange, t, sh, styles }: { value: ArchitectureItem[]; onChange: (v: ArchitectureItem[]) => void } & CardEditorShared) {
  const setItem = (idx: number, patch: Partial<ArchitectureItem>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const moveItem = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  return (
    <section className={`${styles.section} ${styles.sectionWide}`}>
      <SectionHeader title={t("admin.settings.aboutArchitecture")} paths={["about.architectureItems"]} {...sh} />
      <p className={styles.sectionHint}>{t("admin.settings.aboutArchitectureHint")}</p>
      <div className={styles.fields}>
        {/* compact row 레이아웃 — 25+ 항목이라 ItemCard 로 늘리면 너무 길어짐.
            한 줄 = [indent select] [path] [en desc] [ko desc] [↑] [↓] [×] */}
        {value.map((item, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "auto 1.2fr 2fr 2fr auto", gap: "var(--spacing-xs)", alignItems: "center", paddingBlock: "var(--spacing-2xs)" }}>
            <Select
              value={String(item.indent)}
              onChange={(v) => setItem(idx, { indent: parseInt(v, 10) })}
              options={[
                { value: "0", label: "L0" },
                { value: "1", label: "L1" },
                { value: "2", label: "L2" },
              ]}
            />
            <Input value={item.path} onChange={(v) => setItem(idx, { path: v })} placeholder="src/" />
            <Input value={item.description_en} onChange={(v) => setItem(idx, { description_en: v })} placeholder="EN description" />
            <Input value={item.description_ko} onChange={(v) => setItem(idx, { description_ko: v })} placeholder="KO 설명" />
            <div style={{ display: "flex", gap: "var(--spacing-2xs)" }}>
              <Button variant="outline" size="2xs" onClick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label="up">↑</Button>
              <Button variant="outline" size="2xs" onClick={() => moveItem(idx, 1)} disabled={idx === value.length - 1} aria-label="down">↓</Button>
              <Button variant="outline" size="2xs" onClick={() => onChange(value.filter((_, i) => i !== idx))} aria-label="remove">×</Button>
            </div>
          </div>
        ))}
        <div>
          <Button variant="outline" size="sm" onClick={() => onChange([...value, { path: "", description_ko: "", description_en: "", indent: 1 }])}>
            + {t("admin.settings.aboutTechStackAdd")}
          </Button>
        </div>
      </div>
    </section>
  );
}

type FeatureItem = NonNullable<SiteConfigData["about"]["features"]>[number];

function AboutFeaturesEditor({ value, onChange, t, sh, styles }: { value: FeatureItem[]; onChange: (v: FeatureItem[]) => void } & CardEditorShared) {
  const setItem = (idx: number, patch: Partial<FeatureItem>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  /* CoverImagePicker 토글 — 한 번에 하나만 열림 (idx 또는 null) */
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  return (
    <section className={`${styles.section} ${styles.sectionWide}`}>
      <SectionHeader title={t("admin.settings.aboutFeatures")} paths={["about.features"]} {...sh} />
      <p className={styles.sectionHint}>{t("admin.settings.aboutFeaturesHint")}</p>
      <div className={styles.fields}>
        {value.map((item, idx) => (
          <ItemCard key={idx} onRemove={() => onChange(value.filter((_, i) => i !== idx))} removeLabel={t("admin.settings.aboutTechStackRemove")}>
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutItemIcon")} value={item.icon} onChange={(v) => setItem(idx, { icon: v })} placeholder="01" />
              <Field label={t("admin.settings.aboutItemTitle")} value={item.title} onChange={(v) => setItem(idx, { title: v })} />
            </div>
            <Field label={t("admin.settings.aboutFeaturesTech")} value={item.tech} onChange={(v) => setItem(idx, { tech: v })} placeholder="GSAP, Lenis, ..." />
            {/* 이미지 — CoverImagePicker 로 선택 (preset / Unsplash / Pexels / AI 등) */}
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>{t("admin.settings.aboutFeaturesImage")}</label>
              <div style={{ display: "flex", gap: "var(--spacing-md)", alignItems: "center" }}>
                {item.image && (
                  <div style={{ width: 160, height: 90, borderRadius: "var(--radius-2xl)", overflow: "hidden", border: "var(--border-light)", flexShrink: 0, background: "var(--bg-tertiary)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)", alignItems: "stretch" }}>
                  <Button variant="outline" size="sm" onClick={() => setPickerIdx(pickerIdx === idx ? null : idx)}>
                    {pickerIdx === idx ? t("admin.posts.seriesModal.closePicker") : t("admin.posts.seriesModal.chooseCover")}
                  </Button>
                  {item.image && (
                    <Button variant="outline" size="sm" onClick={() => setItem(idx, { image: "" })}>
                      {t("admin.settings.aboutHeroBgClear")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {pickerIdx === idx && (
              <CoverImagePicker
                onSelect={(url) => { setItem(idx, { image: url }); setPickerIdx(null); }}
                onClose={() => setPickerIdx(null)}
                currentUrl={item.image}
                postContext={{ title: item.title, tags: item.tech.split(",").map((s) => s.trim()).filter(Boolean), excerpt: item.description_en }}
              />
            )}
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutItemDesc")} langBadge="en" value={item.description_en} onChange={(v) => setItem(idx, { description_en: v })} multiline />
              <Field label={t("admin.settings.aboutItemDesc")} langBadge="ko" value={item.description_ko} onChange={(v) => setItem(idx, { description_ko: v })} multiline />
            </div>
          </ItemCard>
        ))}
        <div>
          <Button variant="outline" size="sm" onClick={() => onChange([...value, { icon: "", title: "", description_ko: "", description_en: "", tech: "", image: "" }])}>
            + {t("admin.settings.aboutTechStackAdd")}
          </Button>
        </div>
      </div>
    </section>
  );
}

type ProcessItem = NonNullable<SiteConfigData["about"]["process"]>[number];

function AboutProcessEditor({ value, onChange, t, sh, styles }: { value: ProcessItem[]; onChange: (v: ProcessItem[]) => void } & CardEditorShared) {
  const setItem = (idx: number, patch: Partial<ProcessItem>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  return (
    <section className={`${styles.section} ${styles.sectionWide}`}>
      <SectionHeader title={t("admin.settings.aboutProcess")} paths={["about.process"]} {...sh} />
      <p className={styles.sectionHint}>{t("admin.settings.aboutProcessHint")}</p>
      <div className={styles.fields}>
        {value.map((item, idx) => (
          <ItemCard key={idx} onRemove={() => onChange(value.filter((_, i) => i !== idx))} removeLabel={t("admin.settings.aboutTechStackRemove")}>
            <Field label={t("admin.settings.aboutProcessStep")} value={item.step} onChange={(v) => setItem(idx, { step: v })} placeholder="01" />
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutItemTitle")} langBadge="en" value={item.title_en} onChange={(v) => setItem(idx, { title_en: v })} />
              <Field label={t("admin.settings.aboutItemTitle")} langBadge="ko" value={item.title_ko} onChange={(v) => setItem(idx, { title_ko: v })} />
            </div>
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutItemDesc")} langBadge="en" value={item.description_en} onChange={(v) => setItem(idx, { description_en: v })} multiline />
              <Field label={t("admin.settings.aboutItemDesc")} langBadge="ko" value={item.description_ko} onChange={(v) => setItem(idx, { description_ko: v })} multiline />
            </div>
          </ItemCard>
        ))}
        <div>
          <Button variant="outline" size="sm" onClick={() => onChange([...value, { step: "", title_ko: "", title_en: "", description_ko: "", description_en: "" }])}>
            + {t("admin.settings.aboutTechStackAdd")}
          </Button>
        </div>
      </div>
    </section>
  );
}

type SecurityItem = NonNullable<SiteConfigData["about"]["security"]>[number];

function AboutSecurityEditor({ value, onChange, t, sh, styles }: { value: SecurityItem[]; onChange: (v: SecurityItem[]) => void } & CardEditorShared) {
  const setItem = (idx: number, patch: Partial<SecurityItem>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  return (
    <section className={`${styles.section} ${styles.sectionWide}`}>
      <SectionHeader title={t("admin.settings.aboutSecurity")} paths={["about.security"]} {...sh} />
      <p className={styles.sectionHint}>{t("admin.settings.aboutSecurityHint")}</p>
      <div className={styles.fields}>
        {value.map((item, idx) => (
          <ItemCard key={idx} onRemove={() => onChange(value.filter((_, i) => i !== idx))} removeLabel={t("admin.settings.aboutTechStackRemove")}>
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutSecurityLayer")} value={item.layer} onChange={(v) => setItem(idx, { layer: v })} placeholder="SQL Injection" />
              <Field label={t("admin.settings.aboutItemIcon")} value={item.icon} onChange={(v) => setItem(idx, { icon: v })} placeholder="db, shield, lock, ..." />
            </div>
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutItemTitle")} langBadge="en" value={item.title_en} onChange={(v) => setItem(idx, { title_en: v })} />
              <Field label={t("admin.settings.aboutItemTitle")} langBadge="ko" value={item.title_ko} onChange={(v) => setItem(idx, { title_ko: v })} />
            </div>
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutItemDesc")} langBadge="en" value={item.description_en} onChange={(v) => setItem(idx, { description_en: v })} multiline />
              <Field label={t("admin.settings.aboutItemDesc")} langBadge="ko" value={item.description_ko} onChange={(v) => setItem(idx, { description_ko: v })} multiline />
            </div>
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.aboutSecurityScope")} langBadge="en" value={item.scope_en} onChange={(v) => setItem(idx, { scope_en: v })} />
              <Field label={t("admin.settings.aboutSecurityScope")} langBadge="ko" value={item.scope_ko} onChange={(v) => setItem(idx, { scope_ko: v })} />
            </div>
          </ItemCard>
        ))}
        <div>
          <Button variant="outline" size="sm" onClick={() => onChange([...value, { layer: "", icon: "", title_ko: "", title_en: "", description_ko: "", description_en: "", scope_ko: "", scope_en: "" }])}>
            + {t("admin.settings.aboutTechStackAdd")}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ── Tech stack — chip 형태 + 프리셋(아이콘) 추가 + 아이콘 편집(검색/업로드/링크) ── */
function AboutTechStackEditor({ items, onChange, t, styles }: {
  items: TechItem[];
  onChange: (v: TechItem[]) => void;
  t: (key: string) => string;
  styles: Record<string, string>;
}) {
  const patch = (idx: number, p: Partial<TechItem>) => onChange(items.map((it, i) => (i === idx ? { ...it, ...p } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = (it: TechItem) => onChange([...items, it]);
  // 기존 항목에서 실제 쓰이는 카테고리 — 카테고리 입력 제안에 우선 노출
  const currentCats = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  // ── 칩 drag&drop 으로 그룹(카테고리) 이동 ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const handleDragEnd = (e: DragEndEvent) => {
    setDragIdx(null);
    const { active, over } = e;
    if (!over) return;
    const idx = Number(String(active.id).replace("techchip:", ""));
    const targetCat = String(over.id).replace("techgroup:", "");
    if (Number.isNaN(idx) || !items[idx]) return;
    if ((items[idx].category || "") !== targetCat) {
      onChange(items.map((it, i) => (i === idx ? { ...it, category: targetCat } : it)));
    }
  };

  // 카테고리별 그룹화 (등장 순서 보존). 무카테고리는 "" 그룹.
  const order: string[] = [];
  const groups = new Map<string, { item: TechItem; idx: number }[]>();
  items.forEach((item, idx) => {
    const key = item.category || "";
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push({ item, idx });
  });

  const renderChip = (item: TechItem, idx: number) => (
    <Popover
      key={idx}
      placement="bottom-start"
      sheetTitle={item.name || "Tech"}
      trigger={
        <Chip
          leftIcon={
            <span className={styles.techIconTile}>
              <TechIcon icon={item.icon} name={item.name} styles={styles} />
            </span>
          }
          onRemove={() => remove(idx)}
        >
          {item.name || "—"}
        </Chip>
      }
    >
      <TechEditPanel item={item} onChange={(p) => patch(idx, p)} currentCats={currentCats} t={t} styles={styles} />
    </Popover>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setDragIdx(Number(String(e.active.id).replace("techchip:", "")))} onDragEnd={handleDragEnd} onDragCancel={() => setDragIdx(null)}>
      <div className={styles.techGroups}>
        {order.map((cat) => (
          <DroppableTechGroup key={cat || "__none"} cat={cat} styles={styles}>
            {cat && <span className={styles.techGroupLabel}>{cat}</span>}
            <div className={styles.techChips}>
              {groups.get(cat)!.map(({ item, idx }) => (
                <DraggableTechChip key={idx} idx={idx} styles={styles}>
                  {renderChip(item, idx)}
                </DraggableTechChip>
              ))}
            </div>
          </DroppableTechGroup>
        ))}

        <div className={styles.techAddRow}>
          <Popover
            placement="bottom-start"
            sheetTitle={t("admin.settings.aboutTechStackAdd")}
            trigger={
              <Button variant="ghost" size="xs" icon={<Plus size={14} strokeWidth={2.5} />}>
                {t("admin.settings.aboutTechStackAdd")}
              </Button>
            }
          >
            <TechAddPanel existing={items} onAdd={add} currentCats={currentCats} t={t} styles={styles} />
          </Popover>
        </div>
      </div>
      <DragOverlay>
        {dragIdx != null && items[dragIdx] ? (
          <span className={styles.techDragOverlay}>
            <span className={styles.techIconTile}>
              <TechIcon icon={items[dragIdx].icon} name={items[dragIdx].name} styles={styles} />
            </span>
            {items[dragIdx].name || "—"}
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* drag 가능한 칩 wrapper — listeners 는 wrapper 에. activationConstraint(distance) 로 클릭(Popover)과 공존 */
function DraggableTechChip({ idx, children, styles }: { idx: number; children: React.ReactNode; styles: Record<string, string> }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `techchip:${idx}` });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`${styles.techDragWrap} ${isDragging ? styles.techDragSource : ""}`}>
      {children}
    </div>
  );
}

/* drop 가능한 그룹 — 위에 드래그하면 하이라이트, drop 시 해당 카테고리로 이동 */
function DroppableTechGroup({ cat, children, styles }: { cat: string; children: React.ReactNode; styles: Record<string, string> }) {
  const { setNodeRef, isOver } = useDroppable({ id: `techgroup:${cat}` });
  return (
    <div ref={setNodeRef} className={`${styles.techGroup} ${isOver ? styles.techGroupOver : ""}`}>
      {children}
    </div>
  );
}

/* tech 아이콘 업로드 — /api/admin/upload (folder: icons) */
async function uploadTechIcon(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "icons");
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.url ?? null;
}

/* 프리셋 grid — 검색 필터 + 클릭 시 onPick */
function TechPresetGrid({ query, onPick, styles, isAdded, t }: {
  query: string;
  onPick: (p: { slug: string; name: string; category: string }) => void;
  styles: Record<string, string>;
  /** 이미 추가된 항목 — 중복 추가 방지 (비활성 + 체크 표시) */
  isAdded?: (p: TechPreset) => boolean;
  t?: (key: string) => string;
}) {
  const list = TECH_PRESETS.filter((p) => matchTech(p, query));
  if (list.length === 0) return <div className={styles.techPresetEmpty}>검색 결과 없음</div>;
  return (
    <div className={styles.techPresetScroll}>
      <div className={styles.techPresetList}>
        {list.map((p) => {
          const added = isAdded?.(p) ?? false;
          return (
            <button
              key={p.name}
              type="button"
              className={`${styles.techPresetRow} ${added ? styles.techPresetRowAdded : ""}`}
              onClick={() => { if (!added) onPick(p); }}
              disabled={added}
              title={added ? (t?.("admin.settings.aboutTechStackAdded") ?? "Added") : p.name}
            >
              <span className={styles.techIconTile}>
                <TechIcon icon={p.slug} name={p.name} styles={styles} />
              </span>
              <span className={styles.techPresetRowName}>{p.name}</span>
              {added
                ? <Check size={13} strokeWidth={2.5} className={styles.techPresetCheck} />
                : <span className={styles.techPresetRowCat}>{p.category}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 아이콘 편집 공용 — circle 미리보기(클릭=업로드/교체) + 링크 + (옵션)프리셋 검색.
   showSearch=false 면 검색 숨김 (직접 추가용 — 검색되는 건 프리셋으로 추가하면 됨). */
function TechIconEditor({ icon, onIconChange, t, styles, showSearch = true }: {
  icon: string;
  onIconChange: (icon: string) => void;
  t: (key: string) => string;
  styles: Record<string, string>;
  showSearch?: boolean;
}) {
  const [q, setQ] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const src = techIconSrc(icon);

  const handleFile = async (file: File) => {
    setUploading(true);
    const url = await uploadTechIcon(file);
    setUploading(false);
    if (url) onIconChange(url);
  };

  return (
    <>
      <div className={styles.techIconRow}>
        <div className={styles.techIconCircleWrap}>
          <button
            type="button"
            className={styles.techIconCircleBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title={t("admin.settings.aboutTechStackIconHint")}
            aria-label={t("admin.settings.aboutTechStackIconHint")}
          >
            {uploading
              ? <span className={styles.techIconSpinner} />
              : src
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={src} alt="" />
                : <Plus size={16} strokeWidth={2} />}
          </button>
          {icon && !uploading && (
            <button
              type="button"
              className={styles.techIconClear}
              onClick={() => onIconChange("")}
              aria-label={t("admin.settings.aboutTechStackRemove")}
            >
              <X size={9} strokeWidth={3} />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
        <Input
          value={link}
          onChange={setLink}
          placeholder={t("admin.settings.aboutTechStackIconUrl")}
          size="sm"
          onAdd={(v) => { const u = v.trim(); if (u) { onIconChange(u); setLink(""); } }}
        />
      </div>
      {showSearch && (
        <>
          <Input value={q} onChange={setQ} placeholder={t("admin.settings.aboutTechStackSearch")} size="sm" clearable />
          {q.trim() && <TechPresetGrid query={q} onPick={(p) => { onIconChange(p.slug); setQ(""); }} styles={styles} />}
        </>
      )}
    </>
  );
}

/* 추가 패널 — 프리셋 표 + 직접 입력(이름·카테고리·아이콘) */
function TechAddPanel({ existing, onAdd, currentCats, t, styles }: {
  existing: TechItem[];
  onAdd: (it: TechItem) => void;
  currentCats: string[];
  t: (key: string) => string;
  styles: Record<string, string>;
}) {
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<TechItem>({ name: "", category: "", icon: "" });
  const has = (name: string) => existing.some((e) => e.name.toLowerCase() === name.toLowerCase());
  const isDup = !!draft.name.trim() && has(draft.name.trim());
  const canAdd = !!draft.name.trim() && !isDup;
  const submitCustom = () => {
    if (!canAdd) return;
    onAdd({ name: draft.name.trim(), category: draft.category.trim(), icon: draft.icon ?? "" });
    setDraft({ name: "", category: "", icon: "" });
  };

  return (
    <div className={styles.techPanel}>
      <p className={styles.techPanelTitle}>{t("admin.settings.aboutTechStackPresetTitle")}</p>
      <Input value={q} onChange={setQ} placeholder={t("admin.settings.aboutTechStackSearch")} size="sm" clearable />
      <TechPresetGrid
        query={q}
        onPick={(p) => { if (!has(p.name)) onAdd({ name: p.name, category: p.category, icon: p.slug }); }}
        isAdded={(p) => has(p.name)}
        t={t}
        styles={styles}
      />
      {/* 직접 추가 — sticky footer (프리셋 스크롤해도 항상 보임). 검색은 없음(프리셋으로 추가). */}
      <div className={styles.techCustomFooter}>
        <p className={styles.techPanelTitle}>{t("admin.settings.aboutTechStackCustomTitle")}</p>
        <Input value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder={t("admin.settings.aboutTechStackName")} size="sm" />
        {isDup && <p className={styles.techAddDupHint}>{t("admin.settings.aboutTechStackDupHint")}</p>}
        <CategoryInput value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} currentCats={currentCats} t={t} />
        <TechIconEditor icon={draft.icon ?? ""} onIconChange={(icon) => setDraft((d) => ({ ...d, icon }))} t={t} styles={styles} showSearch={false} />
        <Button variant="primary" size="xs" fullWidth disabled={!canAdd} onClick={submitCustom} icon={<Plus size={14} strokeWidth={2.5} />}>
          {t("admin.settings.aboutTechStackAdd")}
        </Button>
      </div>
    </div>
  );
}

/* 편집 패널 — 이름/카테고리 + 아이콘 */
function TechEditPanel({ item, onChange, currentCats, t, styles }: {
  item: TechItem;
  onChange: (p: Partial<TechItem>) => void;
  currentCats: string[];
  t: (key: string) => string;
  styles: Record<string, string>;
}) {
  return (
    <div className={styles.techPanel}>
      <Input value={item.name} onChange={(v) => onChange({ name: v })} placeholder={t("admin.settings.aboutTechStackName")} size="sm" />
      <CategoryInput value={item.category} onChange={(v) => onChange({ category: v })} currentCats={currentCats} t={t} />
      <hr className={styles.techDivider} />
      <p className={styles.techPanelTitle}>{t("admin.settings.aboutTechStackIcon")}</p>
      <TechIconEditor icon={item.icon ?? ""} onIconChange={(icon) => onChange({ icon })} t={t} styles={styles} />
    </div>
  );
}
