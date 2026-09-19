import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { LanguageProvider } from "@/providers/LanguageProvider";
import Textarea from "@/components/ui/Textarea";

/* 글상자 위에서의 휠과, 타이핑 중 우하단 chip(지우개·글자수).

   휠: data-lenis-prevent 를 늘 붙여 두면 전역 Lenis 가 이 위의 휠을 아예 보지 않아, 안에서
   더 굴릴 데가 없어도 페이지가 멈춘다. 안에서 굴릴 수 있을 때만 표시를 붙이고 양 끝에서는
   떼어, 페이지가 이어받게 한다.

   chip: 입력하는 동안에는 물러나야 방금 친 글자를 가리지 않는다. */

function 글상자(value = "") {
  const { container } = render(
    <LanguageProvider>
      <Textarea value={value} onChange={() => {}} maxHint={200} />
    </LanguageProvider>,
  );
  const box = container.querySelector('[role="textbox"]') as HTMLElement;
  const chip = container.querySelector('[class*="bottomRow"]') as HTMLElement;
  return { box, chip };
}

/** jsdom 은 배치를 하지 않아 스크롤 치수가 늘 0 이다 — 넘치는 상태를 직접 만들어 준다 */
function 치수(el: HTMLElement, scrollTop: number, scrollHeight: number, clientHeight: number) {
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  el.scrollTop = scrollTop;
}

afterEach(cleanup);

describe("글상자 위에서의 휠", () => {
  it("안에서 더 굴릴 수 있으면 휠을 가둔다", () => {
    const { box } = 글상자();
    치수(box, 0, 300, 100);
    fireEvent.wheel(box, { deltaY: 120 });
    expect(box.hasAttribute("data-lenis-prevent-wheel")).toBe(true);
  });

  it("아래 끝에서 더 내리면 놓아준다 — 페이지가 이어받는다", () => {
    const { box } = 글상자();
    치수(box, 200, 300, 100);
    fireEvent.wheel(box, { deltaY: 120 });
    expect(box.hasAttribute("data-lenis-prevent-wheel")).toBe(false);
  });

  it("위 끝에서 더 올리면 놓아준다", () => {
    const { box } = 글상자();
    치수(box, 0, 300, 100);
    fireEvent.wheel(box, { deltaY: -120 });
    expect(box.hasAttribute("data-lenis-prevent-wheel")).toBe(false);
  });

  it("넘칠 게 없으면 언제나 놓아준다", () => {
    const { box } = 글상자();
    치수(box, 0, 100, 100);
    fireEvent.wheel(box, { deltaY: 120 });
    expect(box.hasAttribute("data-lenis-prevent-wheel")).toBe(false);
  });

  it("터치는 그대로 안쪽에 둔다 — 브라우저가 끝에서 페이지로 넘긴다", () => {
    const { box } = 글상자();
    expect(box.hasAttribute("data-lenis-prevent-touch")).toBe(true);
  });
});

describe("타이핑 중 지우개·글자수", () => {
  it("입력하는 동안 물러났다가, 손을 멈추면 돌아온다", () => {
    vi.useFakeTimers();
    try {
      const { box, chip } = 글상자("안녕");
      expect(chip.hasAttribute("data-typing")).toBe(false);

      fireEvent.input(box);
      expect(chip.hasAttribute("data-typing")).toBe(true);

      act(() => { vi.advanceTimersByTime(500); });
      expect(chip.hasAttribute("data-typing")).toBe(true);

      act(() => { vi.advanceTimersByTime(500); });
      expect(chip.hasAttribute("data-typing")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
