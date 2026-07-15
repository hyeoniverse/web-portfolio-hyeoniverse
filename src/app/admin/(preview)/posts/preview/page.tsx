"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DetailLayout from "@/components/layout/DetailLayout";
import { PostArticleHeader, PostArticleBody, PostArticleAuthors } from "@/components/posts/PostArticleView";
import RelatedWorksCarousel, { type RelatedWork } from "@/app/posts/[slug]/_components/RelatedWorksCarousel";
import { extractHeadings } from "@/utils/headingUtils";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import type { PostFormData } from "@/types/post";
import styles from "@/app/posts/[slug]/PostDetail.module.css";

export default function PostPreviewPage() {
  const { t } = useLanguage();
  const siteConfig = useSiteConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchId = searchParams.get("fetch");

  const [form, setForm] = useState<(PostFormData & { _trashId?: string }) | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { openModal } = useModalStore();
  const [viewLang, setViewLang] = useState<"ko" | "en">("ko");
  // 발행된 글이면 새창으로 열 href (fetch 프리뷰 한정 — 세션 프리뷰는 미저장이라 없음)
  const [publishedHref, setPublishedHref] = useState<string | null>(null);

  // 프리뷰 상단에 관련 프로젝트 캐러셀만 표시 (추천 글·이전/다음은 프리뷰에서 제외)
  const [relatedWorks, setRelatedWorks] = useState<RelatedWork[]>([]);

  useEffect(() => {
    if (!fetchId) return;
    const ac = new AbortController();
    fetch(`/api/posts/${fetchId}/related-works`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (Array.isArray(d?.items)) setRelatedWorks(d.items); })
      .catch(() => {});
    return () => ac.abort();
  }, [fetchId]);

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
              cover_position: post.cover_position ?? 50,
              cover_zoom: post.cover_zoom ?? 1,
              excerpt: post.excerpt || post.excerpt_en || "",
              tags: post.tags || [],
              author_ids: post.author_ids || [],
            } as PostFormData);
            if (post.published && post.slug) setPublishedHref(`/posts/${post.slug}`);
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

  // 브라우저 탭 제목 — Admin | Preview | 게시물 제목
  useEffect(() => {
    const prev = document.title;
    document.title = `Admin | Preview${displayTitle ? ` | ${displayTitle}` : ""}`;
    return () => { document.title = prev; };
  }, [displayTitle]);

  const headings = useMemo(() => {
    if (!content) return [];
    return extractHeadings(content, isMarkdown);
  }, [content, isMarkdown]);

  // author_ids → Author[] 해석. 미할당(빈 배열)이면 기본 작성자(첫 항목) fallback.
  const previewAuthors = useMemo(() => {
    const all = siteConfig?.authors ?? [];
    const resolved = (form?.author_ids ?? [])
      .map((id) => all.find((a) => a.id === id))
      .filter((a): a is (typeof all)[number] => Boolean(a));
    return resolved.length > 0 ? resolved : all.slice(0, 1);
  }, [siteConfig, form?.author_ids]);

  // richtext 코드블록 — Shiki 는 서버(/api/highlight)에서 처리(detail 과 동일 util/결과).
  const [highlightedContent, setHighlightedContent] = useState(content);
  useEffect(() => {
    if (isMarkdown || !content) { setHighlightedContent(content); return; }
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
    displayContent: highlightedContent,
    displayExcerpt,
    contentType: form.content_type,
    tags: form.tags,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    authors: previewAuthors,
    viewHref: publishedHref ?? undefined,
  };

  return (
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      heroImage={form.cover_image || undefined}
      heroAlt={form.title}
      heroIcon={form.icon}
      heroPosition={form.cover_position}
      heroZoom={form.cover_zoom}
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
      relatedContent={
        <RelatedWorksCarousel works={relatedWorks} viewLang={viewLang} onNavigate={(href) => router.push(href)} />
      }
      afterLike={<PostArticleAuthors authors={previewAuthors} />}
    >
      <PostArticleBody data={articleData} isPreview />
    </DetailLayout>
  );
}
