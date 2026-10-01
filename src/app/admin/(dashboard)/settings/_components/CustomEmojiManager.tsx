"use client";

// ── 커스텀 이모지 (settings > 라이브러리) ──
// 에디터 이모지 피커에서 올린 이미지 이모지 목록(custom_emojis). 예전엔 피커 안에서만 보고 지울 수 있었다.
// 여기서 지우면 피커 목록에서만 빠지고, 이미 글에 넣은 이모지는 이미지 주소가 남아 그대로 보인다.
import { useEffect, useRef, useState } from "react";
import { Plus } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import EmptyState from "@/components/ui/EmptyState";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import { uploadFile } from "@/lib/adminUpload";
import { errorText } from "@/lib/apiError";
import { resizeEmojiImage, EmojiImageError, EMOJI_MIN } from "@/components/ui/EmojiPicker/resizeEmojiImage";
import { forgetCustomEmoji } from "@/components/ui/EmojiPicker/customEmojiCache";
import settings from "../Settings.module.css";
import styles from "./CustomEmojiManager.module.css";

type CustomEmoji = { id: string; name: string; src: string; created_at?: string };

export default function CustomEmojiManager() {
  const { language, t: tr } = useLanguage();
  const ko = language === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const [items, setItems] = useState<CustomEmoji[] | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
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
      showToast(t("이모지를 추가했어요.", "Emoji added."), "success");
    } catch (err) {
      showToast(
        err instanceof EmojiImageError
          ? err.code === "tooSmall" ? t(`이미지가 너무 작아요 (최소 ${EMOJI_MIN}×${EMOJI_MIN}px)`, `Image is too small (min ${EMOJI_MIN}×${EMOJI_MIN}px)`)
            : t("이미지를 읽지 못했어요.", "Couldn’t read the image.")
          : errorText(err, tr, t("이모지를 추가하지 못했어요.", "Couldn’t add the emoji.")),
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const remove = async (e: CustomEmoji) => {
    const res = await tryRequest(`/api/custom-emojis/${e.id}`, { method: "DELETE" });
    if (!(res instanceof Response) || !res.ok) {
      showToast(t("이모지를 지우지 못했어요.", "Couldn’t remove the emoji."), "error");
      return;
    }
    forgetCustomEmoji(e.src);
    setItems((prev) => (prev ? prev.filter((x) => x.id !== e.id) : prev));
    showToast(t("피커 목록에서 뺐어요. 이미 글에 넣은 이모지는 그대로 보여요.", "Removed from the picker. Emojis already in posts stay as they are."), "success");
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={styles.wrap}>
        <div className={styles.headRow}>
          <h2 className={settings.sectionTitle}>{t("커스텀 이모지", "Custom emojis")}</h2>
          {items && <span className={styles.headCount}>{items.length}</span>}
          <div className={styles.headActions}>
            <div className={styles.headSearch}>
              <SearchCapsule search={search} onSearchChange={setSearch} placeholder={t("이름 검색", "Search name")} align="left" />
            </div>
            <Button variant="outline" size="md" icon={<Plus size={14} />} loading={uploading} onClick={() => fileRef.current?.click()}>
              {t("추가", "Add")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void add(f); e.target.value = ""; }}
            />
          </div>
        </div>
        <p className={settings.sectionHint}>
          {t(
            "글 편집기의 이모지 피커에서 쓰는 이미지 이모지예요. 지우면 피커에서만 빠지고, 이미 글에 넣은 이모지는 그대로 보여요.",
            "Image emojis used by the editor’s emoji picker. Removing one only takes it out of the picker; emojis already in posts stay as they are.",
          )}
        </p>

        {filtered === null ? (
          <div className={styles.grid}>
            {[0, 1, 2, 3].map((i) => <div key={i} className={styles.tile}><SkeletonLine width="60%" height={12} /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState pad="sm">{search ? t("검색 결과가 없습니다", "No results") : t("올린 이모지가 없습니다", "No custom emojis yet")}</EmptyState>
        ) : (
          <div className={styles.grid}>
            {filtered.map((e) => (
              <div key={e.id} className={styles.tile}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 올린 작은 이모지 이미지, 최적화 대상이 아니다 */}
                <img src={e.src} alt="" className={styles.img} loading="lazy" />
                <span className={`${styles.name}${e.name ? "" : ` ${styles.nameMuted}`}`} title={e.name}>{e.name || t("이름 없음", "Untitled")}</span>
                <CloseButton
                  size="xs"
                  className={styles.remove}
                  onClick={() => void remove(e)}
                  ariaLabel={t(`${e.name || "이모지"} 지우기`, `Remove ${e.name || "emoji"}`)}
                  title={t("피커에서 빼기", "Remove from picker")}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
