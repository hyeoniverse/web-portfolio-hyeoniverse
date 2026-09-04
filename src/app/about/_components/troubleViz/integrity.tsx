"use client";

import React from "react";
import s from "../TroubleViz.module.css";
import { Chip, Arr, Fig } from "./primitives";
import type { L, VizParts } from "./primitives";

/* 설계 결정 — 데이터 무결성 · 신뢰 경계 · 동시성 */
/* ── 설계 결정: 권한 데이터의 신뢰 경계 ── */
export function permStore(L: L): VizParts {
  return {
    cause: (
      <>
        {/* ① user_metadata 수정 경로 — 사이트를 건너뛴다 */}
        <Fig cap={L("user_metadata 수정 요청은 사이트를 지나지 않는다. 사이트에는 검사할 자리가 없다.", "An update to user_metadata never passes through the site, so the site has no place to check it.")}>
          <div className={s.steps}>
            <span className={s.step}>{L("클라이언트", "client")}</span>
            <Arr label="updateUser()" />
            <span className={`${s.step} ${s.stepMono}`}>Supabase Auth</span>
            <Arr />
            <span className={s.step}><Chip k="bad">{L("user_metadata 변경", "user_metadata changed")}</Chip></span>
          </div>
          <div className={s.steps}>
            <span className={`${s.step} ${s.dim}`}>{L("사이트 API", "site API")}</span>
            <Chip k="stale">{L("경로에 없음", "not in the path")}</Chip>
          </div>
        </Fig>

        {/* ② app_metadata 수정 경로 — 반드시 서버를 지난다 */}
        <Fig cap={L("app_metadata 는 서버를 거쳐야만 바뀐다. service-role 키가 서버에만 있기 때문이다.", "app_metadata changes only by way of the server, because the service-role key lives only there.")}>
          <div className={s.steps}>
            <span className={s.step}>{L("클라이언트", "client")}</span>
            <Arr label={L("권한 변경 요청", "change request")} />
            <span className={s.step}>{L("우리 서버", "our server")}<Chip k="fresh">service-role</Chip></span>
            <Arr />
            <span className={`${s.step} ${s.stepMono}`}>Supabase Auth</span>
            <Arr />
            <span className={s.step}><Chip k="fresh">{L("app_metadata 변경", "app_metadata changed")}</Chip></span>
          </div>
        </Fig>

        {/* ③ 읽을 때의 왕복 비교 */}
        <Fig cap={L("인증 확인은 어느 쪽이든 일어난다. 갈리는 것은 그 뒤에 조회가 붙느냐다.", "The auth check happens either way. What differs is whether a query follows it.")}>
          <div className={s.stack}>
            <div className={s.steps}>
              <span className={`${s.step} ${s.stepMono}`}>app_metadata</span>
              <Arr />
              <span className={`${s.step} ${s.stepMono}`}>getUser()<Chip k="fresh">{L("사용자 + 역할", "user + role")}</Chip></span>
              <Arr label={L("끝", "done")} />
              <span className={s.step}><Chip k="fresh">{L("조회 추가 없음", "no extra query")}</Chip></span>
            </div>
            <div className={s.steps}>
              <span className={`${s.step} ${s.stepMono}`}>{L("권한 테이블", "permissions table")}</span>
              <Arr />
              <span className={`${s.step} ${s.stepMono}`}>getUser()<Chip k="sync">{L("사용자만", "user only")}</Chip></span>
              <Arr />
              <span className={`${s.step} ${s.stepMono}`}>SELECT<Chip k="stale">{L("역할 조회", "role query")}</Chip></span>
              <Arr />
              <span className={s.step}><Chip k="stale">{L("조회 1회 추가", "one extra query")}</Chip></span>
            </div>
          </div>
        </Fig>
      </>
    ),
    solution: (
      <Fig cap={L("인증·역할·글 소유권을 차례로 확인하고 요청을 처리한다.", "Authentication, then role, then post ownership — in that order — before the request is handled.")}>
        <div className={`${s.row} ${s.seq}`}>
          <div className={s.dev}>
            <span className={s.seqNum}>1</span><div className={s.ic}>🔑</div>
            <div className={s.nm}>getUser()</div><div className={s.sub}>{L("인증 확인", "authenticated?")}</div>
          </div>
          <Arr />
          <div className={s.dev}>
            <span className={s.seqNum}>2</span><div className={s.ic}>🏷️</div>
            <div className={s.nm}>app_metadata</div><div className={s.sub}>{L("역할 · 레벨", "role · level")}</div>
          </div>
          <Arr />
          <div className={s.dev}>
            <span className={s.seqNum}>3</span><div className={s.ic}>📄</div>
            <div className={s.nm}>canEditPost</div><div className={s.sub}>{L("대상 글 소유권", "owns this post?")}</div>
          </div>
          <Arr />
          <div className={s.dev}>
            <span className={s.seqNum}>4</span><div className={s.ic}>✅</div>
            <div className={s.nm}>{L("요청 처리", "handle request")}</div><div className={s.sub}>{L("통과", "allowed")}</div>
          </div>
        </div>
      </Fig>
    ),
  };
}

/* ── 설계 결정: 삭제는 복구 가능한 상태 변경 ── */

/* ── 설계 결정: 낙관적 동시성 ── */
export function optimisticLock(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("두 화면이 같은 글을 열어 두면 나중 저장이 앞선 저장을 덮어쓴다.", "With the same post open twice, the later save overwrites the earlier one.")}>
        <div className={s.row}>
          <div className={s.dev}><div className={s.ic}>💻</div><div className={s.nm}>{L("노트북", "Laptop")}</div><Chip k="stale">{L("v3 로 저장", "saves v3")}</Chip></div>
          <div className={s.dev}><div className={s.ic}>📱</div><div className={s.nm}>{L("휴대폰", "Phone")}</div><Chip k="bad">{L("v3 를 덮어씀", "overwrites v3")}</Chip></div>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L("잠금은 드문 일을 막으려고 상시 비용을 낸다. 버전 번호는 어긋난 순간에만 걸린다.", "A lock pays a standing cost to prevent a rare event. A version counter only fires when values diverge.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}>
            <span className={s.stepMono}>{L("잠금", "lock")}</span>
            <Chip k="bad">{L("풀 시점을 늘 관리", "release always managed")}</Chip>
          </div>
          <div className={`${s.box} ${s.boxOk}`}>
            <span className={s.stepMono}>version</span>
            <Chip k="fresh">{L("어긋날 때만 409", "409 only on mismatch")}</Chip>
          </div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("확인과 저장이 한 문장 안에 있어 그 사이에 다른 요청이 끼어들 틈이 없다.", "The check and the write live in one statement, so nothing can slip between them.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{L("열 때 version = 7", "opened at version 7")}</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>.eq(&quot;version&quot;, 7)</span>
          <Arr label={L("일치하면", "if it matches")} />
          <span className={s.step}><Chip k="fresh">{L("저장 · version 8", "saved · version 8")}</Chip></span>
          <Arr label={L("어긋나면", "if not")} x />
          <span className={s.step}><Chip k="bad">409 conflict</Chip></span>
        </div>
      </Fig>
    ),
  };
}

/* ── 설계 결정: 중복 방지는 DB 제약으로 ── */

/* ── 설계 결정: 중복 방지는 DB 제약으로 ── */
export function uniqueConstraint(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("두 요청이 겹치면 둘 다 '기록 없음' 을 보고 둘 다 넣는다. 확인과 삽입 사이가 비어 있어서다.", "When two requests overlap, both read 'no record' and both insert — the gap between check and write is empty.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("요청 A 조회", "request A reads")} <Chip k="sync">{L("기록 없음", "no record")}</Chip></span>
          <span className={s.step}>{L("요청 B 조회", "request B reads")} <Chip k="sync">{L("기록 없음", "no record")}</Chip></span>
          <Arr label={L("둘 다 삽입", "both insert")} />
          <span className={s.step}><Chip k="bad">{L("중복 2건", "2 duplicate rows")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("제약을 걸면 순서가 어떻게 얽히든 살아남는 행은 하나다.", "With the constraint in place, however the requests interleave, exactly one row survives.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}>
            {L("코드에서 확인", "check in code")}
            <Chip k="bad">{L("조회 → 삽입 사이에 틈", "gap between read and write")}</Chip>
          </div>
          <Arr />
          <div className={`${s.box} ${s.boxOk}`}>
            <span className={s.stepMono}>UNIQUE INDEX</span>
            <Chip k="fresh">{L("두 번째 삽입은 거절", "second insert rejected")}</Chip>
          </div>
        </div>
      </Fig>
    ),
  };
}

/* ── 설계 결정: 리비전 상한 ── */
