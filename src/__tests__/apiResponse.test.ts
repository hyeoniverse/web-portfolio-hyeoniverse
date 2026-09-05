import { describe, it, expect, vi, afterEach } from "vitest";
import { jsonOk, jsonError, jsonServerError } from "@/lib/api/response";

/* 응답 헬퍼는 API 라우트 104개가 공유한다(#696). 특히 jsonServerError 는 예전에 받은 오류의
   message 를 그대로 응답에 실었는데, 그 자리에 오는 것은 대부분 Supabase 가 돌려준 Postgres
   오류라 제약 조건·컬럼 이름이 섞여 나온다. 지금은 로그에만 남기고 응답에는 고정 문구를 준다.
   이 규칙이 유지되는지 여기서 본다. */

/* console.error 는 (...data: any[]) 라 vi.spyOn 의 mock.calls 를 그대로 읽으면 any 가 된다.
   찍힌 내용을 문자열로 모아 두고 그걸 본다. */
function captureErrorLogs(): string[] {
  const logs: string[] = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logs.push(args.map((a) => String(a)).join(" "));
  });
  return logs;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("jsonOk", () => {
  it("데이터를 그대로 싣고 기본 200", async () => {
    const res = jsonOk({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("상태 코드를 지정할 수 있다", () => {
    expect(jsonOk({ a: 1 }, 201).status).toBe(201);
  });
});

describe("jsonError", () => {
  it("우리가 쓴 문장을 그대로 전달한다 — 클라이언트가 화면에 띄우거나 코드처럼 비교한다", async () => {
    const res = jsonError("version_conflict", 409);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "version_conflict" });
  });

  it("상태를 안 주면 400", () => {
    expect(jsonError("bad").status).toBe(400);
  });
});

describe("jsonServerError", () => {
  const dbError = new Error(
    'duplicate key value violates unique constraint "posts_slug_key"',
  );

  it("프로덕션에서는 원문을 숨기고 고정 문구를 준다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = jsonServerError(dbError, "POST /api/posts");
    expect(res.status).toBe(500);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("posts_slug_key");
  });

  it("프로덕션에서도 원인은 서버 로그에 남는다", () => {
    vi.stubEnv("NODE_ENV", "production");
    const logs = captureErrorLogs();

    jsonServerError(dbError, "POST /api/posts");

    expect(logs).toHaveLength(1);
    expect(logs[0], "어느 라우트에서 났는지 알 수 있어야 한다").toContain("POST /api/posts");
    expect(logs[0], "원문이 로그에는 남아야 한다").toContain("posts_slug_key");
  });

  it("개발 중에는 원문을 그대로 돌려준다 — 네트워크 탭에서 바로 보는 편이 빠르다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const body = (await jsonServerError(dbError, "POST /api/posts").json()) as { error: string };
    expect(body.error).toContain("posts_slug_key");
  });

  it("Error 가 아닌 값도 다룬다", () => {
    vi.stubEnv("NODE_ENV", "production");
    const logs = captureErrorLogs();

    expect(jsonServerError({ message: "supabase 객체 오류" }).status).toBe(500);
    expect(jsonServerError("문자열 오류").status).toBe(500);
    expect(logs[0]).toContain("supabase 객체 오류");
    expect(logs[1], "context 를 안 주면 unhandled 로 남는다").toContain("unhandled");
  });
});
