"use client";

/* 이모지 키친 — 이모지 두 개를 고르면 Google Gboard 가 섞어 그린 그림이 나온다. 사이트는 조합 14만 7천 개를
   가벼운 목록(meta.json + pairs.bin)으로 줄여 두고, 고른 조합을 커스텀 이모지로 가져와 글과 댓글에 쓴다.
   대본: 둘째 · 첫째 줄을 번갈아 바꿔 네 가지 조합을 보여 준다 */
import { useState } from "react";
import Pressable from "@/components/ui/Pressable";
import { Equal, Plus } from "@/components/icons";
import { kitchenImageUrl } from "@/lib/emojiKitchen";
import { useL } from "../../features/shared";
import { GuideAnchor } from "../../guide/GuideStar";
import { kitchen as copy } from "./data";
import { KITCHEN_EMOJIS, KITCHEN_PAIRS } from "./kitchenData";
import { DemoShell, useScript } from "./Script";
import styles from "./CmsDemos.module.css";

type Emoji = (typeof KITCHEN_EMOJIS)[number];

export default function KitchenDemo() {
  const t = useL();
  const [left, setLeft] = useState<Emoji>(KITCHEN_EMOJIS[0]);
  const [right, setRight] = useState<Emoji>(KITCHEN_EMOJIS[3]);
  const [broken, setBroken] = useState<string | null>(null);
  const pair = KITCHEN_PAIRS[`${left}+${right}`] ?? KITCHEN_PAIRS[`${right}+${left}`];
  const src = pair ? kitchenImageUrl(...pair) : null;

  /* 대본 — KITCHEN_EMOJIS 의 🔥 · 🐱 · 🌈 · 👻 */
  const script = useScript(() => [
    [900, () => setRight(KITCHEN_EMOJIS[2])],
    [1300, () => setLeft(KITCHEN_EMOJIS[1])],
    [1300, () => setRight(KITCHEN_EMOJIS[4])],
    [1300, () => setLeft(KITCHEN_EMOJIS[5])],
  ]);

  const row = (value: Emoji, set: (emoji: Emoji) => void, label: string) => (
    <div className={styles.kitchenRow} role="group" aria-label={label}>
      {KITCHEN_EMOJIS.map((emoji) => (
        <Pressable key={emoji} className={styles.kitchenPick} aria-pressed={value === emoji} onClick={() => set(emoji)}>
          {emoji}
        </Pressable>
      ))}
    </div>
  );

  return (
    <DemoShell {...script}>
      {/* 넓은 화면 — 왼쪽에 고르는 두 줄, 오른쪽에 섞인 그림. 좁은 화면은 위아래로 */}
      <div className={styles.kitchen}>
        <div className={styles.kitchenPickers}>
          <div className={styles.kitchenGroup}>
            <p className={styles.label}>{t(copy.first)}</p>
            {row(left, setLeft, t(copy.first))}
          </div>
          <div className={styles.kitchenGroup}>
            <p className={styles.label}>{t(copy.second)}</p>
            {row(right, setRight, t(copy.second))}
          </div>
        </div>
        <div className={styles.kitchenMix}>
          <p className={styles.kitchenFormula}>
            <span>{left}</span>
            <Plus aria-hidden="true" className={styles.kitchenOp} />
            <span>{right}</span>
            <Equal aria-hidden="true" className={styles.kitchenOp} />
          </p>
          <figure>
            {/* 지금 볼 곳 — 섞인 그림 */}
            <GuideAnchor size="1.25rem" priority={2} className={styles.kitchenPin} />
          {src && broken !== src ? (
              /* eslint-disable-next-line @next/next/no-img-element -- gstatic 그림, next/image 허용 호스트가 아니다(설정의 EmojiKitchenModal 과 같다) */
              <img key={src} src={src} alt={`${t(copy.mixed)}: ${left} + ${right}`} onError={() => setBroken(src)} />
          ) : (
            <em>{t(src ? copy.broken : copy.none)}</em>
          )}
          </figure>
        </div>
      </div>
      <p className={styles.note}>{t(copy.caption)}</p>
    </DemoShell>
  );
}
