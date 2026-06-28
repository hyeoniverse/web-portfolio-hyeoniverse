"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DetailLayout from "@/components/layout/DetailLayout";
import { PostArticleHeader, PostArticleBody } from "@/components/posts/PostArticleView";
import RecommendedSection from "@/app/posts/[slug]/_components/RecommendedSection";
import RelatedWorksCarousel, { type RelatedWork } from "@/app/posts/[slug]/_components/RelatedWorksCarousel";
import type { RecommendedPost } from "@/app/posts/[slug]/_components/types";
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

  // 디테일 페이지와 동일하게 관련 프로젝트/추천 글/이전·다음 (기존 글 프리뷰=fetchId 있을 때만)
  type AdjacentPost = { slug: string; title: string; title_en?: string; cover_image: string };
  const [relatedWorks, setRelatedWorks] = useState<RelatedWork[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<RecommendedPost[]>([]);
  const [adjacent, setAdjacent] = useState<{ prev: AdjacentPost | null; next: AdjacentPost | null }>({ prev: null, next: null });

  useEffect(() => {
    if (!fetchId) return;
    const ac = new AbortController();
    fetch(`/api/posts/${fetchId}/related-works`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (Array.isArray(d?.items)) setRelatedWorks(d.items); })
      .catch(() => {});
    fetch(`/api/posts/${fetchId}/related`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (Array.isArray(d)) setRecommendedPosts(d); })
      .catch(() => {});
    fetch(`/api/posts/${fetchId}/adjacent`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setAdjacent({ prev: d.prev ?? null, next: d.next ?? null }); })
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
      relatedContent={
        <RelatedWorksCarousel works={relatedWorks} viewLang={viewLang} onNavigate={(href) => router.push(href)} />
      }
      recommendedContent={
        recommendedPosts.length > 0 ? (
          <RecommendedSection posts={recommendedPosts} viewLang={viewLang} />
        ) : null
      }
      adjacentConfig={{
        prev: adjacent.prev ? {
          href: `/posts/${adjacent.prev.slug}`,
          title: viewLang === "en" && adjacent.prev.title_en ? adjacent.prev.title_en : adjacent.prev.title,
          image: adjacent.prev.cover_image,
        } : null,
        next: adjacent.next ? {
          href: `/posts/${adjacent.next.slug}`,
          title: viewLang === "en" && adjacent.next.title_en ? adjacent.next.title_en : adjacent.next.title,
          image: adjacent.next.cover_image,
        } : null,
        prevLabelKey: "postDetail.previous",
        nextLabelKey: "postDetail.next",
      }}
    >
      <PostArticleBody data={articleData} isPreview />
    </DetailLayout>
  );
}
