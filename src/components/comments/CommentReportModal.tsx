"use client";

import { useState, useCallback } from "react";
import { Check } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import T from "@/components/ui/T";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import RadioGroup from "@/components/ui/RadioGroup";
import styles from "./CommentReportModal.module.css";

/** 신고 사유 프리셋 — 선택 후 상세 입력 가능. "other" 는 직접 입력. */
const REPORT_REASONS: { value: string; labelKey: string }[] = [
  { value: "spam", labelKey: "comments.reportReasonSpam" },
  { value: "abuse", labelKey: "comments.reportReasonAbuse" },
  { value: "inappropriate", labelKey: "comments.reportReasonInappropriate" },
  { value: "privacy", labelKey: "comments.reportReasonPrivacy" },
  { value: "other", labelKey: "comments.reportReasonOther" },
];

/** 댓글 신고 — 모달 내용. 사유 프리셋 선택(기본) + 구체 내용/직접 입력. */
export default function CommentReportModal({ apiBase, commentId }: { apiBase: string; commentId: string }) {
  const { t } = useLanguage();
  const { closeModal } = useModalStore();
  const [preset, setPreset] = useState("");
  const [detail, setDetail] = useState("");
  const [reporting, setReporting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback(async () => {
    if (reporting || !preset) return;
    const d = detail.trim();
    const label = t(REPORT_REASONS.find((x) => x.value === preset)?.labelKey ?? "");
    // "기타" 는 직접 입력만, 프리셋은 라벨(+상세)을 합성해 저장
    const reason = preset === "other" ? d : d ? `${label} · ${d}` : label;
    if (!reason) return;
    setReporting(true);
    try {
      const res = await fetch(`${apiBase}/${commentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => closeModal(), 1500);
      }
    } catch {
      // silent fail — 신고 실패해도 사용자에겐 굳이 알리지 않음
    } finally {
      setReporting(false);
    }
  }, [apiBase, commentId, preset, detail, reporting, t, closeModal]);

  if (submitted) {
    return (
      <div className={styles.thanks}>
        <span className={styles.thanksIcon} aria-hidden="true">
          <Check size={22} strokeWidth={3} />
        </span>
        <p className={styles.thanksText}>
          <T k="comments.reportThanks" />
        </p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      {/* 사유 선택(기본) — 프리셋 카드 라디오. "기타" 는 직접 입력. */}
      <RadioGroup
        variant="list"
        direction="vertical"
        value={preset}
        onChange={setPreset}
        options={REPORT_REASONS.map((x) => ({ value: x.value, label: t(x.labelKey) }))}
      />
      {/* 프리셋 선택 시 상세 입력 — 프리셋이면 선택, "기타" 면 필수 사유 */}
      {preset && (
        <div className={styles.detail}>
          <Textarea
            size="sm"
            value={detail}
            onChange={setDetail}
            placeholder={t(preset === "other" ? "comments.reportOtherPlaceholder" : "comments.reportDetailPlaceholder")}
            rows={2}
            maxLength={500}
          />
        </div>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={() => closeModal()}>
          <T k="comments.cancel" />
        </Button>
        <Button
          variant="outline"
          tone="danger"
          size="sm"
          loading={reporting}
          disabled={!preset || (preset === "other" && !detail.trim())}
          onClick={submit}
        >
          <T k="comments.confirmReport" />
        </Button>
      </div>
    </div>
  );
}
