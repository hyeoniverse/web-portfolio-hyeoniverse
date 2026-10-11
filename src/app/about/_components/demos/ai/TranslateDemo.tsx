"use client";

/* 번역 — HYEONIVERSE 작업물의 부제 · 설명을 고치고 보내면 /api/demo/translate 가 실제로 번역한다.
   원문 언어(자동 감지 포함)와 번역할 언어를 고른다. 기본은 자동 감지 → 영어. 원문을 고치기 전에는 예시 글이고,
   번역할 언어를 한국어로 고르면 예시도 영어 글로 바뀐다. 원문 · 언어를 바꾸면 옛 번역은 흐리게 남긴다. */
import { useId, useState } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Languages } from "@/components/icons";
import { useL } from "../../features/shared";
import { common, MAX_CHARS, providerName, TRANSLATE_SAMPLE, translateCopy as copy } from "./data";
import { blockReason, Chip, LiveInfo, perIpOf, QuotaChip, StatusLine } from "./parts";
import { useDemoApi } from "./useDemoApi";
import styles from "./AiDemos.module.css";

type Lang = keyof typeof copy.langs;
type Source = Lang | "auto";
const LANGS = Object.keys(copy.langs) as Lang[];
const MAX = MAX_CHARS.translate;

export default function TranslateDemo() {
  const L = useL();
  const id = useId();
  const [source, setSource] = useState<Source>("auto");
  const [target, setTarget] = useState<Lang>("en");
  /* 손대기 전에는 예시 — 번역할 언어가 한국어면 영어 예시, 아니면 한국어 예시 */
  const [own, setOwn] = useState<string | null>(null);
  const text = own ?? TRANSLATE_SAMPLE[target === "ko" ? "en" : "ko"];
  const [made, setMade] = useState<{ text: string; provider: string; source: string; from: Source; target: Lang } | null>(null);
  const { quota, busy, error, run, fail, clearError } = useDemoApi<{ text?: string; provider?: string }>("translate");

  const translate = async () => {
    if (source === target) return fail(L(copy.same));
    const blocked = blockReason(text, MAX, quota);
    if (blocked) return fail(L(blocked));
    const data = await run({ text, source, target });
    if (!data) return;
    if (typeof data.text !== "string") return fail(L(common.failed));
    setMade({ text: data.text, provider: providerName(data.provider), source: text, from: source, target });
  };

  const fresh = made && made.source === text && made.from === source && made.target === target;
  const status = busy
    ? L(copy.busy)
    : made && !fresh
      ? L(copy.stale)
      : made
        ? L(common.madeBy(made.provider || "AI"))
        : L(copy.idle);

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        {/* 원문 언어 → 번역할 언어 */}
        <div className={styles.langs}>
          <div className={styles.langField} role="group" aria-label={L(copy.from)}>
            <span className={styles.langLabel} aria-hidden>{L(copy.from)}</span>
            <Select
              size="sm"
              width="max"
              value={source}
              options={[{ value: "auto", label: L(copy.auto) }, ...LANGS.map((l) => ({ value: l, label: L(copy.langs[l]) }))]}
              onChange={(v) => { setSource(v as Source); clearError(); }}
              disabled={busy}
            />
          </div>
          <span className={styles.langArrow} aria-hidden>→</span>
          <div className={styles.langField} role="group" aria-label={L(copy.to)}>
            <span className={styles.langLabel} aria-hidden>{L(copy.to)}</span>
            <Select
              size="sm"
              width="max"
              value={target}
              options={LANGS.map((l) => ({ value: l, label: L(copy.langs[l]) }))}
              onChange={(v) => { setTarget(v as Lang); clearError(); }}
              disabled={busy}
            />
          </div>
        </div>
        <div className={styles.chips}>
          {made?.provider && <Chip>{made.provider}</Chip>}
          <QuotaChip quota={quota} kind="translate" />
        </div>
      </div>
      <LiveInfo text={common.live(perIpOf(quota, "translate"), MAX)} />
      <Textarea
        className={styles.fieldMd}
        id={`${id}-src`}
        label={L(copy.label)}
        size="sm"
        rows={6}
        maxHint={MAX}
        value={text}
        disabled={busy}
        onChange={(v) => { setOwn(v); clearError(); }}
      />
      <section className={styles.result} aria-label={L(copy.result)} aria-busy={busy || undefined}>
        <span className={styles.resultLabel}>
          <Languages size={14} aria-hidden />
          {L(copy.result)}
        </span>
        {/* 자리를 늘 잡아 두고 내용만 바꾼다 — 상태에 따라 아래가 밀리지 않게 */}
        <div className={styles.resultBody} data-stale={(made && !fresh) || undefined}>
          {busy ? (
            <span className={styles.shimmer} aria-hidden />
          ) : made ? (
            <p key={made.text} className={styles.typed}>{made.text}</p>
          ) : (
            <p className={styles.placeholder}>{L(copy.placeholder)}</p>
          )}
        </div>
      </section>
      <div className={styles.foot}>
        <StatusLine error={error}>{status}</StatusLine>
        <Button
          size="md"
          icon={<Languages size={16} />}
          loading={busy}
          disabled={busy || quota?.remaining === 0 || quota?.unavailable}
          onClick={() => void translate()}
        >
          {L(copy.run)}
        </Button>
      </div>
    </div>
  );
}
