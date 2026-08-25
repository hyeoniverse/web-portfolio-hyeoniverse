"use client";

import React from "react";
import type { Language } from "@/providers/LanguageProvider";
import s from "./TroubleViz.module.css";

/* 트러블슈팅 항목별 시각화 — 아티팩트 비주얼 어휘(선 노드·칩·화살표·비교·타임라인)를 사이트 토큰으로.
   카드 래퍼 없음. 각 figure 는 position(증상/원인/해결/결론)에 맞춰 설명 중간에 배치된다. */

type L = (ko: string, en: string) => string;
export type VizPosition = "definition" | "cause" | "solution" | "insight";
type VizParts = Partial<Record<VizPosition, React.ReactNode>>;

/* ── 공용 프리미티브 ── */
const Chip = ({ k, children }: { k: "fresh" | "stale" | "bad" | "sync"; children: React.ReactNode }) => (
  <span className={`${s.chip} ${s[k]}`}>
    <span className={s.dot} />
    {children}
  </span>
);
const Arr = ({ label, x }: { label?: string; x?: boolean }) => (
  <div className={s.arrow}>
    <span className={x ? s.xmark : s.ln}>{x ? "↮" : "→"}</span>
    {label && <span className={s.lb}>{label}</span>}
  </div>
);
const Fig = ({ children, cap }: { children: React.ReactNode; cap?: string }) => (
  <figure className={s.fig}>
    {children}
    {cap && <figcaption className={s.cap}>{cap}</figcaption>}
  </figure>
);

/* ── 1. 교차 기기 최신 로딩 ── */
function crossDevice(L: L): VizParts {
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
function allParamLeak(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("화면 표시용 쿼리 파라미터가 인증 경계 밖에서 전 데이터를 반환하고 있었다.", "A display-only query param was returning all data outside the auth boundary.")}>
        <div className={s.row}>
          <div className={s.dev}><span className={s.codePill}>?all=true</span><Chip k="sync">{L("인증 없음", "no auth")}</Chip></div>
          <Arr label={L("공개 GET", "public GET")} />
          <div className={s.dev}><div className={s.ic}>🗄️</div><div className={s.nm}>{L("목록 API", "List API")}</div></div>
          <Arr />
          <div className={s.dev}><div className={s.ic}>🔓</div><div className={s.nm}>{L("응답", "Response")}</div><Chip k="bad">{L("비공개+휴지통 전부", "all private + trash")}</Chip></div>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L("RLS 를 우회하는 경로를 열면, 요청자가 관리자인지 확인할 책임이 데이터베이스에서 API 코드로 넘어온다.", "Opening a path that bypasses RLS moves the job of confirming the caller is an admin from the database to the API code.")}>
        <div className={`${s.row} ${s.seq}`}>
          <div className={s.dev}>
            <div className={s.ic}>🪪</div>
            <div className={s.nm}>{L("세션 클라이언트", "session client")}</div>
            <div className={s.sub}>{L("요청자 세션 그대로 전달", "forwards the caller's session")}</div>
            <Chip k="fresh">{L("RLS 가 막아 준다", "RLS enforces")}</Chip>
          </div>
          <Arr />
          <div className={s.dev}>
            <div className={s.ic}>📗</div>
            <div className={s.nm}>{L("발행된 글만", "published only")}</div>
            <div className={s.sub}>{L("공개 창구", "public endpoint")}</div>
          </div>
        </div>
        <div className={`${s.row} ${s.seq}`}>
          <div className={s.dev}>
            <div className={s.ic}>🗝️</div>
            <div className={s.nm}>service-role</div>
            <div className={s.sub}>{L("RLS 우회", "bypasses RLS")}</div>
            <Chip k="bad">{L("API 코드가 확인해야 한다", "the API code must check")}</Chip>
          </div>
          <Arr />
          <div className={s.dev}>
            <div className={s.ic}>📕</div>
            <div className={s.nm}>{L("모든 행", "every row")}</div>
            <div className={s.sub}>{L("초안 · 휴지통 포함", "drafts and trash included")}</div>
          </div>
        </div>
        <div className={`${s.row} ${s.seq}`}>
          <div className={s.dev}>
            <div className={s.ic}>🪪</div>
            <div className={s.nm}>{L("세션 클라이언트", "session client")}</div>
            <div className={s.sub}>{L("규칙이 요청자를 본다", "the rule reads the caller")}</div>
            <Chip k="fresh">{L("우회할 이유가 없어진다", "no reason left to bypass")}</Chip>
          </div>
          <Arr />
          <div className={s.dev}>
            <div className={s.ic}>📘</div>
            <div className={s.nm}>{L("권한이 닿는 행", "rows permission reaches")}</div>
            <div className={s.sub}>{L("발행된 글 + 다룰 수 있는 글", "published + what you may edit")}</div>
          </div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("인가 판정이 API 코드에서 데이터베이스 규칙으로 옮겨 갔다.", "The authorization decision moved from the API code into the database rules.")}>
        <div className={s.cmp}>
          <div className={s.ch}>{L("비교", "Aspect")}</div>
          <div className={s.ch}>{L("이전", "Before")}</div>
          <div className={s.ch}>{L("이후", "After")}</div>
          <div className={s.cell}>{L("DB 접근", "DB access")}</div>
          <div className={`${s.cell} ${s.bad}`}>{L("service-role · 규칙 우회", "service-role, rules cleared")}</div>
          <div className={`${s.cell} ${s.win}`}>{L("요청자 세션 · 규칙 적용", "caller's session, rules apply")}</div>
          <div className={s.cell}>{L("인가 판정", "Decided by")}</div>
          <div className={`${s.cell} ${s.bad}`}>{L("API 코드", "the API code")}</div>
          <div className={`${s.cell} ${s.win}`}>{L("데이터베이스 규칙", "the database rules")}</div>
          <div className={s.cell}>{L("?all=true 응답", "?all=true response")}</div>
          <div className={`${s.cell} ${s.bad}`}>{L("인증 없이 전부", "everything, no auth")}</div>
          <div className={`${s.cell} ${s.win}`}>{L("권한이 닿는 만큼", "as far as permission reaches")}</div>
          <div className={s.cell}>{L("코드가 검문을 빠뜨리면", "If the code skips the check")}</div>
          <div className={`${s.cell} ${s.bad}`}>{L("그대로 노출", "exposed as-is")}</div>
          <div className={`${s.cell} ${s.win}`}>{L("규칙이 막는다", "the rules still refuse")}</div>
        </div>
      </Fig>
    ),
  };
}

/* ── 3. 익명 댓글 — 클라 강제, 서버 우회 ── */
function anonCommentAuth(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("인증이 강한 경로와 약한 경로를 OR 로 묶어 두면, 시스템의 강도는 약한 쪽을 따라간다.", "When auth joins a strong and a weak path with OR, the system's strength follows the weaker one.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{L("비밀번호(bcrypt)", "password (bcrypt)")}</span>
          <span className={s.step}>OR</span>
          <span className={`${s.step} ${s.stepMono}`}>commenter_hash <span className={s.dim}>(31-bit)</span></span>
          <Arr label={L("OR 로 뚫림", "OR is the hole")} />
          <span className={s.step}><Chip k="bad">{L("비밀번호 없이 통과", "passes without password")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <>
        <Fig cap={L("공개된 해시 하나만 맞추면 비밀번호 없이 남의 댓글을 수정·삭제할 수 있었다.", "Matching one public hash was enough to edit or delete someone else's comment without a password.")}>
          <div className={`${s.row} ${s.seq}`}>
            <div className={s.dev}>
              <span className={s.seqNum}>1</span>
              <div className={s.ic}>📄</div>
              <div className={s.nm}>{L("공개 GET", "public GET")}</div>
              <div className={s.sub}>commenter_hash</div>
            </div>
            <Arr />
            <div className={s.dev}>
              <span className={s.seqNum}>2</span>
              <div className={s.ic}>🔑</div>
              <div className={s.nm}>{L("같은 해시 찾기", "find a match")}</div>
              <div className={s.sub}>{L("31비트 · 약 30분", "31-bit · ~30 min")}</div>
            </div>
            <Arr />
            <div className={s.dev}>
              <span className={s.seqNum}>3</span>
              <div className={s.ic}>⌨️</div>
              <div className={s.nm}>{L("curl 요청", "curl request")}</div>
              <div className={s.sub}>{L("비밀번호 없음", "no password")}</div>
            </div>
          </div>
        </Fig>
        <Fig cap={L("클라이언트가 강제한다고 서버가 강제하는 것은 아니다. 인증 경로를 비밀번호 하나로 통일했다.", "Enforcement by the client is not enforcement by the server. Auth was unified to a single password path.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}>{L("이전: 강한 경로 OR 약한 경로", "before: strong path OR weak path")} <Chip k="bad">{L("약한 쪽으로 뚫림", "weakest wins")}</Chip></div>
          <Arr />
          <div className={`${s.box} ${s.boxOk}`}>{L("이후: 비밀번호 단일 경로", "after: single password path")} <Chip k="fresh">{L("서버도 강제", "server enforces too")}</Chip></div>
        </div>
        </Fig>
      </>
    ),
  };
}

/* ── 4. reCAPTCHA v3 지연 로딩 ── */
function recaptchaLazy(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("784KB 스크립트를 앱 초기화에 즉시 로드해 첫 화면을 블로킹했다. LCP 가 17초까지 밀렸다.", "A 784KB script loaded eagerly at init blocked first paint. LCP slipped to 17 seconds.")}>
        <div className={s.bars}>
          <div className={s.barRow}>
            <span className={s.barLabel}>{L("즉시 로드", "Eager")}</span>
            <div className={s.track}><span className={`${s.seg} ${s.segBad}`} style={{ width: "95%" }} /></div>
            <span className={s.barVal}>17.1s</span>
          </div>
          <div className={s.barRow}>
            <span className={s.barLabel}>{L("지연 로드", "Lazy")}</span>
            <div className={s.track}><span className={`${s.seg} ${s.segOk}`} style={{ width: "14%" }} /></div>
            <span className={s.barVal}>~2s</span>
          </div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("페이지를 읽기만 하고 떠나는 대다수 방문자는 이 스크립트를 아예 받지 않는다.", "Most visitors who only read and leave never download it at all.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("앱 초기화", "App init")}</span>
          <Arr label={L("전엔 여기서 로드", "was loaded here")} />
          <span className={s.step}>{L("첫 클릭 / 스크롤", "first click / scroll")}</span>
          <Arr label={L("이제 여기서", "now here")} />
          <span className={s.step}><Chip k="fresh">{L("reCAPTCHA 로드", "load reCAPTCHA")}</Chip></span>
        </div>
      </Fig>
    ),
  };
}

/* ── 5. 커스텀 커서 hit-test ── */
function cursorHitTest(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("무거운 hit-test 와 가벼운 위치 보간이 한 프레임 루프에 묶여, hit-test 가 보간까지 함께 느리게 만들었다.", "A heavy hit-test and a light position lerp shared one frame loop, so the hit-test dragged the lerp down too.")}>
        <div className={s.row}>
          <div className={s.dev}><div className={s.nm}>{L("위치 보간", "Position lerp")}</div><Chip k="fresh">{L("가벼움 · 매 프레임", "light · every frame")}</Chip></div>
          <div className={s.dev}><div className={s.nm}>hit-test</div><div className={s.sub}>elementsFromPoint</div><Chip k="bad">{L("무거움", "heavy")}</Chip></div>
          <Arr x label={L("한 루프에 묶임", "coupled in one loop")} />
          <div className={s.dev}><div className={s.ic}>🐢</div><div className={s.nm}>{L("둘 다 느려짐", "both slow")}</div></div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("hit-test 를 분리해 빈도를 낮췄다. 커서 위치는 매 프레임 부드럽게, hit-test 는 가끔만.", "The hit-test was decoupled and throttled — cursor position stays smooth every frame, hit-test runs only occasionally.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxOk}`}><Chip k="fresh">{L("보간: 매 프레임", "lerp: every frame")}</Chip></div>
          <div className={`${s.box} ${s.boxOk}`}><Chip k="sync">{L("hit-test: throttle", "hit-test: throttled")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}

/* ── 6. 코드블록 하이라이팅 — 브라우저에서만 죽음 ── */
function codeblockHighlight(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("빌드도 테스트도 통과하는데 브라우저에서만 페이지가 죽었다. 런타임에만 터지는 함정이었다.", "Build and tests both passed, yet the page died only in the browser — a trap that surfaces only at runtime.")}>
        <div className={s.row}>
          <div className={s.dev}><div className={s.nm}>{L("빌드", "Build")}</div><Chip k="fresh">{L("통과", "passes")}</Chip></div>
          <div className={s.dev}><div className={s.nm}>{L("테스트", "Tests")}</div><Chip k="fresh">{L("통과", "passes")}</Chip></div>
          <div className={s.dev}><div className={s.ic}>💥</div><div className={s.nm}>{L("브라우저", "Browser")}</div><Chip k="bad">{L("페이지 죽음", "page dies")}</Chip></div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("리더·댓글은 Prism 으로 교체(유니코드 이스케이프 없음), 에디터는 hljs 문법을 등록 시 패치했다.", "Reader/comments moved to Prism (no unicode escapes); the editor patches the hljs grammar at registration.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{L("리더 · 댓글", "reader · comments")}</span>
          <Arr />
          <span className={s.step}><Chip k="fresh">Prism</Chip></span>
          <span className={`${s.step} ${s.stepMono}`}>{L("에디터(Plate)", "editor (Plate)")}</span>
          <Arr />
          <span className={s.step}><Chip k="fresh">{L("hljs 문법 패치", "hljs grammar patch")}</Chip></span>
        </div>
      </Fig>
    ),
    insight: (
      <Fig cap={L("빌드·타입검사·테스트가 다 통과해도, 그게 도는 환경과 코드가 실제로 실행되는 브라우저가 다르면 그 간극의 문제는 테스트가 못 잡는다.", "Even with build, type-check, and tests all green, when their environment differs from the browser where the code truly runs, a failure in that gap is one tests can't catch.")}>
        <div className={s.row}>
          <div className={s.dev}>
            <span className={s.ic}>🧪</span>
            <span className={s.nm}>{L("빌드 · 타입 · 테스트", "build · types · tests")}</span>
            <span className={s.sub}>node / CI</span>
          </div>
          <Chip k="fresh">{L("모두 통과", "all pass")}</Chip>
          <Arr x label={L("보장 못 함", "no guarantee")} />
          <div className={s.dev}>
            <span className={s.ic}>🌐</span>
            <span className={s.nm}>{L("브라우저 런타임", "browser runtime")}</span>
            <span className={s.sub}>highlight.js</span>
          </div>
          <Chip k="bad">{L("여기서만 깨짐", "breaks only here")}</Chip>
        </div>
      </Fig>
    ),
  };
}

/* ── 7. 토글·콜아웃·열블록 저장 후 사라짐 ── */
function blockDeserialize(L: L): VizParts {
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
function stickyFrost(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("blur 는 뒤 콘텐츠와 자체 stacking context 가 있어야 보인다. 둘 중 하나가 없어 frost 가 옅거나 잘렸다.", "A blur needs content behind it and its own stacking context. Missing one made the frost washed-out or clipped.")}>
        <div className={s.row}>
          <div className={s.dev}><div className={s.ic}>🫧</div><div className={s.nm}>{L("sticky 바", "sticky bar")}</div><Chip k="bad">{L("blur 안 보임", "no blur")}</Chip></div>
          <Arr />
          <div className={s.dev}><div className={s.ic}>🧊</div><div className={s.nm}>{L("sticky 바", "sticky bar")}</div><Chip k="fresh">{L("frost 보임", "frost shows")}</Chip></div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig>
        <div className={s.note}>
          <div className={s.noteT}>🧊 {L("frost 가 보이는 조건", "what makes frost show")}</div>
          <p className={s.noteP}>{L("① positioned 요소 자체에 backdrop-filter 를 건다  ② 바 뒤로 흐릴 콘텐츠가 실제로 지나가게 한다  ③ -webkit- prefix 는 빼서 blur 가 파서에서 무효화되지 않게 한다.", "1. put backdrop-filter on the positioned element itself  2. let content actually scroll behind the bar  3. drop the -webkit- prefix so the blur isn't voided by the parser.")}</p>
        </div>
      </Fig>
    ),
  };
}

/* ── GitHub OAuth — 인증(authN) vs 인가(authZ) ── */
function githubOAuth(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("OAuth 콜백이 통과하면 GitHub 계정만 있으면 누구든 세션이 생겼다.", "Once the OAuth callback passed, anyone with a GitHub account got a session.")}>
        <div className={s.row}>
          <div className={s.dev}><div className={s.ic}>🐙</div><div className={s.nm}>{L("GitHub 계정", "GitHub account")}</div><Chip k="sync">{L("누구나", "anyone")}</Chip></div>
          <Arr label={L("콜백 통과", "callback passes")} />
          <div className={s.dev}><div className={s.ic}>🔓</div><div className={s.nm}>{L("세션 생성", "session created")}</div><Chip k="bad">{L("로그인 성공", "logged in")}</Chip></div>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L("OAuth 는 인증(authN)만 보장한다. 인가(authZ)는 전혀 다른 질문인데 아무도 확인하지 않았다.", "OAuth only proves authentication. Authorization is a separate question that nothing checked.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxOk}`}>
            <div className={s.boxQ}>{L("인증 (authN)", "authentication")}</div>
            {L("이 사람이 진짜 이 GitHub 계정 주인인가", "Is this really the owner of this GitHub account?")}
            <div><Chip k="fresh">{L("OAuth 가 보장", "OAuth proves it")}</Chip></div>
          </div>
          <div className={`${s.box} ${s.boxNo}`}>
            <div className={s.boxQ}>{L("인가 (authZ)", "authorization")}</div>
            {L("우리 사이트에 들어와도 되는 사람인가", "Should this person be let into our site?")}
            <div><Chip k="bad">{L("아무도 안 봄", "nobody checked")}</Chip></div>
          </div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("세션 교환 직후 서버가 이메일을 검사한다. 셋 다 아니면 즉시 로그아웃하고 계정까지 지운다.", "Right after the session exchange, the server checks the email; if none of the three match, it signs out and deletes the account.")}>
        <div className={s.guard}>
          <div className={s.guardRow}>
            <div className={s.box}><span className={s.boxQ}>{L("이메일 = OWNER_EMAIL / 역할 보유 / author_invites 초대?", "email = OWNER_EMAIL / has a role / in author_invites?")}</span></div>
          </div>
          <div className={s.guardRow}>
            <Arr label={L("예", "yes")} />
            <div className={`${s.box} ${s.boxOk}`}><Chip k="fresh">{L("로그인 통과", "allow in")}</Chip></div>
            <Arr label={L("아니오", "no")} />
            <div className={`${s.box} ${s.boxNo}`}><Chip k="bad">signOut + deleteUser</Chip></div>
          </div>
        </div>
      </Fig>
    ),
  };
}

/* ── 인기글 — '인기'의 단일 정의 소스 ── */
function popularSingleSource(L: L): VizParts {
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
function mousemoveRerender(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("고빈도 mousemove 가 매번 setState 를 불러 25개+ 아이템이 통째로 리렌더됐다.", "A high-frequency mousemove called setState each time, re-rendering 25+ items wholesale.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>mousemove <span className={s.dim}>60/s</span></span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>setState</span>
          <Arr />
          <span className={s.step}>{L("25개+ 리렌더", "25+ re-render")}</span>
          <Arr />
          <span className={s.step}><Chip k="bad">{L("프레임 밀림 🐢", "frames drop 🐢")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("state 대신 ref 에 값을 담고, 별도 RAF 루프에서 DOM transform 을 직접 수정한다. React 는 이 변화를 모른다.", "The value goes into a ref instead of state; a separate RAF loop writes the DOM transform directly, and React never sees it.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>mousemove</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>useRef</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>RAF → style.transform</span>
          <Arr />
          <span className={s.step}><Chip k="fresh">{L("리렌더 0", "0 re-renders")}</Chip></span>
        </div>
      </Fig>
    ),
  };
}

/* ── 전역 transition shorthand ── */
function transitionShorthand(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("전역 규칙의 specificity 가 더 높고, transition 은 shorthand 라 컴포넌트 transition 을 통째로 대체한다.", "The global rule wins on specificity, and transition is a shorthand, so it replaces the component's transition entirely.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxNo}`}><span className={s.codePill}>html[data-theme-ready] *</span><div className={s.sub}>specificity (0,1,1)</div><Chip k="bad">{L("이김 · 전체 대체", "wins · replaces all")}</Chip></div>
          <div className={s.box}><span className={s.codePill}>.modal</span><div className={s.sub}>(0,1,0)</div><Chip k="stale">{L("max-height 전환 사라짐", "max-height transition lost")}</Chip></div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("컴포넌트 선택자를 복합 선택자로 바꿔 specificity 를 전역보다 높인다.", "Raise the component selector's specificity above the global rule with a compound selector.")}>
        <div className={s.guardRow}>
          <span className={s.codePill}>.modal</span>
          <Arr label="(0,1,0) → (0,2,0)" />
          <div className={`${s.box} ${s.boxOk}`}><span className={s.codePill}>.modalWrap .modal</span> <Chip k="fresh">{L("(0,1,1) 이김 → 전환 복원", "beats (0,1,1) → restored")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}

/* ── backdrop-filter compositing layer ── */
function backdropLayer(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("backdrop-filter 는 자기가 속한 compositing layer 안의 픽셀만 샘플할 수 있다. .home 이 별도 layer 로 승격되면 그 아래 커피 canvas 는 layer 밖이라 blur 가 비빌 대상이 사라진다.", "backdrop-filter can only sample pixels inside its own compositing layer. Once .home is promoted to a separate layer, the coffee canvas below sits outside it, so the blur has nothing left to sample.")}>
        <div className={s.layers}>
          <div className={s.layerCol}>
            <div className={`${s.layerHd} ${s.cut}`}>{L("✗ 분리 — .home 이 자체 layer", "✗ separated — .home is its own layer")}</div>
            <div className={`${s.layerBox} ${s.cut}`}>
              <div className={s.zrow}>{L("🔘 버튼 · backdrop-filter", "🔘 button · backdrop-filter")}</div>
              <div className={s.zrow}>.home</div>
            </div>
            <div className={`${s.reach} ${s.cut}`}>{L("↑ blur 는 이 layer 안만 샘플", "↑ blur samples only inside this layer")}</div>
            <div className={`${s.zrow} ${s.canvas}`}>{L("☕ 커피 canvas — layer 밖", "☕ coffee canvas — outside the layer")}</div>
            <div className={s.layerFoot}><Chip k="bad">{L("canvas 안 보임 → blur 텅 빔", "canvas unseen → empty blur")}</Chip></div>
          </div>
          <div className={s.layerCol}>
            <div className={`${s.layerHd} ${s.thru}`}>{L("✓ 통합 — 일반 layer", "✓ merged — normal layer")}</div>
            <div className={`${s.layerBox} ${s.thru}`}>
              <div className={s.zrow}>{L("🔘 버튼 · backdrop-filter", "🔘 button · backdrop-filter")}</div>
              <div className={s.zrow}>.home</div>
              <div className={`${s.zrow} ${s.canvas}`}>{L("☕ 커피 canvas — 같은 layer", "☕ coffee canvas — same layer")}</div>
            </div>
            <div className={`${s.reach} ${s.thru}`}>{L("↓ blur 가 canvas 까지 샘플", "↓ blur samples down to the canvas")}</div>
            <div className={s.layerFoot}><Chip k="fresh">{L("canvas 보임 → blur 정상", "canvas seen → blur works")}</Chip></div>
          </div>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L("framer-motion 이 남긴 transform/will-change 로 .home 이 자체 compositing layer 로 승격돼, 버튼의 backdrop-filter 가 layer 경계 너머 canvas 를 샘플하지 못했다.", "A leftover transform/will-change from framer-motion promoted .home to its own compositing layer, so the button's backdrop-filter couldn't sample the canvas beyond the layer boundary.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>.home <span className={s.dim}>transform + will-change</span></span>
          <Arr />
          <span className={s.step}>{L("자체 compositing layer 승격", "own compositing layer")}</span>
          <Arr />
          <span className={s.step}><Chip k="bad">{L("layer 너머 못 샘플 → blur 안 보임", "can't sample across → no blur")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("진입 애니메이션을 transform(y) 에서 layout(marginTop) 으로 바꿨다. layout 속성은 compositing layer 를 만들지 않는다.", "The entry animation moved from transform (y) to layout (marginTop). Layout properties don't create a compositing layer.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>y (transform)</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>marginTop (layout)</span>
          <Arr />
          <span className={s.step}><Chip k="fresh">{L("layer 안 생김 → blur 정상", "no layer → blur samples canvas")}</Chip></span>
        </div>
      </Fig>
    ),
    insight: (
      <Fig cap={L("같은 filter인데 위는 되고 아래는 안 된다. 바뀐 건 요소가 아니라 배경과 요소 사이의 layer 경계다. 조상 경로 어딘가에 transform·filter·isolate 가 끼면 그 너머 배경은 \"없는 것\" 이 되므로, filter 를 의심하기 전에 조상 체인부터 확인한다.", "Same filter, yet the top works and the bottom doesn't. What changed isn't the element but the layer boundary between backdrop and element. A transform·filter·isolate anywhere up the ancestor chain makes the backdrop beyond it nonexistent — so check the ancestor chain before blaming the filter.")}>
        <div className={s.steps}>
          <span className={s.step}>☕ {L("배경", "backdrop")}</span>
          <Arr label={L("같은 layer", "same layer")} />
          <span className={`${s.step} ${s.stepMono}`}>backdrop-filter: blur()</span>
          <span className={s.step}><Chip k="fresh">{L("샘플 O · blur 보임", "samples · blur shows")}</Chip></span>
        </div>
        <div className={s.steps}>
          <span className={s.step}>☕ {L("배경", "backdrop")}</span>
          <Arr x label={L("조상 transform → layer 분리", "ancestor transform → layer split")} />
          <span className={`${s.step} ${s.stepMono}`}>backdrop-filter: blur()</span>
          <span className={s.step}><Chip k="bad">{L("배경 = 없는 것", "backdrop = nonexistent")}</Chip></span>
        </div>
      </Fig>
    ),
  };
}

/* ── setPointerCapture ── */
function pointerCapture(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("드래그 시작 시 setPointerCapture 를 걸면 그 pointer 의 모든 이벤트가 캡처 요소로 라우팅된다. 떼는 순간의 click 까지 sphere 가 가로채, 자식 Link 로 안 간다.", "setPointerCapture on drag start routes every event for that pointer to the captured element — even the click on release — so it never reaches the child Link.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>onPointerDown<br />setPointerCapture</span>
          <Arr />
          <span className={s.step}>{L("모든 pointer 이벤트 → sphere", "all pointer events → sphere")}</span>
          <Arr />
          <span className={s.step}><Chip k="bad">{L("자식 Link click 안 먹힘", "child Link click lost")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("sphere 에 capture 를 걸지 않고 document 레벨 pointermove/up 으로 회전을 추적한다. 밖으로 나가도 회전은 그대로, click 은 자식으로 통과.", "Instead of capturing on the sphere, track rotation with document-level pointermove/up; rotation still follows outside, and the click passes to the child.")}>
        <div className={s.guardRow}>
          <span className={`${s.step} ${s.stepMono}`}>document pointermove / up</span>
          <Arr />
          <div className={`${s.box} ${s.boxOk}`}><Chip k="fresh">{L("회전 O", "rotate OK")}</Chip> <Chip k="fresh">{L("클릭 O", "click OK")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}

/* ── DOMPurify URI 검사 ── */
function dompurifyUri(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("marked 는 체크박스를 제대로 만들었다. 사라진 건 DOMPurify 를 통과한 뒤였고, 에러는 발생하지 않았다.", "marked produced the checkbox correctly. It vanished only after DOMPurify, with not a single error.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{'marked → <input type="checkbox"> ✓'}</span>
          <Arr label="DOMPurify" />
          <span className={s.step}><Chip k="bad">{L("사라짐 · 에러 0", "gone · no error")}</Chip></span>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L('DOMPurify 는 URI-safe 목록에 없는 속성의 값을 URL 일 수 있다고 보고 검사한다. type 은 그 목록에 없어 type="checkbox" 값이 조용히 잘렸다.', 'DOMPurify checks the value of any attribute not in its URI-safe list, assuming it might be a URL; type is not on that list, so type="checkbox" was quietly dropped.')}>
        <div className={s.guardRow}>
          <div className={s.box}><span className={s.boxQ}>{L("속성이 URI-safe 목록에 있나?", "attr in URI-safe list?")}</span></div>
          <Arr label={L("아니오", "no")} />
          <div className={`${s.box} ${s.boxNo}`}>{L("값을 URL 로 보고 검사", "value URI-checked")} <Chip k="bad">{L("type=checkbox → 제거", "type=checkbox → stripped")}</Chip></div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("URL 이 아닌 inert 속성들을 URI 검사에서 빼 준다.", "Exempt the inert, non-URL attributes from URI checking.")}>
        <div className={s.guardRow}>
          <span className={s.codePill}>{'ADD_URI_SAFE_ATTR: ["type","checked","disabled"]'}</span>
          <Arr />
          <Chip k="fresh">{L("URI 검사 건너뜀 → 체크박스 통과", "skips URI check → checkbox passes")}</Chip>
        </div>
      </Fig>
    ),
    insight: (
      <Fig cap={L("한 키가 허용해도 다른 축의 키가 값을 보고 조용히 덮는다. 로그 없는 계층에선 에러 없음이 동작함의 근거가 못 된다.", "One key can allow it while a different-axis key inspects the value and silently overrules — and in a layer that doesn't log, no error is not evidence it works.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>ALLOWED_ATTR</span>
          <Arr label={L("남길지? ✓", "keep? ✓")} />
          <span className={`${s.step} ${s.stepMono}`}>ALLOWED_URI_REGEXP</span>
          <Arr x label={L("값이 URL-safe?", "value URL-safe?")} />
          <span className={s.step}><Chip k="bad">{L("조용히 제거 · 에러 0", "silently dropped · no error")}</Chip></span>
        </div>
        <div className={s.note}>
          <div className={s.noteT}><Chip k="sync">{L("전이 가능한 교훈", "the transferable rule")}</Chip></div>
          <div className={s.noteP}>{L("이름만 보면 둘 다 “허용”이지만 축이 다르다 — 무엇을 남길지 vs 값이 URL 로 안전한지. 라이브러리 설정은 키 하나가 아니라 키들의 상호작용으로 읽어야 한다.", "By name both read as “allow”, but they are different axes — what to keep vs is the value URL-safe. Read library config by how the keys interact, not one key at a time.")}</div>
        </div>
      </Fig>
    ),
  };
}


/* ── #5 react-flow fitView / effect 순서 ── */
function effectOrder(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("fitView() 는 호출됐고 노드·엣지 연결도 정상인데, 어떤 노드를 눌러도 화면은 늘 같은 배율·같은 위치에서 멈췄다.", "fitView() was called and the node/edge wiring was correct, yet clicking any node left the view at the same zoom and position every time.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("아무 노드나 클릭", "click any node")}</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>fitView() {L("호출됨 ✓", "called ✓")}</span>
          <Arr x label={L("확대·이동", "zoom / pan")} />
          <span className={s.step}><Chip k="bad">{L("화면 그대로 · 늘 같은 배율·위치", "no change · same zoom & position")}</Chip></span>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L("useEffect 는 자식이 부모보다 먼저 실행된다. 게다가 react-flow 의 기본 fitView 는 리렌더마다 다시 돈다.", "useEffect runs child before parent, and react-flow's default fitView re-runs on every render.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{L("자식 effect: 내 카메라 제어", "child effect: my camera control")}</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>{L("부모 / 기본 fitView", "parent / default fitView")}</span>
          <Arr />
          <span className={s.step}><Chip k="bad">{L("매 렌더 덮어씀", "overwrites every render")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("뷰포트 제어권을 하나로 통합했다. 명령형 fitView() 를 없애고, 설정만 선언한 뒤 react-flow 가 자기 순서에 스스로 맞추게 맡겼다.", "Viewport ownership was unified — the imperative fitView() was removed, options are declared, and react-flow does it in its own order.")}>
        <div className={s.guardRow}>
          <span className={s.codePill}>fitView()</span>
          <Arr label={L("제거", "remove")} />
          <div className={`${s.box} ${s.boxOk}`}>{L("선언적 설정만", "declarative config only")} <Chip k="fresh">{L("react-flow 단독 소유", "single owner")}</Chip></div>
        </div>
      </Fig>
    ),
    insight: (
      <Fig cap={L("아무 일도 안 일어날 때는, 코드가 실행조차 안 됐다고 넘겨짚기 전에 실행은 됐는데 나중 동작이 덮어쓴 건 아닌지부터 본다.", "When nothing happens, before assuming the code never ran, first check whether it ran and a later action overwrote it.")}>
        <div className={s.guard}>
          <div className={s.guardRow}>
            <div className={s.box}><span className={s.boxQ}>{L("증상: 아무 일도 안 일어남", "symptom: nothing happens")}</span></div>
          </div>
          <div className={s.guardRow}>
            <div className={`${s.box} ${s.boxNo}`}>
              <div className={s.boxQ}>{L("흔한 첫 추측", "the easy first guess")}</div>
              {L("코드가 실행조차 안 됐다", "the code never even ran")}
              <div><Chip k="stale">{L("대개 오답", "usually not it")}</Chip></div>
            </div>
            <Arr label={L("먼저 여기", "start here")} />
            <div className={`${s.box} ${s.boxOk}`}>
              <div className={s.boxQ}>{L("먼저 확인할 것", "check this first")}</div>
              {L("실행은 됐고 뒤에서 덮어써졌다", "it ran, then got overwritten")}
              <div><Chip k="fresh">{L("나중 실행이 이긴다", "last write wins")}</Chip></div>
            </div>
          </div>
        </div>
      </Fig>
    ),
  };
}

/* ── #101 percentage height / definite height ── */
function percentageHeight(L: L): VizParts {
  return {
    definition: (
      <Fig cap={L("모바일 컨테이너는 min-height 로만 높이를 받고, 그 안 캔버스의 height:100% 는 0 으로 계산됐다. 노드 23개가 DOM 엔 다 있는데 통째로 안 보였다 (데스크탑은 멀쩡).", "The mobile container's height came only from min-height, so the canvas's height:100% resolved to 0 — all 23 nodes were in the DOM yet the whole diagram was invisible (desktop was fine).")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{'.container { min-height }'}</span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>{'.canvas { height:100% }'}</span>
          <Arr label={L("계산", "resolves")} />
          <span className={s.step}>
            <Chip k="sync">{L("DOM 노드 23개 존재", "23 nodes in DOM")}</Chip>{' '}
            <Chip k="bad">{L("0px · 안 보임", "0px · invisible")}</Chip>
          </span>
        </div>
      </Fig>
    ),
    cause: (
      <Fig cap={L("height:100% 는 부모의 definite height 를 요구한다. min-height 로만 만든 높이는 auto 취급이라 자식의 100% 가 0 이 된다. 데스크탑은 flex 부모가 있어 우연히 살아 원인을 가렸다.", "height:100% needs a definite parent height; a height made only with min-height counts as auto, so the child's 100% becomes 0. Desktop had a flex parent, so it survived by accident and hid the cause.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{L("부모: min-height", "parent: min-height")} <span className={s.dim}>{L("(definite 아님)", "(not definite)")}</span></span>
          <Arr />
          <span className={`${s.step} ${s.stepMono}`}>{L("자식: height 100%", "child: height 100%")}</span>
          <Arr />
          <span className={s.step}><Chip k="bad">{L("0 으로 붕괴", "collapses to 0")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("컨테이너를 flex column 으로 만들어 자식을 stretch 로 늘렸다. flex stretch 는 부모 높이가 definite 인지와 무관하게 동작한다.", "The container became a flex column so the child stretches; flex stretch works regardless of whether the parent height is definite.")}>
        <div className={s.guardRow}>
          <span className={s.codePill}>display: flex; flex-direction: column</span>
          <Arr />
          <div className={`${s.box} ${s.boxOk}`}><Chip k="fresh">{L("자식이 stretch 로 채움", "child fills via stretch")}</Chip></div>
        </div>
      </Fig>
    ),
    insight: (
      <Fig cap={L("percentage height 는 definite height 를 요구한다. min-height 는 definite 가 아니라 100% 가 0 으로 죽고, 진짜 height 나 flex/grid stretch 는 채운다.", "A percentage height needs a definite height. min-height isn't definite, so 100% dies to 0; a real height or flex/grid stretch fills it.")}>
        <div className={s.steps}>
          <span className={`${s.step} ${s.stepMono}`}>{L("부모: min-height 만", "parent: min-height only")}</span>
          <Arr label={L("자식 height:100%", "child height:100%")} />
          <span className={s.step}><Chip k="bad">{L("0 · indefinite", "0 · indefinite")}</Chip></span>
        </div>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxOk}`}>{L("부모 height (definite)", "parent height (definite)")} <Chip k="fresh">{L("채움", "fills")}</Chip></div>
          <div className={`${s.box} ${s.boxOk}`}>{L("flex / grid stretch", "flex / grid stretch")} <Chip k="fresh">{L("definite 불필요", "no definite needed")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}

/* ── #99 hook 호출 순서 ── */
function hookOrder(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("코드블록은 하이라이팅용 decorate leaf 를 쓴다. 여기에 mark(bold·color) leaf 가 겹치면 렌더마다 leaf 구성이 달라져, Plate 의 Leaf 가 부르는 hook 순서가 바뀐다. React 규칙 위반이라 크래시.", "Code blocks use decorate leaves for highlighting. When mark (bold/color) leaves overlap them, the leaf makeup differs per render, so Plate's Leaf calls hooks in a different order — a rules-of-hooks violation that crashes.")}>
        <div className={s.steps}>
          <span className={s.step}>{L("decorate leaf (하이라이팅)", "decorate leaf (highlight)")}</span>
          <span className={s.step}>+ {L("mark leaf (bold/color)", "mark leaf (bold/color)")}</span>
          <Arr label={L("겹침", "overlap")} />
          <span className={s.step}><Chip k="bad">{L("hook 순서 바뀜 → 크래시", "hook order changes → crash")}</Chip></span>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("겹침을 렌더에서 수습하지 않고 입력 단계에서 막았다. 선택 영역이 코드블록 안이면 addMark 를 그냥 무시한다.", "Rather than patching the overlap at render, it's blocked at input — if the selection is inside a code block, addMark is simply ignored.")}>
        <div className={s.guardRow}>
          <div className={`${s.box} ${s.boxOk}`}><span className={s.boxQ}>{L("선택이 코드블록 안?", "selection in a code block?")}</span> {L("→ addMark 무시", "→ ignore addMark")} <Chip k="fresh">{L("겹침 자체가 안 생김", "overlap never forms")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}

/* ── #98 부동소수점 normalize ── */
function floatNormalize(L: L): VizParts {
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
function perceptualColor(L: L): VizParts {
  return {
    cause: (
      <Fig cap={L("HSL 의 lightness 는 (max+min)/2 수학 평균일 뿐, 지각 밝기와 다르다. 같은 L 50% 라도 노랑은 밝게, 보라는 어둡게 느껴진다.", "HSL lightness is just the (max+min)/2 mathematical average, not perceptual brightness. At the same 50%, yellow looks bright and purple looks dark.")}>
        <div className={s.guardRow}>
          <div className={s.box}>{L("노랑 L 50%", "yellow L 50%")} <Chip k="fresh">{L("밝게 느낌", "reads bright")}</Chip></div>
          <div className={s.box}>{L("보라 L 50%", "purple L 50%")} <Chip k="stale">{L("어둡게 느낌", "reads dark")}</Chip></div>
        </div>
      </Fig>
    ),
    solution: (
      <Fig cap={L("모든 토큰을 OKLCH 로 옮겼다. OKLCH 의 L 은 hue 와 무관하게 같은 지각 밝기를 준다. sRGB 밖으로 나가는 건 hue 별 safeChroma 로 clipping 을 피했다.", "All tokens moved to OKLCH, whose L gives the same perceptual brightness regardless of hue; going outside sRGB is avoided with a per-hue safeChroma.")}>
        <div className={s.guardRow}>
          <span className={s.codePill}>oklch(L% C H)</span>
          <Arr />
          <div className={`${s.box} ${s.boxOk}`}><Chip k="fresh">{L("같은 L = 같은 지각 밝기", "same L = same perceptual brightness")}</Chip></div>
        </div>
      </Fig>
    ),
  };
}



/* ── 설계 결정: 권한 데이터의 신뢰 경계 ── */
function permStore(L: L): VizParts {
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
function reversibleDelete(L: L): VizParts {
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
function optimisticLock(L: L): VizParts {
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
function uniqueConstraint(L: L): VizParts {
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
function revisionCap(L: L): VizParts {
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
function dbCron(L: L): VizParts {
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
function failSoftNotify(L: L): VizParts {
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

const REGISTRY: Record<string, (L: L) => VizParts> = {
  "effect-order": effectOrder,
  "percentage-height": percentageHeight,
  "hook-order": hookOrder,
  "float-normalize": floatNormalize,
  "perceptual-color": perceptualColor,
  "mousemove-rerender": mousemoveRerender,
  "transition-shorthand": transitionShorthand,
  "backdrop-layer": backdropLayer,
  "pointer-capture": pointerCapture,
  "dompurify-uri": dompurifyUri,
  "cross-device-autosave": crossDevice,
  "oauth-authz": githubOAuth,
  "popular-single-source": popularSingleSource,
  "all-param-leak": allParamLeak,
  "anon-comment-auth": anonCommentAuth,
  "perm-store": permStore,
  "reversible-delete": reversibleDelete,
  "optimistic-lock": optimisticLock,
  "unique-constraint": uniqueConstraint,
  "revision-cap": revisionCap,
  "db-cron": dbCron,
  "fail-soft-notify": failSoftNotify,
  "recaptcha-lazy": recaptchaLazy,
  "cursor-hittest": cursorHitTest,
  "codeblock-highlight": codeblockHighlight,
  "block-deserialize": blockDeserialize,
  "sticky-frost": stickyFrost,
};

/** 한 위치의 도형을 낱개로 돌려준다. 본문 중간의 `[[viz]]` 마커가 하나씩 꺼내 쓴다.
 *  빌더가 도형 여러 개를 Fragment 로 묶어 둔 경우 그 자식들로 펼친다. */
export function getVizParts(
  vizKey: string,
  position: VizPosition,
  language: Language,
): React.ReactNode[] {
  const build = REGISTRY[vizKey];
  if (!build) return [];
  const L: L = (ko, en) => (language === "ko" ? ko : en);
  const node = build(L)[position];
  if (!node) return [];
  /* 낱개로 꺼내 쓰더라도 상하 여백(.viz)은 유지해야 한다. 감싸지 않으면 본문 줄에
     바로 붙어 문단과 도형이 구분되지 않는다. */
  const frame = (n: React.ReactNode, k: number) => (
    <div key={k} className={s.viz}>
      {n}
    </div>
  );
  if (React.isValidElement(node) && node.type === React.Fragment) {
    const kids = (node.props as { children?: React.ReactNode }).children;
    return React.Children.toArray(kids).map(frame);
  }
  return [frame(node, 0)];
}
