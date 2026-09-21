import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import HomeWorksEditor from "@/app/admin/(dashboard)/settings/_components/HomeWorksEditor";
import { coverFitStyle } from "@/data/works";

/* 홈 Selected Works 설정(#1047) — 원 그리드를 무엇으로 채울지만 고른다.
   저장소 연결은 여기서 걷어냈다. GitHub 은 작업물 목록의 "GitHub 불러오기" 가 작업물로 들여온다. */

afterEach(() => cleanup());

describe("HomeWorksEditor", () => {
  it("고를 수 있는 것은 자동·작업물·게시물 셋이다 — GitHub 은 없다", () => {
    const { queryAllByText } = render(<HomeWorksEditor source="auto" onSourceChange={() => {}} />);
    expect(queryAllByText("작업물").length).toBeGreaterThan(0);
    expect(queryAllByText("게시물").length).toBeGreaterThan(0);
    expect(queryAllByText("GitHub 저장소")).toHaveLength(0);
  });

});

describe("coverFitStyle", () => {
  it("꽉 채운 상태에서는 잘릴 자리를 고르고, 줄이면 빈자리 안에서 그림을 옮긴다", () => {
    // 1 이상 — object-position 으로 보일 자리를 고른다
    expect(coverFitStyle({ x: 20, y: 80, zoom: 1 })).toEqual({ objectPosition: "20% 80%", transform: undefined });
    expect(coverFitStyle({ x: 50, y: 50, zoom: 1.5 })).toEqual({ objectPosition: "50% 50%", transform: "scale(1.5)" });

    /* 1 아래 — 잘릴 것이 없으니 그림째로 움직인다. 0.5 배면 빈자리가 절반이라
       끝까지 밀었을 때 원의 한쪽 끝에 붙는다(요소 크기의 25%) */
    expect(coverFitStyle({ x: 100, y: 0, zoom: 0.5 })).toEqual({
      objectPosition: "50% 50%",
      transform: "translate(25%, -25%) scale(0.5)",
    });
  });
});
