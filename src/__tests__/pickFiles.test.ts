// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { pickFiles } from "@/lib/pickFiles";

/* 사파리에서 고른 파일이 오지 않던 문제 — 문서에 붙이지 않은 input 은 창이 떠 있는 동안 정리되어 change 가 오지 않았다.
   고르기 창이 떠 있는 동안 input 이 body 에 붙어 있고, 고르거나 취소하면 떨어지는지 본다. */

const fileInputs = () => document.querySelectorAll<HTMLInputElement>('input[type="file"]');

function choose(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change"));
}

afterEach(() => {
  fileInputs().forEach((el) => el.remove());
  vi.restoreAllMocks();
});

describe("pickFiles", () => {
  it("고르기 창이 떠 있는 동안 input 을 body 에 붙여 두고 click 한다", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    pickFiles({ accept: "image/*" }, vi.fn());
    const [input] = fileInputs();
    expect(input).toBeDefined();
    expect(input.isConnected).toBe(true);
    expect(input.hidden).toBe(true);
    expect(input.accept).toBe("image/*");
    expect(input.multiple).toBe(false);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("고르면 파일을 넘기고 input 을 뗀다", () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const onPick = vi.fn();
    pickFiles({ accept: "image/*", multiple: true }, onPick);
    const [input] = fileInputs();
    const files = [new File(["a"], "a.jpg", { type: "image/jpeg" }), new File(["b"], "b.jpg", { type: "image/jpeg" })];
    choose(input, files);
    expect(onPick).toHaveBeenCalledWith(files);
    expect(input.isConnected).toBe(false);
  });

  it("취소하면 아무것도 넘기지 않고 input 을 뗀다", () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const onPick = vi.fn();
    pickFiles({ accept: "image/*" }, onPick);
    const [input] = fileInputs();
    input.dispatchEvent(new Event("cancel"));
    expect(onPick).not.toHaveBeenCalled();
    expect(input.isConnected).toBe(false);
  });

  it("고른 파일이 없으면 넘기지 않는다", () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const onPick = vi.fn();
    pickFiles({ accept: "image/*" }, onPick);
    const [input] = fileInputs();
    choose(input, []);
    expect(onPick).not.toHaveBeenCalled();
    expect(input.isConnected).toBe(false);
  });
});
