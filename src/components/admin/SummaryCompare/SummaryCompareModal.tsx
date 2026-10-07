"use client";

/* AI 요약 비교 — 이미 요약이 있는 글에서 다시 만들면 현재 것과 새 것을 나란히 두고 고른다.
   고른 쪽만 저장되고(ai-summary 에 summary_ko/en 으로), 유지하면 아무것도 바꾸지 않는다.
   틀은 공용 ModalConfirm(설명 · 자식 · 취소/확인) 그대로 — 발의 단추 자리를 따로 만들지 않는다 */
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { SummaryBody } from "@/components/ui/AISummary";
import { parseStoredSummary, summaryToPlain } from "@/lib/ai/summary";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./SummaryCompareModal.module.css";

export interface SummaryPair { ko: string; en: string }

export default function SummaryCompareModal({ current, next, onPick }: {
  current: SummaryPair;
  next: SummaryPair;
  /** 새 요약을 고르면 호출 — 유지는 그냥 닫는다 */
  onPick: (picked: SummaryPair) => void;
}) {
  const { t } = useLanguage();
  const tc = (k: string) => t(`admin.summaryCompare.${k}`);
  /* 저장값은 JSON(한 줄 + 핵심) 또는 예전 줄글 — 공개 요약 상자와 같은 모양으로 그린다 */
  const one = (raw: string) => {
    const d = parseStoredSummary(raw);
    return d ? <SummaryBody summary={d} /> : <p className={styles.text}><span className={styles.empty}>{tc("empty")}</span></p>;
  };
  const col = (title: string, pair: SummaryPair, isNext: boolean) => (
    <section className={styles.col} data-next={isNext || undefined}>
      <h3 className={styles.colTitle}>{title}</h3>
      <p className={styles.lang}>KO</p>
      {one(pair.ko)}
      <p className={styles.lang}>EN</p>
      {one(pair.en)}
    </section>
  );
  /* 같은 모델 · 같은 본문이면 결과가 같을 수 있다 — 고를 게 없음을 말해 준다. 해시 같은 메타는 빼고 글만 비교 */
  const same = summaryToPlain(parseStoredSummary(current.ko)) === summaryToPlain(parseStoredSummary(next.ko))
    && summaryToPlain(parseStoredSummary(current.en)) === summaryToPlain(parseStoredSummary(next.en));
  return (
    <ModalConfirm desc={tc("desc")} confirmText={tc("useNext")} cancelText={tc("keep")} onConfirm={() => onPick(next)}>
      <div className={styles.compare}>
        <div className={styles.grid}>
          {col(tc("current"), current, false)}
          <span className={styles.divider} aria-hidden />
          {col(tc("next"), next, true)}
        </div>
      </div>
      {same && <p className={styles.same}>{tc("same")}</p>}
    </ModalConfirm>
  );
}
