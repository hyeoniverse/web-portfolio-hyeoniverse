"use client";

import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown, ExternalLink, GripVertical, Plus, Unlink, Trash2 } from "@/components/icons";
import EditableRowNumber from "@/components/admin/AdminTable/EditableRowNumber";
import { motion, LayoutGroup } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { BilingualCategory } from "@/types/common";
import { Switch } from "@/components/ui/Switch";
import { SERIES_TITLE_MAX, type Series, type SeriesPostItem } from "@/types/post";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Field from "./SettingsFormFields";
import T from "@/components/ui/T";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import { SkeletonLine } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { matchesSearch } from "@/lib/koSearch";
import styles from "./SeriesInlineEditor.module.css";
import EmptyState from "@/components/ui/EmptyState";
import shared from "../Settings.module.css";

/* ── SeriesInlineEditor ── */

interface SeriesInlineEditorProps {
  series: Series | null;
  categories: BilingualCategory[];
  /** 저장 완료 — 새로 만든 경우 새 series 객체 전달 */
  onSave: (saved?: Series) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onCoverChange?: (url: string) => void;
  /** 외부 shell 안에서 렌더 — 자체 border / radius 생략 */
  bare?: boolean;
  /** standalone 모드에서 자체 제목 헤더 숨김 — 외부에서 제목 렌더 */
  hideStandaloneHeader?: boolean;
  /** 외부에서 하단 actions(취소/저장) 도 함께 숨길 때 사용 */
  hideBottomActions?: boolean;
  /** form 의 인라인 발행 토글 fieldRow 숨김 — 외부 헤더에서 토글 렌더할 때 */
  hideInlinePublishToggle?: boolean;
  /** form 상태 변경 알림 (외부 헤더의 토글/저장 버튼 동기화 용) */
  onFormStateChange?: (state: { published: boolean; saving: boolean }) => void;
  /** 새 시리즈 default sort_order 계산용 — 현재 시리즈 총 개수 (default = totalCount + 1, 맨 뒤) */
  totalCount?: number;
}

/** 외부에서 호출 가능한 명령 — save / setPublished */
export interface SeriesInlineEditorHandle {
  save: () => void;
  setPublished: (v: boolean) => void;
}

const SeriesInlineEditor = forwardRef<SeriesInlineEditorHandle, SeriesInlineEditorProps>(function SeriesInlineEditor({
  series,
  onSave,
  onCancel,
  onCoverChange,
  bare = false,
  hideStandaloneHeader = false,
  hideBottomActions = false,
  hideInlinePublishToggle = false,
  onFormStateChange,
  totalCount = 0,
}, ref) {
  const { t } = useLanguage();
  const ts = (key: string) => t(`admin.posts.seriesModal.${key}`);
  // 콘텐츠 작성 기본 언어 — 필수 제목의 기준 (en 기본이면 영문 제목이 필수)
  const primaryLang = useSiteConfig().metadata.defaultLanguage as "ko" | "en";
  const isEdit = !!series;

  /* 초기값 — revert 시 이 값으로 복원. series prop 변경 시 갱신.
     desiredPosition: 새 시리즈일 때 사용자가 원하는 list position (1-based, default totalCount+1 = 맨 뒤). */
  const initialForm = useMemo(() => ({
    title: series?.title ?? "",
    title_en: series?.title_en ?? "",
    description: series?.description ?? "",
    description_en: series?.description_en ?? "",
    cover_image: series?.cover_image ?? "",
    published: series?.published ?? true,
    desiredPosition: totalCount + 1,
  }), [series, totalCount]);

  const [form, setForm] = useState(initialForm);

  /* totalCount 가 비동기로 늦게 도착하는 케이스 — 새 시리즈일 때 desiredPosition 을 최신 totalCount+1 로 동기화.
     마운트 시점에 totalCount=0 이라 1 로 시작했어도, total 이 로드되면 default 갱신. */
  useEffect(() => {
    if (isEdit) return;
    setForm((prev) => ({ ...prev, desiredPosition: totalCount + 1 }));
  }, [totalCount, isEdit]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverPickerClosing, setCoverPickerClosing] = useState(false);
  const coverPickerCloseTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const closeCoverPicker = () => {
    if (coverPickerCloseTimer.current) clearTimeout(coverPickerCloseTimer.current);
    setCoverPickerClosing(true);
    coverPickerCloseTimer.current = setTimeout(() => {
      setShowCoverPicker(false);
      setCoverPickerClosing(false);
    }, 450);
  };
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<SeriesPostItem[]>([]);
  const [originalPosts, setOriginalPosts] = useState<SeriesPostItem[]>([]);
  const [removedPostIds, setRemovedPostIds] = useState<Set<string>>(new Set());

  /* dirty 체크 — form 변경 OR posts 변경 (제거/추가/순서). originalPosts.id 와 posts.id 비교 */
  const isDirty = useMemo(() => {
    const formDirty = (Object.keys(initialForm) as Array<keyof typeof initialForm>).some(
      (k) => form[k] !== initialForm[k],
    );
    if (formDirty) return true;
    if (removedPostIds.size > 0) return true;
    if (posts.length !== originalPosts.length) return true;
    // 순서 변경 또는 추가 감지 — id 배열 비교
    return posts.some((p, i) => p.id !== originalPosts[i]?.id);
  }, [form, initialForm, posts, originalPosts, removedPostIds]);

  const handleRevert = () => {
    setForm(initialForm);
    setPosts(originalPosts);
    setRemovedPostIds(new Set());
  };

  const [postsLoading, setPostsLoading] = useState(false);
  const [showAddPost, setShowAddPost] = useState(false);
  const [addPostVisible, setAddPostVisible] = useState(false);
  const [addPostClosing, setAddPostClosing] = useState(false);

  const [addPostHint, setAddPostHint] = useState(false);

  const openAddPost = () => {
    if (showAddPost) {
      setAddPostHint(true);
      setTimeout(() => setAddPostHint(false), 1500);
      return;
    }
    setShowAddPost(true);
    setAddSearch("");
    if (availablePosts.length === 0 && !addLoading) fetchAvailablePosts();
    requestAnimationFrame(() => requestAnimationFrame(() => setAddPostVisible(true)));
  };

  const closeAddPost = () => {
    setAddPostVisible(false);
    setAddPostClosing(true);
    setTimeout(() => { setShowAddPost(false); setAddPostClosing(false); setAddSelected(new Set()); }, 250);
  };
  const [availablePosts, setAvailablePosts] = useState<SeriesPostItem[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set());
  const addDragStart = useRef<number | null>(null);
  const addDragAdding = useRef(true);
  const addListRef = useRef<HTMLDivElement>(null);
  const addScrollDir = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (!addListRef.current || addDragStart.current === null || addScrollDir.current === 0) {
        raf = 0;
        return;
      }
      addListRef.current.scrollTop += addScrollDir.current * 5;
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e: MouseEvent) => {
      if (addDragStart.current === null || !addListRef.current) { addScrollDir.current = 0; return; }
      const rect = addListRef.current.getBoundingClientRect();
      if (e.clientY < rect.top) addScrollDir.current = -1;
      else if (e.clientY > rect.bottom) addScrollDir.current = 1;
      else { addScrollDir.current = 0; return; }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onUp = () => { addScrollDir.current = 0; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  // grip handle 을 mousedown 했을 때만 카드의 draggable 이 켜짐 — 핸들 외 영역으로는 드래그 시작 X
  const [dragArmedId, setDragArmedId] = useState<string | null>(null);
  const [postsPage, setPostsPage] = useState(0);
  const [editingOrderIdx, setEditingOrderIdx] = useState<number | null>(null);
  const [editingOrderValue, setEditingOrderValue] = useState("");
  const POSTS_PAGE_SIZE = 5;

  useEffect(() => {
    const onMouseUp = () => { addDragStart.current = null; };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  useEffect(() => {
    if (!series?.id) return;
    setPostsLoading(true);
    fetch(`/api/series/${series.id}`)
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data.posts ?? []).sort(
          (a: SeriesPostItem, b: SeriesPostItem) => a.series_order - b.series_order
        );
        setPosts(sorted);
        setOriginalPosts(sorted);
        setRemovedPostIds(new Set());
      })
      .finally(() => setPostsLoading(false));
  }, [series?.id]);

  /* 탭 포커스 복귀 시 게시물 목록 자동 새로고침 */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && showAddPost && !addLoading) {
        fetchAvailablePosts();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddPost, addLoading]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "cover_image") onCoverChange?.(value as string);
    setError("");
  };

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        updateField("cover_image", data.url);
      } catch {
        setError(ts("uploadFailed"));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleRemovePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setRemovedPostIds((prev) => new Set(prev).add(postId));
  };

  const handleReorder = (index: number, direction: -1 | 1) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= posts.length) return;
    const updated = [...posts];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    updated.forEach((p, i) => (p.series_order = i));
    setPosts(updated);
  };

  const handleDragDrop = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const updated = [...posts];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    updated.forEach((p, i) => (p.series_order = i));
    setPosts(updated);
  };


  const handleOrderSubmit = (fromIdx: number, targetNum: number) => {
    const toIdx = Math.max(0, Math.min(posts.length - 1, targetNum - 1));
    if (fromIdx === toIdx) { setEditingOrderIdx(null); return; }
    const updated = [...posts];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    updated.forEach((p, i) => (p.series_order = i));
    setPosts(updated);
    setEditingOrderIdx(null);
    // 이동한 위치의 페이지로 이동
    setPostsPage(Math.floor(toIdx / POSTS_PAGE_SIZE));
  };

  const fetchAvailablePosts = async () => {
    setAddLoading(true);
    try {
      const res = await fetch("/api/posts?all=true&limit=200");
      const data = await res.json();
      const allPosts = (data.posts ?? []) as SeriesPostItem[];
      const currentIds = new Set(posts.map((p) => p.id));
      setAvailablePosts(allPosts.filter((p) => !p.series_id && !currentIds.has(p.id)));
    } catch { /* ignore */ }
    setAddLoading(false);
  };

  const toggleAddSelect = (id: string) => {
    setAddSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    if (addSelected.size === 0) return;
    let order = posts.length;
    const toAdd = availablePosts.filter((p) => addSelected.has(p.id));
    setPosts((prev) => [...prev, ...toAdd.map((p) => ({ ...p, series_order: order++ }))]);
    setAvailablePosts((prev) => prev.filter((p) => !addSelected.has(p.id)));
    setAddSelected(new Set());
  };

  const handleSave = async () => {
    if (!(primaryLang === "en" ? form.title_en : form.title).trim()) {
      setError(ts("titleRequired"));
      return;
    }
    if (form.title.length > SERIES_TITLE_MAX || form.title_en.length > SERIES_TITLE_MAX) {
      setError(ts("titleTooLong").replace("{{max}}", String(SERIES_TITLE_MAX)));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = isEdit && series ? `/api/series/${series.id}` : "/api/series";
      const method = isEdit ? "PATCH" : "POST";
      // desiredPosition 은 form 내부용 — body 에서 분리. POST default 는 max+1, 사용자 위치 변경은 PATCH 로 별도 처리.
      const { desiredPosition: _desiredPosition, ...formBody } = form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formBody),
      });
      if (!res.ok) throw new Error(ts("saveFailed"));
      const savedSeries = (await res.json()) as Series;
      /* 새 시리즈 + 사용자가 원한 position 이 기본 (맨 뒤) 와 다르면 PATCH 로 위치 변경 (backend auto-shift) */
      if (!isEdit && form.desiredPosition !== totalCount + 1) {
        // 현재 list 의 (position-1) 번째 시리즈의 sort_order 자리로 이동
        try {
          const listRes = await fetch(`/api/series?all=true&sortBy=default&sortDir=asc&page=0&limit=200`);
          const listData = await listRes.json();
          const items = (Array.isArray(listData?.items) ? listData.items : []) as Series[];
          const target = items[form.desiredPosition - 1];
          if (target && target.id !== savedSeries.id) {
            await fetch(`/api/series/${savedSeries.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sort_order: target.sort_order }),
            });
          }
        } catch { /* ignore — 위치 변경 실패 시 default 위치 유지 */ }
      }

      /* 포스트 변경사항 일괄 반영 — 새 시리즈 / edit 둘 다. savedSeries.id 로 연결. */
      // 제거된 포스트 (edit 만 의미 — 새 시리즈는 removedPostIds 항상 빈 Set)
      for (const id of removedPostIds) {
        await fetch(`/api/posts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ series_id: null, series_order: 0 }),
        });
      }
      // 추가/순서 변경된 포스트 — 새 시리즈는 모든 posts 가 신규 연결
      const originalIds = new Set(originalPosts.map((o) => o.id));
      for (const p of posts) {
        const orig = originalPosts.find((o) => o.id === p.id);
        const isNew = !originalIds.has(p.id);
        if (isNew) {
          await fetch(`/api/posts/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ series_id: savedSeries.id, series_order: p.series_order }),
          });
        } else if (!orig || orig.series_order !== p.series_order) {
          await fetch(`/api/posts/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ series_order: p.series_order }),
          });
        }
      }

      onSave(savedSeries);
    } catch (err) {
      setError(err instanceof Error ? err.message : ts("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // standalone (새 시리즈 생성 시 — series === null) 면 head 없이 단독 렌더되므로
  // 상단 border + 풀 radius 필요. 기존 시리즈 펼친 상태는 head 가 위에 있어 hairline + 하단 radius 만으로 OK
  const isStandalone = !series;

  /* 외부 헤더(예: SeriesManager 의 shell) 가 제어할 수 있도록 핸들 노출 */
  // handleSave / updateField 는 매 렌더마다 새 reference 라 deps 에 넣으면 매번 imperative handle 재생성 — 의도와 다름.
  // ref 로 최신 값 보관해 stable handle 유지.
  const handleSaveRef = useRef(handleSave);
  const updateFieldRef = useRef(updateField);
  handleSaveRef.current = handleSave;
  updateFieldRef.current = updateField;
  useImperativeHandle(ref, () => ({
    save: () => { void handleSaveRef.current(); },
    setPublished: (v: boolean) => updateFieldRef.current("published", v),
  }), []);

  /* form 상태 변경을 외부에 알림 (토글/저장 버튼 동기화) */
  useEffect(() => {
    onFormStateChange?.({ published: form.published, saving });
  }, [form.published, saving, onFormStateChange]);

  return (
    <div className={
      bare
        ? styles.seriesCardBodyBare
        : `${styles.seriesCardBody}${isStandalone ? ` ${styles.seriesCardBodyStandalone}` : ""}`
    }>
      {isStandalone && !hideStandaloneHeader && (
        <div className={styles.seriesStandaloneHeader}>
          <h3 className={styles.seriesStandaloneTitle}>
            <span className={shared.seriesCardOrderPrefix}>
              #
              <EditableRowNumber
                value={form.desiredPosition}
                min={1}
                max={totalCount + 1}
                onSave={(n) => updateField("desiredPosition", n)}
              />
              _
            </span>
            <T k="admin.posts.seriesModal.newTitle" />
          </h3>
          <div className={styles.seriesStandaloneActions}>
            <div className={shared.publishToggle}>
              <Switch
                size="md"
                checked={form.published}
                onCheckedChange={(v) => updateField("published", v)}
              />
              <span key={form.published ? "pub" : "draft"} className={shared.publishLabel}>{form.published ? ts("publishedLabel") : ts("draftLabel")}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRevert} disabled={!isDirty || saving} soundDisabled>
              <T k="admin.posts.seriesModal.revert" />
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel} soundDisabled>
              <T k="admin.posts.seriesModal.cancel" />
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} loading={saving} soundDisabled>
              <T k="admin.posts.seriesModal.create" />
            </Button>
          </div>
        </div>
      )}
      <div className={shared.fieldPair}>
        <Field label={ts("titleLabel")} langBadge="ko" value={form.title} onChange={(v) => updateField("title", v)} required={primaryLang === "ko"} maxHint={SERIES_TITLE_MAX} maxLength={SERIES_TITLE_MAX} />
        <Field label={ts("titleLabel")} langBadge="en" value={form.title_en} onChange={(v) => updateField("title_en", v)} required={primaryLang === "en"} maxHint={SERIES_TITLE_MAX} maxLength={SERIES_TITLE_MAX} />
      </div>
      <div className={shared.fieldPair}>
        <Field label={ts("descLabel")} langBadge="ko" value={form.description} onChange={(v) => updateField("description", v)} multiline maxHint={200} />
        <Field label={ts("descLabel")} langBadge="en" value={form.description_en} onChange={(v) => updateField("description_en", v)} multiline maxHint={200} />
      </div>
      {/* 순서 — fieldPair (시리즈 카테고리 필드 제거: 카테고리는 멤버 글에서 도출) */}
      <div className={shared.fieldPair}>
        {!isEdit && (
          <div className={shared.fieldRow}>
            <label className={shared.fieldLabel}>
              <span className={shared.fieldLabelText}>
                순서
                <span className={shared.fieldRequiredDot} aria-label="필수">•</span>
              </span>
            </label>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableRowNumber
                value={form.desiredPosition}
                min={1}
                max={totalCount + 1}
                onSave={(n) => updateField("desiredPosition", n)}
              />
            </div>
          </div>
        )}
      </div>
      {!hideInlinePublishToggle && (!isStandalone || (hideStandaloneHeader && !hideBottomActions)) && (
        <div className={shared.fieldRow}>
          <label className={shared.fieldLabel}><T k="admin.posts.seriesModal.published" /></label>
          <div className={shared.publishToggle}>
            <Switch
              size="md"
              checked={form.published}
              onCheckedChange={(v) => updateField("published", v)}
            />
            <span key={form.published ? "pub" : "draft"} className={shared.publishLabel}>{form.published ? ts("publishedLabel") : ts("draftLabel")}</span>
          </div>
        </div>
      )}
      <div className={shared.fieldRow}>
        <label className={shared.fieldLabel}><T k="admin.posts.seriesModal.coverImage" /></label>
        {form.cover_image ? (
          <div className={shared.logoUpload}>
            <div className={shared.seriesCoverPreview}>
              <Image src={form.cover_image} alt="" width={288} height={162} className={shared.logoPreviewImage} unoptimized />
            </div>
            <Button variant="outline" size="md" tone="danger" onClick={() => updateField("cover_image", "")}>
              <T k="admin.posts.seriesModal.remove" />
            </Button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
              <Button variant="outline" size="md" onClick={handleImageUpload} loading={uploading}>
                <T k="admin.posts.seriesModal.uploadCover" />
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  if (showCoverPicker && !coverPickerClosing) closeCoverPicker();
                  else if (!showCoverPicker) setShowCoverPicker(true);
                }}
              >
                {showCoverPicker && !coverPickerClosing ? <T k="admin.posts.seriesModal.closePicker" /> : <T k="admin.posts.seriesModal.chooseCover" />}
              </Button>
            </div>
            {showCoverPicker && (
              <CoverImagePicker
                onSelect={(url) => { updateField("cover_image", url); closeCoverPicker(); }}
                onClose={closeCoverPicker}
                closing={coverPickerClosing}
                postContext={{ title: form.title, tags: [], excerpt: form.description }}
              />
            )}
          </>
        )}
      </div>

      {/* 포함된 글 — edit 시 기존 글 표시 + 추가/제거. 새 시리즈 시 미리 연결할 글 추가 가능. */}
      <div className={styles.seriesPostsSection}>
          <div className={styles.seriesPostsHeader}>
            <label className={shared.fieldLabel} style={{ flexDirection: "row", gap: "4px", whiteSpace: "nowrap" }}><T k="admin.posts.seriesModal.posts" /> ({posts.length})</label>
            <Button
              variant="ghost"
              size="xs"
              icon={addPostHint ? undefined : <Plus size={14} strokeWidth={2} />}
              onClick={openAddPost}
            >
              {addPostHint ? <T k="admin.posts.seriesModal.addPostHint" /> : <T k="admin.posts.seriesModal.addPost" />}
            </Button>
          </div>
          <div className={`${styles.addPostModal} ${addPostVisible ? styles.addPostModalOpen : ""}`}>
            <div>
            {(showAddPost || addPostClosing) && (<>

              <div className={styles.addPostHeader}>
                <input
                  className={styles.addPostSearch}
                  type="text"
                  placeholder={t("admin.posts.search")}
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  autoFocus
                />
                {addSelected.size > 0 && (
                  <Button variant="primary" size="xs" onClick={handleAddSelected}>
                    {addSelected.size}개 추가
                  </Button>
                )}
                <button type="button" className={styles.addPostClose} onClick={closeAddPost}>✕</button>
              </div>
              <div
                ref={addListRef}
                className={styles.addPostList}
                data-lenis-prevent
              >
                {addLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2xs)", padding: "var(--spacing-xs) var(--spacing-sm)" }}>
                    {[0, 1, 2, 3, 4].map((i) => <SkeletonLine key={i} width={`${70 - i * 8}%`} height={24} />)}
                  </div>
                ) : (() => {
                  const filtered = availablePosts.filter((p) =>
                    matchesSearch(addSearch, p.title ?? "")
                  );
                  return filtered.length === 0 ? (
                    <EmptyState pad="sm">{t("admin.posts.seriesModal.noAvailablePosts")}</EmptyState>
                  ) : (
                    filtered.map((p, i) => (
                      <div
                        key={p.id}
                        className={`${styles.addPostItem} ${addSelected.has(p.id) ? styles.addPostItemSelected : ""}`}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          addDragStart.current = i;
                          addDragAdding.current = !addSelected.has(p.id);
                          toggleAddSelect(p.id);
                        }}
                        onMouseEnter={() => {
                          if (addDragStart.current === null || addDragStart.current === i) return;
                          const start = Math.min(addDragStart.current, i);
                          const end = Math.max(addDragStart.current, i);
                          setAddSelected((prev) => {
                            const next = new Set(prev);
                            for (let j = start; j <= end; j++) {
                              if (addDragAdding.current) next.add(filtered[j].id);
                              else next.delete(filtered[j].id);
                            }
                            return next;
                          });
                        }}
                      >
                        <Checkbox
                          checked={addSelected.has(p.id)}
                          onChange={() => toggleAddSelect(p.id)}
                          shape="square"
                        />
                        <span className={styles.addPostNum}>#{p.post_number ?? "—"}</span>
                        <span
                          className={styles.addPostTitle}
                          role="link"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/admin/posts/preview?fetch=${p.id}`, "_blank");
                          }}
                        >
                          {p.title || t("admin.posts.seriesModal.untitled")}
                        </span>
                        <StatusBadge variant={p.published ? "published" : "draft"}>
                          {p.published ? t("admin.posts.published") : t("admin.posts.draft")}
                        </StatusBadge>
                      </div>
                    ))
                  );
                })()}
              </div>
            </>)}
            </div>
          </div>
          {postsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
              {[0, 1, 2].map((i) => <SkeletonLine key={i} width="100%" height={32} />)}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState pad="sm"><T k="admin.posts.seriesModal.postsEmpty" /></EmptyState>
          ) : (
            <LayoutGroup>
            <div className={styles.seriesPostsList}>
              {posts.slice(postsPage * POSTS_PAGE_SIZE, (postsPage + 1) * POSTS_PAGE_SIZE).map((post) => {
                const idx = posts.indexOf(post);
                return (
                <motion.div
                  key={post.id}
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.6 }}
                  className={`${styles.seriesPostItem} ${dragIdx === idx ? styles.seriesPostDragging : ""} ${overIdx === idx && dragIdx !== idx ? (dragIdx !== null && dragIdx < idx ? styles.seriesPostDropBelow : styles.seriesPostDropAbove) : ""}`}
                  // grip handle 이 mousedown 으로 armed 했을 때만 draggable 활성화
                  draggable={dragArmedId === post.id}
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
                  onDragLeave={() => setOverIdx(null)}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); setDragArmedId(null); }}
                  onDrop={() => {
                    if (dragIdx !== null) handleDragDrop(dragIdx, idx);
                    setDragIdx(null);
                    setOverIdx(null);
                    setDragArmedId(null);
                  }}
                >
                  <span
                    className={styles.seriesPostHandle}
                    onMouseDown={(e) => { e.stopPropagation(); setDragArmedId(post.id); }}
                    onMouseUp={() => { if (dragArmedId === post.id) setDragArmedId(null); }}
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    data-cursor="grab"
                  >
                    <GripVertical size={14} strokeWidth={1.8} />
                  </span>
                  <div
                    className={styles.seriesPostOrder}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    <button
                      type="button"
                      className={styles.seriesPostOrderBtn}
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); handleReorder(idx, -1); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      <ChevronUp size={10} strokeWidth={1.5} />
                    </button>
                    {editingOrderIdx === idx ? (
                      <input
                        className={styles.seriesPostOrderInput}
                        type="number"
                        min={1}
                        max={posts.length}
                        value={editingOrderValue}
                        onChange={(e) => setEditingOrderValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleOrderSubmit(idx, parseInt(editingOrderValue, 10));
                          if (e.key === "Escape") setEditingOrderIdx(null);
                        }}
                        onBlur={() => {
                          const num = parseInt(editingOrderValue, 10);
                          if (!isNaN(num)) handleOrderSubmit(idx, num);
                          else setEditingOrderIdx(null);
                        }}
                        autoFocus
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    ) : (
                      <span
                        className={styles.seriesPostOrderNum}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingOrderIdx(idx);
                          setEditingOrderValue(String(idx + 1));
                        }}
                        title="더블클릭하여 순서 변경"
                      >
                        {idx + 1}
                      </span>
                    )}
                    <button
                      type="button"
                      className={styles.seriesPostOrderBtn}
                      disabled={idx === posts.length - 1}
                      onClick={(e) => { e.stopPropagation(); handleReorder(idx, 1); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      <ChevronDown size={10} strokeWidth={1.5} />
                    </button>
                  </div>
                  <a
                    href={`/admin/posts/${post.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.seriesPostTitle}
                  >
                    {post.title || <T k="admin.posts.seriesModal.untitled" />}
                  </a>
                  <StatusBadge variant={post.published ? "published" : "draft"}>
                    {post.published ? t("admin.posts.published") : t("admin.posts.draft")}
                  </StatusBadge>
                  {/* 아이콘 버튼 묶음 — ExternalLink + Unlink + Trash. ghost 스타일, 한 그룹 */}
                  <div
                    className={styles.seriesPostActions}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    <a
                      href={`/posts/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.seriesPostOrderBtn} ${styles.seriesPostViewBtn}`}
                      title={t("admin.posts.seriesModal.viewPost")}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      className={`${styles.seriesPostOrderBtn} ${styles.seriesPostRemoveBtn}`}
                      onClick={(e) => { e.stopPropagation(); handleRemovePost(post.id); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title={t("admin.posts.seriesModal.removeFromSeries")}
                    >
                      <Unlink size={10} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.seriesPostOrderBtn} ${styles.seriesPostDeleteBtn}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`"${post.title}" — ${t("admin.posts.deleteConfirm")}`)) return;
                        handleRemovePost(post.id);
                        fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title={t("admin.posts.delete")}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </motion.div>
                );
              })}
              {Math.ceil(posts.length / POSTS_PAGE_SIZE) > 1 && (
                <div className={styles.seriesPostsPaging}>
                  {Array.from({ length: Math.ceil(posts.length / POSTS_PAGE_SIZE) }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.seriesPostsPageBtn} ${i === postsPage ? styles.seriesPostsPageBtnActive : ""}`}
                      onClick={() => setPostsPage(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </LayoutGroup>
          )}
        </div>

      {error && <p className={shared.sectionHint} style={{ color: "var(--color-accent)" }}>{error}</p>}

      {/* standalone 모드는 상단 header 에 cancel/create 가 있어 하단 버튼 중복 방지로 숨김
         단, 외부 shell 이 헤더를 대체할 때(hideStandaloneHeader)는 하단 버튼을 다시 표시
         외부에서 actions 를 직접 렌더할 때(hideBottomActions)는 양쪽 모두 숨김 */}
      {(!isStandalone || hideStandaloneHeader) && !hideBottomActions && (
        <div className={styles.seriesCardActions}>
          <div className="spacer" />
          <Button variant="outline" size="sm" onClick={handleRevert} disabled={!isDirty || saving}>
            <T k="admin.posts.seriesModal.revert" />
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <T k="admin.posts.seriesModal.cancel" />
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} loading={saving}>
            {isEdit ? <T k="admin.posts.seriesModal.save" /> : <T k="admin.posts.seriesModal.create" />}
          </Button>
        </div>
      )}
    </div>
  );
});

export default SeriesInlineEditor;
