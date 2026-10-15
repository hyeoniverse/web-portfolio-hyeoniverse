import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useSheetDrag } from "@/hooks/useSheetDrag";

/* 바텀 시트 끌기 — Modal · 공용 시트(Popover · ColorPicker) · 표지 고르기 · 인덱스 시트가 같은 훅을 쓴다.
   위로 끌면 펼치고, 펼친 시트를 아래로 끌면 원래 높이로, 원래 높이에서 아래로 끌면 닫는다. */

afterEach(cleanup);

let now = 0;
beforeEach(() => {
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  // jsdom 에는 pointer capture 가 없다
  Element.prototype.setPointerCapture = () => {};
});

function setup() {
  const onDismiss = vi.fn();
  function Sheet() {
    const drag = useSheetDrag(onDismiss);
    return (
      <div data-sheet data-testid="sheet">
        <div data-testid="handle" {...drag} />
        <div data-testid="header" {...drag}>
          <button type="button" data-testid="action">action</button>
        </div>
      </div>
    );
  }
  const { getByTestId } = render(<Sheet />);
  const sheet = getByTestId("sheet");
  const pointer = (target: HTMLElement, type: string, y: number) => {
    const e = new Event(type, { bubbles: true });
    Object.defineProperties(e, {
      pointerId: { value: 1 },
      pointerType: { value: "touch" },
      button: { value: 0 },
      clientY: { value: y },
    });
    target.dispatchEvent(e);
  };
  /** from → to 로 끌고, holdMs 만큼 멈췄다 뗀다(멈췄다 떼면 속도 0 — 거리만으로 판정) */
  const drag = (to: number, { from = 400, steps = 10, stepMs = 16, holdMs = 300, target = getByTestId("handle") } = {}) => {
    pointer(target, "pointerdown", from);
    for (let k = 1; k <= steps; k++) { now += stepMs; pointer(target, "pointermove", from + ((to - from) * k) / steps); }
    now += holdMs;
    pointer(target, "pointerup", to);
  };
  const expanded = () => sheet.hasAttribute("data-sheet-expanded");
  return { sheet, onDismiss, drag, expanded, getByTestId };
}

describe("useSheetDrag", () => {
  it("위로 끌면 펼치고, 펼친 시트를 아래로 끌면 원래 높이로 돌아간다(닫지 않는다)", () => {
    const { drag, expanded, onDismiss } = setup();
    drag(150);
    expect(expanded()).toBe(true);
    drag(550);
    expect(expanded()).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("원래 높이에서 멀리 끌어 내리면 닫는다", () => {
    const { drag, onDismiss } = setup();
    drag(520);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("조금만 끌었다 놓으면 제자리 — 펼치지도 닫지도 않는다", () => {
    const { drag, expanded, onDismiss, sheet } = setup();
    drag(380);
    expect(expanded()).toBe(false);
    drag(440);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(sheet.style.translate).toBe("");
  });

  it("짧아도 휙 쓸어내리면 닫는다", () => {
    const { drag, onDismiss } = setup();
    drag(440, { steps: 3, stepMs: 10, holdMs: 0 });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("짧아도 휙 쓸어올리면 펼친다", () => {
    const { drag, expanded } = setup();
    drag(380, { steps: 2, stepMs: 10, holdMs: 0 });
    expect(expanded()).toBe(true);
  });

  it("끄는 동안 원래 높이의 시트는 손가락을 따라 내려온다", () => {
    const { getByTestId, sheet } = setup();
    const handle = getByTestId("handle");
    const e = (type: string, y: number) => {
      const ev = new Event(type, { bubbles: true });
      Object.defineProperties(ev, { pointerId: { value: 1 }, pointerType: { value: "touch" }, button: { value: 0 }, clientY: { value: y } });
      handle.dispatchEvent(ev);
    };
    e("pointerdown", 400);
    e("pointermove", 460);
    expect(sheet.style.translate).toBe("0 60px");
    e("pointercancel", 460);
    expect(sheet.style.translate).toBe("");
  });

  it("제목 줄 안의 단추에서 시작한 손짓은 끌기로 잡지 않는다(단추가 눌려야 한다)", () => {
    const { drag, expanded, onDismiss, getByTestId } = setup();
    const action = getByTestId("action");
    drag(150, { target: action });
    expect(expanded()).toBe(false);
    drag(550, { target: action });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
