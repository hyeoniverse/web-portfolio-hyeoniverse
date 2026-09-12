import { describe, it, expect } from "vitest";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";
import koAdmin from "@/locales/ko.admin.json";
import enAdmin from "@/locales/en.admin.json";
import { API_ERROR_CODES, CodedError, errorFromBody, errorText } from "@/lib/apiError";

/* 서버·브라우저가 실패에 싣는 코드를 화면 언어 문구로 바꾸는 규칙(#862).
   코드마다 두 언어 문구가 있어야 하고, 사전에 없는 코드나 코드 없는 오류는 그 자리의 대체 문구로 간다.
   서버가 쓴 문장은 한 언어라 화면에 쓰지 않는다. */

type Dict = Record<string, unknown>;
const get = (d: Dict, key: string): unknown => key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Dict)[k] : undefined), d);
/* LanguageProvider 의 t 와 같은 모양 — 없는 키는 키 경로를 돌려준다 */
const tOf = (...dicts: Dict[]) => (key: string) => {
  for (const d of dicts) { const v = get(d, key); if (typeof v === "string") return v; }
  return key;
};
const tKo = tOf(ko as Dict, koAdmin as Dict);
const tEn = tOf(en as Dict, enAdmin as Dict);

describe("apiError", () => {
  it("모든 코드에 두 언어 문구가 있다", () => {
    for (const code of API_ERROR_CODES) {
      for (const t of [tKo, tEn]) {
        const text = errorText({ code }, t, "");
        expect(text, code).not.toBe("");
      }
    }
  });

  it("코드가 있으면 화면 언어 문구에 값을 채운다", () => {
    const err = new CodedError("File too large: 12.3MB (max 10MB)", { code: "UPLOAD_TOO_LARGE", params: { size: "12.3", max: 10 } });
    expect(errorText(err, tKo, "x")).toContain("12.3MB");
    expect(errorText(err, tKo, "x")).toContain("10MB");
    expect(errorText(err, tEn, "x")).toMatch(/^The file is too large \(12\.3MB\)/);
  });

  it("실패 응답 본문도 같은 규칙으로 읽는다", () => {
    const body = { error: "차단된 파일 형식: .exe", code: "UPLOAD_TYPE_NOT_ALLOWED", params: { ext: "exe" } };
    expect(errorText(body, tEn, "x")).toBe("This file type can’t be uploaded (.exe).");
    const err = errorFromBody(body, 400);
    expect(err).toBeInstanceOf(CodedError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("차단된 파일 형식: .exe");
    expect(errorText(err, tKo, "x")).toBe("올릴 수 없는 파일 형식입니다(.exe).");
  });

  it("코드가 없거나 사전에 없으면 대체 문구 — 서버 문장은 쓰지 않는다", () => {
    expect(errorText({ error: "Invalid id" }, tKo, "대체")).toBe("대체");
    expect(errorText({ error: "x", code: "NO_SUCH_CODE" }, tKo, "대체")).toBe("대체");
    expect(errorText(new Error("Failed to fetch"), tKo, "대체")).toBe("대체");
    expect(errorText(null, tKo, "대체")).toBe("대체");
  });

  it("본문이 비었거나 JSON 이 아니어도 상태는 남긴다", () => {
    const err = errorFromBody(null, 413);
    expect(err.status).toBe(413);
    expect(err.code).toBeUndefined();
    expect(err.message).toBe("Request failed (413)");
  });
});
