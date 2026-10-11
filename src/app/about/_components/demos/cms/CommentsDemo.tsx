"use client";

/* 로그인 없는 댓글 — 닉네임은 이모지 + 형용사 + 동물로 섞어 고르고, 반응 8종을 누르고, 고치거나 지울 때는 쓸 때 정한
   비밀번호(bcrypt)로만 확인한다. 답글이 없으면 행을 지우고, 답글이 있거나 관리자가 지우면 내용을 보존한 채 가린다.
   대본: 틀린 비밀번호로 지우기(403) → 1234 와 '답글 있음'으로 지우기 → 자리만 남는다 */
import { useReducer, useState } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { RotateCcw, Shuffle } from "@/components/icons";
import { useL } from "../../features/shared";
import { GuideAnchor } from "../../guide/GuideStar";
import {
  comments as copy,
  COMMENT_ADJECTIVES,
  COMMENT_CREATURES,
  COMMENT_DEMO_PASSWORD,
  REACTION_EMOJIS,
  type L10n,
} from "./data";
import { DemoShell, useScript, type Cue } from "./Script";
import styles from "./CmsDemos.module.css";

type Actor = "author" | "admin";
type Status = "live" | "tomb" | "gone";

/* 지우기 판단 — 대본도 같은 규칙을 거치도록 reducer 로 둔다 */
type State = {
  actor: Actor;
  hasReplies: boolean;
  password: string;
  status: Status;
  deletedBy: Actor | null;
  message: { text: L10n; kind?: "ok" | "error" } | null;
};
type Action =
  | { type: "actor"; actor: Actor }
  | { type: "replies"; on: boolean }
  | { type: "password"; value: string }
  | { type: "remove" }
  | { type: "restore" }
  | { type: "reset" };

const START: State = { actor: "author", hasReplies: false, password: "", status: "live", deletedBy: null, message: null };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "actor":
      return { ...s, actor: a.actor, message: null };
    case "replies":
      return { ...s, hasReplies: a.on };
    case "password":
      return { ...s, password: a.value };
    case "restore":
      return { ...s, status: "live", deletedBy: null, message: { text: copy.restored, kind: "ok" } };
    case "reset":
      return { ...START, actor: s.actor, hasReplies: s.hasReplies };
    case "remove":
      break;
  }
  if (s.actor === "admin") {
    /* 이미 관리자가 가린 댓글을 한 번 더 지우면 행을 지운다 — lib/api/commentDetailHandler */
    if (s.status === "tomb" && s.deletedBy === "admin") return { ...s, status: "gone", message: { text: copy.hardDeleted, kind: "ok" } };
    return { ...s, status: "tomb", deletedBy: "admin", message: { text: copy.adminTomb, kind: "ok" } };
  }
  if (!s.password.trim()) return { ...s, message: { text: copy.required, kind: "error" } };
  if (s.password.trim() !== COMMENT_DEMO_PASSWORD) return { ...s, message: { text: copy.wrong, kind: "error" } };
  return s.hasReplies
    ? { ...s, password: "", status: "tomb", deletedBy: "author", message: { text: copy.selfTomb, kind: "ok" } }
    : { ...s, password: "", status: "gone", message: { text: copy.selfHard, kind: "ok" } };
}

/** 대본이 비밀번호를 한 글자씩 넣는다 */
const typeCues = (value: string, put: (v: string) => void, first: number): Cue[] =>
  [...value].map((_, i) => [i === 0 ? first : 140, () => put(value.slice(0, i + 1))]);

export default function CommentsDemo() {
  const t = useL();
  const [creature, setCreature] = useState(0);
  const [adjective, setAdjective] = useState(3);
  const [counts, setCounts] = useState<Record<string, number>>({ "👍": 3, "🎉": 1, "❤️": 2 });
  const [mine, setMine] = useState<string[]>([]);
  const [s, dispatch] = useReducer(reducer, START);

  /* 지금 이모지와 다른 동물 하나, 형용사는 따로 — utils/commenterIdentity getRandomIdentity */
  const shuffle = () => {
    const pool = COMMENT_CREATURES.map((_, i) => i).filter((i) => i !== creature);
    setCreature(pool[Math.floor(Math.random() * pool.length)]);
    setAdjective(Math.floor(Math.random() * COMMENT_ADJECTIVES.length));
  };
  const react = (emoji: string) => {
    const on = mine.includes(emoji);
    setMine((now) => (on ? now.filter((item) => item !== emoji) : [...now, emoji]));
    setCounts((now) => ({ ...now, [emoji]: (now[emoji] ?? 0) + (on ? -1 : 1) }));
  };

  const put = (value: string) => dispatch({ type: "password", value });
  const script = useScript(() => [
    ...typeCues("0000", put, 900),
    [500, () => dispatch({ type: "remove" })],
    [1800, () => put("")],
    ...typeCues(COMMENT_DEMO_PASSWORD, put, 300),
    [600, () => dispatch({ type: "replies", on: true })],
    [900, () => dispatch({ type: "remove" })],
  ]);

  const who = COMMENT_CREATURES[creature];
  const deleted = s.status !== "live";

  return (
    <DemoShell {...script}>
      <div className={styles.thread}>
        {s.status === "gone" ? (
          <p className={styles.gone}>{t(copy.hardDeleted)}</p>
        ) : (
          <article className={styles.comment} data-deleted={deleted || undefined}>
            <header>
              {!s.message && <GuideAnchor size="1rem" priority={2} />}
              <b>
                {who.emoji} {COMMENT_ADJECTIVES[adjective]} {who.noun}
              </b>
              {/* 이름 다시 뽑기 — 이름 글자 크기에 맞춘 흐린 아이콘, 올리면 밝아진다 */}
              <Button
                variant="ghost"
                shape="circle"
                size="xs"
                icon={<Shuffle size={14} className={styles.shuffleIcon} aria-hidden="true" />}
                aria-label={t(copy.shuffle)}
                disabled={deleted}
                onClick={shuffle}
              />
              <small>{t(copy.justNow)}</small>
            </header>
            <p>{deleted ? <em>{t(copy.tombstone)}</em> : t(copy.body)}</p>
            <ul className={styles.reactions}>
              {REACTION_EMOJIS.map((emoji) => (
                <li key={emoji}>
                  <Pressable className={styles.reaction} aria-pressed={mine.includes(emoji)} disabled={deleted} onClick={() => react(emoji)}>
                    {emoji} {counts[emoji] ? <span>{counts[emoji]}</span> : null}
                  </Pressable>
                </li>
              ))}
            </ul>
          </article>
        )}
        {/* 답글 자리는 늘 잡아 둔다 — 켜고 꺼도 아래 칸이 들썩이지 않게 */}
        <p className={styles.reply} data-on={(s.hasReplies && s.status !== "gone") || undefined}>
          ↳ 🐧 Swift Penguin · 👍
        </p>
      </div>
      <div className={styles.panel}>
        <div className={styles.row}>
          <SegmentedControl
            size="sm"
            items={[
              { value: "author", label: t(copy.author) },
              { value: "admin", label: t(copy.admin) },
            ]}
            value={s.actor}
            onChange={(v) => dispatch({ type: "actor", actor: v })}
          />
          <Checkbox checked={s.hasReplies} onChange={(on) => dispatch({ type: "replies", on })} label={t(copy.hasReplies)} disabled={deleted} />
        </div>
        <div className={styles.row} data-reserve="">
          {s.status === "gone" ? (
            <Button size="sm" variant="outline" onClick={() => dispatch({ type: "reset" })}>
              {t(copy.again)}
            </Button>
          ) : (
            <>
              {s.actor === "author" && s.status === "live" && (
                <Input
                  className={styles.password}
                  type="password"
                  size="sm"
                  value={s.password}
                  onChange={put}
                  placeholder={`${t(copy.password)} (1234)`}
                  aria-label={t(copy.password)}
                  autoComplete="off"
                />
              )}
              {(s.actor === "admin" || s.status === "live") && (
                <Button size="sm" variant="outline" tone="danger" onClick={() => dispatch({ type: "remove" })}>
                  {t(copy.remove)}
                </Button>
              )}
              {s.actor === "admin" && s.status === "tomb" && (
                <Button size="sm" variant="outline" icon={<RotateCcw aria-hidden="true" />} onClick={() => dispatch({ type: "restore" })}>
                  {t(copy.restore)}
                </Button>
              )}
              {s.actor === "author" && s.status === "tomb" && (
                <Button size="sm" variant="outline" onClick={() => dispatch({ type: "reset" })}>
                  {t(copy.again)}
                </Button>
              )}
            </>
          )}
        </div>
        <p className={styles.result} data-kind={s.message?.kind} role="status">
          {s.message && <GuideAnchor size="1rem" priority={2} className={styles.pin} />}
          {s.message ? t(s.message.text) : t(copy.intro)}
        </p>
      </div>
      <p className={styles.note}>{t(copy.reactions)}</p>
    </DemoShell>
  );
}
