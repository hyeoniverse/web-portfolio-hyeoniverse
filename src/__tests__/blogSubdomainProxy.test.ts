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

  it("블로그 주소의 /<글 주소> 는 /posts/<글 주소> 를 그린다", async () => {
    const proxy = await load(false);
    const res = await proxy(req("blog.hyeoniverse.com", "/hello-world"));
    expect(new URL(res.headers.get("x-middleware-rewrite") ?? "").pathname).toBe("/posts/hello-world");
    const til = await proxy(req("blog.hyeoniverse.com", "/til"));
    expect(new URL(til.headers.get("x-middleware-rewrite") ?? "").pathname).toBe("/posts/til");
  });

  it("블로그 주소로 /posts/... 가 오면 짧은 주소로 보낸다", async () => {
    const proxy = await load(false);
    const res = await proxy(req("blog.hyeoniverse.com", "/posts/hello?ref=a"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://blog.hyeoniverse.com/hello?ref=a");
  });

  it("블로그 주소의 API · 관리 화면은 앱 경로 그대로 둔다", async () => {
    const proxy = await load(false);
    const res = await proxy(req("blog.hyeoniverse.com", "/api/posts"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("location")).toBeNull();
  });

  it("블로그 주소로 포트폴리오 화면에 오면 메인 주소로 보낸다", async () => {
    const proxy = await load(false);
    const res = await proxy(req("blog.hyeoniverse.com", "/works?x=1"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://www.hyeoniverse.com/works?x=1");
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
    expect(post.headers.get("location")).toBe("https://blog.hyeoniverse.com/hello?ref=a");
  });

  it("프리뷰 · 로컬 주소는 스위치와 상관없이 그대로 연다", async () => {
    const proxy = await load(true);
    expect(passedThrough(await proxy(req("hyeoniverse-git-x.vercel.app", "/posts")))).toBe(true);
  });
});

describe("proxy — 로그인 쿠키 공유(.hyeoniverse.com)", () => {
  const withCookie = (host: string, path: string, cookie: string) =>
    new NextRequest(`https://${host}${path}`, { headers: { host, cookie } });

  it("예전 주소 전용 로그인 쿠키를 공유 도메인 쿠키로 옮기고 표시를 남긴다", async () => {
    const proxy = await load(false);
    const res = await proxy(withCookie("hyeoniverse.com", "/api/posts", "sb-x-auth-token=abc"));
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith("sb-x-auth-token=abc") && /Domain=\.hyeoniverse\.com/i.test(c))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("sb-x-auth-token=;") && /Max-Age=0/i.test(c) && !/Domain=/i.test(c))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("sb-domain-shared=1") && /Domain=\.hyeoniverse\.com/i.test(c))).toBe(true);
  });

  it("이미 옮겼으면 다시 옮기지 않는다", async () => {
    const proxy = await load(false);
    const res = await proxy(withCookie("hyeoniverse.com", "/api/posts", "sb-x-auth-token=abc; sb-domain-shared=1"));
    expect(res.headers.getSetCookie().some((c) => c.startsWith("sb-x-auth-token="))).toBe(false);
  });

  it("로컬 · 프리뷰 주소에선 옮기지 않는다", async () => {
    const proxy = await load(false);
    const res = await proxy(withCookie("hyeoniverse-git-x.vercel.app", "/api/posts", "sb-x-auth-token=abc"));
    expect(res.headers.getSetCookie().some((c) => c.includes("Domain="))).toBe(false);
  });
});
