import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useCylinderStage } from "@/app/works/_components/layouts/cylinder/useCylinderStage";
import { wrapAngle } from "@/app/works/_components/layouts/cylinder/scene";

/* 터치 화면에서 원통 돌리기(#940). 원통은 휠만 받아서 터치 화면에서는 인트로 양옆 두 판에만 닿았다.
   한 손가락으로 위아래로 끌면 돌고(위로 끌면 휠을 내린 것처럼 다음 판), 놓으면 가까운 판에 멈춘다. */

afterEach(cleanup);

const SLOTS = 6;
const SEG = Math.PI / 3;

function setup() {
  const stage: { current: ReturnType<typeof useCylinderStage> | null } = { current: null };
  function Stage() {
    const s = useCylinderStage({ slotCount: SLOTS, segAngle: SEG, arc: SEG * 0.92, indicatorDotActiveClassName: "on" });
    stage.current = s;
    return <div ref={s.wrapRef} data-testid="wrap" />;
  }
  const { getByTestId } = render(<Stage />);
  const wrap = getByTestId("wrap");
  const angle = () => stage.current!.scrollRef.current * SEG * SLOTS;
  /** 원통이 멈출 앞면 슬롯과, 그 슬롯에 딱 맞았는지 */
  const front = () => {
    let best = 0;
    for (let i = 1; i < SLOTS; i++) if (Math.abs(wrapAngle(angle() - i * SEG)) < Math.abs(wrapAngle(angle() - best * SEG))) best = i;
    return { slot: best, off: Math.abs(wrapAngle(angle() - best * SEG)) };
  };
  const pointer = (type: string, init: { id?: number; y?: number; t: number; kind?: string }) => {
    const e = new Event(type, { bubbles: true });
    Object.defineProperties(e, {
      pointerId: { value: init.id ?? 1 },
      pointerType: { value: init.kind ?? "touch" },
      clientY: { value: init.y ?? 0 },
      timeStamp: { value: init.t },
    });
    wrap.dispatchEvent(e);
  };
  /** from → to 로 steps 번에 나눠 끌고, 마지막 이동 뒤 holdMs 만큼 멈췄다 뗀다 */
  const drag = (from: number, to: number, { steps = 10, stepMs = 16, holdMs = 300, id = 1, kind = "touch" } = {}) => {
    let t = 1000;
    pointer("pointerdown", { id, y: from, t, kind });
    for (let k = 1; k <= steps; k++) { t += stepMs; pointer("pointermove", { id, y: from + ((to - from) * k) / steps, t, kind }); }
    pointer("pointerup", { id, y: to, t: t + holdMs, kind });
  };
  return { stage, angle, front, pointer, drag };
}

describe("useCylinderStage — 터치로 돌리기", () => {
  it("위로 끌면 다음 판으로, 아래로 끌면 앞 판으로 돌고 판에 딱 맞게 멈춘다", () => {
    const { drag, front } = setup();
    // jsdom 창(1024×768)에서 판 한 칸은 약 570px — 400px 끌면 다음 판이 더 가깝다
    drag(600, 200);
    expect(front()).toEqual({ slot: 1, off: 0 });
    drag(200, 600);
    drag(200, 600);
    expect(front().slot, "앞으로 두 칸 → 인트로 너머 마지막 판").toBe(SLOTS - 1);
    expect(front().off).toBeCloseTo(0, 9);
  });

  it("조금만 끌고 놓으면 제자리로 돌아온다", () => {
    const { drag, front } = setup();
    drag(600, 450);
    expect(front()).toEqual({ slot: 0, off: 0 });
  });

  it("빠르게 튕기면 떼기 직전 속도만큼 더 가서 멈춘다", () => {
    const { drag, front } = setup();
    // 같은 400px 이라도 멈추지 않고 빠르게 떼면 한 칸을 더 간다
    drag(600, 200, { steps: 8, stepMs: 8, holdMs: 0 });
    expect(front().slot).toBeGreaterThanOrEqual(2);
    expect(front().off).toBeCloseTo(0, 9);
  });

  it("두 손가락이 닿으면 돌리지 않는다", () => {
    const { pointer, angle } = setup();
    pointer("pointerdown", { id: 1, y: 600, t: 1000 });
    pointer("pointerdown", { id: 2, y: 600, t: 1001 });
    const before = angle();
    pointer("pointermove", { id: 1, y: 200, t: 1100 });
    pointer("pointermove", { id: 2, y: 200, t: 1100 });
    expect(angle()).toBe(before);
  });

  it("마우스로 끄는 것은 받지 않는다 — 데스크톱은 휠로 돌린다", () => {
    const { drag, angle } = setup();
    drag(600, 200, { kind: "mouse" });
    expect(angle()).toBe(0);
  });
});
