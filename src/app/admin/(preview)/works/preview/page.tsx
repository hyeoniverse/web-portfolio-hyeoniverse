"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PREVIEW_KEY } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import { WorkArticleHeader } from "@/components/works/WorkArticleHeader";
import { WorkArticleBody } from "@/components/works/WorkArticleBody";
import { WorkArticleGallery } from "@/components/works/WorkArticleGallery";
import type { RelatedPostItem, RelatedSeriesItem } from "@/components/works/workArticleTypes";
import { extractHeadings } from "@/app/works/_utils";
import { useLanguage } from "@/providers/LanguageProvider";
import { sendAction } from "@/lib/sendAction";
import { useModalStore } from "@/stores/modalStore";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import { workFormToProject } from "@/types/work";
import type { WorkFormData } from "@/types/work";
import type { Project } from "@/data/projects";
import Pressable from "@/components/ui/Pressable";
import TranslateBanner from "@/components/ui/TranslateBanner";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useWorkTranslation, type WorkTranslator, type WorkTranslated } from "@/app/works/[slug]/_hooks/useWorkTranslation";
import { autoTranslate } from "@/utils/autoTranslate";
import { initialContentLang, pickContent } from "@/lib/contentLang";

type RawPost = { id: string; title?: string; title_en?: string; slug?: string; cover_image?: string; excerpt?: string; category?: string; created_at?: string };
type RawSeries = { id: string; title?: string; title_en?: string; cover_image?: string; category?: string; description?: string; description_en?: string };

export default function WorkPreviewPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchId = searchParams.get("fetch");

  const [form, setForm] = useState<(WorkFormData & { _trashId?: string }) | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { openModal } = useModalStore();
  /* 방문자가 고르기 전에는 글이 있는 언어(한쪽에만 있으면 그쪽) — 작업물은 늦게(세션·조회 뒤) 오므로 값으로 두지 않고 그때 고른다 */
  const [pickedLang, setViewLang] = useState<"ko" | "en" | null>(null);
  // 발행된 프로젝트면 새창으로 열 href (fetch·세션 프리뷰 모두 — 편집 중인 글이 이미 발행 상태면 공개 글이 존재)
  const [publishedHref, setPublishedHref] = useState<string | null>(null);

  // 관련 글 — 디테일과 동일하게 info grid 에 표시 (렌더는 공용 WorkArticleHeader, 데이터만 여기서).
  // 프리뷰는 편집 중 초안(저장 전)일 수 있어 work-id 관계테이블 대신 form 의 related_post_ids 로 각 글을 직접 가져온다.
  const relatedIdsKey = (form?.related_post_ids ?? []).join(",");
  const [relatedPosts, setRelatedPosts] = useState<RelatedPostItem[]>([]);
  useEffect(() => {
    const ids = relatedIdsKey ? relatedIdsKey.split(",") : [];
    if (ids.length === 0) { setRelatedPosts([]); return; }
    const ac = new AbortController();
    Promise.all(
      ids.map((id) =>
        fetch(`/api/posts/${id}`, { signal: ac.signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((posts) => {
      if (ac.signal.aborted) return;
      const items: RelatedPostItem[] = (posts as (RawPost | null)[])
        .filter((p): p is RawPost => !!p?.id)
        .map((p) => ({
          id: p.id, title: p.title ?? "", title_en: p.title_en, slug: p.slug ?? "",
          cover_image: p.cover_image ?? "", excerpt: p.excerpt ?? "",
          category: p.category ?? "", created_at: p.created_at ?? "",
        }));
      setRelatedPosts(items);
    }).catch(() => {});
    return () => ac.abort();
  }, [relatedIdsKey]);

  // 관련 시리즈 — form 의 related_series_ids 로 시리즈 데이터 조회
  const relatedSeriesIdsKey = (form?.related_series_ids ?? []).join(",");
  const [relatedSeries, setRelatedSeries] = useState<RelatedSeriesItem[]>([]);
  useEffect(() => {
    const ids = relatedSeriesIdsKey ? relatedSeriesIdsKey.split(",") : [];
    if (ids.length === 0) { setRelatedSeries([]); return; }
    const ac = new AbortController();
    fetch("/api/series?all=true", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ac.signal.aborted) return;
        const list = Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []);
        const byId = new Map((list as RawSeries[]).map((s) => [s.id, s] as const));
        const items: RelatedSeriesItem[] = ids
          .map((id) => byId.get(id))
          .filter((s): s is RawSeries => !!s)
          .map((s) => ({ id: s.id, title: s.title ?? "", title_en: s.title_en, cover_image: s.cover_image, category: s.category, description: s.description, description_en: s.description_en }));
        setRelatedSeries(items);
      }).catch(() => {});
    return () => ac.abort();
  }, [relatedSeriesIdsKey]);

  useEffect(() => {
    if (fetchId) {
      fetch(`/api/works/${fetchId}`)
        .then((r) => r.json())
        .then((w) => {
          if (w?.id) {
            // DB Work row → WorkFormData 형태로 맞춰 보관 (workFormToProject 입력)
            setForm({
              slug: w.slug || "",
              title: w.title || "",
              title_en: w.title_en || "",
              subtitle_ko: w.subtitle_ko || "",
              subtitle_en: w.subtitle_en || "",
              categories_ko: w.categories_ko || [],
              categories_en: w.categories_en || [],
              nature_ko: w.nature_ko || "",
              nature_en: w.nature_en || "",
              year: w.year || "",
              description_ko: w.description_ko || "",
              description_en: w.description_en || "",
              role_ko: w.role_ko || "",
              role_en: w.role_en || "",
              contributions_ko: w.contributions_ko || {},
              contributions_en: w.contributions_en || {},
              tech: w.tech || [],
              tech_notes: w.tech_notes || {},
              image: w.image || "",
              icon: w.icon || "",
              content_ko: w.content_ko || "",
              content_en: w.content_en || "",
              content_type: w.content_type || "markdown",
              team_members: w.team_members || [],
              gallery: w.gallery || [],
              gallery_notes: w.gallery_notes || {},
              live_url: w.live_url || "",
              github_url: w.github_url || "",
              published: !!w.published,
              sort_order: w.sort_order ?? 0,
              is_pinned: !!w.is_pinned,
              scheduled_at: w.scheduled_at ?? null,
              related_post_ids: w.related_post_ids || [],
              _trashId: w.deleted_at ? w.id : undefined,
            });
            if (w.published && w.slug) setPublishedHref(`/works/${w.slug}`);
          }
        })
        .catch(() => {})
        .finally(() => setReady(true));
      return;
    }
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY.work);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm(parsed);
        // 이미 발행된 프로젝트를 편집 중 미리보기(세션 프리뷰)해도 공개 글은 존재 → '글 보기' href 세팅
        if (parsed?.published && parsed?.slug) setPublishedHref(`/works/${parsed.slug}`);
      }
    } catch { /* ignore */ }
    setReady(true);
  }, [fetchId]);

  const trashId = form?._trashId;

  const handleRestore = useCallback(async () => {
    if (!trashId) return;
    setBusy(true);
    /* 실패하면 알림을 띄우고 이 화면에 머문다 — 예전에는 실패해도 목록으로 넘어갔다(#868) */
    const res = await sendAction(`/api/works/${trashId}/restore`, { method: "POST" }, t, t("admin.common.restoreFailed"));
    setBusy(false);
    if (res) router.push(`/admin/works?restored=${trashId}`);
  }, [trashId, router, t]);

  const handlePurge = useCallback(() => {
    if (!trashId) return;
    const title = form?.title || "";
    openModal(
      <ModalPrompt
        hint={t("admin.works.trashPurgeHint")}
        placeholder={title}
        validate={(v) => v === title}
        confirmText={t("admin.works.trashPurge")}
        danger
        onConfirm={async () => {
          setBusy(true);
          const res = await sendAction(`/api/works/${trashId}/purge`, { method: "DELETE" }, t, t("admin.common.purgeFailed"));
          setBusy(false);
          if (res) window.close();
        }}
      />,
      { id: "trash-purge", header: { title: `"${title}"` }, closeButton: true, width: "400px" },
    );
  }, [trashId, form?.title, t, openModal]);

  // form → Project (detail 페이지와 동일 shape). workToProject 재사용.
  const project = useMemo(() => (form ? workFormToProject(form) : null), [form]);
  const viewLang = pickedLang ?? (project ? initialContentLang(project.content, language) : language === "en" ? "en" : "ko");

  if (!form || !project) {
    if (!ready) return null;
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "var(--font-space-grotesk)",
        color: "var(--text-tertiary)",
      }}>
        미리보기 데이터가 없습니다. 에디터에서 Preview 버튼을 눌러주세요.
      </div>
    );
  }

  return (
    <PreviewArticle
      project={project}
      viewLang={viewLang}
      renderHeader={(shown) => (
        <>
          {trashId && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-label)" }}>
                {t("admin.works.trashPreviewNotice")}
              </span>
              <Pressable disabled={busy} onClick={handleRestore} style={{ cursor: "pointer" }}>
                {t("admin.works.trashRestore")}
              </Pressable>
              <Pressable disabled={busy} onClick={handlePurge} style={{ cursor: "pointer", color: "var(--text-accent)" }}>
                {t("admin.works.trashPurge")}
              </Pressable>
            </div>
          )}
          <WorkArticleHeader
            project={shown}
            viewLang={viewLang}
            onLangChange={setViewLang}
            isPreview
            viewHref={publishedHref ?? undefined}
            relatedPosts={relatedPosts}
            relatedSeries={relatedSeries}
          />
        </>
      )}
      heroImage={form.image || undefined}
      heroIcon={form.icon || undefined}
      heroAlt={form.title}
    />
  );
}

/**
 * 미리보기 본문 — 작업물이 온 뒤에만 그린다(번역 훅은 작업물이 있어야 부를 수 있다).
 *
 * 공개 상세와 같게, 보는 언어 칸에 글이 없으면 다른 언어 본문을 보여 주고 "AI 자동 번역" 단추를 낸다.
 * 다만 미리보기는 저장하지 않은 편집 내용일 수 있어 번역을 DB 에 쓰지 않는다 — 관리자 번역 경로로 번역만 받아
 * 이 화면에 덧씌운다(편집 화면으로 돌아가 저장하면 편집기의 값이 그대로 저장되므로, 여기서 쓴 번역이 편집기
 * 값을 덮거나 편집기 저장에 지워지는 일이 없다).
 */
function PreviewArticle({
  project,
  viewLang,
  renderHeader,
  heroImage,
  heroIcon,
  heroAlt,
}: {
  project: Project;
  viewLang: "ko" | "en";
  renderHeader: (shown: Project) => React.ReactNode;
  heroImage?: string;
  heroIcon?: string;
  heroAlt: string;
}) {
  const siteConfig = useSiteConfig();
  const translationEnabled = siteConfig?.translation?.enabled !== false;
  const translator = useCallback<WorkTranslator>(async (from, to) => {
    const keys = ["title", "subtitle", "description", "content"] as const;
    const texts = keys.map((k) => project[k][from] ?? "");
    const idx = texts.flatMap((text, i) => (text.trim() ? [i] : []));
    const result = await autoTranslate(idx.map((i) => texts[i]), from, to);
    if ("error" in result) throw result.error;
    const out: WorkTranslated = { title: "", subtitle: "", description: "", content: "" };
    idx.forEach((i, j) => { out[keys[i]] = result.translations[j] ?? ""; });
    return out;
  }, [project]);
  const { shown, needsTranslation, translating, error, translate } = useWorkTranslation(project, viewLang, translator);

  const content = pickContent(shown.content, viewLang);
  const isRichtext = shown.contentType === "richtext";

  const headings = useMemo<TocHeading[]>(() => {
    if (!content) return [];
    const h = extractHeadings(content, isRichtext);
    if (shown.gallery.length > 0) {
      h.push({ id: "gallery", text: "Gallery", level: 2 });
    }
    return h;
  }, [content, isRichtext, shown.gallery.length]);

  // richtext 코드블록 — Shiki 는 서버(/api/highlight)에서 처리(현재 보이는 본문).
  const [highlightedContent, setHighlightedContent] = useState(content);
  useEffect(() => {
    if (!isRichtext || !content) { setHighlightedContent(content); return; }
    let active = true;
    fetch("/api/highlight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: content }),
    })
      .then((r) => r.json())
      .then((d) => { if (active && d?.html) setHighlightedContent(d.html); })
      .catch(() => { if (active) setHighlightedContent(content); });
    return () => { active = false; };
  }, [content, isRichtext]);

  // 보이는 본문을 하이라이트된 것으로 교체한 project — 보는 언어 칸에 넣어 두면 본문이 그 칸을 그린다
  const highlightedProject = isRichtext
    ? { ...shown, content: { ...shown.content, [viewLang]: highlightedContent } }
    : shown;

  return (
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      heroImage={heroImage}
      heroIcon={heroIcon}
      heroAlt={heroAlt}
      headings={headings}
      header={renderHeader(shown)}
      afterContent={<WorkArticleGallery project={highlightedProject} viewLang={viewLang} />}
    >
      {needsTranslation && translationEnabled && (
        <TranslateBanner subject="work" viewLang={viewLang} translating={translating} error={error} onTranslate={translate} />
      )}
      <WorkArticleBody project={highlightedProject} viewLang={viewLang} isPreview />
    </DetailLayout>
  );
}
