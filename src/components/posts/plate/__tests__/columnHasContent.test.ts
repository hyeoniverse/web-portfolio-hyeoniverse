import { describe, it, expect } from "vitest";
import { columnHasContent } from "../columnOps";

const p = (text = "") => ({ type: "p", children: [{ text }] });
const col = (...children: unknown[]) => ({ type: "column", children: children as never[] });

describe("columnHasContent — 오판하면 내용이 날아간다", () => {
  it("빈 문단 하나 = 비어있음 (모달 없이 바로 삭제되는 케이스)", () => {
    expect(columnHasContent(col(p()))).toBe(false);
  });

  it("공백만 있는 문단도 비어있음", () => {
    expect(columnHasContent(col(p("   \n  ")))).toBe(false);
  });

  it("빈 문단 여러 개도 비어있음", () => {
    expect(columnHasContent(col(p(), p(), p()))).toBe(false);
  });

  it("텍스트가 있으면 내용 있음", () => {
    expect(columnHasContent(col(p("안녕")))).toBe(true);
  });

  it("중첩된 곳의 텍스트도 잡는다", () => {
    expect(columnHasContent(col({ type: "blockquote", children: [p("깊은 곳")] }))).toBe(true);
  });

  it("이미지만 있으면 — 텍스트는 없어도 내용 있음 (핵심)", () => {
    expect(columnHasContent(col({ type: "img", url: "x.png", children: [{ text: "" }] }))).toBe(true);
  });

  it("구분선만 있어도 내용 있음", () => {
    expect(columnHasContent(col({ type: "hr", children: [{ text: "" }] }))).toBe(true);
  });

  it("빈 코드블록도 내용 있음 (애매하면 물어보는 쪽)", () => {
    expect(columnHasContent(col({ type: "code_block", children: [{ text: "" }] }))).toBe(true);
  });

  it("children 없음 / undefined 에도 안 터진다", () => {
    expect(columnHasContent(col())).toBe(false);
    expect(columnHasContent(undefined)).toBe(false);
  });
});
