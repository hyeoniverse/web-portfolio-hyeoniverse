"use client";

import React from "react";
import s from "../TroubleViz.module.css";
import { Chip, Arr, Fig } from "./primitives";
import type { L, VizParts } from "./primitives";

/* 데이터 흐름 · 직렬화 · 단일 정의 — 트러블슈팅 항목별 시각화. */
/* ── 1. 교차 기기 최신 로딩 ── */
export function crossDevice(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("기기 사이에 최신본이 전달되지 않으면 이런 일이 생긴다.", "Without the latest version passing between devices, this happens.")}>
        <div className={s.row}>
          <div className={s.dev}><div className={s.ic}>📱</div><div className={s.nm}>{L("휴대폰", "Phone")}</div><Chip k="fresh">{L("방금 씀 · v3", "just wrote · v3")}</Chip></div>
          <Arr x label={L("이어지지 않음", "not carried")} />
          <div className={s.dev}><div className={s.ic}>💻</div><div className={s.nm}>{L("노트북", "Laptop")}</div><Chip k="stale">{L("열어보니 · v1", "opened · v1")}</Chip></div>
        </div>
      </Fig>
    ),
    solution: (
      <>
        <Fig cap={L("서버 리비전이 다리 역할을 해서, 마지막으로 쓴 버전이 다음 기기로 넘어간다.", "Server revisions act as the bridge, carrying the last-written version to the next device.")}>
          <div className={s.row}>
            <div className={s.dev}><div className={s.ic}>📱</div><div className={s.nm}>{L("휴대폰", "Phone")}</div><Chip k="fresh">{L("v3 편집", "edits v3")}</Chip></div>
            <Arr label={L("① 리비전 저장", "1. save revision")} />
            <div className={s.cloud}>
              <div className={s.hd}>{L("☁ 서버 리비전", "☁ Server revisions")}</div>
              <div className={s.stack}>
                <div className={`${s.rev} ${s.top}`}><span>{L("v3 · 최신", "v3 · latest")}</span><span>12:05</span></div>
                <div className={s.rev}><span>v2</span><span>12:01</span></div>
              </div>
            </div>
            <Arr label={L("② 최신 불러오기", "2. load latest")} />
            <div className={s.dev}><div className={s.ic}>💻</div><div className={s.nm}>{L("노트북", "Laptop")}</div><Chip k="fresh">{L("v3 로 이어 씀", "continues v3")}</Chip></div>
          </div>
        </Fig>
        <Fig>
          <div className={s.cmp}>
            <div className={s.ch}>{L("후보", "Candidate")}</div>
            <div className={s.ch} style={{ textAlign: "right" }}>{L("마지막 시각", "Last time")}</div>
            <div className={s.ch} />
            <div className={s.cell}>{L("서버 최종 저장 본문", "Saved post")} <span className={s.dim}>(posts.content)</span></div>
            <div className={`${s.cell} ${s.num}`}>12:00</div>
            <div className={s.cell} />
            <div className={`${s.cell} ${s.win}`}>{L("서버 최신 리비전", "Latest server revision")}</div>
            <div className={`${s.cell} ${s.num} ${s.win}`}>12:05</div>
            <div className={`${s.cell} ${s.win}`}><span className={s.badge}>{L("← 채택", "← picked")}</span></div>
            <div className={s.cell}>localStorage <span className={s.dim}>{L("(이 브라우저)", "(this browser)")}</span></div>
            <div className={`${s.cell} ${s.num}`}>11:58</div>
            <div className={s.cell} />
          </div>
          <div className={s.note}>
            <div className={s.noteT}>🛡 {L("단, 지금 편집 중이면 덮지 않는다", "But it won't overwrite while you are editing")}</div>
            <p className={s.noteP}>{L("이미 고치기 시작했다면 서버 최신본이 더 새로워 보여도 ", "If you have already started editing, the latest server copy is ")}<span className={s.strong}>{L("덮어쓰지 않는다.", "not applied,")}</span>{L(" 방금 한 작업을 지우지 않는 것이 항상 먼저다.", " even if it looks newer — not erasing work just done always comes first.")}</p>
          </div>
        </Fig>
      </>
    ),
    insight: (
      <Fig cap={L("옛 리비전이 최신으로 오인되는 경로를 가드가 막는다. 그 위에서 교차 기기 로딩을 다시 켠다.", "The guard blocks the path where an old revision is mistaken for the newest, and cross-device loading is re-enabled above it.")}>
        <div className={s.guard}>
          <div className={s.guardRow}>
            <div className={s.box}><span className={s.boxQ}>{L("리비전 시각 > 저장본 시각?", "revision time > saved time?")}</span></div>
            <Arr label={L("예", "yes")} />
            <div className={`${s.box} ${s.boxOk}`}><Chip k="fresh">{L("최신본으로 이어 씀", "continue from latest")}</Chip></div>
          </div>
          <div className={s.guardRow}>
            <div className={s.box} style={{ visibility: "hidden" }} aria-hidden><span className={s.boxQ}>?</span></div>
            <Arr label={L("아니오", "no")} />
            <div className={`${s.box} ${s.boxNo}`}><Chip k="sync">{L("무시 · 저장본 유지", "ignore · keep saved")}</Chip></div>
          </div>
        </div>
      </Fig>
    ),
  };
}

/* ── 2. ?all=true 인증 없이 노출 ── */

/* ── 인기글 — '인기'의 단일 정의 소스 ── */
export function popularSingleSource(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("'인기'가 세 곳에서 따로 정의돼, 서로 다른 답을 냈다.", "'Popular' was defined in three separate places, so they gave different answers.")}>
        <div className={s.row}>
          <div className={s.dev}><div className={s.nm}>{L("HOT 배지", "HOT badge")}</div><div className={s.sub}>{L("view 상위 5", "top 5 by view")}</div></div>
          <div className={s.dev}><div className={s.nm}>{L("정렬 popular", "popular sort")}</div><div className={s.sub}>{L("자체 가중치", "own weights")}</div></div>
          <div className={s.dev}><div className={s.nm}>{L("삭제 보호", "delete guard")}</div><div className={s.sub}>{L("절대 임계값", "fixed threshold")}</div></div>
        </div>
        <div className={s.guardRow}><Chip k="bad">{L("세 곳이 서로 다른 답 → 정의가 어긋남", "three answers that drift apart")}</Chip></div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("한 모듈로 정의를 모으고, 세 기능이 모두 이걸 호출한다. 가중치는 한 줄만 고치면 세 곳이 함께 따른다.", "One module holds the definition and all three features call it; tuning the weights is a one-line change all three pick up.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>lib/popularity.ts<br />scoreOf() · getPopularPostIds()</span>
          <Arr />
          <span className={s.step}>{L("HOT 배지", "HOT badge")}</span>
          <span className={s.step}>{L("정렬", "sort")}</span>
          <span className={s.step}>{L("삭제 보호", "delete guard")}</span>
        </div>
        <div className={s.guardRow}><Chip k="fresh">{L("세 기능이 자동으로 같은 답", "all three agree automatically")}</Chip></div>
      </Fig>
    ),
  };
}

/* ── mousemove 리렌더 ── */

/* ── #98 부동소수점 normalize ── */
export function floatNormalize(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("3열 블록을 만들거나 열 너비를 %로 조정하면 에디터가 그대로 굳었다. 탭이 응답을 멈추고 결국 크래시.", "Making a 3-column block or adjusting column widths in % froze the editor solid — the tab stopped responding and eventually crashed.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("3열 만들기 · % 너비 조정", "make 3 columns · adjust % width")}</span>
          <Arr label={L("적용", "apply")} />
          <span className={s.step}><Chip k="stale">{L("에디터 정지", "editor frozen")}</Chip></span>
          <Arr />
          <span className={s.step}><Chip k="bad">{L("탭 응답 없음 · 크래시", "tab unresponsive · crash")}</Chip></span>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L("normalizer 는 열 너비 합이 100 이 아니면 다시 보정한다. 100/3 은 부동소수점으로 더해도 정확히 100 이 안 돼, 보정 → 여전히 ≠100 → 보정 … 종료조건에 영영 못 닿고 동기 루프가 탭을 얼린다.", "The normalizer re-balances whenever the column widths don't sum to 100. 100/3 never sums to exactly 100 in floating point, so it re-balances forever — the sync loop freezes the tab.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>33.333 × 3 ≠ 100</span>
          <Arr />
          <span className={s.step}>{L("합≠100 → 재보정 → 또 ≠100 → …", "sum≠100 → rebalance → still ≠100 → …")}</span>
          <Arr />
          <span className={s.step}><Chip k="bad">{L("무한루프 · 탭 정지", "infinite loop · tab freezes")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("오차를 허용하는 게 아니라, 오차가 생길 수 없는 정수 표현으로 옮겼다. 비율을 유지한 채 정수로 재분배하고 그 pass 를 즉시 끝낸다.", "Instead of allowing error, the widths moved to an integer space where error can't arise — redistributed as integers keeping the ratio, ending the pass at once.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxOk}`}>{L("정수로만 재분배 (합 정확히 100)", "integer-only redistribution (sum exactly 100)")} <Chip k="fresh">{L("종료조건 도달", "termination reached")}</Chip></div>
        </div>
      </Fig>
    ),
    insight: (
      <Fig cap={L("종료조건이 안 닿을 땐 임계값을 늦추기보다, 목표가 정확히 표현되는 값 공간으로 옮기는 편이 단단하다.", "When an exit condition can't be reached, moving to a space where the target is exactly representable is sturdier than loosening the threshold.")}>
        <div className={s.cmp}>
          <div className={s.ch}><span className={s.dim}>{L("합=100 만들기", "make sum=100")}</span></div>
          <div className={s.ch}>{L("오차를 허용", "tolerate error")}</div>
          <div className={s.ch}>{L("표현을 바꿈", "change representation")}</div>
      
          <div className={`${s.cell} ${s.dim}`}>{L("종료조건", "exit cond")}</div>
          <div className={s.cell}><span className={s.codePill}>{'abs(sum-100) < 0.01'}</span></div>
          <div className={`${s.cell} ${s.win}`}><span className={s.codePill}>{'sum === 100'}</span></div>
      
          <div className={`${s.cell} ${s.dim}`}>{L("단단함", "sturdiness")}</div>
          <div className={s.cell}><Chip k="stale">{L("오차를 견딤", "endures error")}</Chip></div>
          <div className={`${s.cell} ${s.win}`}><Chip k="fresh">{L("오차가 불가능", "error impossible")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}

/* ── #80 지각 밝기 / OKLCH ── */

/* ── 7. 토글·콜아웃·열블록 저장 후 사라짐 ── */
export function blockDeserialize(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("저장(직렬화) 후 다시 불러올 때(역직렬화) deserializer 가 이 블록들을 복원하지 못해 사라졌다.", "On reload (deserialize) after save (serialize), the deserializer failed to restore these blocks, so they vanished.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("편집기: 토글 · 콜아웃 · 열블록", "editor: toggle · callout · columns")}</span>
          <Arr label={L("직렬화", "serialize")} />
          <span className={`${s.step} ${s.stepMono}`}>HTML</span>
          <Arr label={L("역직렬화", "deserialize")} />
          <span className={s.step}><Chip k="bad">{L("복원 실패 → 사라짐", "not restored → gone")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("deserializer 가 이 블록 타입을 인식해 노드로 되돌리도록 고쳤다.", "The deserializer was fixed to recognize these block types and turn them back into nodes.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}>{L("이전", "before")} <Chip k="bad">{L("저장 후 소실", "lost after save")}</Chip></div>
          <Arr />
          <div className={`${s.box} ${s.boxOk}`}>{L("이후", "after")} <Chip k="fresh">{L("그대로 복원", "restored intact")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}

/* ── 8. sticky 유리 헤더 frost ── */
