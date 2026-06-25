"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import { WorkArticleHeader, WorkArticleBody, WorkArticleTeam } from "@/components/works/WorkArticleView";
import { extractHeadings } from "@/app/works/_utils";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import { workFormToProject } from "@/types/work";
import type { WorkFormData } from "@/types/work";

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
      const raw = sessionStorage.getItem("work-preview");
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
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      heroImage={form.image || undefined}
      heroAlt={form.title}
      headings={headings}
      afterContent={<WorkArticleTeam project={project} viewLang={viewLang} isPreview />}
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
          />
        </>
      }
    >
      <WorkArticleBody project={project} viewLang={viewLang} isPreview />
    </DetailLayout>
  );
}
