"use client";

/* 글 한 편의 일생 — 예약하면 DB 안의 pg_cron 이 매분 확인해 발행하고, 저장마다 version 이 오르고, 지우면 휴지통에서
   30일(인기 글 90일) 뒤 매일 03:00 정리 작업이 영구 삭제한다. 복구하면 초안으로 돌아온다. 단추로 넘기며 칼럼 값을 본다.
   대본: 예약 → 예약 시각이 지나 발행 → 고쳐 저장 → 지우기 → 30일 지나 영구 삭제 */
import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { Clock } from "@/components/icons";
import { useL } from "../../features/shared";
import { GuideAnchor } from "../../guide/GuideStar";
import { lifecycle as copy, TRASH_DAYS, TRASH_DAYS_POPULAR, TRASH_EXTEND_DAYS, type Stage } from "./data";
import { DemoShell, useScript } from "./Script";
import styles from "./CmsDemos.module.css";

/** 정리 작업이 도는 모습을 보여 주는 시간 */
const CRON_MS = 1400;

/** 처음 버전 — 고쳐 저장하면 오른다 */
const VERSION0 = 1;

export default function LifecycleDemo() {
  const t = useL();
  const [stage, setStage] = useState<Stage>("draft");
  const [version, setVersion] = useState(VERSION0);
  const [popular, setPopular] = useState(false);
  /* 휴지통에 들어간 뒤 남은 날 — 연장하면 늘어난다. 복구해도 purge_after 는 지우지 않는다(trashHandlers.restoreFromTrash) */
  const [days, setDays] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const [cron, setCron] = useState<"publish" | "purge" | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const runCron = (kind: "publish" | "purge", next: Stage) => {
    setCron(kind);
    timer.current = window.setTimeout(() => {
      setCron(null);
      setStage(next);
    }, CRON_MS);
  };
  const remove = () => {
    setDays(popular ? TRASH_DAYS_POPULAR : TRASH_DAYS);
    setRestored(false);
    setStage("trash");
  };
  const restore = () => {
    setRestored(true);
    setStage("draft");
  };
  const reset = () => {
    setStage("draft");
    setVersion(1);
    setDays(null);
    setRestored(false);
  };

  const script = useScript(() => [
    [900, () => setStage("scheduled")],
    [1600, () => runCron("publish", "published")],
    [CRON_MS + 1400, () => setVersion((n) => n + 1)],
    [1400, remove],
    [1800, () => runCron("purge", "purged")],
  ]);

  const at = copy.stages.findIndex((item) => item.key === stage);
  const columns: [string, string][] = [
    ["published", String(stage === "published")],
    ["scheduled_at", stage === "scheduled" ? t(copy.today9) : "null"],
    ["version", stage === "purged" ? "—" : String(version)],
    ["deleted_at", stage === "trash" ? t(copy.now) : "null"],
    ["purge_after", stage === "purged" ? "—" : days === null ? "null" : `'${days}${t(copy.daysLater)}'`],
  ];
  const hint =
    stage === "draft" && restored ? copy.hints.restored : copy.hints[stage];
  /* 이 단계가 바꾼 칼럼 — 강조색으로(무엇을 보면 되는지) */
  const changed = new Set<string>(
    stage === "scheduled" ? ["scheduled_at"]
    : stage === "published" ? ["published", "scheduled_at", ...(version !== VERSION0 ? ["version"] : [])]
    : stage === "trash" ? ["published", "deleted_at", "purge_after"]
    : stage === "purged" ? columns.map(([name]) => name)
    : stage === "draft" && restored ? ["deleted_at"]
    : [],
  );
  const firstChanged = columns.find(([name]) => changed.has(name))?.[0] ?? null;

  return (
    <DemoShell {...script}>
      <p className={styles.focusHead}>
        <span className={styles.focusNo}>✦</span>
        {t(copy.focus)}
      </p>
      <ol className={styles.track}>
        {copy.stages.map((item, i) => (
          <li key={item.key} data-done={i < at || undefined} data-now={i === at || undefined}>
            {i === at && !firstChanged && <GuideAnchor size="0.9em" priority={2} className={styles.pin} />}
            {t(item.label)}
          </li>
        ))}
      </ol>
      <div className={styles.card} data-stage={stage}>
        <p className={styles.cardTitle}>{t(stage === "purged" ? copy.gone : copy.title)}</p>
        <dl className={styles.columns}>
          {columns.map(([name, value]) => (
            <div key={name} data-changed={changed.has(name) || undefined}>
              <dt>
                {/* 지금 볼 곳 — 이 단계가 바꾼 첫 칼럼 */}
                {name === firstChanged && <GuideAnchor size="0.9em" priority={2} className={styles.pin} />}
                {name}
              </dt>
              <dd key={value}>{value}</dd>
            </div>
          ))}
        </dl>
        {/* 정리 작업 문구 자리는 늘 잡아 두어, 문구가 떠도 카드 크기가 바뀌지 않는다 */}
        <p className={styles.cron} role="status">
          {cron && (
            <>
              <Clock aria-hidden="true" className={styles.inlineIcon} />
              <span>{t(cron === "publish" ? copy.cronPublish : copy.cronPurge)}</span>
            </>
          )}
        </p>
      </div>
      <div className={styles.row} data-reserve="">
        {stage === "draft" && (
          <>
            <Button size="sm" onClick={() => setStage("scheduled")}>
              {t(copy.schedule)}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStage("published")}>
              {t(copy.publishNow)}
            </Button>
          </>
        )}
        {stage === "scheduled" && (
          <Button size="sm" disabled={!!cron} onClick={() => runCron("publish", "published")}>
            {t(copy.passSchedule)}
          </Button>
        )}
        {stage === "published" && (
          <>
            <Button size="sm" onClick={() => setVersion((n) => n + 1)}>
              {t(copy.editSave)}
            </Button>
            <Button size="sm" variant="outline" onClick={remove}>
              {t(copy.remove)}
            </Button>
            <Checkbox checked={popular} onChange={setPopular} label={t(copy.popular)} />
          </>
        )}
        {stage === "trash" && days !== null && (
          <>
            <Button size="sm" variant="outline" disabled={!!cron} onClick={restore}>
              {t(copy.restore)}
            </Button>
            <Button size="sm" variant="outline" disabled={!!cron} onClick={() => setDays((n) => (n ?? 0) + TRASH_EXTEND_DAYS)}>
              {t(copy.extend)}
            </Button>
            <Button size="sm" disabled={!!cron} onClick={() => runCron("purge", "purged")}>
              {`${days}${t(copy.passDays)}`}
            </Button>
          </>
        )}
        {stage === "purged" && (
          <Button size="sm" variant="outline" onClick={reset}>
            {t(copy.again)}
          </Button>
        )}
      </div>
      <p className={styles.result}>{t(hint)}</p>
    </DemoShell>
  );
}
