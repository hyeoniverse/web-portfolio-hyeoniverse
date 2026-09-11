import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { LanguageProvider } from "@/providers/LanguageProvider";
import Select from "@/components/ui/Select";

/* 닫힌 Select 는 목록을 그리지 않는다. 예전에는 쓰지도 않는 너비를 재려고 목록 전체를 보이지 않게 복제해
   body 에 붙이고, 마운트할 때마다 레이아웃을 강제로 계산했다. 작업물 편집기(Select 12개)를 열 때
   이것만 170 ms 남짓 걸렸다(#838). */

afterEach(cleanup);

describe("Select", () => {
  it("닫혀 있을 때는 트리거 단추 하나만 있고 선택지 단추는 그리지 않는다", () => {
    // 트리거 너비는 모든 선택지 글자를 겹쳐 둔 sizer(글자뿐인 span)가 CSS 로 정한다. 선택지 단추는 열 때만 그린다.
    const options = ["알파", "브라보", "찰리", "델타"].map((label, i) => ({ value: String(i), label }));
    render(<LanguageProvider><Select value="0" options={options} onChange={() => {}} /></LanguageProvider>);
    expect(document.body.querySelectorAll("button")).toHaveLength(1);
  });
});
