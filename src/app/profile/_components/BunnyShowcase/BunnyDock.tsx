"use client";

/* 몽이가 내려앉는 자리 — 떠다니는 몽이(FloatingObject)가 이 상자로 내려와 앉고, 볼 잡기 · 쓰다듬기 · 찌르기 ·
   끌어 돌리기 입력을 이 상자가 받아 profileSectionStore 로 넘긴다. 그림은 그리지 않는다 — 상자의 크기와 위치가
   곧 몽이의 크기와 위치다. 크기는 쓰는 쪽이 className 으로 정한다(프로필 쇼케이스 · About 몽이 섹션).
   프로필 쇼케이스 패널에 있던 것을 떼어 왔다. */
import { useEffect, useRef, useCallback } from "react";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import dockStyles from "./BunnyDock.module.css";

const THREE_CLAMP = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ── 어디를 눌렀는지 ──────────────────────────────────────
   여기서는 정하지 않는다. 몽이가 지금 어떤 자세로 돌아 있는지는 FloatingScene 만 알기
   때문이다. 예전에는 이 파일이 "상자 가운데가 몽이 가운데" 라고 가정하고 로컬 좌표를
   만들었는데, 몽이를 돌리면 그 가정이 깨져 왼쪽 볼을 집었는데 오른쪽 볼이 늘어났다.

   그래서 이쪽은 화면 좌표만 넘기고, 무엇을 만지고 있는지는 장면이 광선을 쏴서 풀어 준다.
   그 결과(`spot`)를 다시 읽어 커서와 동작을 정한다. */

/** 커서를 화면 정규 좌표로. 광선을 쏘려면 뷰포트 기준이어야 한다(상자 기준이 아니라). */
function toNdc(e: { clientX: number; clientY: number }) {
  return {
    x: (e.clientX / window.innerWidth) * 2 - 1,
    y: -(e.clientY / window.innerHeight) * 2 + 1,
  };
}

/** 볼을 위로 끌 수 있는 한계(NDC). 더 끌면 밀린 살이 눈까지 올라온다. */
const PULL_UP_LIMIT = 0.05;
/** 좌우·아래로 끌 수 있는 한계(NDC). */
const PULL_LIMIT = 0.22;

type Spot = "pinch" | "pet" | "poke" | "grab";

/**
 * 트레일 커서를 전역으로 감춘다. 몽이를 만지는 동안에는 장면 안의 3D 손이 커서 노릇을 한다.
 *
 * 자리 상자에만 표시하면 모자란다. 볼을 잡고 끌면 포인터를 이 상자가 붙잡아(setPointerCapture)
 * 밖으로 나가도 계속 잡고 있는데, 트레일은 지금 커서 밑에 있는 요소를 따로 찾아보므로
 * 상자 밖에서는 다시 나타난다 — 손과 트레일이 같이 보인다.
 */
function setTrailHidden(on: boolean): void {
  if (on) document.body.dataset.cursor = "blank";
  else delete document.body.dataset.cursor;
}

/** 이만큼 안 움직이고 뗐으면 끈 게 아니라 찌른 것(px). */
const TAP_SLOP = 8;

export default function BunnyDock({ className }: { className?: string }) {
  /* 떠다니는 몽이가 내려앉을 자리. 여기에 3D 를 하나 더 그리면 화면에 몽이가 둘이 된다. */
  const dockRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const { addBunnyDockSlot, removeBunnyDockSlot } = useProfileSectionStore.getState();
    addBunnyDockSlot(el);
    return () => removeBunnyDockSlot(el);
  }, []);


  /* ── 끌어서 돌리기 ──
     몽이 그림은 위에 뜬 오버레이가 그리고 그 오버레이는 클릭을 받지 않는다. 그래서 입력은
     자리 상자가 받아 각도만 넘기고, 실제 회전은 FloatingScene 이 그린다.
     상태가 아니라 객체를 제자리에서 고친다 — 매 프레임 setState 하면 렌더가 계속 돈다. */
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  /* 누른 자리와, 그 뒤로 얼마나 움직였는지. 톡 찌른 건지 끈 건지를 뗄 때 가른다. */
  const press = useRef<{ x: number; y: number; nx: number; ny: number; moved: number; spot: Spot } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const { bunnyDrag: drag, bunnyTouch: touch } = useProfileSectionStore.getState();
    const ndc = toNdc(e);
    /* 무엇을 만지고 있는지는 장면이 직전 프레임에 풀어 둔 값을 쓴다. 커서를 움직여야
       누를 수 있으니 그 값은 언제나 지금 자리의 것이다. */
    const spot: Spot = touch.spot || "grab";
    press.current = { x: e.clientX, y: e.clientY, nx: ndc.x, ny: ndc.y, moved: 0, spot };
    /* 자리마다 하는 일이 다르다. 잡아당기거나 쓰다듬는 동안에는 돌지 않는다 —
       동시에 하면 뭘 하고 있는지 안 보인다. */
    touch.cheek = spot === "pinch" ? 1 : 0;
    touch.grabX = ndc.x;
    touch.grabY = ndc.y;
    touch.pullX = 0;
    touch.pullY = 0;
    touch.petting = spot === "pet";
    /* 만지는 데 따라 표정이 바뀐다 — 쓰다듬으면 좋아하고, 볼을 잡히면 놀란다. */
    if (spot === "pet") useProfileSectionStore.getState().setBunnyExpression("happy");
    if (spot === "pinch") useProfileSectionStore.getState().setBunnyExpression("surprised");
    drag.dragging = spot === "grab" || spot === "poke";
    drag.vx = 0;
    drag.vy = 0;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragging = "true";
    /* 누르는 순간의 기본 동작(글자 선택 시작)을 막는다 — 안 막으면 몽이를 끌 때 옆 소개 글이
       같이 드래그돼 파랗게 선택된다. 포인터 캡처는 그대로라 끌기에는 영향이 없다 */
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const last = lastPointer.current;
    if (!last) return;
    const touch = useProfileSectionStore.getState().bunnyTouch;
    if (press.current) {
      press.current.moved += Math.hypot(e.clientX - last.x, e.clientY - last.y);
    }
    /* 쓰다듬거나 볼을 잡고 있으면 커서 자리만 넘긴다 — 그 자리를 몽이 위의 점으로 옮기는
       일은 자세를 아는 장면이 한다. */
    if (press.current && (touch.petting || touch.cheek !== 0)) {
      const ndc = toNdc(e);
      touch.pullX = THREE_CLAMP(ndc.x - press.current.nx, -PULL_LIMIT, PULL_LIMIT);
      /* NDC 는 위가 + 라, 위로 끌면 양수다. 위로만 상한이 좁다. */
      touch.pullY = THREE_CLAMP(ndc.y - press.current.ny, -PULL_LIMIT, PULL_UP_LIMIT);
      lastPointer.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const drag = useProfileSectionStore.getState().bunnyDrag;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    /* 화면 폭의 절반쯤 끌면 한 바퀴 — 손맛이 너무 가볍지도 무겁지도 않은 값. */
    const perPx = (Math.PI * 2) / (window.innerWidth * 0.5);
    drag.y += dx * perPx;
    /* 위아래는 자유롭게 두면 뒤집혀서 무슨 자세인지 알 수 없다 — 70도쯤에서 멈춘다. */
    drag.x = Math.max(-1.2, Math.min(1.2, drag.x + dy * perPx));
    drag.vx = dy * perPx;
    drag.vy = dx * perPx;
  }, []);

  /* 커서 자리를 넘기고, 장면이 풀어 준 자리에 맞는 손 모양을 고른다. 누르고 있는 동안에는
     바꾸지 않는다 — 잡아당기다 손이 볼 밖으로 나갔다고 모양이 바뀌면 뭘 하고 있는지 흔들린다. */
  const onHover = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const touch = useProfileSectionStore.getState().bunnyTouch;
    const ndc = toNdc(e);
    touch.ndcX = ndc.x;
    touch.ndcY = ndc.y;
    touch.over = true;
    const spot = press.current ? press.current.spot : touch.spot || "grab";
    /* 잡고 있는 동안에는 쥔 손으로 — 무엇을 하고 있는지가 손 모양에도 남는다.
       몽이 위에서는 어디든 손이 커서다. 몸통만 트레일 커서로 되돌리면 같은 대상 위에서
       커서가 두 종류로 갈린다. */
    touch.hand = press.current && spot === "pinch" ? "pinching" : spot;
    /* 손은 3D 로 장면 안에 세운다. DOM 커서는 그 자리에서 비켜 준다 — 둘 다 있으면 손이 둘이다. */
    e.currentTarget.dataset.cursor = "blank";
    setTrailHidden(true);
  }, []);

  useEffect(() => () => { delete document.body.dataset.cursor; }, []);

  /* cancelled — 브라우저가 입력을 가져갔다(터치로 세로로 쓸어 페이지가 스크롤되기 시작함). 찌른 게 아니다 */
  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const { bunnyDrag: drag, bunnyTouch: touch } = useProfileSectionStore.getState();
    drag.dragging = false;
    /* 거의 안 움직이고 뗐으면 찌른 것이다. 볼이든 몸이든 상관없다. */
    if (!cancelled && press.current && press.current.moved < TAP_SLOP) {
      touch.grabX = press.current.nx;
      touch.grabY = press.current.ny;
      touch.poke = 1;
    }
    /* 놓으면 볼은 스스로 돌아간다 — 되돌리는 건 FloatingScene 이 용수철로 한다. */
    touch.cheek = 0;
    touch.petting = false;
    /* 손을 떼면 커서가 지금 어디 있는지 알 수 없다. 트레일을 되살려 두고,
       상자 안이면 바로 다음 이동에서 다시 감춘다. */
    /* 터치는 손가락을 떼면 끝이다 — 터치 뒤에도 :hover 가 남는 브라우저가 있어 손이 그 자리에 떠 있었다 */
    if (e.pointerType === "touch" || !e.currentTarget.matches(":hover")) {
      touch.over = false;
      touch.hand = "";
      setTrailHidden(false);
    }
    press.current = null;
    lastPointer.current = null;
    delete e.currentTarget.dataset.dragging;
  }, []);

  /* 그림은 떠다니는 몽이(FloatingObject)가 대신 그린다. 비어 있는 상자지만 크기가 곧 몽이의 크기이자 위치다. */
  return (
    <div
      ref={dockRef}
      className={`${dockStyles.dock} ${className ?? ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => { onHover(e); onPointerMove(e); }}
      onPointerUp={endDrag}
      onPointerCancel={(e) => endDrag(e, true)}
      onPointerLeave={() => {
        const touch = useProfileSectionStore.getState().bunnyTouch;
        touch.over = false;
        touch.hand = "";
        touch.spot = "";
        setTrailHidden(false);
      }}
      role="presentation"
    />
  );
}
