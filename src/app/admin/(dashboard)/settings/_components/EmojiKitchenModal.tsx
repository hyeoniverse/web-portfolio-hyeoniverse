"use client";

/* ── 이모지 조합 (라이브러리 › 커스텀 이모지 › 조합) ──
   Google Emoji Kitchen 의 두 이모지를 섞은 그림을 골라 커스텀 이모지로 들인다.
   1) 첫 이모지를 고르고 2) 그 이모지와 섞을 수 있는 두 번째 이모지(원래 모양)를 고르면 3) 위 줄에
   "첫 + 두 번째 = 결과" 로 섞은 그림이 뜨고, 이름을 붙여 추가한다. 예전엔 2) 에서 섞인 그림부터 보여
   무엇과 무엇을 섞은 것인지 알기 어려웠다.
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
  /* 두 번째 후보는 첫 번째 목록과 같은 순서(분류 → Gboard)로 — pairs 는 i ≤ j 쌍을 양쪽에 넣어 순서가 섞여 있다 */
  const combos = useMemo(() => (data && base !== null ? data.pairs[base].filter((p) => match(p.j)).sort((a, b) => a.j - b.j) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match 는 data·q 로만 정해진다
    [data, base, q]);

  /* 분류별로 나눈다 — 목록이 분류 순서로 놓여 있으므로 앞에서부터 끊으면 된다 */
  const byGroup = <T,>(items: T[], idx: (x: T) => number) => {
    const out: { g: number; items: T[] }[] = [];
    for (const x of items) {
      const g = data!.meta.emojis[idx(x)].g;
      if (out.at(-1)?.g !== g) out.push({ g, items: [] });
      out.at(-1)!.items.push(x);
    }
    return out;
  };
  const GROUP_LABEL: Record<string, [string, string]> = {
    "smileys & emotion": ["표정·감정", "Smileys & emotion"],
    "people & body": ["사람·몸", "People & body"],
    "animals & nature": ["동물·자연", "Animals & nature"],
    "food & drink": ["음식·음료", "Food & drink"],
    "travel & places": ["여행·장소", "Travel & places"],
    "activities": ["활동", "Activities"],
    "objects": ["사물", "Objects"],
    "symbols": ["기호", "Symbols"],
    "": ["기타", "Other"],
  };
  const groupLabel = (g: number) => {
    const [ko, en] = GROUP_LABEL[data!.meta.groups[g]] ?? GROUP_LABEL[""];
    return t(ko, en);
  };

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
  const partnerEmoji = data && picked ? data.meta.emojis[picked.j] : null;
  return (
    <div className={styles.wrap}>
      {/* 식 — [첫 이모지] + [두 번째 이모지] = [결과]. 아직 고르지 않은 칸은 비워 둔다 */}
      <div className={styles.formulaRow} aria-live="polite">
        <span className={styles.slot} data-on={baseEmoji ? "" : undefined} title={baseEmoji?.n}>
          {baseEmoji ? <span className={styles.slotChar}>{baseEmoji.e}</span> : <span className={styles.slotHint}>{t("첫 번째", "First")}</span>}
        </span>
        <span className={styles.op} aria-hidden>+</span>
        <span className={styles.slot} data-on={partnerEmoji ? "" : undefined} title={partnerEmoji?.n}>
          {partnerEmoji ? <span className={styles.slotChar}>{partnerEmoji.e}</span> : <span className={styles.slotHint}>{t("두 번째", "Second")}</span>}
        </span>
        <span className={styles.op} aria-hidden>=</span>
        <span className={styles.slot} data-on={picked ? "" : undefined}>
          {picked
            /* eslint-disable-next-line @next/next/no-img-element -- gstatic 미리보기, next/image 허용 호스트가 아니다 */
            ? <img src={kitchenImageUrl(picked.date, picked.left, picked.right)} alt={t("섞은 결과", "Mixed result")} className={styles.slotImg} />
            : <span className={styles.slotHint}>{t("결과", "Result")}</span>}
        </span>
      </div>

      <div className={styles.bar}>
        {baseEmoji ? (
          <Pressable className={styles.back} onClick={() => { setBase(null); setPicked(null); setSearch(""); }}>
            <ChevronLeft size={15} />
            <span>{t("첫 번째 바꾸기", "Change first")}</span>
            <span className={styles.count}>{t(`두 번째 이모지 ${data!.pairs[base!].length}개`, `${data!.pairs[base!].length} to mix with`)}</span>
          </Pressable>
        ) : (
          <span className={styles.step}>{t("첫 번째 이모지를 고르세요", "Pick the first emoji")}</span>
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
            byGroup(baseList, (i) => i).map(({ g, items }) => (
              <section key={g} className={styles.group}>
                <h3 className={styles.groupHead}>{groupLabel(g)}<span>{items.length}</span></h3>
                <div className={styles.grid}>
                  {items.map((i) => {
                    const e = data.meta.emojis[i];
                    return (
                      <Pressable key={e.c} className={styles.cell} onClick={() => chooseBase(i)} title={e.n} aria-label={e.n}>
                        <span className={styles.char}>{e.e}</span>
                      </Pressable>
                    );
                  })}
                </div>
              </section>
            ))
          ) : <EmptyState pad="sm">{t("맞는 이모지가 없습니다", "No matching emoji")}</EmptyState>
        ) : combos.length ? (
          byGroup(combos, (p) => p.j).map(({ g, items }) => (
            <section key={g} className={styles.group}>
              <h3 className={styles.groupHead}>{groupLabel(g)}<span>{items.length}</span></h3>
              <div className={styles.grid}>
                {items.map((p) => {
                  const partner = data.meta.emojis[p.j];
                  const on = picked?.left === p.left && picked.right === p.right;
                  return (
                    <Pressable key={`${p.left}_${p.right}`} className={styles.cell} data-on={on ? "" : undefined}
                      onClick={() => choose(p)} title={partner.n} aria-label={`${baseEmoji!.n} + ${partner.n}`} aria-pressed={on}>
                      <span className={styles.char}>{partner.e}</span>
                    </Pressable>
                  );
                })}
              </div>
            </section>
          ))
        ) : <EmptyState pad="sm">{t("맞는 조합이 없습니다", "No matching combinations")}</EmptyState>}
      </div>

      {/* 아래 단은 늘 그린다 — 조합을 고를 때만 나타나면 모달 높이가 바뀌어 화면이 튀었다. 고르기 전엔 비활성 */}
      {footerEl && createPortal(
        <div className={styles.foot}>
          <div className={styles.footMain}>
            <span className={styles.formula}>{t("이모지 이름", "Emoji name")}</span>
            <Input value={picked ? name : ""} onChange={setName} size="sm" disabled={!picked}
              placeholder={picked ? t("이모지 이름", "Emoji name") : t("두 이모지를 고르면 정할 수 있어요", "Pick two emojis first")} />
          </div>
          <Button variant="primary" size="md" loading={saving} disabled={!picked} onClick={() => void add()}>{t("추가", "Add")}</Button>
        </div>,
        footerEl,
      )}
    </div>
  );
}
