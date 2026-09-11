import { describe, it, expect } from "vitest";
import { fillTemplate } from "@/utils/format";

/* 번역 문구의 {{이름}} 자리 채우기. 값은 태그 이름처럼 사용자가 적은 글자일 수 있다. */

describe("fillTemplate", () => {
  it("이름마다 값을 채우고, 숫자는 글자로 바꾼다", () => {
    expect(fillTemplate("태그 {{n}}개 삭제됨 (게시물 {{m}}건 업데이트)", { n: 3, m: 12 })).toBe("태그 3개 삭제됨 (게시물 12건 업데이트)");
  });

  it("값에 없는 이름은 그대로 둔다", () => {
    expect(fillTemplate("{{tag}} 삭제 취소 {{other}}", { tag: "react" })).toBe("react 삭제 취소 {{other}}");
  });

  it("값의 $& · $1 같은 표기를 글자 그대로 넣는다", () => {
    // 문자열을 String.replace 에 그대로 넘기면 $& 는 찾은 부분({{tag}})으로 바뀐다
    expect(fillTemplate('Tag "{{tag}}"', { tag: "a$&b$1" })).toBe('Tag "a$&b$1"');
  });
});
