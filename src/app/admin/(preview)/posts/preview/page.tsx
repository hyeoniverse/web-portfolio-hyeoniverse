"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import DetailLayout from "@/components/layout/DetailLayout";
import { extractHeadings, addIdsToHtml } from "@/utils/headingUtils";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import type { PostFormData } from "@/types/post";
import styles from "@/app/posts/[slug]/PostDetail.module.css";

export default function PostPreviewPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<(PostFormData & { _trashId?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const { openModal } = useModalStore();
  const richtextRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const fetchId = searchParams.get("fetch");

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
        .catch(() => {});
      return;
    }
    try {
      const raw = sessionStorage.getItem("post-preview");
      if (raw) setForm(JSON.parse(raw));
    } catch {
      // ignore
    }
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
        cancelText={t("admin.posts.cancel")}
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

  const content = form?.content ?? "";
  const isMarkdown = form?.content_type === "markdown";

  const headings = useMemo(() => {
    if (!content) return [];
    return extractHeadings(content, isMarkdown);
  }, [content, isMarkdown]);

  const processedHtml = useMemo(() => {
    if (isMarkdown || !content) return "";
    return addIdsToHtml(content);
  }, [content, isMarkdown]);

  useRichtextEnhance(richtextRef, processedHtml);

  if (!form) {
    return (
      <div className={styles.loadingState}>
        미리보기 데이터가 없습니다. 에디터에서 Preview 버튼을 눌러주세요.
      </div>
    );
  }

  const readTime = Math.max(1, Math.ceil(content.length / 1000));

  return (
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      heroImage={form.cover_image || undefined}
      heroAlt={form.title}
      headings={headings}
    >
      <div className={styles.articleHeader}>
        <div className={styles.meta}>
          <span>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          <span className={styles.dot}>&middot;</span>
          <span>{readTime} min read</span>
          {trashId && (
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
          )}
        </div>

        <h1 className={styles.articleTitle}>{form.title}</h1>

        {form.excerpt && <p className={styles.excerpt}>{form.excerpt}</p>}

        {form.tags.length > 0 && (
          <div className={styles.tags}>
            {form.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        <div className={styles.headerDivider} />
      </div>

      {isMarkdown ? (
        <MarkdownRenderer content={content} className={styles.prose} />
      ) : (
        <div
          ref={richtextRef}
          className={styles.prose}
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      )}
    </DetailLayout>
  );
}
