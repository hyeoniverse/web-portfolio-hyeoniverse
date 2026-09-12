import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { LanguageProvider } from "@/providers/LanguageProvider";
import Select from "@/components/ui/Select";

/* 편집 가능한 Select 는 값이 비어 있으면 입력칸으로 시작한다(#895). 예전에는 그 입력칸이 마운트되자마자 포커스를 가져가,
   화면을 열자마자 다른 칸에 치던 글자가 이리로 새고, 포커스가 빠질 때 onChange("") 가 불렸다. 본문 도구 막대의 글자 크기·
   줄 간격 칸이 빈 값으로 마운트되면서 작업물 편집기의 제목 입력을 가로챘다. */

afterEach(cleanup);

const options = ["12", "14", "16"].map((v) => ({ value: v, label: `${v}px` }));
const renderSelect = (value: string, onChange = vi.fn()) =>
  render(<LanguageProvider><Select value={value} options={options} onChange={onChange} editable placeholder="크기" /></LanguageProvider>);

describe("편집 가능한 Select", () => {
  it("빈 값으로 마운트하면 입력칸으로 시작하되 포커스는 가져가지 않는다", () => {
    const outside = document.createElement("input");
    document.body.appendChild(outside);
    outside.focus();
    const onChange = vi.fn();
    renderSelect("", onChange);
    expect(document.body.querySelector("input[type=text]:not(:focus)")).not.toBeNull();
    expect(document.activeElement).toBe(outside);
    expect(onChange).not.toHaveBeenCalled();
    outside.remove();
  });

  it("건드리기 전에 값이 들어오면 단추 모드로 돌아간다", () => {
    const r = renderSelect("");
    r.rerender(<LanguageProvider><Select value="16" options={options} onChange={vi.fn()} editable placeholder="크기" /></LanguageProvider>);
    expect(document.body.querySelector("input[type=text]")).toBeNull();
    expect(document.body.textContent).toContain("16px");
  });

  it("더블클릭으로 편집에 들어가면 입력칸에 포커스를 준다", () => {
    vi.useFakeTimers();
    renderSelect("16");
    const trigger = document.body.querySelector("button") as HTMLButtonElement;
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    act(() => { vi.runAllTimers(); });
    const input = document.body.querySelector("input[type=text]");
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
    vi.useRealTimers();
  });
});
