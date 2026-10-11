import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACCESS_OVERRIDES, buildApiMap, groupKeyOf, renderApiMap, routePathOf } from "@/lib/about/apiMap";

/* About API 지도는 route.ts 에서 굽는다(scripts/gen-api-map.ts). 굽지 않은 채 라우트만 바뀌면 여기서 알린다 */

const root = process.cwd();
const routeFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? routeFiles(p) : /^route\.tsx?$/.test(e.name) ? [p] : [];
  });
const readReal = (p: string) => {
  try {
    return statSync(p).isFile() ? readFileSync(p, "utf8") : null;
  } catch {
    return null;
  }
};

/** 가짜 저장소 — 경로 → 소스 */
const fake = (files: Record<string, string>) => {
  const R = "/repo";
  const abs = Object.fromEntries(Object.entries(files).map(([k, v]) => [`${R}/${k}`, v]));
  const routes = Object.keys(abs).filter((k) => /\/route\.ts$/.test(k));
  return buildApiMap(R, routes, (p) => abs[p] ?? null);
};
const endpoint = (m: ReturnType<typeof fake>, method: string, p: string) =>
  m.groups.flatMap((g) => g.endpoints).find((e) => e.method === method && e.path === p);

describe("API 지도 — 경로 · 묶음", () => {
  it("라우트 그룹 (x) 는 빼고 [param] 은 둔다", () => {
    expect(routePathOf("/r/src/app/api/(public)/posts/[id]/route.ts")).toBe("/api/posts/[id]");
    expect(routePathOf("/r/src/app/auth/callback/route.ts")).toBe("/auth/callback");
  });

  it("첫 조각으로 묶고 admin 만 둘째 조각까지", () => {
    expect(groupKeyOf("/api/posts/[id]/like")).toBe("posts");
    expect(groupKeyOf("/api/admin/auth/devices")).toBe("admin/auth");
    expect(groupKeyOf("/auth/callback")).toBe("auth");
  });
});

describe("API 지도 — 핸들러 읽기", () => {
  it("가드 호출로 등급을 정한다", () => {
    const m = fake({
      "src/app/api/a/route.ts": `
        import { requireOwner, requireRole } from "@/lib/api/requireRole";
        import { requireAuth } from "@/lib/api/requireAuth";
        import { requirePostAccess } from "@/lib/api/requirePostAccess";
        import { PERM } from "@/lib/api/roles";
        export async function GET() { return Response.json(1); }
        export async function POST() { await requireAuth(); }
        export async function PUT() { await requirePostAccess("posts", "x"); }
        export async function PATCH() { await requireRole(PERM.ADMIN); }
        export async function DELETE() { await requireOwner(); }`,
      "src/app/api/cron/x/route.ts": `export async function GET(r) { if (r.headers.get("a") !== process.env.CRON_SECRET) return 1; }`,
    });
    expect(endpoint(m, "GET", "/api/a")?.access).toBe("public");
    expect(endpoint(m, "POST", "/api/a")?.access).toBe("signed-in");
    expect(endpoint(m, "PUT", "/api/a")?.access).toBe("author");
    expect(endpoint(m, "PATCH", "/api/a")?.access).toBe("admin");
    expect(endpoint(m, "DELETE", "/api/a")?.access).toBe("owner");
    expect(endpoint(m, "GET", "/api/cron/x")?.access).toBe("cron");
  });

  it("조건 안의 가드는 세지 않는다(?trash 일 때만 로그인 → 공개)", () => {
    const m = fake({
      "src/app/api/p/route.ts": `
        import { requireAuth } from "@/lib/api/requireAuth";
        export async function GET(r) { if (r.trash) { await requireAuth(); } return 1; }`,
    });
    expect(endpoint(m, "GET", "/api/p")?.access).toBe("public");
  });

  it("공장에서 나온 핸들러는 공장 안의 같은 이름 함수를 읽고, 옵션의 table 을 센다", () => {
    const m = fake({
      "src/app/api/c/route.ts": `
        import { createHandlers } from "@/lib/api/h";
        export const { GET, POST } = createHandlers({ table: "comments" });`,
      "src/lib/api/h.ts": `
        import { requireAuth } from "./requireAuth";
        export function createHandlers(o) {
          async function GET() { return admin.from("likes").select(); }
          async function POST() { await requireAuth(); await admin.rpc("bump"); }
          return { GET, POST };
        }`,
    });
    expect(endpoint(m, "GET", "/api/c")?.access).toBe("public");
    expect(endpoint(m, "POST", "/api/c")?.access).toBe("signed-in");
    expect(m.tables).toEqual(["comments", "likes"]);
    expect(m.rpcs).toEqual(["bump"]);
  });

  it("가져온 함수 · 같은 파일 함수를 따라가고, storage.from 은 테이블이 아니다", () => {
    const m = fake({
      "src/app/api/u/route.ts": `
        import { purge } from "@/lib/api/trash";
        async function save() { await sb.storage.from("bucket").upload(); await fetch("https://api.resend.com/emails"); }
        export async function POST() { await save(); return purge(); }`,
      "src/lib/api/trash.ts": `
        import { requireOwner } from "./requireRole";
        export async function purge() { await requireOwner(); return sb.from("posts").delete(); }`,
    });
    expect(endpoint(m, "POST", "/api/u")?.access).toBe("owner");
    expect(m.tables).toEqual(["posts"]);
    expect(m.services).toEqual(["storage", "mail"]);
  });

  it("작은 묶음은 접는다 — admin/x 는 admin 으로, 나머지는 etc 로", () => {
    const m = fake({
      "src/app/api/one/route.ts": "export function GET() {}",
      "src/app/api/admin/tiny/route.ts": "export function GET() {}",
      "src/app/api/big/route.ts": "export function GET() {}\nexport function POST() {}\nexport function PUT() {}\nexport function DELETE() {}",
    });
    expect(m.groups.map((g) => g.key)).toEqual(["big", "admin", "etc"]);
    expect(m.groups.find((g) => g.key === "etc")?.folded).toEqual(["one"]);
    expect(m.total).toBe(6);
  });
});

describe("API 지도 — 실제 라우트", () => {
  const files = ["src/app/api", "src/app/auth"].flatMap((d) => routeFiles(path.join(root, d)));
  const map = buildApiMap(root, files, readReal);

  it("생성 파일이 라우트와 같다 (다르면 npm run gen-api-map)", () => {
    expect(readFileSync(path.join(root, "src/data/generated/apiMap.ts"), "utf8")).toBe(renderApiMap(map));
  });

  it("모든 route.ts 에서 메서드를 찾았고, 등급 합이 전체와 같다", () => {
    expect(map.routeFiles).toBe(files.length);
    expect(Object.values(map.access).reduce((a, b) => a + b, 0)).toBe(map.total);
  });

  it("손으로 바로잡은 등급이 아직 있는 엔드포인트를 가리킨다", () => {
    const all = new Set(map.groups.flatMap((g) => g.endpoints.map((e) => `${e.method} ${e.path}`)));
    for (const k of Object.keys(ACCESS_OVERRIDES)) expect(all.has(k), k).toBe(true);
  });
});
