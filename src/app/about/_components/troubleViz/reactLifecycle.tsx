"use client";

import React from "react";
import s from "../TroubleViz.module.css";
import { Chip, Arr, Fig } from "./primitives";
import type { L, VizParts } from "./primitives";

/* React 생명주기 · 이벤트 — 트러블슈팅 항목별 시각화. */
/* ── mousemove 리렌더 ── */
export function mousemoveRerender(L: L): VizParts {
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

/* ── setPointerCapture ── */
export function pointerCapture(L: L): VizParts {
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

/* ── #5 react-flow fitView / effect 순서 ── */
export function effectOrder(L: L): VizParts {
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

/* ── #99 hook 호출 순서 ── */
export function hookOrder(L: L): VizParts {
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
