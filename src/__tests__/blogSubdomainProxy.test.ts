// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

/* proxy 의 블로그 서브도메인(blog.hyeoniverse.com) 처리 — `/` 는 /posts 를 그리고, 포트폴리오 화면은 메인 주소로 보내며,
   BLOG_SUBDOMAIN_REDIRECT=1 일 때만 메인 주소의 /posts 를 블로그 주소로 보낸다. Supabase 에는 닿지 않는다(쿠키 없음) */

vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";

async function load(redirectFlag: boolean) {
  vi.resetModules();
  process.env.BLOG_SUBDOMAIN_REDIRECT = redirectFlag ? "1" : "";
  return (await import("@/proxy")).proxy;
}
const req = (host: string, path: string) => new NextRequest(`https://${host}${path}`, { headers: { host } });
const passedThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

afterEach(() => { delete process.env.BLOG_SUBDOMAIN_REDIRECT; });

describe("proxy — 블로그 서브도메인", () => {
  it("블로그 주소의 / 는 /posts 를 그린다(주소는 그대로)", async () => {
    const proxy = await load(false);
    const res = await proxy(req("blog.hyeoniverse.com", "/"));
    expect(new URL(res.headers.get("x-middleware-rewrite") ?? "").pathname).toBe("/posts");
  });

  it("블로그 주소의 /posts/* 는 그대로 연다", async () => {
    const proxy = await load(false);
    expect(passedThrough(await proxy(req("blog.hyeoniverse.com", "/posts/til")))).toBe(true);
  });

  it("블로그 주소로 포트폴리오 화면에 오면 메인 주소로 보낸다", async () => {
    const proxy = await load(false);
    const res = await proxy(req("blog.hyeoniverse.com", "/works?x=1"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://hyeoniverse.com/works?x=1");
  });

  it("스위치가 꺼져 있으면 메인 주소의 /posts 는 그대로 연다", async () => {
    const proxy = await load(false);
    expect(passedThrough(await proxy(req("hyeoniverse.com", "/posts")))).toBe(true);
  });

  it("스위치를 켜면 메인 주소의 /posts · /posts/* 를 블로그 주소로 보낸다", async () => {
    const proxy = await load(true);
    const root = await proxy(req("hyeoniverse.com", "/posts"));
    expect(root.status).toBe(308);
    expect(root.headers.get("location")).toBe("https://blog.hyeoniverse.com/");
    const post = await proxy(req("www.hyeoniverse.com", "/posts/hello?ref=a"));
    expect(post.headers.get("location")).toBe("https://blog.hyeoniverse.com/posts/hello?ref=a");
  });

  it("프리뷰 · 로컬 주소는 스위치와 상관없이 그대로 연다", async () => {
    const proxy = await load(true);
    expect(passedThrough(await proxy(req("hyeoniverse-git-x.vercel.app", "/posts")))).toBe(true);
  });
});
