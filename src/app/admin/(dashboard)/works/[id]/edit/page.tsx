"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import WorkEditor from "@/components/works/WorkEditor";
import AdminNotFound from "@/components/admin/AdminNotFound";
import { SkeletonLine, SkeletonPill, SkeletonBlock } from "@/components/ui/Skeleton";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { useLenis } from "@/providers/LenisProvider";
import type { Work } from "@/types/work";
import wStyles from "@/components/works/WorkEditor.module.css";

function WorkEditorSkeleton() {
  return (
    <div className={es.container} aria-busy="true">
      {/* Top bar — title + action buttons */}
      <div className={es.topBar}>
        <SkeletonLine width={140} height="var(--skeleton-h-line-lg)" />
        <div className={es.topBarActions}>
          <SkeletonPill width={80} />
          <SkeletonPill width={80} />
          <SkeletonPill width={80} />
        </div>
      </div>

      {/* Basic Info */}
      <div className={wStyles.section}>
        <SkeletonLine width={100} />
        <SkeletonBlock height={44} />
        <div className={wStyles.row3}>
          <SkeletonBlock height="var(--button-h-md)" />
          <SkeletonBlock height="var(--button-h-md)" />
          <SkeletonBlock height="var(--button-h-md)" />
        </div>
        <div className={es.row}>
          <SkeletonBlock height="var(--button-h-md)" />
          <SkeletonBlock height="var(--button-h-md)" />
        </div>
        <div className={es.row}>
          <SkeletonBlock height="var(--button-h-md)" />
          <SkeletonBlock height="var(--button-h-md)" />
        </div>
      </div>

      {/* Description */}
      <div className={wStyles.section}>
        <SkeletonLine width={100} />
        <SkeletonBlock height={80} />
      </div>

      {/* Content (editor) */}
      <div className={wStyles.section}>
        <div className={wStyles.sectionTitleRow}>
          <SkeletonLine width={120} />
          <SkeletonPill width={140} />
        </div>
        <SkeletonBlock height={240} />
      </div>

      {/* Tech Stack */}
      <div className={wStyles.section}>
        <SkeletonLine width={80} />
        <SkeletonBlock height="var(--button-h-md)" />
        <div className={es.tags}>
          <SkeletonPill width={60} />
          <SkeletonPill width={80} />
          <SkeletonPill width={50} />
        </div>
      </div>

      {/* Images */}
      <div className={wStyles.section}>
        <SkeletonLine width={60} />
        <SkeletonBlock width={160} height={100} />
      </div>
    </div>
  );
}

export default function EditWorkPage() {
  const params = useParams();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/works/${params.id}`);
      if (!res.ok) {
        setError("Work not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setWork(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return <WorkEditorSkeleton />;
  }

  if (error || !work) {
    return (
      <AdminNotFound
        title={error || "작품을 찾을 수 없습니다"}
        backHref="/admin/works"
        backLabel="작품 목록으로"
      />
    );
  }

  return <WorkEditor work={work} />;
}
