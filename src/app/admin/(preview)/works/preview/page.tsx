"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PREVIEW_KEY } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import { WorkArticleHeader, WorkArticleBody, type RelatedPostItem, type RelatedSeriesItem } from "@/components/works/WorkArticleView";
import { extractHeadings } from "@/app/works/_utils";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import { workFormToProject } from "@/types/work";
import type { WorkFormData } from "@/types/work";

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
  const [viewLang, setViewLang] = useState<"ko" | "en">(language === "en" ? "en" : "ko");

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
              live_url: w.live_url || "",
              github_url: w.github_url || "",
              published: !!w.published,
              sort_order: w.sort_order ?? 0,
              scheduled_at: w.scheduled_at ?? null,
              related_post_ids: w.related_post_ids || [],
              _trashId: w.deleted_at ? w.id : undefined,
            });
          }
        })
        .catch(() => {})
        .finally(() => setReady(true));
      return;
    }
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY.work);
      if (raw) setForm(JSON.parse(raw));
    } catch { /* ignore */ }
    setReady(true);
  }, [fetchId]);

  const trashId = form?._trashId;

  const handleRestore = useCallback(async () => {
    if (!trashId) return;
    setBusy(true);
    await fetch(`/api/works/${trashId}/restore`, { method: "POST" });
    setBusy(false);
    router.push(`/admin/works?restored=${trashId}`);
  }, [trashId, router]);

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
          await fetch(`/api/works/${trashId}/purge`, { method: "DELETE" });
          setBusy(false);
          window.close();
        }}
      />,
      { id: "trash-purge", header: { title: `"${title}"` }, closeButton: true, width: "400px" },
    );
  }, [trashId, form?.title, t, openModal]);

  // form → Project (detail 페이지와 동일 shape). workToProject 재사용.
  const project = useMemo(() => (form ? workFormToProject(form) : null), [form]);

  const content = project ? (project.content[viewLang] || project.content.ko) : "";
  const isRichtext = project?.contentType === "richtext";

  const headings = useMemo<TocHeading[]>(() => {
    if (!content) return [];
    const h = extractHeadings(content, isRichtext);
    if (project && project.gallery.length > 0) {
      h.push({ id: "gallery", text: "Gallery", level: 2 });
    }
    return h;
  }, [content, isRichtext, project]);

  // richtext 코드블록 — Shiki 는 서버(/api/highlight)에서 처리(현재 viewLang content).
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

  // 현재 viewLang content 를 하이라이트된 것으로 교체한 project
  const highlightedProject = isRichtext
    ? { ...project, content: { ...project.content, [viewLang]: highlightedContent } }
    : project;

  return (
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      heroImage={form.image || undefined}
      heroIcon={form.icon || undefined}
      heroAlt={form.title}
      headings={headings}
      header={
        <>
          {trashId && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
                {t("admin.works.trashPreviewNotice")}
              </span>
              <button type="button" disabled={busy} onClick={handleRestore} style={{ cursor: "pointer" }}>
                {t("admin.works.trashRestore")}
              </button>
              <button type="button" disabled={busy} onClick={handlePurge} style={{ cursor: "pointer", color: "var(--text-accent)" }}>
                {t("admin.works.trashPurge")}
              </button>
            </div>
          )}
          <WorkArticleHeader
            project={project}
            viewLang={viewLang}
            onLangChange={setViewLang}
            isPreview
            relatedPosts={relatedPosts}
            relatedSeries={relatedSeries}
          />
        </>
      }
    >
      <WorkArticleBody project={highlightedProject} viewLang={viewLang} isPreview />
    </DetailLayout>
  );
}
