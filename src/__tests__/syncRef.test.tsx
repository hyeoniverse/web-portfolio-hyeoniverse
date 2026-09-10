import { describe, it, expect, vi } from "vitest";
import { Component, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { render } from "@testing-library/react";
import { useSyncRef } from "@/hooks/useSyncRef";

/* useSyncRef 는 렌더 중이 아니라 렌더가 확정된 뒤에 ref 를 맞춘다. 두 가지를 확인한다.
   확정되지 않고 버려진 렌더의 값이 ref 에 남지 않는다. 그리고 자식의 layout 효과가 부모의
   콜백을 불러도 새 값을 읽는다(useLayoutEffect 로 맞추면 자식이 먼저 돌아 옛 값을 읽는다). */

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/* ref 는 같은 컴포넌트에서 늘 같은 객체라, 확정된 렌더에서 한 번 받아 두면 뒤의 렌더가 버려져도 볼 수 있다. */
function Holder({ value, boom, onRef }: { value: string; boom?: boolean; onRef: (ref: RefObject<string>) => void }) {
  const ref = useRef(value);
  useSyncRef(ref, value);
  useLayoutEffect(() => { onRef(ref); });
  if (boom) throw new Error("렌더 실패");
  return null;
}

function Child({ read, log }: { read: () => string; log: string[] }) {
  useLayoutEffect(() => { log.push(read()); });
  return null;
}
function Parent({ value, log }: { value: string; log: string[] }) {
  const ref = useRef(value);
  useSyncRef(ref, value);
  return <Child read={() => ref.current} log={log} />;
}

describe("useSyncRef", () => {
  it("확정된 렌더의 값을 담는다", () => {
    let seen: RefObject<string> | null = null;
    const onRef = (ref: RefObject<string>) => { seen = ref; };
    const { rerender } = render(<Holder value="a" onRef={onRef} />);
    expect(seen!.current).toBe("a");
    rerender(<Holder value="b" onRef={onRef} />);
    expect(seen!.current).toBe("b");
  });

  it("버려진 렌더의 값은 ref 에 남지 않는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let seen: RefObject<string> | null = null;
    const onRef = (ref: RefObject<string>) => { seen = ref; };
    const { rerender } = render(<Boundary><Holder value="a" onRef={onRef} /></Boundary>);
    rerender(<Boundary><Holder value="b" boom onRef={onRef} /></Boundary>);
    expect(seen!.current).toBe("a");
    vi.restoreAllMocks();
  });

  it("자식의 layout 효과가 부모 콜백을 불러도 새 값을 읽는다", () => {
    const log: string[] = [];
    const { rerender } = render(<Parent value="a" log={log} />);
    rerender(<Parent value="b" log={log} />);
    expect(log).toEqual(["a", "b"]);
  });
});
