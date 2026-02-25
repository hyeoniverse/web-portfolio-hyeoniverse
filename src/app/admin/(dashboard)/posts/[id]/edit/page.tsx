"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PostEditor from "@/components/posts/PostEditor";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import type { Post } from "@/types/post";
import styles from "@/components/posts/PostEditor.module.css";

export default function EditPostPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <EditorSkeleton />;

  if (!post) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-tertiary)" }}>
        Post not found
      </div>
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
            <Skeleton height={34} borderRadius="var(--radius-md)" />
          </div>
        </div>

        {/* Excerpt */}
        <div className={es.field}>
          <SkeletonLine width={50} height={10} />
          <Skeleton height={60} borderRadius="var(--radius-md)" />
        </div>

        {/* Tags + Cover row */}
        <div className={es.row}>
          <div className={es.field}>
            <SkeletonLine width={30} height={10} />
            <Skeleton height={34} borderRadius="var(--radius-md)" />
          </div>
          <div className={es.field}>
            <SkeletonLine width={80} height={10} />
            <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
              <Skeleton width={70} height={34} borderRadius="var(--radius-md)" />
              <Skeleton width={100} height={34} borderRadius="var(--radius-md)" />
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
        <Skeleton height={400} borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
}
