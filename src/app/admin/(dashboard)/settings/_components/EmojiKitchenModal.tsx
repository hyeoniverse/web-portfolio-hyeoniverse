"use client";

/* ── 이모지 조합 (라이브러리 › 커스텀 이모지 › 조합) ──
   Google Emoji Kitchen 의 두 이모지를 섞은 그림을 골라 커스텀 이모지로 들인다.
   1) 이모지 하나를 고르면 2) 그 이모지와 섞을 수 있는 조합 그림이 뜨고 3) 하나를 골라 이름을 붙여 추가한다.
   조합 목록은 public/emoji-kitchen(빌드 스크립트 산출물)에서, 그림은 gstatic 에서 바로 보인다.
   추가하면 서버가 그림을 받아 우리 저장소에 올린다(/api/admin/emoji-kitchen). */
import { useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import { ModalFooterContext } from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Pressable from "@/components/ui/Pressable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import { errorFromResponse, errorText } from "@/lib/apiError";
import { decodePairs, kitchenImageUrl, type KitchenMeta, type KitchenPair } from "@/lib/emojiKitchen";
import styles from "./EmojiKitchenModal.module.css";

type Data = { meta: KitchenMeta; pairs: KitchenPair[][] };
export type KitchenEmojiRow = { id: string; name: string; src: string; created_at?: string };

/* 목록은 한 번만 받는다(약 120KB gzip) — 창을 다시 열어도 다시 받지 않게 모듈에 들고 있는다 */
let dataPromise: Promise<Data> | null = null;
function loadData(): Promise<Data> {
  dataPromise ??= Promise.all([
    fetch("/emoji-kitchen/meta.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
    fetch("/emoji-kitchen/pairs.bin").then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))),
  ]).then(([meta, buf]: [KitchenMeta, ArrayBuffer]) => ({ meta, pairs: decodePairs(buf, meta) }))
    .catch((e) => { dataPromise = null; throw e; });
  return dataPromise;
}

export default function EmojiKitchenModal({ onAdded }: { onAdded: (row: KitchenEmojiRow) => void }) {
  const { language, t: tr } = useLanguage();
  const ko = language === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [base, setBase] = useState<number | null>(null);
  const [picked, setPicked] = useState<KitchenPair | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  /* 고른 조합(미리보기·이름·추가)은 모달 아래 단(footer)에 그린다 — 다른 모달과 같은 여백·자리 */
  const footerEl = useContext(ModalFooterContext);

  useEffect(() => {
    let cancelled = false;
    loadData().then((d) => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const q = search.trim().toLowerCase();
  const match = (i: number) => {
    if (!q || !data) return true;
    const e = data.meta.emojis[i];
    return e.n.includes(q) || e.k.includes(q) || e.e === search.trim();
  };
  const baseList = useMemo(() => (data ? data.meta.emojis.map((_, i) => i).filter(match) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match 는 data·q 로만 정해진다
    [data, q]);
  const combos = useMemo(() => (data && base !== null ? data.pairs[base].filter((p) => match(p.j)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match 는 data·q 로만 정해진다
    [data, base, q]);

  const chooseBase = (i: number) => { setBase(i); setPicked(null); setSearch(""); };
  const choose = (p: KitchenPair) => {
    if (!data || base === null) return;
    setPicked(p);
    setName(`${data.meta.emojis[base].n}_${data.meta.emojis[p.j].n}`);
  };

  const add = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      const res = await tryRequest("/api/admin/emoji-kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ left: picked.left, right: picked.right, date: picked.date, name: name.trim() }),
      });
      if (!(res instanceof Response) || !res.ok) {
        const err = res instanceof Response ? await errorFromResponse(res) : null;
        showToast(errorText(err, tr, t("조합 이모지를 추가하지 못했어요.", "Couldn’t add the combined emoji.")), "error");
        return;
      }
      onAdded((await res.json()) as KitchenEmojiRow);
      showToast(t("조합 이모지를 추가했어요.", "Combined emoji added."), "success");
      setPicked(null);
    } finally {
      setSaving(false);
    }
  };

  if (failed) return <div className={styles.pad}><EmptyState pad="sm">{t("조합 목록을 불러오지 못했습니다", "Couldn’t load combinations")}</EmptyState></div>;

  const baseEmoji = data && base !== null ? data.meta.emojis[base] : null;
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {baseEmoji ? (
          <Pressable className={styles.back} onClick={() => { setBase(null); setPicked(null); setSearch(""); }}>
            <ChevronLeft size={15} />
            <span className={styles.baseChar} aria-hidden>{baseEmoji.e}</span>
            <span>{t(`${baseEmoji.n} 와 섞기 · ${data!.pairs[base!].length}개`, `Mix with ${baseEmoji.n} · ${data!.pairs[base!].length}`)}</span>
          </Pressable>
        ) : (
          <span className={styles.step}>{t("섞을 이모지를 하나 고르세요", "Pick an emoji to mix")}</span>
        )}
        <div className={styles.search}>
          <SearchCapsule search={search} onSearchChange={setSearch} placeholder={t("이름·키워드 검색 (영어)", "Search name or keyword")} align="left" />
        </div>
      </div>

      <div className={styles.scroll}>
        {!data ? (
          <div className={styles.grid}>{Array.from({ length: 24 }, (_, i) => <span key={i} className={styles.cell}><SkeletonLine width={28} height={28} /></span>)}</div>
        ) : base === null ? (
          baseList.length ? (
            <div className={styles.grid}>
              {baseList.map((i) => {
                const e = data.meta.emojis[i];
                return (
                  <Pressable key={e.c} className={styles.cell} onClick={() => chooseBase(i)} title={e.n} aria-label={e.n}>
                    <span className={styles.char}>{e.e}</span>
                  </Pressable>
                );
              })}
            </div>
          ) : <EmptyState pad="sm">{t("맞는 이모지가 없습니다", "No matching emoji")}</EmptyState>
        ) : combos.length ? (
          <div className={`${styles.grid} ${styles.gridLarge}`}>
            {combos.map((p) => {
              const partner = data.meta.emojis[p.j];
              const on = picked?.left === p.left && picked.right === p.right;
              return (
                <Pressable key={`${p.left}_${p.right}`} className={styles.cell} data-on={on ? "" : undefined}
                  onClick={() => choose(p)} title={partner.n} aria-label={`${baseEmoji!.n} + ${partner.n}`} aria-pressed={on}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- gstatic 미리보기, next/image 허용 호스트가 아니다 */}
                  <img src={kitchenImageUrl(p.date, p.left, p.right)} alt="" loading="lazy" className={styles.mix} />
                </Pressable>
              );
            })}
          </div>
        ) : <EmptyState pad="sm">{t("맞는 조합이 없습니다", "No matching combinations")}</EmptyState>}
      </div>

      {picked && baseEmoji && data && footerEl && createPortal(
        <div className={styles.foot}>
          {/* eslint-disable-next-line @next/next/no-img-element -- gstatic 미리보기 */}
          <img src={kitchenImageUrl(picked.date, picked.left, picked.right)} alt="" className={styles.preview} />
          <div className={styles.footMain}>
            <span className={styles.formula}>{baseEmoji.e} + {data.meta.emojis[picked.j].e}</span>
            <Input value={name} onChange={setName} size="sm" placeholder={t("이모지 이름", "Emoji name")} />
          </div>
          <Button variant="primary" size="md" loading={saving} onClick={() => void add()}>{t("추가", "Add")}</Button>
        </div>,
        footerEl,
      )}
    </div>
  );
}
