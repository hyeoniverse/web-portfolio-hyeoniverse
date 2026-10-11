"use client";

/* AI 커버 — 프롬프트를 고치고 스타일을 골라 보내면 /api/demo/cover 가 실제로 커버를 그린다.
   16:9 자리를 늘 잡아 두고 그림만 바꾼다. 그리기 전에는 빈 커버(그라데이션 위 프롬프트)를 보인다.
   무료 한도가 작아 하루 1번이 기본이다. */
import { useId, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Textarea from "@/components/ui/Textarea";
import { ImageIcon } from "@/components/icons";
import { useL } from "../../features/shared";
import { COVER_SAMPLE, COVER_STYLE_LABEL, COVER_STYLES, common, coverCopy as copy, MAX_CHARS, providerName, type CoverStyle } from "./data";
import { blockReason, Chip, LiveInfo, perIpOf, QuotaChip, StatusLine, useSampleText } from "./parts";
import { useDemoApi } from "./useDemoApi";
import styles from "./AiDemos.module.css";

const MAX = MAX_CHARS.cover;

export default function CoverDemo() {
  const L = useL();
  const id = useId();
  const [prompt, setPrompt] = useSampleText(COVER_SAMPLE);
  const [style, setStyle] = useState<CoverStyle>("abstract");
  const [made, setMade] = useState<{ src: string; prompt: string; provider: string } | null>(null);
  const { quota, busy, error, run, fail, clearError } = useDemoApi<{ image?: string; provider?: string }>("cover");

  const draw = async () => {
    const blocked = blockReason(prompt, MAX, quota);
    if (blocked) return fail(L(blocked));
    const data = await run({ prompt, style });
    if (!data) return;
    if (typeof data.image !== "string" || !data.image) return fail(L(common.failed));
    setMade({ src: data.image, prompt, provider: providerName(data.provider) });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <SegmentedControl
          size="sm"
          items={COVER_STYLES.map((value) => ({ value, label: COVER_STYLE_LABEL[value] }))}
          value={style}
          onChange={(v) => { setStyle(v); clearError(); }}
        />
        <div className={styles.chips}>
          {made?.provider && <Chip>{made.provider}</Chip>}
          <QuotaChip quota={quota} kind="cover" />
        </div>
      </div>
      <LiveInfo text={copy.live(perIpOf(quota, "cover"))} />
      <Textarea
        className={styles.fieldSm}
        id={`${id}-prompt`}
        label={L(copy.label)}
        size="sm"
        rows={3}
        maxHint={MAX}
        value={prompt}
        disabled={busy}
        onChange={(v) => { setPrompt(v); clearError(); }}
      />
      <figure className={styles.coverFrame} data-busy={busy || undefined} aria-busy={busy || undefined}>
        {made ? (
          /* 데이터 URL 이거나 바깥 주소라 최적화 서버를 거치지 않는다 */
          <Image src={made.src} alt={L(copy.alt(made.prompt))} fill unoptimized sizes="(width > 768px) 50vw, 100vw" className={styles.coverImage} />
        ) : (
          <figcaption className={styles.coverCaption}>{prompt.trim() || L(copy.label)}</figcaption>
        )}
        {busy && <span className={styles.coverShimmer} aria-hidden />}
      </figure>
      <div className={styles.foot}>
        <StatusLine error={error}>
          {busy ? L(copy.busy) : made ? L(common.madeBy(made.provider || "AI")) : L(copy.idle)}
        </StatusLine>
        <Button
          size="md"
          icon={<ImageIcon size={16} />}
          loading={busy}
          disabled={busy || quota?.remaining === 0 || quota?.unavailable}
          onClick={() => void draw()}
        >
          {L(copy.run)}
        </Button>
      </div>
    </div>
  );
}
