// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";

/* 방문자가 댓글을 고치거나 지울 때의 거절 사유가 코드로 오고, 화면이 그 코드와 입력 검사 코드를
   화면 언어 문구로 바꾸는지(#862). 실제 DB 대신 댓글 조회만 흉내 내고, 지우기·고치기는 실패하게 둔다. */

const row: { comment: { password_hash: string | null } | null } = { comment: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: row.comment }) }) }),
      delete: () => { throw new Error("must not delete in rejection tests"); },
      update: () => { throw new Error("must not update in rejection tests"); },
    }),
  }),
}));

import { createCommentDeleteHandler } from "@/lib/api/commentDetailHandler";
import { commentErrorText } from "@/components/comments/commentErrorText";

const ID = "7b0c1f9e-3c2a-4d8e-9f10-2a3b4c5d6e7f";
const { DELETE } = createCommentDeleteHandler({ table: "comments" } as Parameters<typeof createCommentDeleteHandler>[0]);
const del = (password?: string) =>
  DELETE(new Request(`http://local/api/comments/${ID}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }), { params: Promise.resolve({ id: ID }) });

async function codeOf(res: Response) {
  return { status: res.status, code: (await res.json()).code };
}

describe("댓글 지우기 거절", () => {
  it("없는 댓글·비밀번호 없이 쓴 댓글·비밀번호 없음·틀림을 코드로", async () => {
    row.comment = null;
    expect(await codeOf(await del("x"))).toEqual({ status: 404, code: "COMMENT_NOT_FOUND" });
    row.comment = { password_hash: null };
    expect(await codeOf(await del("x"))).toEqual({ status: 403, code: "COMMENT_NO_PASSWORD" });
    row.comment = { password_hash: bcrypt.hashSync("right", 4) };
    expect(await codeOf(await del())).toEqual({ status: 401, code: "COMMENT_PASSWORD_REQUIRED" });
    expect(await codeOf(await del("wrong"))).toEqual({ status: 403, code: "COMMENT_PASSWORD_WRONG" });
  });
});

type Dict = Record<string, unknown>;
const tOf = (d: Dict) => (key: string) => {
  const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Dict)[k] : undefined), d);
  return typeof v === "string" ? v : key;
};

describe("commentErrorText", () => {
  it("입력 검사 코드는 폼의 안내 문구, 거절 코드는 사전 문구, 그 밖은 대체 문구", () => {
    const tKo = tOf(ko as Dict);
    const tEn = tOf(en as Dict);
    expect(commentErrorText({ error: "CONTENT_TOO_LONG" }, tKo, "x")).toBe((ko as Dict & { comments: Dict }).comments.hintContentTooLong);
    expect(commentErrorText({ error: "Not authorized", code: "COMMENT_PASSWORD_WRONG" }, tEn, "x")).toBe("The password is incorrect.");
    expect(commentErrorText({ error: "Invalid id" }, tKo, "대체")).toBe("대체");
    expect(commentErrorText(null, tKo, "대체")).toBe("대체");
  });
});
