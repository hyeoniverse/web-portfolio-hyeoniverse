import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { useLeaveGuard } from "@/hooks/useLeaveGuard";

/* 저장하지 않은 변경이 있을 때만, 사이트 안의 평범한 링크 이동과 새로고침·닫기를 가로챈다.
   새 창·보조 키·다른 사이트·같은 화면(해시만 다른 링크)은 건드리지 않아야 한다 — 가로채면 Cmd+클릭으로
   새 탭을 열거나 목차 링크를 누를 때까지 확인이 뜬다. */

function Links({ active, ask, fallback }: { active: boolean; ask: (go: () => void) => void; fallback?: string }) {
  useLeaveGuard(active, ask, { fallback });
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 가드가 평범한 <a> 클릭을 가로채는지 보는 검사라 일부러 쓴다(/admin 아래 catch-all 이 생긴 뒤 규칙이 페이지로 본다, #889) */}
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

  it("뒤로 가기를 붙잡아 묻고, 괜찮다고 하면 덧기록까지 건너뛴다", () => {
    const ask = vi.fn();
    const pushState = vi.spyOn(window.history, "pushState");
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
    render(<Links active ask={ask} />);
    /* 변경이 생기면 같은 주소로 기록을 하나 더 쌓아 둔다 */
    expect(pushState).toHaveBeenCalledTimes(1);

    /* 뒤로 가기 = 그 덧기록이 벗겨진 것 */
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(pushState).toHaveBeenCalledTimes(2); // 제자리에 다시 세운다
    expect(ask).toHaveBeenCalledTimes(1);
    expect(go).not.toHaveBeenCalled();

    ask.mock.calls[0][0]();
    expect(go).toHaveBeenCalledWith(-2);
    pushState.mockRestore();
    go.mockRestore();
  });

  it("버리고 떠나면 이 화면과 경로가 다른 기록이 나올 때까지 물러난다 — 새로고침 전의 덧기록에 머물지 않는다", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/admin/works/1/edit");
    const ask = vi.fn();
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
    render(<Links active ask={ask} fallback="/admin/works" />);
    window.dispatchEvent(new PopStateEvent("popstate")); // 뒤로 가기 → 묻는다
    ask.mock.calls[0][0]();
    expect(go).toHaveBeenLastCalledWith(-2);

    /* 두 칸 물러났는데 아직 같은 화면 — 새로고침 전에 쌓아 둔 덧기록이다. 한 칸 더 */
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(go).toHaveBeenLastCalledWith(-1);

    /* 목록에 닿았다 — 멈춘다 */
    window.history.replaceState(null, "", "/admin/works");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(go).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(2000);
    expect(push).not.toHaveBeenCalled();
    go.mockRestore();
    vi.useRealTimers();
  });

  it("물러날 기록이 없으면(새 탭에서 바로 연 화면) fallback 으로 보낸다", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/admin/works/1/edit");
    const ask = vi.fn();
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
    render(<Links active ask={ask} fallback="/admin/works" />);
    window.dispatchEvent(new PopStateEvent("popstate"));
    ask.mock.calls[0][0]();
    /* history.go 가 아무 일도 하지 않아 popstate 가 오지 않는다 */
    vi.advanceTimersByTime(1000);
    expect(push).toHaveBeenCalledWith("/admin/works");
    go.mockRestore();
    vi.useRealTimers();
  });

  it("변경이 없으면 덧기록을 쌓지 않는다", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    render(<Links active={false} ask={vi.fn()} />);
    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
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
