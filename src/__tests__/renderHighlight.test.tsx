import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderHighlight } from "@/app/about/_components/renderHighlight";

describe("renderHighlight", () => {
  /* renderHighlight 는 용어 툴팁이 붙으면서 문자열이 아니라 React.ReactNode 를 돌려준다.
     반환값 자체를 비교하면 Fragment 와 문자열을 비교하게 되므로, 렌더 결과로 확인한다. */
  it("마크업이 없는 텍스트는 하이라이트 없이 그대로 렌더된다", () => {
    const { container } = render(<>{renderHighlight("일반 텍스트")}</>);
    expect(container.textContent).toBe("일반 텍스트");
    expect(container.querySelector(".highlighted-text")).toBeNull();
  });

  it("**볼드** 마크업을 highlighted-text span으로 변환한다", () => {
    const { container } = render(
      <>{renderHighlight("이것은 **강조** 텍스트입니다")}</>
    );
    const span = container.querySelector(".highlighted-text");
    expect(span).toBeTruthy();
    expect(span?.textContent).toBe("강조");
  });

  it("여러 **볼드** 마크업을 모두 변환한다", () => {
    const { container } = render(
      <>{renderHighlight("**첫 번째**와 **두 번째** 강조")}</>
    );
    const spans = container.querySelectorAll(".highlighted-text");
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toBe("첫 번째");
    expect(spans[1].textContent).toBe("두 번째");
  });

  it("빈 **** 마크업은 하이라이트 없이 원본 텍스트로 렌더된다", () => {
    const { container } = render(<>{renderHighlight("텍스트 **** 여기")}</>);
    expect(container.textContent).toBe("텍스트 **** 여기");
    expect(container.querySelector(".highlighted-text")).toBeNull();
  });
});
