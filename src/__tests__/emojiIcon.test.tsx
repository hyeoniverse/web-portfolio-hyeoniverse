import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";

/* EmojiIcon 은 글·시리즈의 아이콘을 그린다. 값의 형태가 셋이다.
   - 이모지 그대로 ("🚀")
   - 이미지 주소 ("img:https://...")
   - 아이콘 목록의 id ("icon:scan")

   마지막 것만 220여 개 SVG 가 든 목록(101 KiB)이 필요하다. 그것을 필요할 때만 받도록
   바꾸면서, 셋 다 제대로 그려지는지 여기서 고정한다. */

describe("EmojiIcon", () => {
  it("이모지는 글자 그대로 그린다", () => {
    render(<EmojiIcon value="🚀" size={24} />);
    expect(screen.getByText("🚀")).toBeInTheDocument();
  });

  it("이미지 주소는 img 로 그린다", () => {
    const { container } = render(<EmojiIcon value="img:https://example.com/a.png" size={24} />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://example.com/a.png");
  });

  it("아이콘 id 는 목록을 받아 온 뒤 SVG 로 그린다", async () => {
    const { container } = render(<EmojiIcon value="icon:scan" size={24} />);
    const svg = container.querySelector("svg");
    // 자리는 곧바로 잡는다 — 늦게 그려지며 옆 글자가 밀리지 않게
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("24");
    // 목록이 도착하면 안쪽 그림이 채워진다
    await waitFor(() => expect(container.querySelector("svg")?.innerHTML).not.toBe(""));
    expect(container.querySelector("svg")?.innerHTML).toContain("path");
  });

  it("없는 아이콘 id 면 빈 채로 두고 터지지 않는다", async () => {
    const { container } = render(<EmojiIcon value="icon:이런건없다" size={24} />);
    await waitFor(() => expect(container.querySelector("svg")).toBeTruthy());
    expect(container.querySelector("svg")?.innerHTML).toBe("");
  });
});
