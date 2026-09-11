import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { useLeaveGuard } from "@/hooks/useLeaveGuard";

/* 저장하지 않은 변경이 있을 때만, 사이트 안의 평범한 링크 이동과 새로고침·닫기를 가로챈다.
   새 창·보조 키·다른 사이트·같은 화면(해시만 다른 링크)은 건드리지 않아야 한다 — 가로채면 Cmd+클릭으로
   새 탭을 열거나 목차 링크를 누를 때까지 확인이 뜬다. */

function Links({ active, ask }: { active: boolean; ask: (go: () => void) => void }) {
  useLeaveGuard(active, ask);
  return (
    <div>
      <a href="/admin/works">internal</a>
      <a href="/admin/works" target="_blank" rel="noreferrer">blank</a>
      <a href="/admin/works" download>download</a>
      <a href="https://example.com/x">external</a>
      <a href="#section">hash</a>
    </div>
  );
}

/* jsdom 은 링크를 따라가지 못해 경고를 낸다. 가드는 캡처 단계에서 먼저 보므로, 버블 단계에서 막아도 판단은 같다 */
const stopNavigation = (e: Event) => e.preventDefault();

const click = (el: Element, init: MouseEventInit = {}) => {
  const e = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  el.dispatchEvent(e);
  return e;
};

describe("useLeaveGuard", () => {
  beforeEach(() => { push.mockClear(); document.addEventListener("click", stopNavigation); });
  afterEach(() => { cleanup(); document.removeEventListener("click", stopNavigation); });

  it("변경이 있으면 사이트 안 링크를 가로채 묻고, 괜찮다고 하면 그 주소로 옮긴다", () => {
    const ask = vi.fn();
    const { getByText } = render(<Links active ask={ask} />);
    click(getByText("internal"));
    expect(ask).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    ask.mock.calls[0][0]();
    expect(push).toHaveBeenCalledWith("/admin/works");
  });

  it("변경이 없으면 가로채지 않는다", () => {
    const ask = vi.fn();
    const { getByText } = render(<Links active={false} ask={ask} />);
    click(getByText("internal"));
    expect(ask).not.toHaveBeenCalled();
  });

  it("새 창·다운로드·보조 키·다른 사이트·해시 링크는 건드리지 않는다", () => {
    const ask = vi.fn();
    const { getByText } = render(<Links active ask={ask} />);
    click(getByText("blank"));
    click(getByText("download"));
    click(getByText("internal"), { metaKey: true });
    click(getByText("internal"), { ctrlKey: true });
    click(getByText("internal"), { shiftKey: true });
    click(getByText("internal"), { button: 1 });
    click(getByText("external"));
    click(getByText("hash"));
    expect(ask).not.toHaveBeenCalled();
  });

  it("변경이 있을 때만 새로고침·닫기를 붙잡는다(beforeunload)", () => {
    const { rerender } = render(<Links active={false} ask={vi.fn()} />);
    const idle = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(idle);
    expect(idle.defaultPrevented).toBe(false);
    rerender(<Links active ask={vi.fn()} />);
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
