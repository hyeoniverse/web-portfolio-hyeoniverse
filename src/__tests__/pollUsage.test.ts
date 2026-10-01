// @vitest-environment node
import { describe, it, expect } from "vitest";
import { collectPolls, extractPolls } from "@/lib/pollUsage";

/* 라이브러리 › 투표 — 저장된 본문 HTML 에서 투표 블록을 다시 읽는다 */

const poll = (id: string, title = "", opts: [string, string][] = [["o1", "예"], ["o2", "아니오"]]) =>
  `<div data-poll data-poll-id="${id}" data-multiple="false"${title ? ` data-poll-title="${title}"` : ""}>${opts.map(([i, l]) => `<div data-poll-option data-option-id="${i}">${l}</div>`).join("")}</div>`;

describe("extractPolls", () => {
  it("제목·옵션·이스케이프를 되돌려 읽는다", () => {
    const html = `<p>앞</p>${poll("p1", "점심 &quot;뭐&quot; 먹지?", [["a", "김밥 &amp; 라면"], ["b", "&lt;비빔밥&gt;"]])}<p>뒤</p>`;
    expect(extractPolls(html)).toEqual([{
      pollId: "p1", title: "점심 \"뭐\" 먹지?", multiple: false, startAt: null, endAt: null,
      options: [{ id: "a", label: "김밥 & 라면" }, { id: "b", label: "<비빔밥>" }],
    }]);
  });

  it("복수 선택·기간, 여러 블록", () => {
    const html = `<div data-poll data-poll-id="p2" data-multiple="true" data-start="2026-10-01" data-end="2026-10-07"><div data-poll-option data-option-id="x">X</div></div>${poll("p3")}`;
    const ps = extractPolls(html);
    expect(ps.map((p) => p.pollId)).toEqual(["p2", "p3"]);
    expect(ps[0]).toMatchObject({ multiple: true, startAt: "2026-10-01", endAt: "2026-10-07" });
  });

  it("id 가 빈 블록·빈 본문은 없음", () => {
    expect(extractPolls(poll(""))).toEqual([]);
    expect(extractPolls(null)).toEqual([]);
  });
});

describe("collectPolls", () => {
  it("한·영 본문에 같은 투표가 있어도 쓰는 곳은 한 번", () => {
    const m = collectPolls(
      [{ id: "post1", title: "글", slug: "g", html: [poll("p1", "질문"), poll("p1", "Question")] }],
      [{ id: "w1", title: "프로젝트", slug: "w", html: [poll("p1"), poll("p2")] }],
    );
    expect(m.get("p1")?.poll.title).toBe("질문");
    expect(m.get("p1")?.where).toEqual([{ kind: "post", id: "post1", title: "글", slug: "g" }, { kind: "work", id: "w1", title: "프로젝트", slug: "w" }]);
    expect(m.get("p2")?.where.map((w) => w.id)).toEqual(["w1"]);
  });
});
