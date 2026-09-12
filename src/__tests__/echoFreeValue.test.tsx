import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEchoFreeValue } from "@/components/posts/plate/useEchoFreeValue";

/* 본문 편집기 값 넘기기(#877). 부모가 편집기가 올린 값을 돌려주면 안쪽에 넘기지 않고,
   밖에서 바꾼 값(되돌리기·리비전 복원·번역 적용)은 같은 문자열이어도 판을 올려 넘긴다. */

function setup(initial: string) {
  const r = renderHook(({ value }) => useEchoFreeValue(value), { initialProps: { value: initial } });
  const type = (html: string) => { act(() => r.result.current.markEmitted(html)); r.rerender({ value: html }); };
  return { r, type, set: (value: string) => r.rerender({ value }) };
}

describe("useEchoFreeValue", () => {
  it("편집기가 올린 값을 부모가 돌려주면 안쪽 값은 그대로다", () => {
    const { r, type } = setup("<p>a</p>");
    type("<p>ab</p>");
    type("<p>abc</p>");
    expect(r.result.current.external).toEqual({ html: "<p>a</p>", version: 0 });
  });

  it("밖에서 바꾼 값은 넘긴다", () => {
    const { r, type, set } = setup("<p>a</p>");
    type("<p>ab</p>");
    set("<p>restored</p>");
    expect(r.result.current.external).toEqual({ html: "<p>restored</p>", version: 1 });
  });

  it("처음 값으로 되돌리면 문자열이 같아도 판을 올려 넘긴다", () => {
    const { r, type, set } = setup("<p>a</p>");
    type("<p>ab</p>");
    set("<p>a</p>");
    expect(r.result.current.external).toEqual({ html: "<p>a</p>", version: 1 });
  });

  it("밖의 값을 넘긴 뒤에는 예전에 올린 값으로 돌아오는 것도 밖의 변경이다", () => {
    const { r, type, set } = setup("<p>a</p>");
    type("<p>ab</p>");
    set("<p>x</p>");
    set("<p>ab</p>");
    expect(r.result.current.external).toEqual({ html: "<p>ab</p>", version: 2 });
  });

  it("같은 값으로 다시 그려도 바뀌지 않는다", () => {
    const { r, set } = setup("<p>a</p>");
    set("<p>a</p>");
    set("<p>a</p>");
    expect(r.result.current.external).toEqual({ html: "<p>a</p>", version: 0 });
  });
});
