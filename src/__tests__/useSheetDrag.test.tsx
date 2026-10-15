import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useSheetDrag, sheetStops, pickSheetStop } from "@/hooks/useSheetDrag";

/* 바텀 시트 끌기 — Modal · 공용 시트(Popover · ColorPicker) · 표지 고르기 · 인덱스 시트가 같은 훅을 쓴다.
   위로 끌면 내용 크기에 맞춰 여러 단계로 펼치고(가장 높아도 위에 틈), 펼친 시트를 내리면 접고,
   처음 높이에서 내리면 닫는다. */

afterEach(cleanup);

const VIEWPORT = 800;
const GAP = 24;
const BASE = 300;

let now = 0;
beforeEach(() => {
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  // jsdom 에는 pointer capture 가 없다
  Element.prototype.setPointerCapture = () => {};
  Object.defineProperty(window, "innerHeight", { configurable: true, value: VIEWPORT });
  // jsdom 은 CSS 를 계산하지 않는다 — 위 틈(--sheet-top-gap)을 재는 요소만 그 높이를 돌려준다
  const rect = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return (this as HTMLElement).style?.height === "var(--sheet-top-gap)" ? ({ height: GAP } as DOMRect) : rect.call(this);
  });
});

describe("sheetStops", () => {
  it("내용이 길면 처음 높이 · 화면 50% · 75% · 화면 − 위 틈", () => {
    expect(sheetStops(BASE, 2000, VIEWPORT, GAP)).toEqual([300, 400, 600, 776]);
  });

  it("가장 높은 단계는 내용 높이를 넘지 않는다 — 짧은 내용은 빈 자리까지 펼치지 않는다", () => {
    expect(sheetStops(BASE, 420, VIEWPORT, GAP)).toEqual([300, 420]);
  });

  it("이웃 단계와 너무 가까운 중간 단계는 뺀다", () => {
    expect(sheetStops(BASE, 620, VIEWPORT, GAP)).toEqual([300, 400, 620]);
  });

  it("내용이 처음 높이에 다 들어가면 펼칠 단계가 없다", () => {
    expect(sheetStops(BASE, 310, VIEWPORT, GAP)).toEqual([300]);
  });
});

describe("pickSheetStop", () => {
  const stops = [300, 400, 600, 776];
  it("멈췄다 놓으면 가장 가까운 단계", () => {
    expect(pickSheetStop(stops, 480, 0)).toBe(400);
    expect(pickSheetStop(stops, 520, 0)).toBe(600);
  });
  it("휙 쓸면 그 방향의 다음 단계 — 한 번에 끝까지 가지 않는다", () => {
    expect(pickSheetStop(stops, 330, -1)).toBe(400);
    expect(pickSheetStop(stops, 590, 1)).toBe(400);
  });
});

function setup(content = 2000) {
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
  /* 레이아웃 흉내 — 인라인 높이가 있으면 그 높이, 없으면 CSS 가 정한 처음 높이 */
  const height = () => parseFloat(sheet.style.maxHeight) || BASE;
  sheet.getBoundingClientRect = () => ({ height: height() }) as DOMRect;
  Object.defineProperty(sheet, "clientHeight", { get: height });
  Object.defineProperty(sheet, "scrollHeight", { get: () => Math.max(content, height()) });
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
  /** to 까지 끌고 holdMs 만큼 멈췄다 뗀다(멈췄다 떼면 속도 0 — 거리만으로 판정) */
  const drag = (dy: number, { from = 500, steps = 10, stepMs = 16, holdMs = 300, target = getByTestId("handle") } = {}) => {
    pointer(target, "pointerdown", from);
    for (let k = 1; k <= steps; k++) { now += stepMs; pointer(target, "pointermove", from + (dy * k) / steps); }
    now += holdMs;
    pointer(target, "pointerup", from + dy);
  };
  const expanded = () => sheet.hasAttribute("data-sheet-expanded");
  return { sheet, onDismiss, drag, expanded, height, pointer, getByTestId };
}

describe("useSheetDrag", () => {
  it("위로 끌어 놓으면 가까운 단계에 멈추고, 더 끌면 다음 단계로 — 가장 높아도 위에 틈이 남는다", () => {
    const { drag, height, expanded } = setup();
    drag(-110); // 300 → 410 근처 → 400
    expect(expanded()).toBe(true);
    expect(height()).toBe(400);
    drag(-210); // 400 → 610 → 600
    expect(height()).toBe(600);
    drag(-400); // 600 → 끝(고무줄) → 776
    expect(height()).toBe(VIEWPORT - GAP);
  });

  it("짧은 내용은 내용 높이까지만 펼친다", () => {
    const { drag, height } = setup(450);
    drag(-400);
    expect(height()).toBe(450);
  });

  it("펼친 시트를 아래로 끌면 처음 높이로 접히고 닫히지는 않는다", () => {
    const { drag, expanded, onDismiss } = setup();
    drag(-300);
    expect(expanded()).toBe(true);
    drag(600);
    expect(expanded()).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("처음 높이에서 멀리 끌어 내리면 닫는다", () => {
    const { drag, onDismiss } = setup();
    drag(120);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("조금만 끌었다 놓으면 제자리 — 펼치지도 닫지도 않는다", () => {
    const { drag, expanded, onDismiss, sheet } = setup();
    drag(-20);
    expect(expanded()).toBe(false);
    drag(40);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(sheet.style.translate).toBe("");
  });

  it("짧아도 휙 쓸어내리면 닫는다", () => {
    const { drag, onDismiss } = setup();
    drag(40, { steps: 3, stepMs: 10, holdMs: 0 });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("짧아도 휙 쓸어올리면 다음 단계 하나만 펼친다", () => {
    const { drag, height } = setup();
    drag(-20, { steps: 2, stepMs: 10, holdMs: 0 });
    expect(height()).toBe(400);
  });

  it("끄는 동안 처음 높이의 시트는 손가락을 따라 내려온다", () => {
    const { getByTestId, sheet, pointer } = setup();
    const handle = getByTestId("handle");
    pointer(handle, "pointerdown", 400);
    pointer(handle, "pointermove", 460);
    expect(sheet.style.translate).toBe("0 60px");
    pointer(handle, "pointercancel", 460);
    expect(sheet.style.translate).toBe("");
  });

  it("제목 줄 안의 단추에서 시작한 손짓은 끌기로 잡지 않는다(단추가 눌려야 한다)", () => {
    const { drag, expanded, onDismiss, getByTestId } = setup();
    const action = getByTestId("action");
    drag(-300, { target: action });
    expect(expanded()).toBe(false);
    drag(300, { target: action });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
