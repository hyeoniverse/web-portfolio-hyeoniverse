import { describe, it, expect } from "vitest";
import { useLayoutEffect, useState } from "react";
import { render, act } from "@testing-library/react";
import { useStateFromProp } from "@/hooks/useStateFromProp";
import { useDepsChanged } from "@/hooks/useDepsChanged";

/* 두 훅은 "원본이 바뀌면 상태를 맞춘다" 를 효과 없이 한다. 효과로 하던 때와 같은 결과여야 하고,
   원본이 바뀐 렌더에서 낡은 값이 화면에 한 번 나가던 것은 없어져야 한다.
   화면에 나간 값은 useLayoutEffect 로 적는다 — 렌더 도중 버려진 결과는 여기에 안 잡힌다. */

function Draft({ page, committed, onSet }: { page: number; committed: string[]; onSet?: (set: (v: string) => void) => void }) {
  const [draft, setDraft] = useStateFromProp(page, String);
  onSet?.(setDraft);
  useLayoutEffect(() => { committed.push(draft); });
  return <span>{draft}</span>;
}

describe("useStateFromProp", () => {
  it("처음에는 원본에서 만든 값이다", () => {
    const committed: string[] = [];
    const { container } = render(<Draft page={3} committed={committed} />);
    expect(container.textContent).toBe("3");
    expect(committed).toEqual(["3"]);
  });

  it("원본이 바뀌면 그 렌더에 바로 맞춘다 — 낡은 값이 화면에 나가지 않는다", () => {
    const committed: string[] = [];
    const { rerender } = render(<Draft page={3} committed={committed} />);
    rerender(<Draft page={4} committed={committed} />);
    expect(committed).toEqual(["3", "4"]);
  });

  it("원본이 그대로면 사용자가 고친 값을 지킨다", () => {
    const committed: string[] = [];
    let set!: (v: string) => void;
    const { container, rerender } = render(<Draft page={3} committed={committed} onSet={(s) => { set = s; }} />);
    act(() => set("12"));
    rerender(<Draft page={3} committed={committed} />);
    expect(container.textContent).toBe("12");
    rerender(<Draft page={5} committed={committed} />);
    expect(container.textContent).toBe("5");
  });
});

function Counter({ a, b }: { a: number; b: string }) {
  const changed = useDepsChanged([a, b]);
  const [count, setCount] = useState(0);
  if (changed) setCount((c) => c + 1);
  return <span>{count}</span>;
}

describe("useDepsChanged", () => {
  it("마운트 때는 바뀐 것으로 치지 않는다", () => {
    const { container } = render(<Counter a={1} b="x" />);
    expect(container.textContent).toBe("0");
  });

  it("값 하나라도 바뀐 렌더마다 한 번씩만 참이다", () => {
    const { container, rerender } = render(<Counter a={1} b="x" />);
    rerender(<Counter a={1} b="x" />);
    expect(container.textContent).toBe("0");
    rerender(<Counter a={2} b="x" />);
    expect(container.textContent).toBe("1");
    rerender(<Counter a={2} b="y" />);
    expect(container.textContent).toBe("2");
    rerender(<Counter a={2} b="y" />);
    expect(container.textContent).toBe("2");
  });
});
