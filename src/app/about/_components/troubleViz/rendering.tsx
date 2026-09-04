"use client";

import React from "react";
import s from "../TroubleViz.module.css";
import { Chip, Arr, Fig } from "./primitives";
import type { L, VizParts } from "./primitives";

/* 렌더 · 스타일 · 합성 — 트러블슈팅 항목별 시각화. */
/* ── 5. 커스텀 커서 hit-test ── */
export function cursorHitTest(L: L): VizParts {
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

/* ── 6. 코드블록 하이라이팅 — 브라우저에서만 죽음 ── */
export function codeblockHighlight(L: L): VizParts {
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

/* ── 8. sticky 유리 헤더 frost ── */
export function stickyFrost(L: L): VizParts {
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

/* ── 전역 transition shorthand ── */
export function transitionShorthand(L: L): VizParts {
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

/* ── backdrop-filter compositing layer ── */
export function backdropLayer(L: L): VizParts {
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

/* ── #101 percentage height / definite height ── */
export function percentageHeight(L: L): VizParts {
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

/* ── #80 지각 밝기 / OKLCH ── */
export function perceptualColor(L: L): VizParts {
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
