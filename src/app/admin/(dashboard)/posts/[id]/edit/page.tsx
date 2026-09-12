"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PostEditor from "@/components/posts/PostEditor";
import AdminNotFound from "@/components/admin/AdminNotFound";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { useLenis } from "@/providers/LenisProvider";
import type { Post } from "@/types/post";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "@/components/posts/PostEditor.module.css";
import { errorText } from "@/lib/apiError";

/* 실패 응답 본문은 그대로 두고 그릴 때 화면 언어 문구로 바꾼다 — 효과 안에서 번역하면 번역 함수가 바뀔 때마다 다시 불러와야 한다 */
type LoadFailure = { status: number; body: unknown };

export default function EditPostPage() {
  const { t } = useLanguage();
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  useEffect(() => {
    /* 응답 코드를 구분해야 한다. 예전에는 본문만 보고 id 가 없으면 전부 "찾을 수 없습니다" 로
       그렸는데, 권한이 없어 403 이 온 경우까지 없는 글처럼 보였다. */
    (async () => {
      try {
        const res = await fetch(`/api/posts/${id}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.id) {
          setFailure({ status: res.status, body });
        } else {
          setPost(body as Post);
        }
      } catch {
        setFailure({ status: 0, body: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <EditorSkeleton />;

  if (!post || !post.id) {
    const denied = failure?.status === 403;
    return (
      <AdminNotFound
        variant={denied ? "denied" : "notFound"}
        title={denied ? t("admin.posts.editor.deniedTitle") : t("admin.posts.editor.notFoundTitle")}
        description={errorText(failure?.body, t, "") || undefined}
        backHref="/admin/posts"
        backLabel={t("admin.posts.editor.backToList")}
      />
    );
  }

  return <PostEditor post={post} />;
}

/* ── Skeleton ── */
function EditorSkeleton() {
  return (
    <div className={es.container}>
      {/* Top bar */}
      <div className={es.topBar}>
        <SkeletonLine width={100} height={16} />
        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
          <Skeleton width={80} height={34} borderRadius="var(--radius-capsule)" />
          <Skeleton width={90} height={34} borderRadius="var(--radius-capsule)" />
          <Skeleton width={80} height={34} borderRadius="var(--radius-capsule)" />
        </div>
      </div>

      {/* Title */}
      <div className={styles.meta}>
        <SkeletonLine width="60%" height={36} />

        {/* Slug row */}
        <div className={es.row}>
          <div className={es.field}>
            <SkeletonLine width={40} height={10} />
            <Skeleton height={34} borderRadius="var(--radius-capsule)" />
          </div>
        </div>

        {/* Excerpt */}
        <div className={es.field}>
          <SkeletonLine width={50} height={10} />
          <Skeleton height={60} borderRadius="var(--radius-2xl)" />
        </div>

        {/* Tags + Cover row */}
        <div className={es.row}>
          <div className={es.field}>
            <SkeletonLine width={30} height={10} />
            <Skeleton height={34} borderRadius="var(--radius-capsule)" />
          </div>
          <div className={es.field}>
            <SkeletonLine width={80} height={10} />
            <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
              <Skeleton width={70} height={34} borderRadius="var(--radius-capsule)" />
              <Skeleton width={100} height={34} borderRadius="var(--radius-capsule)" />
            </div>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div className={styles.editorSection}>
        <div className={es.editorHeader}>
          <SkeletonLine width={60} height={14} />
          <Skeleton width={160} height={30} borderRadius="var(--radius-capsule)" />
        </div>
        <Skeleton height={400} borderRadius="var(--radius-2xl)" />
      </div>
    </div>
  );
}
