"use client";

import { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { Book } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BilingualCategory } from "@/types/common";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import T from "@/components/ui/T";
import { ModalFooterContext } from "@/components/ui/Modal";
import { List, ListItem } from "@/app/admin/(dashboard)/components";
import styles from "./CategoryReassignModal.module.css";

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
  onCancel: _onCancel,
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
  const [newDescKo, setNewDescKo] = useState("");
  const [newDescEn, setNewDescEn] = useState("");
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
    const descKo = newDescKo.trim();
    const descEn = newDescEn.trim();
    if (
      ko && en &&
      !allCategories.some((c) => c.ko === ko || c.en === en) &&
      ko !== category.ko && en !== category.en
    ) {
      /* BilingualCategory.description 은 단일 string — ko 우선, 없으면 en */
      const description = descKo || descEn || undefined;
      setAddedCategories((prev) => [...prev, { ko, en, ...(description && { description }) }]);
    }
    setNewKo("");
    setNewEn("");
    setNewDescKo("");
    setNewDescEn("");
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

  /* 공통 Modal 의 footer slot — body 와 같은 컴포넌트라 state(saving, isValid) 공유 OK. */
  const footerEl = useContext(ModalFooterContext);

  /* 공통 Modal 의 content 로 사용 — overlay/modal/header/footer 는 Modal 컴포넌트가 처리.
     X 버튼/배경 클릭 dismiss/일관된 radius 모두 공통 Modal 가 책임. */
  return (
    <div className={styles.body}>
        <p className={styles.subtitle}>
          <span className={styles.catBadge}>{catLabel}</span>
          <T k="admin.settings.reassignModal.description" />
        </p>

        {loading ? (
          <p className={styles.loading}><T k="admin.settings.reassignModal.loading" /></p>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <p><T k="admin.settings.reassignModal.noPosts" /></p>
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
                  dropdownClassName={styles.selectDropdownAboveModal}
                />
              </div>
            </div>

            {/* New category — form 레이아웃: title + 추가 버튼 한 줄, 아래에 이름/설명 ko/en */}
            <div className={styles.newCatSection}>
              <div className={styles.newCatTitleRow}>
                <label className={styles.bulkLabel}>
                  <T k="admin.settings.reassignModal.newCategoryTitle" />
                </label>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleAddCategory}
                  disabled={!newKo.trim() || !newEn.trim()}
                >
                  <T k="admin.settings.reassignModal.addCategory" />
                </Button>
              </div>
              <div className={styles.newCatFormRow}>
                <span className={styles.newCatFormLabel}>{t("admin.settings.name")}</span>
                <div className={styles.newCatGroup}>
                  <Input
                    inlineLabel="KO"
                    size="sm"
                    value={newKo}
                    onChange={setNewKo}
                  />
                </div>
                <div className={styles.newCatGroup}>
                  <Input
                    inlineLabel="EN"
                    size="sm"
                    value={newEn}
                    onChange={setNewEn}
                  />
                </div>
              </div>
              <div className={styles.newCatFormRow}>
                <span className={styles.newCatFormLabel}>{t("admin.settings.categoryDescPlaceholder")}</span>
                <div className={styles.newCatGroup}>
                  <Input
                    inlineLabel="KO"
                    size="sm"
                    value={newDescKo}
                    onChange={setNewDescKo}
                  />
                </div>
                <div className={styles.newCatGroup}>
                  <Input
                    inlineLabel="EN"
                    size="sm"
                    value={newDescEn}
                    onChange={setNewDescEn}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Post list — 공통 List/ListItem 로 통일 */}
            <List className={styles.postList}>
              {seriesGroups.map((g) => (
                <ListItem key={g.seriesId} layout="column" className={styles.seriesGroup}>
                  <div className={styles.seriesHeader}>
                    <span className={styles.seriesLabel}>
                      <Book size={12} />
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
                        dropdownClassName={styles.selectDropdownAboveModal}
                      />
                    </div>
                  </div>
                  <List className={styles.seriesPosts}>
                    {g.posts.map((p) => (
                      <ListItem key={p.id} className={styles.postItem}>
                        <span className={styles.postTitle}>
                          {getTitle(p)}
                        </span>
                      </ListItem>
                    ))}
                  </List>
                  {!assignments[`series:${g.seriesId}`] && (
                    <p className={styles.warningText}>
                      <T k="admin.settings.reassignModal.seriesWarning" />
                    </p>
                  )}
                </ListItem>
              ))}

              {standalonePosts.map((p) => (
                <ListItem key={p.id} className={styles.standalonePost}>
                  <span className={styles.postTitle}>{getTitle(p)}</span>
                  <div className={styles.standaloneSelect}>
                    <Select
                      value={assignments[p.id] || ""}
                      options={[
                        { value: "", label: tc("selectCategory") },
                        ...categoryOptions,
                      ]}
                      onChange={(v) => handleAssign(p.id, v)}
                      dropdownClassName={styles.selectDropdownAboveModal}
                    />
                  </div>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* footer — 공통 Modal 의 footer slot 으로 portal. case 별 분기 */}
        {footerEl && createPortal(
          loading ? null : posts.length === 0 ? (
            <Button variant="primary" size="xs" tone="danger" onClick={() => onConfirm([], addedCategories)}>
              <T k="admin.settings.reassignModal.delete" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="xs"
              onClick={handleConfirm}
              disabled={saving || !isValid()}
            >
              {saving ? <T k="admin.settings.reassignModal.saving" /> : <T k="admin.settings.reassignModal.confirm" />}
            </Button>
          ),
          footerEl,
        )}
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
