"use client";

import React from "react";
import s from "../TroubleViz.module.css";
import { Chip, Arr, Fig } from "./primitives";
import type { L, VizParts } from "./primitives";

/* 설계 결정 — 복구 · 보존 · 정기 작업 · 알림 */
/* ── 설계 결정: 삭제는 복구 가능한 상태 변경 ── */
export function reversibleDelete(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("행을 지우면 되돌릴 방법이 백업 복원뿐이다. 운영자가 한 명이라 대신 해 줄 사람도 없다.", "Removing the row leaves only a backup restore, and a single operator has nobody to do it for them.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}>
            <span className={s.stepMono}>DELETE FROM</span>
            <Chip k="bad">{L("복구 = 백업 복원", "recovery = restore backup")}</Chip>
          </div>
          <div className={`${s.box} ${s.boxOk}`}>
            <span className={s.stepMono}>deleted_at = now()</span>
            <Chip k="fresh">{L("휴지통에서 복구", "restore from trash")}</Chip>
          </div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("삭제는 세 단계로 나뉜다. 영구 삭제까지 두 번의 관문이 있다.", "Deletion runs in three stages, with two gates before anything is gone for good.")}>
        <div className={`${s.row} ${s.seq}`}>
          <div className={s.dev}>
            <span className={s.seqNum}>1</span><div className={s.ic}>🗑️</div>
            <div className={s.nm}>{L("삭제", "delete")}</div><div className={s.sub}>deleted_at</div>
          </div>
          <Arr />
          <div className={s.dev}>
            <span className={s.seqNum}>2</span><div className={s.ic}>♻️</div>
            <div className={s.nm}>{L("휴지통", "trash")}</div><div className={s.sub}>{L("복구 가능", "restorable")}</div>
          </div>
          <Arr label={L("기한 경과", "deadline passes")} />
          <div className={s.dev}>
            <span className={s.seqNum}>3</span><div className={s.ic}>⏱️</div>
            <div className={s.nm}>{L("영구 삭제", "purge")}</div><div className={s.sub}>purge_after</div>
          </div>
        </div>
      </Fig>
    ),
  };
}

/* ── 설계 결정: 낙관적 동시성 ── */

/* ── 설계 결정: 리비전 상한 ── */
export function revisionCap(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("기간으로 자르면 오래된 글은 되돌릴 거리가 하나도 남지 않는다. 개수로 자르면 나이와 무관하게 최근 것이 남는다.", "Cutting by age leaves an old post with nothing to roll back to. Cutting by count keeps the recent ones regardless of age.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}>
            {L("30일 지난 것 삭제", "drop anything over 30 days")}
            <Chip k="bad">{L("오래된 글 = 0개", "old post → none left")}</Chip>
          </div>
          <div className={`${s.box} ${s.boxOk}`}>
            {L("최근 50개만 유지", "keep the latest 50")}
            <Chip k="fresh">{L("항상 되돌릴 거리 있음", "always something to undo")}</Chip>
          </div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("저장할 때마다 정리해서 상한을 넘긴 상태로 오래 머무르지 않는다.", "Trimming happens on every save, so the table never sits over the limit for long.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("새 리비전 저장", "new revision saved")}</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>{L("최신순 정렬", "sort newest first")}</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>range(50, …)</span>
          <Arr label={L("초과분", "the excess")} />
          <span className={s.step}><Chip k="fresh">{L("51번째부터 삭제", "51st onward deleted")}</Chip></span>
        </div>
      </Fig>
    ),
  };
}

/* ── 설계 결정: 정기 작업을 DB 안에서 ── */

/* ── 설계 결정: 정기 작업을 DB 안에서 ── */
export function dbCron(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("HTTP cron 은 안쪽 일을 시키려고 바깥에 입구를 하나 열고, 그 입구를 지키는 코드까지 함께 관리해야 한다.", "HTTP cron opens an outside door just to trigger inside work, and adds guarding code to maintain with it.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("호스팅 cron", "hosting cron")}</span>
          <Arr label="HTTP" />
          <span className={`${s.step} ${s.stepMono}`}>/api/cron/…<Chip k="bad">{L("공개 입구 · 비밀키 필요", "public door · needs a secret")}</Chip></span>
          <Arr />
          <span className={s.step}>{L("데이터베이스", "database")}</span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("실행 주체를 데이터가 있는 곳으로 옮기면 입구도 그 코드도 필요 없어진다.", "Move the runner to where the data is and both the door and that code disappear.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>pg_cron</span>
          <Arr label={L("DB 안에서 직접", "inside the database")} />
          <span className={`${s.step} ${s.stepMono}`}>safe_publish_scheduled()</span>
          <Arr />
          <span className={s.step}><Chip k="fresh">{L("매분 · 입구 없음", "every minute · no door")}</Chip></span>
        </div>
      </Fig>
    ),
  };
}

/* ── 설계 결정: 알림 실패가 본 작업을 되돌리지 않게 ── */

/* ── 설계 결정: 알림 실패가 본 작업을 되돌리지 않게 ── */
export function failSoftNotify(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("두 실패의 무게가 다르다. 이메일은 나중에 화면에서 확인하면 되지만, 발행이 취소되면 글이 안 올라간다.", "The two failures do not weigh the same. A missing email can be checked later; a rolled-back publish means the post never goes up.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}>
            {L("오류를 그대로 올림", "let the error propagate")}
            <Chip k="bad">{L("트랜잭션 취소 · 발행 안 됨", "transaction rolls back · nothing publishes")}</Chip>
          </div>
          <div className={`${s.box} ${s.boxOk}`}>
            {L("알림 실패는 삼킴", "swallow the notification failure")}
            <Chip k="fresh">{L("발행은 예정대로", "the publish still lands")}</Chip>
          </div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("알림 실패는 조용히 넘기고, 작업 자체의 실패는 반드시 기록한다. 방향이 서로 반대다.", "A failed notification passes silently; a failed job must be recorded. The two fall in opposite directions.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("이메일 실패", "email fails")}<Chip k="sync">{L("무시 · 작업 계속", "ignored · job continues")}</Chip></span>
          <span className={s.step}>{L("작업 실패", "job fails")}<Chip k="bad">{L("admin_notifications 에 기록", "recorded to admin_notifications")}</Chip></span>
        </div>
      </Fig>
    ),
  };
}
