// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

/* 업로드 라우트가 거절할 때 화면이 번역할 수 있는 코드를 싣는지(#862).
   실제 저장소에 올리지 않도록 저장소 클라이언트는 부르면 실패하게 둔다 — 거절은 모두 그 앞에서 끝나야 한다. */

const limits: { current: Record<string, number> } = { current: { png: 1, pdf: 1 } };

vi.mock("@/lib/api/requireAuth", () => ({ requireAuth: async () => ({ error: null }) }));
vi.mock("@/lib/getSiteConfig", () => ({ getSiteConfig: async () => ({ media: { limits: limits.current } }) }));
vi.mock("@/lib/convertImage", () => ({ needsConversion: () => false, convertToWebp: async () => { throw new Error("unused"); } }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => { throw new Error("storage must not be touched in rejection tests"); },
}));

import { POST as upload } from "@/app/api/upload/route";
import { POST as adminUpload } from "@/app/api/admin/upload/route";
import { POST as signedUrl } from "@/app/api/upload/signed-url/route";

const MB = 1024 * 1024;
const form = (name: string, type: string, bytes = 16, folder?: string) => {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(bytes)], name, { type }));
  if (folder) fd.append("folder", folder);
  return new Request("http://local/api/upload", { method: "POST", body: fd });
};
const json = (body: unknown) =>
  new Request("http://local/api/upload/signed-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function expectCode(res: Response, code: string, params?: Record<string, unknown>) {
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.code).toBe(code);
  expect(typeof body.error).toBe("string");
  if (params) expect(body.params).toEqual(params);
}

describe("/api/upload", () => {
  beforeEach(() => { limits.current = { png: 1, pdf: 1 }; });

  it("확장자가 없으면 UPLOAD_NO_EXTENSION", async () => {
    await expectCode(await upload(form("file.", "image/png")), "UPLOAD_NO_EXTENSION");
  });
  it("막힌 형식과 허용 목록 밖 형식은 UPLOAD_TYPE_NOT_ALLOWED", async () => {
    await expectCode(await upload(form("evil.exe", "application/octet-stream")), "UPLOAD_TYPE_NOT_ALLOWED", { ext: "exe" });
    await expectCode(await upload(form("note.txt", "text/plain")), "UPLOAD_TYPE_NOT_ALLOWED", { ext: "txt" });
  });
  it("MIME 과 확장자가 다르면 UPLOAD_TYPE_MISMATCH", async () => {
    await expectCode(await upload(form("photo.png", "application/pdf")), "UPLOAD_TYPE_MISMATCH", { ext: "png" });
  });
  it("형식별 한도를 넘으면 UPLOAD_TOO_LARGE 와 크기·한도", async () => {
    await expectCode(await upload(form("photo.png", "image/png", 2 * MB)), "UPLOAD_TOO_LARGE", { size: "2.0", max: 1 });
  });
});

describe("/api/admin/upload", () => {
  it("폴더마다 받는 종류가 아니면 UPLOAD_ONLY_*", async () => {
    await expectCode(await adminUpload(form("a.txt", "text/plain")), "UPLOAD_ONLY_IMAGE");
    await expectCode(await adminUpload(form("a.txt", "text/plain", 16, "fonts")), "UPLOAD_ONLY_FONT");
    await expectCode(await adminUpload(form("a.txt", "text/plain", 16, "bgm")), "UPLOAD_ONLY_AUDIO");
    await expectCode(await adminUpload(form("a.txt", "text/plain", 16, "resume")), "UPLOAD_ONLY_PDF");
  });
  it("한도를 넘으면 UPLOAD_TOO_LARGE", async () => {
    await expectCode(await adminUpload(form("a.png", "image/png", 3 * MB)), "UPLOAD_TOO_LARGE", { size: "3.0", max: 2 });
  });
});

describe("/api/upload/signed-url", () => {
  it("확장자 없음·막힌 형식을 코드로 알린다", async () => {
    await expectCode(await signedUrl(json({ fileName: "clip." })), "UPLOAD_NO_EXTENSION");
    await expectCode(await signedUrl(json({ fileName: "clip.exe" })), "UPLOAD_TYPE_NOT_ALLOWED", { ext: "exe" });
    await expectCode(await signedUrl(json({ fileName: "clip.avi" })), "UPLOAD_TYPE_NOT_ALLOWED", { ext: "avi" });
  });
});
