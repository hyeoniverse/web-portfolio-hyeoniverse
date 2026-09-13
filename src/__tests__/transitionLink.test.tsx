import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import CardsBanner from "@/app/posts/_components/PostsBanner/CardsBanner";
import TickerBanner from "@/app/posts/_components/PostsBanner/TickerBanner";
import SplitBanner from "@/app/posts/_components/PostsBanner/SplitBanner";
import type { Post } from "@/types/post";

/* 연출로 넘어가는 링크(#933). 그냥 누르면 기본 동작을 막고 연출로 넘어가며, 가운데 버튼·보조 키 클릭은 브라우저에 맡긴다.
   배너 세 종류(티커·카드·분할)는 지금 사이트 설정이 쓰지 않아 브라우저에서 볼 수 없어 여기서 링크 구조와 누름을 본다. */

const navigate = vi.fn();
vi.mock("@/providers/PageTransitionProvider", () => ({ usePageTransition: () => ({ navigateWithTransition: navigate }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ prefetch: () => {}, push: () => {} }) }));
vi.mock("next/image", () => ({
  // 이미지 최적화는 테스트 대상이 아니라 그냥 img 로 그린다
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => <img src={typeof src === "string" ? src : ""} alt={alt} />,
}));

afterEach(() => { cleanup(); navigate.mockReset(); });

/** 기본 동작을 막았는지 돌려주는 클릭 */
const click = (el: Element, init: MouseEventInit = {}) => !fireEvent.click(el, { button: 0, ...init });

describe("TransitionLink", () => {
  it("그냥 누르면 기본 동작을 막고 연출로 넘어간다", () => {
    const { getByRole } = render(<TransitionLink href="/posts/a" image="/cover.jpg" color="#000">글</TransitionLink>);
    expect(click(getByRole("link")), "기본 동작을 막는다").toBe(true);
    expect(navigate).toHaveBeenCalledWith("/posts/a", "/cover.jpg", expect.anything(), "#000");
  });

  it("보조 키·가운데 버튼 클릭은 브라우저에 맡긴다", () => {
    const { getByRole } = render(<TransitionLink href="/posts/a">글</TransitionLink>);
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(click(getByRole("link"), init), JSON.stringify(init)).toBe(false);
    }
    expect(navigate).not.toHaveBeenCalled();
  });

  it("쓰는 쪽이 기본 동작을 막으면 넘어가지 않는다", () => {
    const { getByRole } = render(<TransitionLink href="/posts/a" onClick={(e) => e.preventDefault()}>글</TransitionLink>);
    click(getByRole("link"));
    expect(navigate).not.toHaveBeenCalled();
  });
});

const posts = ["a", "b", "c"].map((slug, i) => ({
  id: `p${i}`, slug, title: `제목 ${slug}`, content: "본문", cover_image: `/${slug}.jpg`, tags: [], category: null,
  created_at: "2026-01-01T00:00:00Z",
})) as unknown as Post[];
const bannerProps = { posts, imgErrors: new Set<string>(), onImgError: () => {} };

describe("배너의 글 링크", () => {
  it("카드 배너: 가운데 카드만 글로 넘어가고, 옆 카드는 누르면 가운데로 온다", () => {
    const { container } = render(<CardsBanner {...bannerProps} />);
    const links = () => Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href^='/posts/']"));
    expect(links().map((a) => a.getAttribute("href"))).toEqual(["/posts/a", "/posts/b", "/posts/c"]);
    click(links()[1]);
    expect(navigate, "옆 카드는 넘어가지 않는다").not.toHaveBeenCalled();
    click(links()[1]);
    expect(navigate, "가운데로 온 뒤에는 넘어간다").toHaveBeenCalledWith("/posts/b", "/b.jpg", expect.anything(), undefined);
  });

  it("티커 배너: 보이는 한 줄만 초점을 받고, 이어 붙인 첫 줄 복제는 늘 뺀다", () => {
    const { container } = render(<TickerBanner {...bannerProps} />);
    const rows = Array.from(container.querySelectorAll("a[href^='/posts/']")).map((a) => (a.parentElement?.hasAttribute("inert") ? "inert" : "shown"));
    expect(rows).toEqual(["shown", "inert", "inert", "inert"]);
  });

  it("분할 배너: 제목 링크가 이름을 갖고, 같은 곳으로 가는 이미지 링크는 초점·보조기기에서 뺀다", () => {
    const { container } = render(<SplitBanner {...bannerProps} />);
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href='/posts/a']"));
    expect(links).toHaveLength(2);
    const [image, title] = links;
    expect(image.getAttribute("tabindex")).toBe("-1");
    expect(image.getAttribute("aria-hidden")).toBe("true");
    expect(title.textContent).toContain("제목 a");
    click(title);
    expect(navigate).toHaveBeenCalledWith("/posts/a", "/a.jpg", expect.anything(), undefined);
  });
});
