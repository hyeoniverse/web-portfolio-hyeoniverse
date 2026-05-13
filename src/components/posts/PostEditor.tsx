"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronRight, ExternalLink } from "lucide-react";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import { stripHtml } from "@/utils/htmlUtils";
import type { Post, PostFormData, Series } from "@/types/post";
import SeriesInlineEditor from "@/app/admin/(dashboard)/settings/_components/SeriesInlineEditor";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import { useRevisions } from "@/hooks/useRevisions";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useEditorTranslation } from "@/hooks/useEditorTranslation";
import EditorToggle from "./EditorToggle";
import MarkdownEditor, { extractMarkdownImages } from "./MarkdownEditor";
import CoverImagePicker from "./CoverImagePicker";
import SeoChecklist from "@/components/admin/SeoChecklist";
import RelationPicker from "@/components/admin/RelationPicker";
import SortOrderDragList from "@/components/admin/SortOrderDragList";
import CoverImageField from "@/components/admin/CoverImageField";
import DateTimePicker from "@/components/ui/DatePicker/DateTimePicker";
import CloseIcon from "@/components/ui/CloseIcon";
import { motion, AnimatePresence } from "framer-motion";
import { postProcessMarkedHtml } from "./postProcessMarkedHtml";
import { generateSlug, validateSlug } from "@/utils/postSlug";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { useTagInput } from "@/hooks/useTagInput";
import { usePostSeries } from "@/hooks/usePostSeries";
import TagsList from "./TagsList";
import ShortcutsModalContent from "./ShortcutsModal";
import styles from "./PostEditor.module.css";
import "./PostEditor.global.css";


const Editor = dynamic(() => import("./PlateEditor"), {
  ssr: false,
  loading: () => (
    <div className={styles.editorSkeletonFrame}>
      <div className={styles.editorSkeletonToolbar}>
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
      </div>
      <div className={styles.editorSkeleton}>
        <div className={styles.editorSkeletonBar} style={{ width: "60%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "90%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "75%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "85%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "40%" }} />
      </div>
    </div>
  ),
});

const ImagePanel = dynamic(
  () => import("./PlateEditor").then((m) => ({ default: m.ImagePanel })),
  { ssr: false },
);

import type { PlateEditorHandle, EditorImageInfo } from "./PlateEditor";

interface PostEditorProps {
  post?: Post;
}

import { POST_TEMPLATES } from "@/data/postTemplates";
import type { PostTemplate } from "@/data/postTemplates";

export default function PostEditor({ post }: PostEditorProps) {
  const router = useRouter();
  const { tLang, language } = useLanguage();
  const config = useSiteConfig();
  const mediaLimits = (config.media as Record<string, unknown>)?.limits as Record<string, number> | undefined;
  const isEdit = !!post;
  const categories = useCategories();
  const serviceStatus = useServiceStatus();
  // 카테고리 ko 또는 en 값으로 매칭
  const findCat = (val: string): BilingualCategory | undefined =>
    categories.find((c) => c.ko === val || c.en === val);
  const isManagedCat = (val: string) => !!findCat(val);

  const POST_FIELD_KEYS = ["title", "content", "excerpt"];

  const postFieldMapper = useCallback(
    (lang: "ko" | "en") => {
      const isToEn = lang === "en";
      return [
        { key: "title", sourceKey: isToEn ? "title" : "title_en", targetKey: isToEn ? "title_en" : "title" },
        { key: "content", sourceKey: isToEn ? "content" : "content_en", targetKey: isToEn ? "content_en" : "content" },
        { key: "excerpt", sourceKey: isToEn ? "excerpt" : "excerpt_en", targetKey: isToEn ? "excerpt_en" : "excerpt" },
      ];
    },
    [],
  );

  const [form, setForm] = useState<PostFormData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    content: post?.content ?? "",
    content_type: post?.content_type ?? "markdown",
    excerpt: post?.excerpt ?? "",
    cover_image: post?.cover_image ?? "",
    tags: post?.tags ?? [],
    category: post?.category || "",
    is_pinned: post?.is_pinned ?? false,
    published: post?.published ?? false,
    language: post?.language ?? "ko",
    title_en: post?.title_en ?? "",
    content_en: post?.content_en ?? "",
    excerpt_en: post?.excerpt_en ?? "",
    series_id: post?.series_id ?? null,
    series_order: post?.series_order ?? 0,
    github_url: post?.github_url ?? "",
    scheduled_at: post?.scheduled_at ?? null,
    related_work_ids: [],
  });

  // 직접 입력 모드 — 사용자가 "직접 입력" 선택 시 활성화. form.category 가 비어도 input 유지
  const [categoryCustomMode, setCategoryCustomMode] = useState(false);

  /** 연결된 works 목록 — 편집기 진입 시 한 번 fetch */
  const [allWorks, setAllWorks] = useState<Array<{ id: string; title: string; year: string; image: string; published: boolean; category_ko?: string }>>([]);
  useEffect(() => {
    fetch("/api/works?all=true&limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.works)) setAllWorks(d.works);
      })
      .catch(() => {});
  }, []);

  // 편집 모드일 때 기존 관계 불러오기
  useEffect(() => {
    if (!post?.id) return;
    fetch(`/api/admin/posts/${post.id}/related-works`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.items)) {
          setForm((prev) => ({ ...prev, related_work_ids: d.items.map((w: { id: string }) => w.id) }));
        }
      })
      .catch(() => {});
  }, [post?.id]);

  // Auto-correct ONLY when category is empty — 직접 입력한 커스텀 카테고리/모드는 유지
  useEffect(() => {
    if (categories.length === 0) return;
    if (categoryCustomMode) return;
    if (!form.category) {
      const fallback = categories.find((c) => c.ko === "기타")?.ko ?? categories[0]?.ko ?? "";
      setForm((prev) => ({ ...prev, category: fallback }));
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const { openModal, closeAll } = useModalStore();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingSummary, setRegeneratingSummary] = useState(false);
  const [status, setStatusRaw] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [statusTimestamp, setStatusTimestamp] = useState<number | undefined>(undefined);
  const setStatus = useCallback((s: string) => { setStatusRaw(s); setStatusTimestamp(undefined); }, []);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const {
    editorLang,
    translating,
    handleEditorLangChange,
    handleRetranslate,
  } = useEditorTranslation({
    form: form as unknown as Record<string, unknown>,
    tLang,
    i18nPrefix: "admin.posts.editor",
    fieldMapper: postFieldMapper,
    allFieldKeys: POST_FIELD_KEYS,
    onUpdate: (patch) => setForm((prev) => ({ ...prev, ...patch })),
    onStatus: (msg, type) => { setStatus(msg); setStatusType(type); },
    onError: setError,
  });

  const te = useCallback(
    (key: string) => tLang(`admin.posts.editor.${key}`, editorLang),
    [tLang, editorLang],
  );
  const [optionalOpen, setOptionalOpen] = useState(false);
  const optionalInnerRef = useRef<HTMLDivElement>(null);
  const optionalContentRef = useRef<HTMLDivElement>(null);

  /** SEO 체크리스트 항목 클릭 → 해당 필드로 스크롤 + 포커스 + label 색을 accent 로 + dot 표시.
   *  강조된 필드 외부에서 다음 인터랙션(클릭/포커스)이 일어나면 강조 해제. */
  const activeSeoLabelRef = useRef<HTMLElement | null>(null);
  const activeSeoFieldRef = useRef<HTMLElement | null>(null);
  const seoCleanupRef = useRef<(() => void) | null>(null);

  const clearSeoHighlight = useCallback(() => {
    if (activeSeoLabelRef.current) {
      activeSeoLabelRef.current.classList.remove("seo-flash");
      activeSeoLabelRef.current = null;
    }
    activeSeoFieldRef.current = null;
    if (seoCleanupRef.current) {
      seoCleanupRef.current();
      seoCleanupRef.current = null;
    }
  }, []);

  // 컴포넌트 unmount 시 document 리스너 정리
  useEffect(() => () => {
    if (seoCleanupRef.current) seoCleanupRef.current();
  }, []);

  const handleSeoItemClick = useCallback((id: "title" | "slug" | "excerpt" | "cover" | "category" | "tags") => {
    // category 는 시리즈와 같은 always-visible row 로 옮겨졌으므로 optional 펼침 불필요
    const inOptional = id === "excerpt" || id === "cover" || id === "tags";
    if (inOptional) setOptionalOpen(true);
    const scrollAndHighlight = () => {
      const el = document.querySelector<HTMLElement>(`[data-seo="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLElement>("input, textarea, select, button");
      input?.focus({ preventScroll: true });
      const label = el.querySelector<HTMLElement>("label");
      if (!label) return;

      // 이전 활성 label 의 강조 제거 + 기존 리스너 정리 → transition 으로 자연스럽게 페이드 아웃
      if (activeSeoLabelRef.current && activeSeoLabelRef.current !== label) {
        activeSeoLabelRef.current.classList.remove("seo-flash");
      }
      if (seoCleanupRef.current) {
        seoCleanupRef.current();
        seoCleanupRef.current = null;
      }

      // 새 highlight 적용
      label.classList.add("seo-flash");
      activeSeoLabelRef.current = label;
      activeSeoFieldRef.current = el;

      // 강조된 필드 외부에서 인터랙션 발생 시 해제 — 현재 클릭 이벤트가 잡히지 않도록 한 프레임 지연
      requestAnimationFrame(() => {
        const onOutside = (e: Event) => {
          const target = e.target as Node | null;
          if (activeSeoFieldRef.current && target && activeSeoFieldRef.current.contains(target)) return;
          clearSeoHighlight();
        };
        document.addEventListener("pointerdown", onOutside, true);
        document.addEventListener("focusin", onOutside, true);
        seoCleanupRef.current = () => {
          document.removeEventListener("pointerdown", onOutside, true);
          document.removeEventListener("focusin", onOutside, true);
        };
      });
    };
    if (inOptional) requestAnimationFrame(() => requestAnimationFrame(scrollAndHighlight));
    else scrollAndHighlight();
  }, [clearSeoHighlight]);

  useEffect(() => {
    const inner = optionalInnerRef.current;
    const content = optionalContentRef.current;
    if (!inner || !content) return;
    const update = () => {
      if (optionalOpen) {
        // box-sizing: border-box 라서 max-height 가 padding 까지 포함하는 총 높이.
        // inner.scrollHeight 만 쓰면 padding-bottom 만큼 마지막 항목이 잘림 → 명시적으로 더해줌.
        const cs = getComputedStyle(content);
        const pad = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
        content.style.setProperty("--_content-height", `${inner.scrollHeight + pad}px`);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [optionalOpen]);

  // 에디터 ref + 첨부 이미지
  const plateRef = useRef<PlateEditorHandle>(null);
  const [editorImages, setEditorImages] = useState<EditorImageInfo[]>([]);
  // 초기 로드 후 이미지 목록 동기화 (에디터 준비될 때까지 polling)
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const imgs = plateRef.current?.getImages();
      if (!cancelled && imgs !== undefined) {
        setEditorImages(imgs);
        // 이미지가 있거나 충분히 시도했으면 중단
        if (imgs.length > 0 || attempts >= 10) clearInterval(poll);
      }
    }, 300);
    return () => { cancelled = true; clearInterval(poll); };
  }, [editorLang, form.content_type]);
  const [slugManual, setSlugManual] = useState(isEdit);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  // 닫는 중 — coverPickerCollapse 애니메이션 (~0.45s) 끝난 뒤 unmount.
  // showCoverPicker 만 false 로 즉시 두면 컴포넌트가 사라져 닫는 애니메이션이 보이지 않음
  const [closingCoverPicker, setClosingCoverPicker] = useState(false);
  const closeCoverPickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestCloseCoverPicker = useCallback(() => {
    if (closeCoverPickerTimer.current) clearTimeout(closeCoverPickerTimer.current);
    setClosingCoverPicker(true);
    closeCoverPickerTimer.current = setTimeout(() => {
      setShowCoverPicker(false);
      setClosingCoverPicker(false);
      closeCoverPickerTimer.current = null;
    }, 450);
  }, []);
  useEffect(() => () => {
    if (closeCoverPickerTimer.current) clearTimeout(closeCoverPickerTimer.current);
  }, []);
  const [showMdHelp, setShowMdHelp] = useState(false);
  const initialFormRef = useRef(form);
  const formRef = useRef(form);
  formRef.current = form;
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  // 새 글도 DB revision 저장을 위해 임시 ID 사용
  const draftEntityId = post?.id ?? "draft-new-post";
  const { revisions: dbRevisions, saveRevision, loadRevisionSnapshot, deleteRevision, dismissRevision } = useRevisions<PostFormData>({
    entityType: "post",
    entityId: draftEntityId,
  });

  // 편집기 진입 시 DB revision 복원 확인
  // 최신 non-dismissed revision(B)이 저장된 데이터(A)와 다르면 한 번만 물어봄
  // 무시 → B dismissed, A 유지 / 불러오기 → B dismissed, B 적용
  const draftAsked = useRef(false);
  // 비동기 fetch 중에 unmount/navigation 발생하면 모달이 다른 페이지에 뜨는 문제 방지
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (draftAsked.current) return;
    if (dbRevisions.length === 0) return;
    const latest = dbRevisions.find((r) => !r.dismissed);
    if (!latest) return;
    const initialJson = JSON.stringify(initialFormRef.current);
    draftAsked.current = true;
    loadRevisionSnapshot(latest.id).then((snapshot) => {
      if (!snapshot) return;
      if (!mountedRef.current) return; // 다른 페이지로 이동했으면 모달 띄우지 않음
      if (JSON.stringify(snapshot) === initialJson) return;
      // 사용자가 이미 폼을 수정했다면 (자동으로 이미 선택을 했다고 판단) 모달 띄우지 않음
      if (JSON.stringify(formRef.current) !== initialJson) {
        dismissRevision(latest.id);
        return;
      }

      openModal(
        <ModalConfirm
          desc={te("draftFoundDesc")}
          cancelText={te("draftFoundDiscard")}
          confirmText={te("draftFoundLoad")}
          onConfirm={() => {
            // 불러오기: B 적용 + dismissed 처리
            autoSaveSkip.current = true;
            setForm(snapshot);
            lastAutoSaveJson.current = JSON.stringify(snapshot);
            setStatus(te("draftRestored"));
            setStatusType("info");
            dismissRevision(latest.id);
          }}
          onCancel={() => {
            // 무시: dismissed 처리만
            dismissRevision(latest.id);
          }}
        />,
        { id: "draft-restore", header: { title: te("draftFoundTitle") }, width: "360px", closeButton: false },
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRevisions]);

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [form.title, slugManual]);

  // status 메시지는 다음 액션까지 유지

  /* ── Auto-save ── */
  const getPostTitle = useCallback(
    () => formRef.current.title || formRef.current.title_en || "(untitled)",
    [],
  );
  const onAutoSaved = useCallback(() => {
    setStatus(te("autoSaved"));
    setStatusType("success");
  }, [te, setStatus]);

  const { savedId, autoSaveSkip, lastAutoSaveJson, scheduleAutoSave } =
    useEditorAutoSave<PostFormData>({
      entityType: "post",
      entityId: post?.id,
      draftEntityId,
      formRef,
      saveRevision,
      getTitle: getPostTitle,
      busyFlags: { saving, translating },
      onSaved: onAutoSaved,
      ignoredFields: ["scheduled_at"],
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(scheduleAutoSave, [form]);

  const updateField = useCallback(
    <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
      setShowErrors(false);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tag = useTagInput(form.tags, (tags) => updateField("tags", tags));

  const { seriesList, seriesPosts, setSeriesPosts, seriesPostsLoading, refetchSeries } = usePostSeries(
    form.series_id,
    isEdit,
    post?.id,
    (order) => updateField("series_order", order),
  );

  const [seriesSelectMode, setSeriesSelectMode] = useState<"existing" | "custom">("existing");

  const handleSeriesCreated = useCallback(async (saved?: Series) => {
    await refetchSeries();
    if (saved?.id) {
      updateField("series_id", saved.id);
      if (saved.category) updateField("category", saved.category);
    }
    setSeriesSelectMode("existing");
  }, [refetchSeries, updateField]);


  const [converting, setConverting] = useState(false);

  const handleContentTypeChange = useCallback(
    async (newType: "markdown" | "richtext") => {
      if (newType === form.content_type) return;
      // 1) fade-out
      flushSync(() => setConverting(true));
      // 2) fade-out 완료 대기 (0.2s transition)
      await new Promise((r) => setTimeout(r, 220));

      const convert = async (content: string): Promise<string> => {
        if (!content) return content;
        if (form.content_type === "markdown" && newType === "richtext") {
          let html = marked.parse(content, { async: false }) as string;
          html = postProcessMarkedHtml(html);
          return html;
        } else {
          const TurndownService = (await import("turndown")).default;
          const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
          // 백틱 이스케이프 방지
          td.escape = (str: string) => str;

          // 각주 참조: <sup data-footnote-ref="1">[1]</sup> → [^1]
          td.addRule("footnoteRef", {
            filter: (node) => node.nodeName === "SUP" && node.hasAttribute("data-footnote-ref"),
            replacement: (_content, node) => `[^${(node as HTMLElement).getAttribute("data-footnote-ref")}]`,
          });
          // 각주 ID span: <span data-footnote-id="1">[1]</span> → 무시
          td.addRule("footnoteIdSpan", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-footnote-id"),
            replacement: () => "",
          });
          // 각주 내용: <div data-footnote-content="1">text</div> → [^1]: text
          td.addRule("footnoteContent", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-footnote-content"),
            replacement: (content, node) => {
              const id = (node as HTMLElement).getAttribute("data-footnote-content");
              return `\n[^${id}]: ${content.trim()}\n`;
            },
          });
          // 수식 블록: <div data-math-block data-latex="..."> → $$...$$
          td.addRule("mathBlock", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-math-block"),
            replacement: (_content, node) => `\n$$\n${(node as HTMLElement).getAttribute("data-latex") ?? ""}\n$$\n`,
          });
          // 인라인 수식: <span data-math-inline data-latex="..."> → $...$
          td.addRule("mathInline", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-math-inline"),
            replacement: (_content, node) => `$${(node as HTMLElement).getAttribute("data-latex") ?? ""}$`,
          });
          // 코드 블록: fenced style 보장
          td.addRule("codeBlock", {
            filter: (node) => {
              if (node.nodeName === "PRE") {
                const code = (node as HTMLElement).querySelector("code");
                return !!code;
              }
              if (node.nodeName === "DIV" && (node as HTMLElement).classList.contains("code-block-wrap")) return true;
              return false;
            },
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const code = el.querySelector("code");
              if (!code) return _content;
              const lang = Array.from(code.classList).find(c => c.startsWith("language-"))?.replace("language-", "") ?? "";
              const text = code.textContent ?? "";
              return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
            },
          });

          // 콜아웃: <div data-callout ...> → > [!NOTE]
          td.addRule("callout", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-callout"),
            replacement: (content) => {
              const lines = content.trim().split("\n").map((l) => `> ${l}`).join("\n");
              return `\n> [!NOTE]\n${lines}\n`;
            },
          });
          // 콜아웃 아이콘 visual span 무시
          td.addRule("calloutIconVisual", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-callout-icon-visual"),
            replacement: () => "",
          });
          // 테이블: Plate 테이블 → 마크다운 표
          td.addRule("table", {
            filter: (node) => node.nodeName === "TABLE",
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const rows = Array.from(el.querySelectorAll("tr"));
              if (rows.length === 0) return _content;
              const toRow = (tr: Element) => {
                const cells = Array.from(tr.querySelectorAll("th, td"));
                return `| ${cells.map((c) => (c.textContent ?? "").trim().replace(/\|/g, "\\|")).join(" | ")} |`;
              };
              const header = toRow(rows[0]);
              const divider = `| ${Array.from(rows[0].querySelectorAll("th, td")).map(() => "---").join(" | ")} |`;
              const body = rows.slice(1).map(toRow).join("\n");
              return `\n${header}\n${divider}\n${body}\n`;
            },
          });
          // 열블록 (column_group) → 마크다운 표 + 열블록 마커
          td.addRule("columnGroup", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-column-group"),
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const cols = Array.from(el.querySelectorAll(":scope > [data-column]"));
              if (cols.length === 0) return _content;
              const widths = cols.map((c) => (c as HTMLElement).getAttribute("data-width") || "");
              const layout = el.getAttribute("data-layout") || "";
              const bg = el.getAttribute("data-column-bg") || "";
              const divider = el.getAttribute("data-column-divider") || "";
              const meta = [
                widths.join(","),
                layout && `layout=${layout}`,
                bg && `bg=${bg}`,
                divider && `divider=${divider}`,
              ].filter(Boolean).join(" ");
              const header = `| ${cols.map((_, i) => `Col ${i + 1}`).join(" | ")} |`;
              const sep = `| ${cols.map(() => "---").join(" | ")} |`;
              const body = `| ${cols.map((c) => (c.textContent ?? "").trim().replace(/\n/g, " ").replace(/\|/g, "\\|")).join(" | ")} |`;
              return `\n<!-- columns ${meta} -->\n${header}\n${sep}\n${body}\n`;
            },
          });
          td.addRule("column", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-column"),
            replacement: (content) => content,
          });
          // 인라인 리스트 div (Plate indent-list) → 마크다운 리스트
          td.addRule("indentList", {
            filter: (node) => {
              if (node.nodeName !== "DIV") return false;
              const style = (node as HTMLElement).getAttribute("style") ?? "";
              return style.includes("list-style-type") && style.includes("margin-left");
            },
            replacement: (content, node) => {
              const style = (node as HTMLElement).getAttribute("style") ?? "";
              const isOl = style.includes("decimal");
              const prefix = isOl ? "1. " : "- ";
              return `${prefix}${content.trim()}\n`;
            },
          });

          // 파일 첨부: <div data-file-embed ...> → [📎 filename](url)
          td.addRule("fileEmbed", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-file-embed"),
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const url = el.getAttribute("data-url") || "";
              const name = el.getAttribute("data-filename") || url.split("/").pop() || "file";
              return `\n[📎 ${name}](${url})\n`;
            },
          });
          // 오디오 첨부: <div data-audio-embed ...> → [🔊 title](url)
          td.addRule("audioEmbed", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-audio-embed"),
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const url = el.getAttribute("data-url") || "";
              const title = el.getAttribute("data-title") || url.split("/").pop() || "audio";
              return `\n[🔊 ${title}](${url})\n`;
            },
          });

          return td.turndown(content);
        }
      };

      const [newContent, newContentEn] = await Promise.all([
        convert(form.content),
        convert(form.content_en),
      ]);

      setForm((prev) => ({
        ...prev,
        content: newContent,
        content_en: newContentEn,
        content_type: newType,
      }));
      setStatus("");
      setError("");
      // 3) 새 에디터 mount 후 fade-in
      requestAnimationFrame(() => setConverting(false));
    },
    [form.content, form.content_en, form.content_type] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    // 보안 + 형식별 크기 제한 검증 (설정 값 사용)
    const sizeError = validateFileSize(file, mediaLimits);
    if (sizeError) throw new Error(sizeError);

    // 일반 이미지는 압축 파이프라인 적용
    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressed);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);
    return data.url;
  }, [mediaLimits]);

  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await handleImageUpload(file);
      updateField("cover_image", url);
    };
    input.click();
  }, [handleImageUpload, updateField]);


  const handleSave = useCallback(
    async (publish?: boolean) => {
      const willPublish = publish !== undefined ? publish : form.published;

      if (willPublish) {
        const missing: string[] = [];
        const _koStarted = !!(form.title.trim() || form.content.trim());
        const _enStarted = !!(form.title_en.trim() || form.content_en.trim());

        if (!form.slug.trim()) {
          missing.push(te("slug"));
        }
        if (!form.category.trim()) missing.push(te("category"));

        if (!_koStarted && !_enStarted) {
          missing.push(te("title"));
          missing.push(te("content"));
        } else {
          if (_koStarted) {
            if (!form.title.trim()) missing.push(`${te("title")} (KO)`);
            if (!form.content.trim()) missing.push(`${te("content")} (KO)`);
          }
          if (_enStarted) {
            if (!form.title_en.trim()) missing.push(`${te("title")} (EN)`);
            if (!form.content_en.trim()) missing.push(`${te("content")} (EN)`);
          }
        }

        if (missing.length > 0) {
          setError(`${missing.join(" · ")} ${te("requiredFields")}`);
          setShowErrors(true);
          return;
        }

        const slugError = validateSlug(form.slug);
        if (slugError) {
          setError(`[Slug] ${te(`slugError.${slugError}`)}`);
          setShowErrors(true);
          return;
        }

        const security = validateContentSecurity(form.content + form.content_en);
        if (!security.safe) {
          setError(`${te("securityWarning")}: ${security.warnings.join(", ")}`);
          return;
        }
      }

      setSaving(true);
      setError("");
      setStatus("");

      // posts 테이블에는 related_work_ids 컬럼이 없음 — 분리해서 별도 endpoint로 sync.
      const { related_work_ids, ...postBody } = form;
      const body = {
        ...postBody,
        published: willPublish,
      };

      try {
        const url = savedId.current
          ? `/api/posts/${savedId.current}`
          : "/api/posts";
        const method = savedId.current ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to save");
          return;
        }

        if (!savedId.current) savedId.current = data.id;

        // 관계 동기화 — 별도 endpoint
        if (savedId.current && related_work_ids) {
          await fetch(`/api/admin/posts/${savedId.current}/related-works`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workIds: related_work_ids }),
          }).catch(() => {});
        }

        // 발행 시 AI 요약 자동 생성 (fire-and-forget)
        if (willPublish && savedId.current) {
          fetch(`/api/posts/${savedId.current}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
        }

        const savedSlug = data.slug || form.slug;

        if (!isEdit && publish && savedSlug) {
          window.open(`/posts/${savedSlug}`, "_blank");
        }

        // 새 글이었으면 임시 draft revision 정리
        if (!isEdit) {
          fetch(`/api/revisions?entity_type=post&entity_id=draft-new-post`, { method: "DELETE" }).catch(() => {});
        }
        router.push("/admin/posts");
      } catch {
        setError(te("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, router, te, isEdit] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDelete = useCallback(async () => {
    if (!post) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/posts");
    } catch {
      setError(te("deleteFailed"));
      setDeleting(false);
    }
  }, [post, router, te]);

  const handlePreview = useCallback(() => {
    sessionStorage.setItem("post-preview", JSON.stringify(form));
    window.open("/admin/posts/preview", "_blank");
  }, [form]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot);
        setStatus(te("restored"));
        setStatusType("success");
        setStatusTimestamp(rev.timestamp);
      }
    },
    [dbRevisions, loadRevisionSnapshot, te], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return null;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot;
      return {
        excerpt: s.excerpt || s.excerpt_en || "",
        content: stripHtml(s.content || s.content_en || ""),
        meta: {
          Category: s.category || "",
          Tags: s.tags?.join(", ") || "",
          Series: seriesList.find((x) => x.id === s.series_id)?.title || "",
          Pinned: s.is_pinned ? "Yes" : "",
        },
      };
    },
    [dbRevisions, loadRevisionSnapshot, seriesList],
  );

  const handleDeleteRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return false;
      return deleteRevision(rev.id);
    },
    [dbRevisions, deleteRevision],
  );

  const handleRevert = useCallback(() => {
    setForm(initialFormRef.current);
    setStatus(te("reverted"));
    setStatusType("info");
    setStatusTimestamp(undefined);
  }, [te]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateSummary = useCallback(async () => {
    const id = savedId.current ?? post?.id;
    if (!id) return;
    setRegeneratingSummary(true);
    try {
      const res = await fetch(`/api/posts/${id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const raw = data.error ?? "";
        const status = res.status;
        const msg = raw.includes("not configured") || status === 503 ? te("summaryNoKey")
          : status === 429 || raw.includes("429") ? te("summaryRateLimit")
          : status === 401 || status === 403 || raw.includes("401") || raw.includes("403") ? te("summaryAuthError")
          : status === 400 || raw.includes("400") ? te("summaryBadRequest")
          : te("summaryFailed");
        setError(msg);
        return;
      }
      setStatus(te("generateSummaryDone"));
      setStatusType("success");
    } catch {
      setError(te("summaryFailed"));
    } finally {
      setRegeneratingSummary(false);
    }
  }, [post?.id, te]); // eslint-disable-line react-hooks/exhaustive-deps

  const shellLabels = useMemo(
    () => ({
      delete: te("delete"),
      deleting: te("deleting"),
      deleteConfirm: te("deleteConfirm"),
      deleteConfirmInput: te("deleteConfirmInput"),
      deleteCancel: te("deleteCancel"),
      preview: te("preview"),
      saving: te("saving"),
      saveDraft: te("saveDraft"),
      update: te("update"),
      publish: te("publish"),
      revert: te("revert"),
      revisionHistory: te("revisionHistory"),
      restore: te("restore"),
      retranslate: te("retranslate"),
      retranslateAll: te("retranslateAll"),
      retranslateDisabled: te("retranslateDisabled"),
      generateSummary: te("generateSummary"),
      generateSummaryDisabled: te("generateSummaryDisabled"),
    }),
    [te]
  );

  const retranslateOptions = useMemo(
    () => [
      { key: "title", label: te("title") },
      { key: "excerpt", label: te("excerpt") },
      { key: "content", label: te("content") },
    ],
    [te]
  );

  const handleInsertTemplate = useCallback(() => {
    const lang = editorLang;
    const key = lang === "ko" ? "content" : "content_en";
    const current = form[key as keyof PostFormData] as string;

    const applyTemplate = (tmpl: PostTemplate) => {
      const md = lang === "ko" ? tmpl.content.ko : tmpl.content.en;
      const content = form.content_type === "richtext"
        ? postProcessMarkedHtml(marked.parse(md, { async: false }) as string)
        : md;

      if (current.trim()) {
        const divider = form.content_type === "richtext" ? "<hr />" : "\n\n---\n\n";
        updateField(key as keyof PostFormData, current + divider + content);
      } else {
        updateField(key as keyof PostFormData, content);
      }
    };

    openModal(
      <div className={styles.templateModal}>
        <p className={styles.templateModalDesc}>{te("templateDesc")}</p>
        <div className={styles.templateList}>
          {POST_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              className={styles.templateItem}
              onClick={() => {
                if (current.trim()) {
                  openModal(
                    <ModalConfirm
                      desc={te("templateConfirm")}
                      cancelText={te("cancel")}
                      confirmText={te("insertTemplate")}
                      onConfirm={() => { applyTemplate(tmpl); closeAll(); }}
                    />,
                    { header: { title: te("insertTemplate") }, closeButton: true, width: "360px" },
                  );
                } else {
                  applyTemplate(tmpl);
                  closeAll();
                }
              }}
            >
              <span className={styles.templateItemLabel}>{lang === "ko" ? tmpl.label.ko : tmpl.label.en}</span>
              <span className={styles.templateItemDesc}>{lang === "ko" ? tmpl.desc.ko : tmpl.desc.en}</span>
            </button>
          ))}
        </div>
      </div>,
      { header: { title: te("insertTemplate") }, closeButton: true, width: "420px" },
    );
  }, [editorLang, form, updateField, te, openModal, closeAll]);

  const titleKey = editorLang === "ko" ? "title" : "title_en";
  const contentKey = editorLang === "ko" ? "content" : "content_en";
  const excerptKey = editorLang === "ko" ? "excerpt" : "excerpt_en";

  const koStarted = !!(form.title.trim() || form.content.trim());
  const enStarted = !!(form.title_en.trim() || form.content_en.trim());
  const titleFieldError = showErrors && (
    (editorLang === "ko" && koStarted && !form.title.trim()) ||
    (editorLang === "en" && enStarted && !form.title_en.trim())
  );
  const contentFieldError = showErrors && (
    (editorLang === "ko" && koStarted && !form.content.trim()) ||
    (editorLang === "en" && enStarted && !form.content_en.trim())
  );

  return (
    <>
    <AdminEditorShell
      backHref="/admin/posts"
      backLabel={te("backToPosts")}
      editorLang={editorLang}
      onEditorLangChange={handleEditorLangChange}
      isEdit={isEdit}
      isDirty={isDirty}
      saving={saving || translating}
      deleting={deleting}
      published={form.published}
      onDelete={handleDelete}
      deleteTargetName={post?.title}
      onSaveDraft={() => handleSave()}
      onPublish={() => handleSave(true)}
      onPreview={handlePreview}
      status={status}
      statusType={statusType}
      statusTimestamp={statusTimestamp}
      error={error}
      labels={shellLabels}
      revisions={dbRevisions.map((r) => ({
        timestamp: r.timestamp,
        title: r.title,
      }))}
      onRevert={handleRevert}
      onRestoreRevision={handleRestoreRevision}
      onLoadRevisionDetail={handleLoadRevisionDetail}
      onDeleteRevision={handleDeleteRevision}
      onRetranslate={serviceStatus.translation ? handleRetranslate : undefined}
      retranslateOptions={retranslateOptions}
      retranslateDisabled={!serviceStatus.loading && !serviceStatus.translation}
      onGenerateSummary={isEdit || !!savedId.current ? (serviceStatus.aiSummary ? handleGenerateSummary : undefined) : undefined}
      aiSummaryDisabled={!serviceStatus.loading && !serviceStatus.aiSummary && (isEdit || !!savedId.current)}
      generatingSummary={generatingSummary}
      currentSnapshot={(() => {
        return {
          title: form.title || form.title_en,
          excerpt: form.excerpt || form.excerpt_en || "",
          content: stripHtml(form.content || form.content_en || ""),
          meta: {
            Category: form.category || "",
            Tags: form.tags?.join(", ") || "",
            Series: seriesList.find((x) => x.id === form.series_id)?.title || "",
            Pinned: form.is_pinned ? "Yes" : "",
          },
        };
      })()}
      topBarFirstRowExtra={
        <Checkbox
          checked={form.is_pinned}
          onChange={(v) => updateField("is_pinned", v)}
          shape="square"
          label={te("pinLabel")}
        />
      }
      topBarSecondRowLeft={
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)", flexWrap: "nowrap" }}>
          {/* 예약 발행 — Works editor 와 동일 스타일 */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", flexWrap: "nowrap" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", whiteSpace: "nowrap", flexShrink: 0, marginRight: "var(--spacing-2xs)" }}>{te("scheduledAt")}</span>
            <DateTimePicker
              value={form.scheduled_at ?? null}
              onChange={(iso) => updateField("scheduled_at", iso)}
            />
            <AnimatePresence>
              {form.scheduled_at && (
                <motion.button
                  key="clear"
                  type="button"
                  className={es.scheduledClearBtn}
                  onClick={() => updateField("scheduled_at", null)}
                  title={te("scheduledClear")}
                  aria-label={te("scheduledClear")}
                  data-close-trigger
                  initial={{ opacity: 0, scale: 0.5, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 24 }}
                  exit={{ opacity: 0, scale: 0.5, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                >
                  <CloseIcon />
                </motion.button>
              )}
            </AnimatePresence>
            {form.scheduled_at && !form.published && (
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{te("scheduledHint")}</span>
            )}
          </div>
        </div>
      }
    >
      <div className={styles.meta}>
        {/* ── 필수 입력 ── */}
        <div className={es.field} data-seo="title">
          <label className={`${es.fieldLabel}${titleFieldError ? ` ${es.fieldLabelError}` : ""}`}>{te("title")}</label>
          <input
            className={`${es.titleInput}${titleFieldError ? ` ${es.titleInputError}` : ""}`}
            type="text"
            value={form[titleKey]}
            onChange={(e) => updateField(titleKey, e.target.value)}
            placeholder={te("titlePlaceholder")}
          />
        </div>

        <div className={es.row}>
          <div className={es.field} style={{ gridColumn: "1 / -1" }} data-seo="slug">
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-xs)" }}>
              <label className={`${es.fieldLabel}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{te("slug")}</label>
              {form.slug.trim() && validateSlug(form.slug) && (
                <span className={styles.slugHint}>{te(`slugError.${validateSlug(form.slug)}`)}</span>
              )}
            </div>
            <input
              className={`${es.fieldInput}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldInputError}` : ""}`}
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                updateField("slug", e.target.value);
              }}
              placeholder="post-url-slug"
            />
          </div>

        </div>

        {/* ── 선택 입력 (접기/펼치기) ── */}
        <div className={styles.optionalSection}>
          <button
            type="button"
            className={styles.optionalToggle}
            onClick={() => setOptionalOpen((v) => !v)}
          >
            <span>{te("optionalFields")}</span>
            <ChevronRight
              size={12}
              strokeWidth={2.5}
              style={{ transform: optionalOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          </button>

          {/* 시리즈 + 카테고리 — 같은 row, 항상 표시 (optionalContent 바깥이라 직접 padding 부여) */}
          <div style={{ padding: "0 var(--spacing-md) var(--spacing-md)" }}>
            <div className={es.row}>
              {/* 1열: 시리즈 */}
              <div className={es.field} onFocusCapture={() => { if (!optionalOpen) setOptionalOpen(true); }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <label className={es.fieldLabel}>{te("series")}</label>
                  <a href="/admin/settings?tab=content&sub=posts" target="_blank" rel="noopener noreferrer" className={styles.manageLink}>
                    {te("seriesManage")}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  {seriesSelectMode === "custom" ? (
                    <motion.div
                      key="custom"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <SeriesInlineEditor
                        series={null}
                        categories={categories}
                        onSave={handleSeriesCreated}
                        onCancel={() => setSeriesSelectMode("existing")}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="existing"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <Select
                        value={form.series_id ?? ""}
                        options={[
                          { value: "", label: te("seriesNone") },
                          { value: "__custom__", label: te("customSeries") },
                          ...seriesList.map((s) => ({ value: s.id, label: `${s.title} (${s.post_count ?? 0})${s.category ? ` — ${s.category}` : ""}` })),
                        ]}
                        onChange={(v) => {
                          if (v === "__custom__") {
                            setSeriesSelectMode("custom");
                            updateField("series_id", null);
                            return;
                          }
                          setSeriesSelectMode("existing");
                          updateField("series_id", v || null);
                          if (v) {
                            const selected = seriesList.find((s) => s.id === v);
                            if (selected?.category) updateField("category", selected.category);
                          }
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* 2열: 카테고리 */}
              <div className={es.field} data-seo="category">
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <label className={`${es.fieldLabel}${showErrors && !form.category.trim() ? ` ${es.fieldLabelError}` : ""}`}>{te("category")}</label>
                  {form.series_id && (
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-space-grotesk)" }}>{te("categoryFromSeries")}</span>
                  )}
                </div>
                {(() => {
                  const matched = isManagedCat(form.category);
                  const isCustom = categoryCustomMode || (!!form.category && !matched);
                  const selectValue = isCustom ? "__custom__" : (matched ? (findCat(form.category)?.ko ?? form.category) : (categories[0]?.ko ?? ""));
                  return (
                    <>
                      <Select
                        value={selectValue}
                        options={[
                          { value: "__custom__", label: te("customCategory") },
                          ...categories.map((cat) => ({ value: cat.ko, label: language === "ko" ? cat.ko : cat.en })),
                        ]}
                        onChange={(v) => {
                          if (v === "__custom__") {
                            setCategoryCustomMode(true);
                            updateField("category", "");
                          } else {
                            setCategoryCustomMode(false);
                            updateField("category", v);
                          }
                        }}
                        disabled={!!form.series_id}
                      />
                      {isCustom && !form.series_id && (
                        <input
                          className={es.fieldInput}
                          type="text"
                          value={form.category}
                          onChange={(e) => updateField("category", e.target.value)}
                          placeholder={te("category")}
                          style={{ marginTop: "var(--spacing-xs)" }}
                          autoFocus
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          <div ref={optionalContentRef} className={`${styles.optionalContent}${optionalOpen ? ` ${styles.optionalContentOpen}` : ""}`}>
            <div ref={optionalInnerRef} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              {/* 줄1: [시리즈 순서(1열) + 관련 프로젝트(2열)] — 시리즈 없으면 관련 프로젝트 단독 */}
              {(() => {
                const seriesOrderEl = form.series_id ? (
                  seriesPostsLoading ? (
                    <div className={es.field} style={{ opacity: 0.5 }}>
                      <label className={es.fieldLabel}>{te("seriesOrder")}</label>
                      <div className={styles.seriesOrderSkeleton}>
                        {[1, 2, 3].map((i) => (
                          <span key={i} className={styles.seriesOrderSkeletonRow} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <SortOrderDragList
                      label={te("seriesOrder")}
                      currentTitle={form.title || te("currentPost")}
                      currentOrder={form.series_order || 1}
                      // SortOrderDragList 의 sort_order 필드명에 맞게 매핑
                      otherItems={seriesPosts
                        .filter((p) => p.id !== post?.id)
                        .map((p) => ({ id: p.id, title: p.title, sort_order: p.series_order }))
                        .sort((a, b) => a.sort_order - b.sort_order)}
                      onChange={(newOrder, otherUpdates) => {
                        updateField("series_order", newOrder);
                        if (otherUpdates.length) {
                          setSeriesPosts((prev) => prev.map((p) => {
                            const u = otherUpdates.find((x) => x.id === p.id);
                            return u ? { ...p, series_order: u.sort_order } : p;
                          }));
                          otherUpdates.forEach((u) => {
                            fetch(`/api/posts/${u.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ series_order: u.sort_order }),
                            });
                          });
                        }
                      }}
                    />
                  )
                ) : null;

                const relatedWorksEl = (
                  <div className={es.field}>
                    <div className={es.fieldLabelRow}>
                      <label className={es.fieldLabel}>{te("relatedWorks")}</label>
                      {(form.related_work_ids ?? []).length === 0 && (
                        <span className={es.fieldHint}>{te("relatedWorksEmpty")}</span>
                      )}
                    </div>
                    <RelationPicker
                      items={allWorks}
                      selectedIds={form.related_work_ids ?? []}
                      onChange={(ids) => updateField("related_work_ids", ids)}
                      getId={(w) => w.id}
                      getTitle={(w) => w.title}
                      getMeta={(w) => w.year}
                      getThumb={(w) => w.image}
                      getStatus={(w) => (w.published ? "published" : "draft")}
                      searchPlaceholder={te("relatedWorksSearch")}
                      searchInputPlaceholder={te("relatedWorksSearchInput")}
                      noResultsText={te("relatedWorksNoResults")}
                    />
                  </div>
                );

                return seriesOrderEl ? (
                  <div className={es.row}>
                    {seriesOrderEl}
                    {relatedWorksEl}
                  </div>
                ) : (
                  relatedWorksEl
                );
              })()}
              {/* 줄2: [요약 + 태그] (1열 / 2열) */}
              <div className={es.row}>
                <div className={es.field} data-seo="excerpt">
                  <label className={es.fieldLabel}>{te("excerpt")}</label>
                  <textarea
                    className={styles.excerptInput}
                    value={form[excerptKey]}
                    onChange={(e) => updateField(excerptKey, e.target.value)}
                    placeholder={te("excerptPlaceholder")}
                    rows={2}
                  />
                </div>
                <div className={es.field} data-seo="tags">
                  <label className={es.fieldLabel}>{te("tags")}</label>
                  <div>
                    <div className={styles.tagInputRow}>
                      <input className={es.fieldInput} type="text" value={tag.input} onChange={(e) => tag.setInput(e.target.value)} onKeyDown={tag.handleKeyDown} placeholder={te("tagsPlaceholder")} />
                      <button type="button" className={styles.tagAddBtn} onClick={tag.add} disabled={!tag.input.trim()}>+</button>
                    </div>
                    {form.tags.length > 0 && <TagsList tags={form.tags} onRemove={tag.remove} />}
                  </div>
                </div>
              </div>
              {/* 줄3: [커버이미지 라벨/thumb/버튼(1열)] + [GitHub URL(2열)]
                  picker 본체는 row 밖 full-width 로 렌더 → 좁은 column 에 squeeze 되거나
                  optional wrapper 에 닿는 문제 회피 */}
              <div className={es.row}>
                <CoverImageField
                  value={form.cover_image}
                  onChange={(url) => {
                    updateField("cover_image", url);
                    if (!url) setShowCoverPicker(false);
                  }}
                  label={te("coverImage")}
                  removeLabel={te("remove")}
                  uploadLabel={te("upload")}
                  chooseLabel={te("chooseCover")}
                  closeLabel={te("closePicker")}
                  onUpload={handleCoverUpload}
                  pickerOpen={showCoverPicker}
                  pickerClosing={closingCoverPicker}
                  onPickerToggle={() => {
                    if (showCoverPicker && !closingCoverPicker) {
                      requestCloseCoverPicker();
                    } else if (!showCoverPicker) {
                      setShowCoverPicker(true);
                    }
                  }}
                  seoId="cover"
                />
                {/* 2열: GitHub URL */}
                <div className={es.field}>
                  <label className={es.fieldLabel}>GitHub URL</label>
                  <input
                    className={es.fieldInput}
                    type="url"
                    value={form.github_url}
                    onChange={(e) => updateField("github_url", e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
              {/* picker — full-width (col 안에 두면 좁은 폭에 squeeze + wrapper 와 닿음).
                  cover_image 세팅 후에도 유지 — AI auto-save 시 picker 가 사라지면 재생성 불가능 */}
              {showCoverPicker && (
                <CoverImagePicker
                  onSelect={(url) => {
                    updateField("cover_image", url);
                    // 선택 직후엔 닫는 애니메이션 없이 즉시 unmount (커버 이미지 미리보기로 전환)
                    setShowCoverPicker(false);
                    setClosingCoverPicker(false);
                  }}
                  onClose={requestCloseCoverPicker}
                  closing={closingCoverPicker}
                  // AI 생성 즉시 form 에 반영 (picker 유지) — 사용자가 "사용" 안 눌러도 자동저장
                  onAutoSave={(url) => updateField("cover_image", url)}
                  currentUrl={form.cover_image}
                  postContext={{
                    title: form.title,
                    tags: form.tags,
                    excerpt: form.excerpt,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.editorSection}>
        <div className={es.editorHeader}>
          <div className={styles.editorHeaderLeft}>
            <span className={`${styles.editorLabel}${contentFieldError ? ` ${styles.editorLabelError}` : ""}`}>{te("content")}</span>
            <button
              type="button"
              className={styles.templateBtn}
              onClick={handleInsertTemplate}
            >
              {te("insertTemplate")}
            </button>
            <button
              type="button"
              className={styles.editorHelpBtn}
              onClick={() => openModal(<ShortcutsModalContent />, { id: "shortcuts-help", header: { title: "단축키 및 기능 안내" }, closeButton: true })}
              title="단축키 및 기능 안내"
            >
              ?
            </button>
            {form.content_type === "markdown" && (
              <button
                type="button"
                className={`${styles.editorHelpBtn} ${showMdHelp ? styles.editorHelpBtnActive : ""}`}
                onClick={() => setShowMdHelp(!showMdHelp)}
                title="Markdown"
              >
                MD
              </button>
            )}
          </div>
          <EditorToggle
            value={form.content_type}
            onChange={handleContentTypeChange}
          />
        </div>

        <div className={`${styles.editorWrap} ${converting ? styles.editorWrapConverting : ""}`}>
        {converting && (
          <div className={styles.editorSkeletonOverlay}>
            <div className={styles.editorSkeletonToolbar}>
              <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
              <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
              <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
              <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
            </div>
            <div className={styles.editorSkeleton}>
              <div className={styles.editorSkeletonBar} style={{ width: "60%" }} />
              <div className={styles.editorSkeletonBar} style={{ width: "90%" }} />
              <div className={styles.editorSkeletonBar} style={{ width: "75%" }} />
              <div className={styles.editorSkeletonBar} style={{ width: "85%" }} />
              <div className={styles.editorSkeletonBar} style={{ width: "40%" }} />
            </div>
          </div>
        )}
        {form.content_type === "markdown" ? (
          <MarkdownEditor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => updateField(contentKey, v)}
            onImageUpload={handleImageUpload}
            editLabel={te("editorLabel")}
            previewLabel={te("previewLabel")}
            showHelp={showMdHelp}
          />
        ) : (
          <Editor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => {
              updateField(contentKey, v);
              // 이미지 목록 동기화
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
            onImageUpload={handleImageUpload}
            editorRef={plateRef}
            postLang={editorLang}
          />
        )}
        </div>
      </div>

      {/* ── 첨부 이미지 패널 ── */}
      {form.content_type === "markdown" ? (
        (() => {
          const mdImages = extractMarkdownImages(form[contentKey]).map((url, i) => ({
            url, path: [i], mediaType: "img" as const,
          }));
          return (
            <div className={styles.attachedImagesSection}>
              <ImagePanel
                images={mdImages}
                onSelect={() => {}}
                onReorder={() => {}}
                onRemove={() => {}}
                onImageUpload={async (file) => {
                  const url = await handleImageUpload(file);
                  // 마크다운 본문 끝에 이미지 삽입
                  const content = form[contentKey] as string;
                  updateField(contentKey, `${content}\n![image](${url})\n`);
                  return url;
                }}
              />
            </div>
          );
        })()
      ) : (
        <div className={styles.attachedImagesSection}>
          <ImagePanel
            images={editorImages}
            onSelect={(path) => plateRef.current?.selectImageAt(path)}
            onReorder={(from, to) => plateRef.current?.reorderImage(from, to)}
            onRemove={(path) => plateRef.current?.removeImage(path)}
            onImageUpload={async (file) => {
              const url = await handleImageUpload(file);
              plateRef.current?.insertImageByUrl(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
              return url;
            }}
            onVideoUpload={async (file) => {
              const url = await handleImageUpload(file);
              plateRef.current?.insertMediaByUrl(url);
              return url;
            }}
            onBulkInsert={(paths) => {
              for (const path of paths) {
                plateRef.current?.selectImageAt(path);
              }
            }}
            onReinsert={(url, mediaType) => {
              if (mediaType === "media_embed") plateRef.current?.insertMediaByUrl(url);
              else plateRef.current?.insertImageByUrl(url);
            }}
            onRemoveDetached={(url) => {
              plateRef.current?.removeDetached(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
          />
        </div>
      )}

      {/* SEO 체크리스트 — portal 로 floating pill 렌더 (wrapper 불필요) */}
      <SeoChecklist
        data={{
          title: form[titleKey] || form.title,
          slug: form.slug,
          excerpt: form[excerptKey] || form.excerpt,
          cover: form.cover_image,
          category: form.category,
          tagsCount: form.tags?.length ?? 0,
        }}
        onItemClick={handleSeoItemClick}
      />

    </AdminEditorShell>

</>
  );
}
