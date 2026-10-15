// @vitest-environment node
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  COMMENT_IMAGE_DEFAULT_MB,
  COMMENT_IMAGE_MAX_SIDE,
  commentImageDay,
  commentImageFolder,
  commentImagePathsIn,
  orphanCommentImages,
  resolveCommentImageMaxMb,
} from "@/lib/commentImages";
import { reencodeCommentImage } from "@/lib/api/commentImages";

/* 댓글 이미지(#1455) — 용량 설정 값, 저장 경로, 뒷정리가 고르는 이미지, 다시 저장 */

const URL_BASE = "https://example.supabase.co/storage/v1/object/public/uploads";

describe("resolveCommentImageMaxMb", () => {
  it("고를 수 있는 값은 그대로, 모르는 값은 기본값", () => {
    expect(resolveCommentImageMaxMb(3)).toBe(3);
    expect(resolveCommentImageMaxMb(10)).toBe(COMMENT_IMAGE_DEFAULT_MB);
    expect(resolveCommentImageMaxMb("4")).toBe(COMMENT_IMAGE_DEFAULT_MB);
    expect(resolveCommentImageMaxMb(undefined)).toBe(COMMENT_IMAGE_DEFAULT_MB);
  });
});

describe("저장 경로", () => {
  it("날짜(UTC) / 방문자 해시 폴더", () => {
    const day = commentImageDay(new Date("2026-10-16T23:30:00Z"));
    expect(day).toBe("2026-10-16");
    expect(commentImageFolder(day, "ab12")).toBe("comments/2026-10-16/ab12");
  });
});

describe("뒷정리", () => {
  const a = "comments/2026-10-14/ab12/11111111-1111-1111-1111-111111111111.webp";
  const b = "comments/2026-10-14/ab12/22222222-2222-2222-2222-222222222222.webp";
  const c = "comments/2026-10-14/cd34/33333333-3333-3333-3333-333333333333.webp";

  it("댓글 본문의 이미지 주소에서 저장 경로를 뽑는다", () => {
    const used = commentImagePathsIn([`사진 ![고양이](${URL_BASE}/${a}) 입니다`, `![](${URL_BASE}/${c})`, "글만 있는 댓글"]);
    expect([...used].sort()).toEqual([a, c]);
  });

  it("어느 댓글에도 쓰이지 않은 이미지만 지운다", () => {
    expect(orphanCommentImages([a, b, c], [`![x](${URL_BASE}/${a})`, `![y](${URL_BASE}/${c})`])).toEqual([b]);
  });

  it("다른 버킷 · 다른 폴더의 같은 이름은 쓰인 것으로 치지 않는다", () => {
    expect(orphanCommentImages([a], [`![x](${URL_BASE.replace("uploads", "posts")}/${a})`])).toEqual([a]);
  });
});

describe("reencodeCommentImage", () => {
  it("webp 로 다시 저장하며 EXIF 를 버리고 긴 변을 줄인다", async () => {
    const photo = await sharp({ create: { width: 3200, height: 2000, channels: 3, background: "#468" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Make: "Phone", Model: "Camera" } } })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const out = await reencodeCommentImage(photo);
    expect(out).not.toBeNull();
    const meta = await sharp(out!.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(Math.max(meta.width!, meta.height!)).toBe(COMMENT_IMAGE_MAX_SIDE);
    expect(out!.width).toBe(COMMENT_IMAGE_MAX_SIDE);
  });

  it("작은 이미지는 키우지 않는다", async () => {
    const small = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#fff" } }).png().toBuffer();
    const out = await reencodeCommentImage(small);
    expect([out!.width, out!.height]).toEqual([200, 100]);
  });

  it("그림이 아닌 파일은 null", async () => {
    expect(await reencodeCommentImage(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
});
