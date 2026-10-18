import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import SearchSyntaxHelpContent from "@/components/ui/SearchCapsule/SearchSyntaxHelpContent";

/* 정규식 안내는 한 문장 한 키(common.searchHelp.regexNote)에 코드 칩을 자리표시로 끼운다.
   조각을 이어 붙이던 때는 다른 언어로 기계 번역하면 어순이 깨지고, 번역이 앞뒤 공백을 다듬어 칩과 글이 붙었다. */
describe("검색 도움말 정규식 안내", () => {
  it("한 문장으로 그리고 자리표시 자리에 코드 칩을 넣는다", () => {
    const { container } = render(<SearchSyntaxHelpContent options={{ syntaxMode: "regex" }} update={() => {}} />);
    const note = container.querySelector('p[class*="helpFootnote"]');
    expect(note, "regex 모드에서는 안내가 보인다").toBeTruthy();
    expect(note!.textContent).not.toMatch(/\{\{/);
    expect(note!.textContent).toMatch(/JS regex 표준 그대로 지원 — \. \* \+ \| \^ \$ \\d \\w \\s 등\. 메타문자를 글자로 찾으려면 \\ escape \(예: \\\.\)/);
    expect(note!.querySelectorAll("code").length).toBe(11);
  });
});
