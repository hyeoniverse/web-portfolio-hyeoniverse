"use client";

import React from "react";
import s from "../TroubleViz.module.css";
import { Chip, Arr, Fig } from "./primitives";
import type { L, VizParts } from "./primitives";

/* 인증 · 인가 · 입력 검증 — 트러블슈팅 항목별 시각화. */
/* ── 2. ?all=true 인증 없이 노출 ── */
export function allParamLeak(L: L): VizParts {
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

/* ── 3. 익명 댓글 — 클라 강제, 서버 우회 ── */
export function anonCommentAuth(L: L): VizParts {
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

/* ── 4. reCAPTCHA v3 지연 로딩 ── */
export function recaptchaLazy(L: L): VizParts {
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

/* ── GitHub OAuth — 인증(authN) vs 인가(authZ) ── */
export function githubOAuth(L: L): VizParts {
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

/* ── DOMPurify URI 검사 ── */
export function dompurifyUri(L: L): VizParts {
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
