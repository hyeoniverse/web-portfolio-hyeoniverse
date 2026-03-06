"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import Select from "@/components/ui/Select";
import T from "@/components/ui/T";
import styles from "./CategoryReassignModal.module.css";

interface BilingualCategory {
  ko: string;
  en: string;
}

interface PostItem {
  id: string;
  title: string;
  title_en: string;
  series_id: string | null;
  series?: { title: string; title_en: string } | null;
}

interface SeriesGroup {
  seriesId: string;
  seriesTitle: string;
  posts: PostItem[];
}

interface Props {
  category: BilingualCategory;
  availableCategories: BilingualCategory[];
  onConfirm: (
    assignments: { id: string; category: string }[],
    newCategories: BilingualCategory[],
  ) => Promise<void>;
  onCancel: () => void;
}

export default function CategoryReassignModal({
  category,
  availableCategories,
  onConfirm,
  onCancel,
}: Props) {
  const { t, language } = useLanguage();
  const tc = (key: string) => t(`admin.settings.reassignModal.${key}`);

  const catLabel = language === "ko" ? category.ko : category.en;

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [bulkCategory, setBulkCategory] = useState("");
  const [newKo, setNewKo] = useState("");
  const [newEn, setNewEn] = useState("");
  const [addedCategories, setAddedCategories] = useState<BilingualCategory[]>([]);

  const allCategories = [...availableCategories, ...addedCategories];

  useEffect(() => {
    // DB에 ko 또는 en 값이 저장되어 있을 수 있으므로 둘 다 검색
    Promise.all([
      fetch(`/api/posts?all=true&category=${encodeURIComponent(category.ko)}&limit=200`).then((r) => r.json()),
      category.ko !== category.en
        ? fetch(`/api/posts?all=true&category=${encodeURIComponent(category.en)}&limit=200`).then((r) => r.json())
        : Promise.resolve({ posts: [] }),
    ])
      .then(([dataKo, dataEn]) => {
        const koIds = new Set((dataKo.posts ?? []).map((p: PostItem) => p.id));
        const merged = [
          ...(dataKo.posts ?? []),
          ...(dataEn.posts ?? []).filter((p: PostItem) => !koIds.has(p.id)),
        ];
        setPosts(merged);
      })
      .finally(() => setLoading(false));
  }, [category]);

  const { seriesGroups, standalonePosts } = groupPosts(posts, language);

  const handleBulkAssign = (koValue: string) => {
    if (!koValue) return;
    setBulkCategory(koValue);
    const next: Record<string, string> = {};
    seriesGroups.forEach((g) => {
      next[`series:${g.seriesId}`] = koValue;
    });
    standalonePosts.forEach((p) => {
      next[p.id] = koValue;
    });
    setAssignments(next);
  };

  const handleAssign = (key: string, koValue: string) => {
    setAssignments((prev) => ({ ...prev, [key]: koValue }));
    setBulkCategory("");
  };

  const handleAddCategory = () => {
    const ko = newKo.trim();
    const en = newEn.trim();
    if (
      ko && en &&
      !allCategories.some((c) => c.ko === ko || c.en === en) &&
      ko !== category.ko && en !== category.en
    ) {
      setAddedCategories((prev) => [...prev, { ko, en }]);
    }
    setNewKo("");
    setNewEn("");
  };

  const isValid = () => {
    for (const g of seriesGroups) {
      if (!assignments[`series:${g.seriesId}`]) return false;
    }
    for (const p of standalonePosts) {
      if (!assignments[p.id]) return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!isValid()) return;
    setSaving(true);

    const result: { id: string; category: string }[] = [];
    seriesGroups.forEach((g) => {
      const cat = assignments[`series:${g.seriesId}`];
      g.posts.forEach((p) => result.push({ id: p.id, category: cat }));
    });
    standalonePosts.forEach((p) => {
      result.push({ id: p.id, category: assignments[p.id] });
    });

    await onConfirm(result, addedCategories);
    setSaving(false);
  };

  const categoryOptions = allCategories
    .filter((c) => c.ko !== category.ko || c.en !== category.en)
    .map((c) => ({
      value: c.ko,
      label: language === "ko" ? c.ko : c.en,
    }));

  const getTitle = (p: PostItem) => {
    if (language === "en" && p.title_en) return p.title_en;
    return p.title || tc("untitled");
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}><T k="admin.settings.reassignModal.title" /></h2>
          <p className={styles.subtitle}>
            <span className={styles.catBadge}>{catLabel}</span>
            <T k="admin.settings.reassignModal.description" />
          </p>
        </div>

        {loading ? (
          <p className={styles.loading}><T k="admin.settings.reassignModal.loading" /></p>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <p><T k="admin.settings.reassignModal.noPosts" /></p>
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => onConfirm([], addedCategories)}
              >
                <T k="admin.settings.reassignModal.confirm" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Bulk assign */}
            <div className={styles.bulkSection}>
              <label className={styles.bulkLabel}><T k="admin.settings.reassignModal.bulkAssign" /></label>
              <div className={styles.bulkRow}>
                <Select
                  value={bulkCategory}
                  options={[
                    { value: "", label: tc("selectCategory") },
                    ...categoryOptions,
                  ]}
                  onChange={handleBulkAssign}
                />
              </div>
            </div>

            {/* New category */}
            <div className={styles.newCatRow}>
              <label className={styles.newCatGroup}>
                <span className={styles.newCatGroupLabel}><T k="admin.settings.categoryKoLabel" /></span>
                <input
                  className={styles.newCatInput}
                  type="text"
                  value={newKo}
                  onChange={(e) => setNewKo(e.target.value)}
                />
              </label>
              <label className={styles.newCatGroup}>
                <span className={styles.newCatGroupLabel}><T k="admin.settings.categoryEnLabel" /></span>
                <input
                  className={styles.newCatInput}
                  type="text"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className={styles.newCatBtn}
                onClick={handleAddCategory}
                disabled={!newKo.trim() || !newEn.trim()}
              >
                <T k="admin.settings.reassignModal.addCategory" />
              </button>
            </div>

            {/* Post list */}
            <div className={styles.postList}>
              {seriesGroups.map((g) => (
                <div key={g.seriesId} className={styles.seriesGroup}>
                  <div className={styles.seriesHeader}>
                    <span className={styles.seriesLabel}>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                      </svg>
                      {g.seriesTitle}
                    </span>
                    <span className={styles.postCount}>
                      {g.posts.length} <T k="admin.settings.reassignModal.posts" />
                    </span>
                    <div className={styles.seriesSelect}>
                      <Select
                        value={assignments[`series:${g.seriesId}`] || ""}
                        options={[
                          { value: "", label: tc("selectCategory") },
                          ...categoryOptions,
                        ]}
                        onChange={(v) =>
                          handleAssign(`series:${g.seriesId}`, v)
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.seriesPosts}>
                    {g.posts.map((p) => (
                      <div key={p.id} className={styles.postItem}>
                        <span className={styles.postTitle}>
                          {getTitle(p)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {!assignments[`series:${g.seriesId}`] && (
                    <p className={styles.warningText}>
                      <T k="admin.settings.reassignModal.seriesWarning" />
                    </p>
                  )}
                </div>
              ))}

              {standalonePosts.map((p) => (
                <div key={p.id} className={styles.standalonePost}>
                  <span className={styles.postTitle}>{getTitle(p)}</span>
                  <div className={styles.standaloneSelect}>
                    <Select
                      value={assignments[p.id] || ""}
                      options={[
                        { value: "", label: tc("selectCategory") },
                        ...categoryOptions,
                      ]}
                      onChange={(v) => handleAssign(p.id, v)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onCancel}
              >
                <T k="admin.settings.reassignModal.cancel" />
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleConfirm}
                disabled={saving || !isValid()}
              >
                {saving ? <T k="admin.settings.reassignModal.saving" /> : <T k="admin.settings.reassignModal.confirm" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function groupPosts(posts: PostItem[], language: string) {
  const seriesMap = new Map<
    string,
    { title: string; posts: PostItem[] }
  >();
  const standalone: PostItem[] = [];

  for (const p of posts) {
    if (p.series_id) {
      const existing = seriesMap.get(p.series_id);
      if (existing) {
        existing.posts.push(p);
      } else {
        const seriesTitle =
          language === "en"
            ? p.series?.title_en || p.series?.title || "Untitled"
            : p.series?.title || "Untitled";
        seriesMap.set(p.series_id, { title: seriesTitle, posts: [p] });
      }
    } else {
      standalone.push(p);
    }
  }

  const seriesGroups: SeriesGroup[] = [...seriesMap.entries()].map(
    ([id, data]) => ({
      seriesId: id,
      seriesTitle: data.title,
      posts: data.posts,
    }),
  );

  return { seriesGroups, standalonePosts: standalone };
}
