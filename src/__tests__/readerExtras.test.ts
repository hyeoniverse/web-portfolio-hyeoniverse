import { describe, it, expect, vi, beforeEach } from "vitest";

const toasts: string[] = [];
vi.mock("@/stores/toastStore", () => ({ showToast: (m: string) => { toasts.push(m); return "id"; } }));

import { enhanceReaderExtras } from "@/components/posts/enhanceReaderExtras";

/* enhanceReaderExtras 는 에디터가 남긴 마커를 리더에서 실제 렌더로 바꾼다.
   기능별 파일로 나눈 뒤 각 마커가 그대로 처리되는지 확인한다.
   React island(mermaid · 플레이그라운드 · 캘린더)는 무거운 동적 import 라 여기서 다루지 않는다. */

function mount(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "ko";
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })));
});

describe("enhanceReaderExtras", () => {
  it("TOC: heading 에 id 를 붙이고 마커 자리에 앵커 목록을 만든다", () => {
    const el = mount(`
      <div data-toc></div>
      <h2>첫 번째 장</h2>
      <h3>Nested Section</h3>
      <h2 id="keep-me">이미 id 있음</h2>
    `);
    const cleanup = enhanceReaderExtras(el);

    const nav = el.querySelector("nav.reader-toc");
    expect(nav).not.toBeNull();
    const links = Array.from(nav!.querySelectorAll("a"));
    expect(links.map((a) => a.textContent)).toEqual(["첫 번째 장", "Nested Section", "이미 id 있음"]);
    expect(links.map((a) => a.dataset.depth)).toEqual(["2", "3", "2"]);
    // 이미 있던 id 는 건드리지 않는다
    expect(links[2].getAttribute("href")).toBe("#keep-me");
    // 없던 id 는 slug 로 채운다
    expect(links[1].getAttribute("href")).toBe("#nested-section");
    cleanup();
  });

  it("TOC: 두 번 돌려도 중복 렌더하지 않는다", () => {
    const el = mount(`<div data-toc></div><h2>제목</h2>`);
    enhanceReaderExtras(el)();
    enhanceReaderExtras(el)();
    expect(el.querySelectorAll("nav.reader-toc").length).toBe(1);
  });

  it("날짜 멘션: 저장값은 두고 표시 텍스트만 다시 만든다", () => {
    const el = mount(`<span data-date-mention="2026-03-14">원본 텍스트</span>`);
    const cleanup = enhanceReaderExtras(el);

    const span = el.querySelector<HTMLElement>("[data-date-mention]")!;
    expect(span.getAttribute("data-date-mention")).toBe("2026-03-14");
    expect(span.querySelector("svg")).not.toBeNull();
    expect(span.textContent).not.toBe("원본 텍스트");
    expect(span.textContent).toContain("2026");
    expect(span.dataset.dmDone).toBe("1");
    cleanup();
  });

  it("문서 멘션: 저장된 아이콘이 있으면 fetch 없이 앞에 붙인다", () => {
    const el = mount(`<a data-post-link="some-slug" data-post-icon="📌" href="/posts/some-slug">글</a>`);
    const cleanup = enhanceReaderExtras(el);

    const icon = el.querySelector(".post-link-icon");
    expect(icon?.textContent).toBe("📌");
    expect(fetch).not.toHaveBeenCalled();
    cleanup();
  });

  it("탭: 라벨 버튼 헤더를 만들고 active 패널만 보여준다", () => {
    const el = mount(`
      <div data-tabs data-active="1">
        <div data-tab-panel data-label="첫째">A</div>
        <div data-tab-panel data-label="둘째">B</div>
      </div>
    `);
    const cleanup = enhanceReaderExtras(el);

    const tabs = el.querySelector<HTMLElement>("[data-tabs]")!;
    const buttons = Array.from(tabs.querySelectorAll<HTMLButtonElement>(".tabs-tab"));
    expect(buttons.map((b) => b.textContent)).toEqual(["첫째", "둘째"]);
    expect(buttons[1].className).toContain("tabs-tab-active");

    const panels = Array.from(tabs.querySelectorAll<HTMLElement>("[data-tab-panel]"));
    expect(panels[0].style.display).toBe("none");
    expect(panels[1].style.display).toBe("");

    buttons[0].click();
    expect(panels[0].style.display).toBe("");
    expect(panels[1].style.display).toBe("none");
    expect(buttons[0].className).toContain("tabs-tab-active");
    cleanup();
  });

  it("투표: poll-id 와 option-id 가 있어야 렌더한다", () => {
    const el = mount(`
      <div data-poll data-poll-id="poll-1" data-poll-title="점심">
        <div data-poll-option data-option-id="a">사과</div>
        <div data-poll-option data-option-id="b">바나나</div>
      </div>
    `);
    const cleanup = enhanceReaderExtras(el);

    const poll = el.querySelector<HTMLElement>("[data-poll]")!;
    expect(poll.dataset.pollRendered).toBe("1");
    expect(poll.textContent).toContain("사과");
    expect(poll.textContent).toContain("바나나");
    // 집계는 서버에서 가져온다
    expect(fetch).toHaveBeenCalled();
    cleanup();
  });

  it("투표: 보내지 못하면 선택을 그대로 두고 알린다(#868)", async () => {
    toasts.length = 0;
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(init?.method === "POST"
        ? { ok: false, status: 500, json: () => Promise.resolve({ error: "Failed to vote" }) }
        : { ok: true, json: () => Promise.resolve({ counts: {}, total: 0, mine: [] }) })));
    const el = mount(`
      <div data-poll data-poll-id="poll-3">
        <div data-poll-option data-option-id="a">사과</div>
        <div data-poll-option data-option-id="b">바나나</div>
      </div>
    `);
    const cleanup = enhanceReaderExtras(el);
    const poll = el.querySelector<HTMLElement>("[data-poll]")!;
    await vi.waitFor(() => expect(poll.querySelector<HTMLButtonElement>(".poll-option-btn")!.disabled).toBe(false));
    poll.querySelector<HTMLButtonElement>(".poll-option-btn")!.click();
    poll.querySelector<HTMLButtonElement>(".poll-submit")!.click();
    await vi.waitFor(() => expect(toasts).toEqual(["투표를 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요."]));
    // 결과 화면으로 넘어가지 않고 고른 항목과 완료 단추가 남는다
    await vi.waitFor(() => expect(poll.querySelector<HTMLButtonElement>(".poll-submit")!.disabled).toBe(false));
    expect(poll.querySelector(".poll-option-btn.poll-voted")?.textContent).toBe("사과");
    cleanup();
  });

  it("투표: option-id 가 없으면 마커를 건드리지 않는다", () => {
    const el = mount(`
      <div data-poll data-poll-id="poll-2">
        <div data-poll-option>아이디 없음</div>
      </div>
    `);
    const cleanup = enhanceReaderExtras(el);

    const poll = el.querySelector<HTMLElement>("[data-poll]")!;
    expect(poll.dataset.pollRendered).toBeUndefined();
    cleanup();
  });

  it("cleanup 은 붙여둔 리스너와 옵저버를 정리한다", () => {
    const el = mount(`
      <div data-toc></div>
      <h2>제목</h2>
      <table data-freeze-rows="1"><tbody><tr><th>머리</th></tr><tr><td>값</td></tr></tbody></table>
    `);
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const cleanup = enhanceReaderExtras(el);
    cleanup();
    // 표 고정이 window scroll/resize 를 걸었다면 반드시 떼야 한다
    expect(() => cleanup()).not.toThrow();
    removeSpy.mockRestore();
  });
});
