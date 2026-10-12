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
import { SkeletonLine } from "@/components/ui/Skeleton";
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
import { usePagedList } from "./usePagedList";

/* 격자 한 쪽 — 넓은 화면 12열 × 10줄 */
const PAGE_SIZE = 120;

type CustomEmoji = { id: string; name: string; src: string; created_at?: string };

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

  const remove = async (e: CustomEmoji) => {
    const res = await tryRequest(`/api/custom-emojis/${e.id}`, { method: "DELETE" });
    if (!(res instanceof Response) || !res.ok) {
      showToast(t("admin.inline.customEmojiManager.removeFailed"), "error");
      return;
    }
    forgetCustomEmoji(e.src);
    setItems((prev) => (prev ? prev.filter((x) => x.id !== e.id) : prev));
    showToast(t("admin.inline.customEmojiManager.removed"), "success");
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
          <div className={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.tile}><SkeletonLine width={32} height={32} /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState pad="sm">{search ? t("admin.inline.customEmojiManager.noResults") : t("admin.inline.customEmojiManager.empty")}</EmptyState>
        ) : (
          <div className={styles.grid}>
            {paged.slice!.map((e) => (
              <Tooltip key={e.id} content={<span className={styles.tipName}>{e.name ? `:${e.name}:` : t("admin.inline.customEmojiManager.untitled")}</span>} placement="bottom" delay={120}>
                <div className={styles.tile} tabIndex={0}>
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
        )}
        {paged.totalPages > 1 && (
          <Pagination className={lib.pager} page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} showJump={false} />
        )}
      </div>
    </section>
  );
}
