"use client";

/* 설정 › 서비스 › AI 자동 요약의 작성 지침 — 프롬프트에서 고칠 수 있는 부분(문체 · 블록 고르는 요령 · 피할 예).
   저장하지 않고도 글 하나로 미리 만들어 볼 수 있다(요약 라우트의 apply:false + guide). */
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { SummaryBody } from "@/components/ui/AISummary";
import { reportAiResponse } from "@/lib/ai/notifyFailures";
import { parseStoredSummary, type SummaryOptions } from "@/lib/ai/summary";
import { DEFAULT_SUMMARY_GUIDE, SUMMARY_GUIDE_MAX } from "@/lib/ai/summaryGuide";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./AiSummaryField.module.css";

type Target = { kind: "posts" | "works"; id: string; title: string };

/** 작성 지침 — 비우면 기본값. 저장 전에 글 하나로 미리 만들어 본다 */
export function SummaryGuideEditor({ value, onChange, options }: {
  /** 저장된 지침("" = 기본값) */
  value: string;
  onChange: (next: string) => void;
  /** 미리보기에 쓸 사이트 기본 옵션 */
  options: SummaryOptions;
}) {
  const { t, language } = useLanguage();
  const tg = (k: string) => t(`admin.aiSummaryField.guide.${k}`);
  const text = value || DEFAULT_SUMMARY_GUIDE;
  const [targets, setTargets] = useState<Target[]>([]);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ko: string; en: string } | null>(null);

  /* 미리보기 대상 — 최근 글 · 작업물 몇 개(관리자 목록 API) */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [posts, works] = await Promise.all([
        fetch("/api/posts?all=true&limit=15").then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ posts?: { id: string; title: string }[] } | null>,
        fetch("/api/works?all=true&limit=15").then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ works?: { id: string; title: string }[] } | null>,
      ]);
      if (!alive) return;
      const list: Target[] = [
        ...(posts?.posts ?? []).map((p) => ({ kind: "posts" as const, id: p.id, title: p.title })),
        ...(works?.works ?? []).map((w) => ({ kind: "works" as const, id: w.id, title: w.title })),
      ];
      setTargets(list);
      setTarget((cur) => cur || (list[0] ? `${list[0].kind}/${list[0].id}` : ""));
    })();
    return () => { alive = false; };
  }, []);
  const targetOptions = targets.map((x) => ({ value: `${x.kind}/${x.id}`, label: `${tg(x.kind === "posts" ? "targetPost" : "targetWork")} · ${x.title}` }));

  const preview = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/${target}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* 저장하지 않는 요청 — 지금 칸의 지침(아직 저장 전)과 사이트 기본 옵션으로 만든다 */
        body: JSON.stringify({ force: true, apply: false, options, guide: text }),
      });
      const data = (await reportAiResponse(res, t, t("admin.aiHealth.feature.summary"))) as { summary_ko?: string; summary_en?: string } | null;
      if (res.ok && data?.summary_ko) setResult({ ko: data.summary_ko, en: data.summary_en ?? "" });
    } finally {
      setBusy(false);
    }
  };

  const shown = result ? parseStoredSummary(language === "ko" ? result.ko || result.en : result.en || result.ko) : null;
  return (
    <div className={styles.guide}>
      <Textarea
        value={text}
        onChange={(v) => onChange(v.trim() === DEFAULT_SUMMARY_GUIDE.trim() ? "" : v)}
        rows={14}
        maxHint={SUMMARY_GUIDE_MAX}
        textareaClassName={styles.guideInput}
      />
      <div className={styles.guideActions}>
        <Button variant="ghost" shape="capsule" onClick={() => onChange("")} disabled={!value} soundDisabled>{tg("reset")}</Button>
        <span className={styles.guideSpacer} />
        <Select value={target} onChange={setTarget} options={targetOptions} placeholder={tg("targetPlaceholder")} />
        <Button variant="outline" shape="capsule" onClick={preview} loading={busy} disabled={!target} soundDisabled>{tg("preview")}</Button>
      </div>
      {shown && (
        <div className={styles.guidePreview}>
          <span className={styles.guidePreviewLabel}>{tg("previewLabel")}</span>
          <SummaryBody summary={shown} />
        </div>
      )}
    </div>
  );
}
