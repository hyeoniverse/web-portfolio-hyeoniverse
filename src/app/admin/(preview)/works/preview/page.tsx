"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PREVIEW_KEY } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";
import DetailLayout from "@/components/layout/DetailLayout";
import { LandingRenderer } from "@/components/works/landing/LandingRenderer";
import { landingOf } from "@/components/works/landing/landingData";
import { useLanguage } from "@/providers/LanguageProvider";
import { sendAction } from "@/lib/sendAction";
import { useModalStore } from "@/stores/modalStore";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import { workFormToProject } from "@/types/work";
import type { WorkFormData } from "@/types/work";
import TrashPreviewBar from "@/components/admin/TrashPreviewBar/TrashPreviewBar";

export default function WorkPreviewPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchId = searchParams.get("fetch");

  const [form, setForm] = useState<(WorkFormData & { _trashId?: string }) | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { openModal } = useModalStore();

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
              cover_position: w.cover_position ?? 50,
              cover_zoom: w.cover_zoom ?? 1,
              content_ko: w.content_ko || "",
              content_en: w.content_en || "",
              content_type: w.content_type || "markdown",
              team_members: w.team_members || [],
              gallery: w.gallery || [],
              gallery_notes: w.gallery_notes || {},
              landing: w.landing ?? null,
              live_url: w.live_url || "",
              github_url: w.github_url || "",
              published: !!w.published,
              sort_order: w.sort_order ?? 0,
              is_pinned: !!w.is_pinned,
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
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm(parsed);
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
  /* 랜딩 글은 보는 언어 칸이 비면 다른 언어로 채워 그린다 — 화면 언어로 본다 */
  const viewLang = language === "en" ? "en" : "ko";

  if (!form || !project) {
    if (!ready) return null;
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        fontFamily: "var(--font-family-body)",
        color: "var(--text-tertiary)",
      }}>
        {t("admin.inline.previewPage.noData")}
      </div>
    );
  }

  return (
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      scrollButtons={false}
      heroAlt={form.title}
      headings={[]}
      header={null}
      landing={
        <>
          {trashId && (
            <TrashPreviewBar
              placement="block"
              notice={t("admin.works.trashPreviewNotice")}
              restoreLabel={t("admin.works.trashRestore")}
              purgeLabel={t("admin.works.trashPurge")}
              onRestore={handleRestore}
              onPurge={handlePurge}
              busy={busy}
            />
          )}
          <LandingRenderer data={landingOf(project)} project={project} viewLang={viewLang} next={null} nav={false} />
        </>
      }
    >
      {null}
    </DetailLayout>
  );
}
