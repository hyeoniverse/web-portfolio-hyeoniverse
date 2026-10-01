"use client";

/* ── 이모지 조합 (라이브러리 › 커스텀 이모지 › 조합) ──
   Google Emoji Kitchen 의 두 이모지를 섞은 그림을 골라 커스텀 이모지로 들인다.
   1) 첫 이모지를 고르고 2) 그 이모지와 섞을 수 있는 두 번째 이모지(원래 모양)를 고르면 3) 위 줄에
   "첫 + 두 번째 = 결과" 로 섞은 그림이 뜨고, 이름을 붙여 추가한다. 예전엔 2) 에서 섞인 그림부터 보여
   무엇과 무엇을 섞은 것인지 알기 어려웠다.
   조합 목록은 public/emoji-kitchen(빌드 스크립트 산출물)에서, 그림은 gstatic 에서 바로 보인다.
   추가하면 서버가 그림을 받아 우리 저장소에 올린다(/api/admin/emoji-kitchen). */
import { Fragment, useContext, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  /* 두 칸(첫·두 번째)에 이모지를 하나씩 — 칸을 누르면 그 칸이 "바꿀 칸"이 되고, 아래 격자에서 고른 이모지가 그 칸에 들어간다 */
  const [slots, setSlots] = useState<[number | null, number | null]>([null, null]);
  const [active, setActive] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const nameId = useId();
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
  /* 바꿀 칸의 후보 — 다른 칸이 비어 있으면 모든 이모지, 차 있으면 그 이모지와 섞이는 것만(분류 → Gboard 순) */
  const other = slots[active === 0 ? 1 : 0];
  const candidates = useMemo(() => {
    if (!data) return [];
    const all = other === null ? data.meta.emojis.map((_, i) => i) : data.pairs[other].map((p) => p.j).sort((a, b) => a - b);
    return all.filter(match);
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match 는 data·q 로만 정해진다
    [data, other, q]);
  const picked: KitchenPair | null = data && slots[0] !== null && slots[1] !== null
    ? data.pairs[slots[0]].find((p) => p.j === slots[1]) ?? null
    : null;

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

  /* 바꿀 칸에 넣는다 — 첫 칸을 채웠고 두 번째가 비어 있으면 두 번째 칸으로 넘어간다 */
  const choose = (i: number) => {
    if (!data) return;
    const next: [number | null, number | null] = active === 0 ? [i, slots[1]] : [slots[0], i];
    setSlots(next);
    if (next[0] !== null && next[1] !== null) setName(`${data.meta.emojis[next[0]].n}_${data.meta.emojis[next[1]].n}`);
    if (active === 0 && next[1] === null) { setActive(1); setSearch(""); }
  };
  const focusSlot = (s: 0 | 1) => { setActive(s); setSearch(""); };

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
      setSlots([null, null]);
      setActive(0);
    } finally {
      setSaving(false);
    }
  };

  if (failed) return <div className={styles.pad}><EmptyState pad="sm">{t("조합 목록을 불러오지 못했습니다", "Couldn’t load combinations")}</EmptyState></div>;

  const slotEmoji = (s: 0 | 1) => (data && slots[s] !== null ? data.meta.emojis[slots[s]!] : null);
  const slotLabel = (s: 0 | 1) => (s === 0 ? t("첫 번째", "First") : t("두 번째", "Second"));
  return (
    <div className={styles.wrap}>
      {/* 식 — [첫 이모지] + [두 번째 이모지] = [결과]. 앞 두 칸은 눌러서 바꿀 칸으로 고른다 */}
      <div className={styles.formulaRow} aria-live="polite">
        {([0, 1] as const).map((s) => {
          const e = slotEmoji(s);
          return (
            <Fragment key={s}>
              {s === 1 && <span className={styles.op} aria-hidden>+</span>}
              <Pressable className={styles.slot} data-active={active === s ? "" : undefined} aria-pressed={active === s}
                onClick={() => focusSlot(s)} title={e?.n}
                aria-label={e ? `${slotLabel(s)}: ${e.n} — ${t("바꾸기", "change")}` : slotLabel(s)}>
                {e ? <span className={styles.slotChar}>{e.e}</span> : <span className={styles.slotHint}>{slotLabel(s)}</span>}
              </Pressable>
            </Fragment>
          );
        })}
        <span className={styles.op} aria-hidden>=</span>
        <span className={styles.slot} data-result="">
          {picked
            /* eslint-disable-next-line @next/next/no-img-element -- gstatic 미리보기, next/image 허용 호스트가 아니다 */
            ? <img src={kitchenImageUrl(picked.date, picked.left, picked.right)} alt={t("섞은 결과", "Mixed result")} className={styles.slotImg} />
            : <span className={styles.slotHint}>{t("결과", "Result")}</span>}
        </span>
      </div>

      <div className={styles.bar}>
        <span className={styles.step}>
          {t(`${slotLabel(active)} 칸에 넣을 이모지`, `Pick the ${active === 0 ? "first" : "second"} emoji`)}
          {data && <span className={styles.count}>{t(`${candidates.length}개`, `${candidates.length}`)}</span>}
        </span>
        <div className={styles.search}>
          <SearchCapsule search={search} onSearchChange={setSearch} placeholder={t("이름·키워드 검색 (영어)", "Search name or keyword")} align="left" />
        </div>
      </div>

      <div className={styles.scroll}>
        {!data ? (
          <div className={styles.grid}>{Array.from({ length: 24 }, (_, i) => <span key={i} className={styles.cell}><SkeletonLine width={28} height={28} /></span>)}</div>
        ) : candidates.length ? (
          byGroup(candidates, (i) => i).map(({ g, items }) => (
            <section key={g} className={styles.group}>
              <h3 className={styles.groupHead}>{groupLabel(g)}<span>{items.length}</span></h3>
              <div className={styles.grid}>
                {items.map((i) => {
                  const e = data.meta.emojis[i];
                  const on = slots[active] === i;
                  return (
                    <Pressable key={e.c} className={styles.cell} data-on={on ? "" : undefined} aria-pressed={on}
                      onClick={() => choose(i)} title={e.n} aria-label={e.n}>
                      <span className={styles.char}>{e.e}</span>
                    </Pressable>
                  );
                })}
              </div>
            </section>
          ))
        ) : <EmptyState pad="sm">{t("맞는 이모지가 없습니다", "No matching emoji")}</EmptyState>}
      </div>

      {/* 아래 단은 늘 그린다 — 조합을 고를 때만 나타나면 모달 높이가 바뀌어 화면이 튀었다. 고르기 전엔 비활성 */}
      {footerEl && createPortal(
        <div className={styles.foot}>
          {/* 라벨 · 입력 · 단추를 한 줄에 — 입력과 단추는 같은 높이(md, 32px) */}
          <label className={styles.nameLabel} htmlFor={nameId}>{t("이모지 이름", "Emoji name")}</label>
          <Input id={nameId} value={picked ? name : ""} onChange={setName} size="md" disabled={!picked} className={styles.nameInput}
            placeholder={picked ? t("이모지 이름", "Emoji name") : t("두 이모지를 고르면 이름을 정할 수 있어요", "Pick two emojis to name it")} />
          <Button variant="primary" size="md" loading={saving} disabled={!picked} onClick={() => void add()}>{t("추가", "Add")}</Button>
        </div>,
        footerEl,
      )}
    </div>
  );
}
