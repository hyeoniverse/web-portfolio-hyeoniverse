"use client";

// ── 커스텀 이모지 (settings > 라이브러리) ──
// 에디터 이모지 피커에서 올린 이미지 이모지 목록(custom_emojis). 예전엔 피커 안에서만 보고 지울 수 있었다.
// 여기서 지우면 피커 목록에서만 빠지고, 이미 글에 넣은 이모지는 이미지 주소가 남아 그대로 보인다.
import { useEffect, useRef, useState } from "react";
import { Blend, Plus } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Tooltip from "@/components/ui/Tooltip";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import { uploadFile } from "@/lib/adminUpload";
import { errorText } from "@/lib/apiError";
import { resizeEmojiImage, EmojiImageError, EMOJI_MIN } from "@/components/ui/EmojiPicker/resizeEmojiImage";
import { forgetCustomEmoji } from "@/components/ui/EmojiPicker/customEmojiCache";
import settings from "../Settings.module.css";
import LibraryHead from "./LibraryHead";
import EmojiKitchenModal from "./EmojiKitchenModal";
import lib from "./Library.module.css";
import styles from "./CustomEmojiManager.module.css";
import { EmojiGridSkeleton } from "./LibrarySkeletons";
import { usePagedList } from "./usePagedList";
import Checkbox from "@/components/ui/Checkbox";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { LibraryBulkBar, runBulk, useBulkResultText, useDragSelect, useLibrarySelection } from "./LibrarySelection";

/* 격자 한 쪽 — 넓은 화면 12열 × 10줄 */
const PAGE_SIZE = 120;

type CustomEmoji = { id: string; name: string; src: string; created_at?: string };

/* 여러 개 고르기의 열쇠 — 모듈 수준이라 훅의 의존 배열이 늘 같다 */
const emojiKey = (e: CustomEmoji) => e.id;

export default function CustomEmojiManager() {
  const { t } = useLanguage();
  const [items, setItems] = useState<CustomEmoji[] | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const openModal = useModalStore((st) => st.openModal);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/custom-emojis")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((rows: CustomEmoji[]) => { if (!cancelled) setItems(Array.isArray(rows) ? rows : []); });
    return () => { cancelled = true; };
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = items && q ? items.filter((e) => e.name.toLowerCase().includes(q)) : items;
  const paged = usePagedList(filtered, PAGE_SIZE);

  const add = async (file: File) => {
    setUploading(true);
    try {
      const resized = await resizeEmojiImage(file);
      const src = await uploadFile(resized, "emojis");
      const name = file.name.replace(/\.\w+$/, "");
      const res = await tryRequest("/api/custom-emojis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, src }),
      });
      if (!(res instanceof Response) || !res.ok) throw new Error("save failed");
      const row = (await res.json()) as CustomEmoji;
      setItems((prev) => [row, ...(prev ?? [])]);
      showToast(t("admin.inline.customEmojiManager.added"), "success");
    } catch (err) {
      showToast(
        err instanceof EmojiImageError
          ? err.code === "tooSmall" ? fillTemplate(t("admin.inline.customEmojiManager.tooSmall"), { min: EMOJI_MIN })
            : t("admin.inline.customEmojiManager.readFailed")
          : errorText(err, t, t("admin.inline.customEmojiManager.addFailed")),
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  /* 이모지 조합(Emoji Kitchen) — 두 이모지를 섞은 Google 그림을 골라 들인다 */
  const openKitchen = () => openModal(
    <EmojiKitchenModal onAdded={(row) => setItems((prev) => [row, ...(prev ?? [])])} />,
    { id: "emoji-kitchen", header: { title: t("admin.inline.customEmojiManager.mixTitle") }, closeButton: true, width: "min(720px, 94vw)" },
  );

  const removeOne = async (e: CustomEmoji) => {
    const res = await tryRequest(`/api/custom-emojis/${e.id}`, { method: "DELETE" });
    if (!(res instanceof Response) || !res.ok) return false;
    forgetCustomEmoji(e.src);
    return true;
  };
  const remove = async (e: CustomEmoji) => {
    if (!(await removeOne(e))) {
      showToast(t("admin.inline.customEmojiManager.removeFailed"), "error");
      return;
    }
    setItems((prev) => (prev ? prev.filter((x) => x.id !== e.id) : prev));
    showToast(t("admin.inline.customEmojiManager.removed"), "success");
  };

  /* 여러 개 고르기 — 찾은 것 전체가 대상(쪽을 넘겨도 고른 것은 남는다) */
  const sel = useLibrarySelection(filtered, emojiKey);
  const pick = useDragSelect(sel);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkResult = useBulkResultText();
  const removeSelected = () => {
    const targets = sel.selected;
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.inline.libraryBulk.deleteConfirm"), { n: targets.length })}
        confirmText={fillTemplate(t("admin.inline.libraryBulk.deleteN"), { n: targets.length })}
        danger
        onConfirm={async () => {
          setBulkDeleting(true);
          const { ok, failed } = await runBulk(targets, removeOne);
          setBulkDeleting(false);
          const gone = new Set(ok.map(emojiKey));
          setItems((prev) => (prev ? prev.filter((x) => !gone.has(x.id)) : prev));
          showToast(bulkResult(ok.length, failed.length), failed.length ? "error" : "success");
          sel.clear();
        }}
      />,
      { id: "emoji-bulk-delete", header: { title: t("admin.inline.customEmojiManager.title") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("admin.inline.customEmojiManager.title")}
          count={items?.length}
          hint={t("admin.inline.customEmojiManager.hint")}
          search={{ value: search, onChange: (v) => { setSearch(v); paged.setPage(1); }, placeholder: t("admin.inline.customEmojiManager.searchName") }}
          actions={<>
            <Button variant="outline" icon={<Blend size={14} />} onClick={openKitchen}>
              {t("admin.inline.customEmojiManager.mix")}
            </Button>
            <Button variant="outline" icon={<Plus size={14} />} loading={uploading} onClick={() => fileRef.current?.click()}>
              {t("admin.inline.customEmojiManager.add")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void add(f); e.target.value = ""; }}
            />
          </>}
        />

        {filtered === null ? (
          <EmojiGridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState pad="sm">{search ? t("admin.inline.customEmojiManager.noResults") : t("admin.inline.customEmojiManager.empty")}</EmptyState>
        ) : (
          <>
          <LibraryBulkBar
            count={sel.count}
            selectableCount={sel.selectableCount}
            onSelectAll={sel.selectAll}
            onClear={sel.clear}
            onDelete={removeSelected}
            deleting={bulkDeleting}
            deleteLabel={t("admin.inline.libraryBulk.deleteN")}
          />
          <div className={styles.grid} data-selecting={sel.count > 0 ? "" : undefined}>
            {paged.slice!.map((e) => (
              <Tooltip key={e.id} content={<span className={styles.tipName}>{e.name ? `:${e.name}:` : t("admin.inline.customEmojiManager.untitled")}</span>} placement="bottom" delay={120}>
                <div
                  className={styles.tile}
                  tabIndex={0}
                  data-selected={sel.isSelected(e) ? "" : undefined}
                  /* 칸을 눌러 · 끌어서 고른다 — 지우기 단추 · 고르기 상자는 제 일 */
                  {...pick(e)}
                >
                  <span className={styles.select}>
                    <Checkbox
                      checked={sel.isSelected(e)}
                      onChange={(v) => sel.toggle(e, v)}
                      ariaLabel={fillTemplate(t("admin.inline.libraryBulk.select"), { name: e.name || t("admin.inline.customEmojiManager.emoji") })}
                    />
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 올린 작은 이모지 이미지, 최적화 대상이 아니다 */}
                  <img src={e.src} alt={e.name} className={styles.img} loading="lazy" />
                  <CloseButton
                    className={styles.remove}
                    onClick={() => void remove(e)}
                    ariaLabel={fillTemplate(t("admin.inline.customEmojiManager.removeNamed"), { name: e.name || t("admin.inline.customEmojiManager.emoji") })}
                    title={t("admin.inline.customEmojiManager.removeFromPicker")}
                  />
                </div>
              </Tooltip>
            ))}
          </div>
          </>
        )}
        {paged.totalPages > 1 && (
          <Pagination className={lib.pager} page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} showJump={false} />
        )}
      </div>
    </section>
  );
}
