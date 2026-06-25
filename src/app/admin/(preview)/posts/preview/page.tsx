"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DetailLayout from "@/components/layout/DetailLayout";
import { PostArticleHeader, PostArticleBody } from "@/components/posts/PostArticleView";
import { extractHeadings } from "@/utils/headingUtils";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import type { PostFormData } from "@/types/post";
import styles from "@/app/posts/[slug]/PostDetail.module.css";

export default function PostPreviewPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchId = searchParams.get("fetch");

  const [form, setForm] = useState<(PostFormData & { _trashId?: string }) | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { openModal } = useModalStore();
  const [viewLang, setViewLang] = useState<"ko" | "en">("ko");

  useEffect(() => {
    if (fetchId) {
      fetch(`/api/posts/${fetchId}`)
        .then((r) => r.json())
        .then((post) => {
          if (post?.id) {
            setForm({
              title: post.title || post.title_en || "",
              content: post.content || post.content_en || "",
              content_type: post.content_type || "markdown",
              cover_image: post.cover_image || "",
              excerpt: post.excerpt || post.excerpt_en || "",
              tags: post.tags || [],
            } as PostFormData);
          }
        })
        .catch(() => {})
        .finally(() => setReady(true));
      return;
    }
    try {
      const raw = sessionStorage.getItem("post-preview");
      if (raw) setForm(JSON.parse(raw));
    } catch { /* ignore */ }
    setReady(true);
  }, [fetchId]);

  const trashId = form?._trashId;

  const handleRestore = useCallback(async () => {
    if (!trashId) return;
    setBusy(true);
    await fetch(`/api/posts/${trashId}/restore`, { method: "POST" });
    setBusy(false);
    router.push(`/admin/posts?restored=${trashId}`);
  }, [trashId, router]);

  const handlePurge = useCallback(() => {
    if (!trashId) return;
    const title = form?.title || "";
    openModal(
      <ModalPrompt
        hint={t("admin.posts.trashPurgeHint")}
        placeholder={title}
        validate={(v) => v === title}
        confirmText={t("admin.posts.trashPurge")}
        danger
        onConfirm={async () => {
          setBusy(true);
          await fetch(`/api/posts/${trashId}/purge`, { method: "DELETE" });
          setBusy(false);
          window.close();
        }}
      />,
      { id: "trash-purge", header: { title: `"${title}"` }, closeButton: true, width: "400px" },
    );
  }, [trashId, form?.title, t, openModal]);

  const content = viewLang === "en"
    ? (form?.content_en || form?.content || "")
    : (form?.content || form?.content_en || "");
  const displayTitle = viewLang === "en"
    ? (form?.title_en || form?.title || "")
    : (form?.title || form?.title_en || "");
  const displayExcerpt = viewLang === "en"
    ? (form?.excerpt_en || form?.excerpt || "")
    : (form?.excerpt || form?.excerpt_en || "");
  const isMarkdown = form?.content_type === "markdown";

  const headings = useMemo(() => {
    if (!content) return [];
    return extractHeadings(content, isMarkdown);
  }, [content, isMarkdown]);

  if (!form) {
    if (!ready) return null;
    return (
      <div className={styles.loadingState}>
        미리보기 데이터가 없습니다. 에디터에서 Preview 버튼을 눌러주세요.
      </div>
    );
  }

  const articleData = {
    displayTitle,
    displayContent: content,
    displayExcerpt,
    contentType: form.content_type,
    tags: form.tags,
    viewCount: 0,
    createdAt: new Date().toISOString(),
  };

  return (
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      heroImage={form.cover_image || undefined}
      heroAlt={form.title}
      headings={headings}
      header={
        <div className={styles.articleHeader}>
          <PostArticleHeader
            data={articleData}
            viewLang={viewLang}
            onLangChange={setViewLang}
            isPreview
            headerActionsLeft={
              trashId ? (
                <>
                  <span className={styles.trashBarLabel}>{t("admin.posts.trashPreviewNotice")}</span>
                  <button
                    type="button"
                    className={styles.trashBarRestore}
                    disabled={busy}
                    onClick={handleRestore}
                  >
                    {t("admin.posts.trashRestore")}
                  </button>
                  <button
                    type="button"
                    className={styles.trashBarPurge}
                    disabled={busy}
                    onClick={handlePurge}
                  >
                    {t("admin.posts.trashPurge")}
                  </button>
                </>
              ) : null
            }
          />
        </div>
      }
    >
      <PostArticleBody data={articleData} isPreview />
    </DetailLayout>
  );
}
