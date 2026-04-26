"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown, ExternalLink, X, Trash2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BilingualCategory } from "@/types/common";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import type { Series, SeriesPostItem } from "@/types/post";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Field from "./SettingsFormFields";
import T from "@/components/ui/T";
import { SkeletonLine } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import styles from "../Settings.module.css";

/* ── SeriesInlineEditor ── */

interface SeriesInlineEditorProps {
  series: Series | null;
  categories: BilingualCategory[];
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onCoverChange?: (url: string) => void;
}

export default function SeriesInlineEditor({
  series,
  categories,
  onSave,
  onCancel,
  onCoverChange,
}: SeriesInlineEditorProps) {
  const { t, language } = useLanguage();
  const ts = (key: string) => t(`admin.posts.seriesModal.${key}`);
  const isEdit = !!series;

  const defaultCatKo = categories[0]?.ko || "";

  const [form, setForm] = useState({
    title: series?.title ?? "",
    title_en: series?.title_en ?? "",
    description: series?.description ?? "",
    description_en: series?.description_en ?? "",
    category: series?.category || defaultCatKo,
    cover_image: series?.cover_image ?? "",
    published: series?.published ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<SeriesPostItem[]>([]);
  const [originalPosts, setOriginalPosts] = useState<SeriesPostItem[]>([]);
  const [removedPostIds, setRemovedPostIds] = useState<Set<string>>(new Set());
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
    if (!form.title.trim()) {
      setError(ts("titleRequired"));
      return;
    }
    if (!form.category) {
      setError(ts("categoryRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = isEdit && series ? `/api/series/${series.id}` : "/api/series";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(ts("saveFailed"));

      /* 포스트 변경사항 일괄 반영 */
      if (isEdit) {
        // 제거된 포스트
        for (const id of removedPostIds) {
          await fetch(`/api/posts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ series_id: null, series_order: 0 }),
          });
        }
        // 추가/순서 변경된 포스트
        const originalIds = new Set(originalPosts.map((o) => o.id));
        for (const p of posts) {
          const orig = originalPosts.find((o) => o.id === p.id);
          const isNew = !originalIds.has(p.id);
          if (isNew) {
            await fetch(`/api/posts/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ series_id: series!.id, series_order: p.series_order }),
            });
          } else if (!orig || orig.series_order !== p.series_order) {
            await fetch(`/api/posts/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ series_order: p.series_order }),
            });
          }
        }
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : ts("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.seriesCardBody}>
      <div className={styles.fieldPair}>
        <Field label={ts("titleKO")} value={form.title} onChange={(v) => updateField("title", v)} />
        <Field label={ts("titleEN")} value={form.title_en} onChange={(v) => updateField("title_en", v)} />
      </div>
      <div className={styles.fieldPair}>
        <Field label={ts("descriptionKO")} value={form.description} onChange={(v) => updateField("description", v)} multiline />
        <Field label={ts("descriptionEN")} value={form.description_en} onChange={(v) => updateField("description_en", v)} multiline />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}><T k="admin.posts.seriesModal.category" /></label>
        <Select
          value={form.category}
          options={categories.map((cat) => ({
            value: cat.ko,
            label: language === "ko" ? cat.ko : cat.en,
          }))}
          onChange={(v) => updateField("category", v)}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}><T k="admin.posts.seriesModal.published" /></label>
        <div className={styles.publishToggle}>
          <Toggle
            checked={form.published}
            onChange={(v) => updateField("published", v)}
          />
          <span key={form.published ? "pub" : "draft"} className={styles.publishLabel}>{form.published ? ts("publishedLabel") : ts("draftLabel")}</span>
        </div>
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}><T k="admin.posts.seriesModal.coverImage" /></label>
        {form.cover_image ? (
          <div className={styles.logoUpload}>
            <div className={styles.seriesCoverPreview}>
              <Image src={form.cover_image} alt="" width={288} height={162} className={styles.logoPreviewImage} unoptimized />
            </div>
            <button type="button" className={styles.logoBtnRemove} onClick={() => updateField("cover_image", "")}>
              <T k="admin.posts.seriesModal.remove" />
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
              <button type="button" className={styles.logoBtn} onClick={handleImageUpload} disabled={uploading}>
                {uploading ? <T k="admin.posts.seriesModal.uploading" /> : <T k="admin.posts.seriesModal.uploadCover" />}
              </button>
              <button type="button" className={styles.logoBtn} onClick={() => setShowCoverPicker((v) => !v)}>
                {showCoverPicker ? <T k="admin.posts.seriesModal.closePicker" /> : <T k="admin.posts.seriesModal.chooseCover" />}
              </button>
            </div>
            {showCoverPicker && (
              <CoverImagePicker
                onSelect={(url) => { updateField("cover_image", url); setShowCoverPicker(false); }}
                onClose={() => setShowCoverPicker(false)}
                postContext={{ title: form.title, tags: form.category ? [form.category] : [], excerpt: form.description }}
              />
            )}
          </>
        )}
      </div>

      {isEdit && (
        <div className={styles.seriesPostsSection}>
          <div className={styles.seriesPostsHeader}>
            <label className={styles.fieldLabel} style={{ flexDirection: "row", gap: "4px", whiteSpace: "nowrap" }}><T k="admin.posts.seriesModal.posts" /> ({posts.length})</label>
            <button
              type="button"
              className={styles.seriesPostsAddBtn}
              onClick={openAddPost}
            >
              {addPostHint ? <T k="admin.posts.seriesModal.addPostHint" /> : <>+ <T k="admin.posts.seriesModal.addPost" /></>}
            </button>
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
                    !addSearch || (p.title || "").toLowerCase().includes(addSearch.toLowerCase())
                  );
                  return filtered.length === 0 ? (
                    <p className={styles.addPostEmpty}>{t("admin.posts.seriesModal.noAvailablePosts")}</p>
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
                        <span className={`${styles.seriesPostStatus} ${p.published ? styles.seriesPostPublished : styles.seriesPostDraft}`}>
                          {p.published ? "P" : "D"}
                        </span>
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
            <p className={styles.seriesPostsEmpty}><T k="admin.posts.seriesModal.postsEmpty" /></p>
          ) : (
            <div className={styles.seriesPostsList}>
              {posts.slice(postsPage * POSTS_PAGE_SIZE, (postsPage + 1) * POSTS_PAGE_SIZE).map((post) => {
                const idx = posts.indexOf(post);
                return (
                <div
                  key={post.id}
                  className={`${styles.seriesPostItem} ${dragIdx === idx ? styles.seriesPostDragging : ""} ${overIdx === idx && dragIdx !== idx ? (dragIdx !== null && dragIdx < idx ? styles.seriesPostDropBelow : styles.seriesPostDropAbove) : ""}`}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
                  onDragLeave={() => setOverIdx(null)}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  onDrop={() => {
                    if (dragIdx !== null) handleDragDrop(dragIdx, idx);
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                >
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
                  <a
                    href={`/posts/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.seriesPostViewBtn}
                    title={t("admin.posts.seriesModal.viewPost")}
                  >
                    <ExternalLink size={12} />
                  </a>
                  <span className={`${styles.seriesPostStatus} ${post.published ? styles.seriesPostPublished : styles.seriesPostDraft}`}>
                    {post.published ? "P" : "D"}
                  </span>
                  <div
                    className={styles.seriesPostActions}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    <button
                      type="button"
                      className={`${styles.seriesPostOrderBtn} ${styles.seriesPostRemoveBtn}`}
                      onClick={(e) => { e.stopPropagation(); handleRemovePost(post.id); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title={t("admin.posts.seriesModal.removeFromSeries")}
                    >
                      <X size={10} />
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
                </div>
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
          )}
        </div>
      )}

      {error && <p className={styles.sectionHint} style={{ color: "var(--color-accent)" }}>{error}</p>}

      <div className={styles.seriesCardActions}>
        <div style={{ flex: 1 }} />
        <Button variant="outline" size="xs" onClick={onCancel}>
          <T k="admin.posts.seriesModal.cancel" />
        </Button>
        <Button variant="primary" size="xs" onClick={handleSave} disabled={saving} loading={saving}>
          {isEdit ? <T k="admin.posts.seriesModal.save" /> : <T k="admin.posts.seriesModal.create" />}
        </Button>
      </div>
    </div>
  );
}
