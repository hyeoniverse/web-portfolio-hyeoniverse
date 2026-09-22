import { describe, it, expect, vi, beforeEach } from "vitest";

/* 이력서 업로드 — 서명 URL 로 Storage 에 직접 올리므로 서버가 크기를 막지 못한다.
   형식과 크기는 브라우저에서 먼저 확인해 화면이 번역할 수 있는 코드로 알린다. */

const direct = vi.fn(async () => "https://example.com/uploads/resume/1.pdf");
vi.mock("@/lib/directUpload", () => ({ directUpload: (...args: unknown[]) => direct(...(args as [])) }));

import { uploadResume, RESUME_MAX_MB } from "@/lib/adminUpload";

const MB = 1024 * 1024;
/* 실제로 수십 MB 를 만들지 않고 크기만 흉내 낸다 */
const fakeFile = (name: string, type: string, size: number) => {
  const f = new File([new Uint8Array(8)], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("uploadResume", () => {
  beforeEach(() => direct.mockClear());

  it("한도는 50MB 다", () => {
    expect(RESUME_MAX_MB).toBe(50);
  });

  it("PDF 가 아니면 UPLOAD_ONLY_PDF 로 거절하고 올리지 않는다", async () => {
    await expect(uploadResume(fakeFile("cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", MB)))
      .rejects.toMatchObject({ code: "UPLOAD_ONLY_PDF" });
    expect(direct).not.toHaveBeenCalled();
  });

  it("50MB 를 넘으면 UPLOAD_TOO_LARGE 와 크기·한도를 싣는다", async () => {
    await expect(uploadResume(fakeFile("cv.pdf", "application/pdf", 51 * MB)))
      .rejects.toMatchObject({ code: "UPLOAD_TOO_LARGE", params: { size: "51.0", max: 50 } });
    expect(direct).not.toHaveBeenCalled();
  });

  it("50MB 이하 PDF 는 이력서 자리로 직접 올린다", async () => {
    const url = await uploadResume(fakeFile("cv.pdf", "application/pdf", 50 * MB));
    expect(url).toBe("https://example.com/uploads/resume/1.pdf");
    expect(direct).toHaveBeenCalledWith(expect.any(File), "cv.pdf", "application/pdf", "resume");
  });

  it("브라우저가 형식을 비워 두면 확장자로 PDF 를 알아본다", async () => {
    await uploadResume(fakeFile("cv.PDF", "", MB));
    expect(direct).toHaveBeenCalledTimes(1);
  });
});
