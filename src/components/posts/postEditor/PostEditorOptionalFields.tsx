"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ExternalLink } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import SeriesInlineEditor from "@/app/admin/(dashboard)/settings/_components/SeriesInlineEditor";
import CoverImageField from "@/components/admin/CoverImageField";
import CoverImagePicker from "../CoverImagePicker";
import RelationPicker from "@/components/admin/RelationPicker";
import SortOrderDragList from "@/components/admin/SortOrderDragList";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import type { Post, PostFormData, PostMetaForm, Series } from "@/types/post";
import type { BilingualCategory } from "@/hooks/useCategories";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import type { usePostSeries } from "@/hooks/usePostSeries";
import styles from "../PostEditor.module.css";

/* 선택 입력 — 접었다 펼치는 하단 섹션. 커버 이미지 · 발췌 · 태그 · 시리즈 · 관련 작품.
   커버 피커의 열림/닫힘 상태와 펼침 높이 계산은 이 섹션 안에서만 쓰므로 함께 들고 있다.
   닫을 때 바로 unmount 하면 닫는 애니메이션이 보이지 않아, 애니메이션이 끝난 뒤에 내린다. */

export default function PostEditorOptionalFields({
  form,
  updateField,
  te,
  config,
  setForm,
  allWorks,
  allTagSuggestions,
  categories,
  excerptKey,
  tag,
  post,
  series,
  optionalOpen,
  setOptionalOpen,
  optionalInnerRef,
  optionalContentRef,
  seriesSelectMode,
  setSeriesSelectMode,
  onSeriesCreated,
  onCoverUpload,
  onReorderSeriesPosts,
}: {
  /** 본문을 뺀 폼 — 이 섹션은 본문을 쓰지 않는다. 본문을 칠 때는 같은 객체라 다시 그리지 않는다 */
  form: PostMetaForm;
  updateField: <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => void;
  te: (key: string) => string;
  config: ReturnType<typeof import("@/providers/SiteConfigProvider").useSiteConfig>;
  setForm: React.Dispatch<React.SetStateAction<PostFormData>>;
  allWorks: Array<{ id: string; title: string; year: string; image: string; published: boolean; categories_ko?: string[] }>;
  allTagSuggestions: string[];
  categories: BilingualCategory[];
  /** 편집 언어에 따라 excerpt / excerpt_en 중 어느 필드를 쓸지 */
  excerptKey: "excerpt" | "excerpt_en";
  tag: ReturnType<typeof import("@/hooks/useTagInput").useTagInput>;
  post?: Post | null;
  /** 시리즈 목록과 선택한 시리즈의 글 — 부모가 usePostSeries 로 들고 있다 */
  series: Pick<ReturnType<typeof usePostSeries>, "seriesList" | "seriesPosts" | "setSeriesPosts" | "seriesPostsLoading">;
  /** 시리즈 안 다른 글의 바뀐 순서를 넘긴다 — 부모가 들고 있다가 이 글을 저장할 때 보낸다(#873) */
  onReorderSeriesPosts: (updates: { id: string; sort_order: number }[]) => void;
  /** 펼침 상태는 부모가 소유한다 — SEO 체크리스트 클릭으로도 열리기 때문 */
  optionalOpen: boolean;
  setOptionalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  optionalInnerRef: React.RefObject<HTMLDivElement | null>;
  optionalContentRef: React.RefObject<HTMLDivElement | null>;
  seriesSelectMode: "existing" | "custom";
  setSeriesSelectMode: (v: "existing" | "custom") => void;
  onSeriesCreated: (saved?: Series) => void | Promise<void>;
  onCoverUpload: () => void | Promise<void>;
}) {

  const [showCoverPicker, setShowCoverPicker] = useState(false);
  // 닫는 중 — coverPickerCollapse 애니메이션 (~0.45s) 끝난 뒤 unmount.
  // showCoverPicker 만 false 로 즉시 두면 컴포넌트가 사라져 닫는 애니메이션이 보이지 않음
  const [closingCoverPicker, setClosingCoverPicker] = useState(false);
  const closeCoverPickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestCloseCoverPicker = useCallback(() => {
    if (closeCoverPickerTimer.current) clearTimeout(closeCoverPickerTimer.current);
    setClosingCoverPicker(true);
    closeCoverPickerTimer.current = setTimeout(() => {
      setShowCoverPicker(false);
      setClosingCoverPicker(false);
      closeCoverPickerTimer.current = null;
    }, 450);
  }, []);
  useEffect(() => () => {
    if (closeCoverPickerTimer.current) clearTimeout(closeCoverPickerTimer.current);
  }, []);

  const addTagWithPreset = useCallback((value?: string) => {
    const raw = (value ?? tag.input).trim().replace(/,/g, "");
    if (!raw || form.tags.includes(raw)) {
      tag.setInput("");
      return;
    }
    /* tagDescriptions 의 description (bilingual) 을 tag_notes 초기값으로 채움 */
    const stored = config.tagDescriptions?.[raw];
    const meta = stored !== undefined
      ? (() => {
          if (typeof stored === "string") return { description: { ko: stored, en: "" } };
          if ("description" in stored && stored.description) return { description: stored.description };
          // legacy { ko, en } as description
          return { description: { ko: stored.ko ?? "", en: stored.en ?? "" } };
        })()
      : null;
    const presetNote = meta?.description.ko || meta?.description.en
      ? { ko: meta.description.ko, en: meta.description.en }
      : null;
    setForm((prev) => ({
      ...prev,
      tags: [...prev.tags, raw],
      tag_notes: presetNote
        ? { ...(prev.tag_notes ?? {}), [raw]: presetNote }
        : prev.tag_notes,
    }));
    tag.setInput("");
  }, [tag, form.tags, config.tagDescriptions, setForm]);

  /* 시리즈 순서 목록 — 저장값은 0 부터(설정의 시리즈 편집) 또는 1 부터(이 편집기)일 수 있어, 이 글의 자리는 값이 아니라
     앞선 글의 수로 정한다. 다른 글은 원래 값을 그대로 넘겨, 옮기면 자리와 값이 다른 글을 모두 다시 매긴다(#873) */
  const seriesOthers = useMemo(
    () => series.seriesPosts
      .filter((p) => p.id !== post?.id)
      .map((p) => ({ id: p.id, title: p.title, sort_order: p.series_order }))
      .sort((a, b) => a.sort_order - b.sort_order),
    [series.seriesPosts, post?.id],
  );
  const seriesPosition = seriesOthers.filter((o) => o.sort_order < (form.series_order ?? 0)).length + 1;

  return (
        <div className={styles.optionalSection}>
          <Pressable
            className={styles.optionalToggle}
            onClick={() => setOptionalOpen((v) => !v)}
          >
            <span>{te("optionalFields")}</span>
            <ChevronRight
              size={12}
              strokeWidth={2.5}
              style={{ transform: optionalOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          </Pressable>

          {/* 시리즈 — 항상 표시 (optionalContent 바깥이라 직접 padding 부여) */}
          <div style={{ padding: "0 var(--spacing-md) var(--spacing-md)" }}>
            <div className={es.row}>
              <div className={es.field} onFocusCapture={() => { if (!optionalOpen) setOptionalOpen(true); }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <label className={es.fieldLabel}>{te("series")}</label>
                  <a href="/admin/settings?tab=content&sub=posts" target="_blank" rel="noopener noreferrer" className={styles.manageLink}>
                    {te("seriesManage")}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  {seriesSelectMode === "custom" ? (
                    <motion.div
                      key="custom"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <SeriesInlineEditor
                        series={null}
                        categories={categories}
                        onSave={onSeriesCreated}
                        onCancel={() => setSeriesSelectMode("existing")}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="existing"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <Select
                        width="full"
                        value={form.series_id ?? ""}
                        options={[
                          { value: "", label: te("seriesNone") },
                          { value: "__custom__", label: te("customSeries") },
                          ...series.seriesList.map((s) => ({ value: s.id, label: `${s.title} (${s.post_count ?? 0})` })),
                        ]}
                        onChange={(v) => {
                          if (v === "__custom__") {
                            setSeriesSelectMode("custom");
                            updateField("series_id", null);
                            return;
                          }
                          setSeriesSelectMode("existing");
                          updateField("series_id", v || null);
                          // 시리즈 카테고리를 글에 상속하지 않음 — 글은 각자 카테고리를 가진다(도출 모델)
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div ref={optionalContentRef} className={`${styles.optionalContent}${optionalOpen ? ` ${styles.optionalContentOpen}` : ""}`}>
            <div ref={optionalInnerRef} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              {/* 줄1: [시리즈 순서(1열) + 관련 프로젝트(2열)] — 시리즈 없으면 관련 프로젝트 단독 */}
              {(() => {
                const seriesOrderEl = form.series_id ? (
                  series.seriesPostsLoading ? (
                    <div className={es.field} style={{ opacity: 0.5 }}>
                      <label className={es.fieldLabel}>{te("seriesOrder")}</label>
                      <div className={styles.seriesOrderSkeleton}>
                        {[1, 2, 3].map((i) => (
                          <span key={i} className={styles.seriesOrderSkeletonRow} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <SortOrderDragList
                      label={te("seriesOrder")}
                      currentTitle={form.title || te("currentPost")}
                      currentOrder={seriesPosition}
                      otherItems={seriesOthers}
                      onChange={(newOrder, otherUpdates) => {
                        updateField("series_order", newOrder);
                        if (otherUpdates.length) {
                          series.setSeriesPosts((prev) => prev.map((p) => {
                            const u = otherUpdates.find((x) => x.id === p.id);
                            return u ? { ...p, series_order: u.sort_order } : p;
                          }));
                          onReorderSeriesPosts(otherUpdates);
                        }
                      }}
                    />
                  )
                ) : null;

                const relatedWorksEl = (
                  <div className={es.field}>
                    <div className={es.fieldLabelRow}>
                      <label className={es.fieldLabel}>{te("relatedWorks")}</label>
                      {(form.related_work_ids ?? []).length === 0 && (
                        <span className={es.fieldHint}>{te("relatedWorksEmpty")}</span>
                      )}
                    </div>
                    <RelationPicker
                      items={allWorks}
                      selectedIds={form.related_work_ids ?? []}
                      onChange={(ids) => updateField("related_work_ids", ids)}
                      getId={(w) => w.id}
                      getTitle={(w) => w.title}
                      getMeta={(w) => w.year}
                      getThumb={(w) => w.image}
                      getStatus={(w) => (w.published ? "published" : "draft")}
                      searchPlaceholder={te("relatedWorksSearch")}
                      searchInputPlaceholder={te("relatedWorksSearchInput")}
                      noResultsText={te("relatedWorksNoResults")}
                    />
                  </div>
                );

                return seriesOrderEl ? (
                  <div className={es.row}>
                    {seriesOrderEl}
                    {relatedWorksEl}
                  </div>
                ) : (
                  relatedWorksEl
                );
              })()}
              {/* 줄2: [요약 + 태그] (1열 / 2열) */}
              <div className={es.row}>
                <div className={es.field} data-seo="excerpt">
                  <label className={es.fieldLabel}>{te("excerpt")}</label>
                  <Textarea
                    textareaClassName={styles.excerptInput}
                    value={form[excerptKey]}
                    onChange={(v) => updateField(excerptKey, v)}
                    placeholder={te("excerptPlaceholder")}
                    rows={2}
                    maxHint="basic"
                  />
                </div>
                <div className={es.field} data-seo="tags">
                  <label className={es.fieldLabel}>{te("tags")}</label>
                  <div>
                    <div className={styles.tagInputRow}>
                      <Select
                        combobox
                        value=""
                        onChange={() => {}}
                        inputValue={tag.input}
                        onInputChange={tag.setInput}
                        onAdd={(v) => addTagWithPreset(v)}
                        options={allTagSuggestions
                          .filter((t) => !form.tags.includes(t))
                          .map((t) => ({ value: t, label: t }))}
                        placeholder={te("tagsPlaceholder")}
                      />
                      <Pressable className={styles.tagAddBtn} onClick={() => addTagWithPreset()} disabled={!tag.input.trim()}>+</Pressable>
                    </div>
                    {/* 태그별 설명 — 공통 TagNotesEditor (drag-reorder + ko/en + add/cancel 애니메이션) */}
                    <TagNotesEditor
                      items={form.tags}
                      notes={form.tag_notes ?? {}}
                      onItemsChange={(next) => updateField("tags", next)}
                      onNotesChange={(next) => updateField("tag_notes", next)}
                      prefix="#"
                      notePlaceholder={te("tagNotePlaceholder")}
                      addLabel={te("tagNoteAddPlaceholder")}
                      cancelLabel={te("tagNoteCancel")}
                      editLabel={te("tagNoteEdit")}
                      removeTitle={te("tagRemove")}
                    />
                  </div>
                </div>
              </div>
              {/* 줄3: [커버이미지 라벨/thumb/버튼(1열)] + [GitHub URL(2열)]
                  picker 본체는 row 밖 full-width 로 렌더 → 좁은 column 에 squeeze 되거나
                  optional wrapper 에 닿는 문제 회피 */}
              <div className={es.row}>
                <CoverImageField
                  value={form.cover_image}
                  onChange={(url) => {
                    updateField("cover_image", url);
                    if (!url) setShowCoverPicker(false);
                  }}
                  label={te("coverImage")}
                  removeLabel={te("remove")}
                  uploadLabel={te("upload")}
                  chooseLabel={te("chooseCover")}
                  closeLabel={te("closePicker")}
                  onUpload={onCoverUpload}
                  pickerOpen={showCoverPicker}
                  pickerClosing={closingCoverPicker}
                  onPickerToggle={() => {
                    if (showCoverPicker && !closingCoverPicker) {
                      requestCloseCoverPicker();
                    } else if (!showCoverPicker) {
                      setShowCoverPicker(true);
                    }
                  }}
                  seoId="cover"
                />
                {/* 2열: GitHub URL */}
                <div className={es.field}>
                  <label className={es.fieldLabel}>GitHub URL</label>
                  <input
                    className={es.fieldInput}
                    type="url"
                    value={form.github_url}
                    onChange={(e) => updateField("github_url", e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
              {/* picker — full-width (col 안에 두면 좁은 폭에 squeeze + wrapper 와 닿음).
                  cover_image 세팅 후에도 유지 — AI auto-save 시 picker 가 사라지면 재생성 불가능 */}
              {showCoverPicker && (
                <CoverImagePicker
                  onSelect={(url) => {
                    updateField("cover_image", url);
                    // 선택 직후엔 닫는 애니메이션 없이 즉시 unmount (커버 이미지 미리보기로 전환)
                    setShowCoverPicker(false);
                    setClosingCoverPicker(false);
                  }}
                  onClose={requestCloseCoverPicker}
                  closing={closingCoverPicker}
                  // AI 생성 즉시 form 에 반영 (picker 유지) — 사용자가 "사용" 안 눌러도 자동저장
                  onAutoSave={(url) => updateField("cover_image", url)}
                  currentUrl={form.cover_image}
                  postContext={{
                    title: form.title,
                    tags: form.tags,
                    excerpt: form.excerpt,
                  }}
                />
              )}
            </div>
          </div>
        </div>
  );
}
