"use client";

import { useState, useEffect, useCallback } from "react";
import { useLenis } from "@/providers/LenisProvider";
import type { Series } from "@/types/post";
import { CATEGORIES } from "@/constants/categories";
import styles from "./AdminSeries.module.css";

export default function AdminSeriesPage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", title_en: "", description_en: "", category: "General" });
  const [newForm, setNewForm] = useState({ title: "", description: "", category: "General" });

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);

    return () => {
      clearTimeout(timer);
      setInfinite(true);
    };
  }, [setInfinite, lenis, stop, start]);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/series?all=true");
    const data = await res.json();
    setSeriesList(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleCreate = async () => {
    if (!newForm.title.trim()) return;
    await fetch("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, published: true }),
    });
    setNewForm({ title: "", description: "", category: "General" });
    fetchSeries();
  };

  const handleUpdate = async (id: string) => {
    await fetch(`/api/series/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditingId(null);
    fetchSeries();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 시리즈를 삭제하시겠습니까?\n소속 포스트의 시리즈 연결이 해제됩니다.`)) return;
    await fetch(`/api/series/${id}`, { method: "DELETE" });
    fetchSeries();
  };

  const handleTogglePublish = async (series: Series) => {
    await fetch(`/api/series/${series.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !series.published }),
    });
    fetchSeries();
  };

  const startEdit = (series: Series) => {
    setEditingId(series.id);
    setForm({
      title: series.title,
      description: series.description,
      title_en: series.title_en,
      description_en: series.description_en,
      category: series.category || "General",
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Series</h1>
      </div>

      {/* Create new series */}
      <div className={styles.createBox}>
        <input
          className={styles.input}
          type="text"
          value={newForm.title}
          onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="New series title"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <input
          className={styles.input}
          type="text"
          value={newForm.description}
          onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
        />
        <select
          className={styles.input}
          value={newForm.category}
          onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          className={styles.createBtn}
          onClick={handleCreate}
          disabled={!newForm.title.trim()}
        >
          Create
        </button>
      </div>

      {/* Series list */}
      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : seriesList.length === 0 ? (
        <p className={styles.empty}>No series yet</p>
      ) : (
        <div className={styles.list}>
          {seriesList.map((series) => (
            <div key={series.id} className={styles.item}>
              {editingId === series.id ? (
                <div className={styles.editForm}>
                  <input
                    className={styles.input}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Title"
                  />
                  <input
                    className={styles.input}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description"
                  />
                  <input
                    className={styles.input}
                    value={form.title_en}
                    onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                    placeholder="Title (EN)"
                  />
                  <input
                    className={styles.input}
                    value={form.description_en}
                    onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
                    placeholder="Description (EN)"
                  />
                  <select
                    className={styles.input}
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className={styles.editActions}>
                    <button className={styles.saveBtn} onClick={() => handleUpdate(series.id)}>
                      Save
                    </button>
                    <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{series.title}</span>
                    {series.description && (
                      <span className={styles.itemDesc}>{series.description}</span>
                    )}
                    <span className={styles.itemMeta}>
                      {series.category} &middot; {series.post_count ?? 0} posts
                    </span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      className={`${styles.statusBadge} ${series.published ? styles.published : styles.draft}`}
                      onClick={() => handleTogglePublish(series)}
                    >
                      {series.published ? "Published" : "Draft"}
                    </button>
                    <button className={styles.actionBtn} onClick={() => startEdit(series)}>
                      Edit
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(series.id, series.title)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
