import { after } from "next/server";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  COMMENT_IMAGE_DAILY_LIMIT,
  COMMENT_IMAGE_TYPES,
  commentImageDay,
  commentImageFolder,
  resolveCommentImageMaxMb,
} from "@/lib/commentImages";
import {
  commentImageIpHash,
  countCommentImages,
  reencodeCommentImage,
  storeCommentImage,
  sweepCommentImages,
} from "@/lib/api/commentImages";

/** multipart 머리말 · 경계 문자열이 파일 크기에 더해지는 몫 */
const FORM_OVERHEAD_BYTES = 64 * 1024;

/**
 * POST /api/comments/images — 댓글 입력란의 이미지 단추가 고른 이미지를 올린다(로그인 없음, #1455).
 * 게시물 · 작업물 댓글이 함께 쓴다. 본문 `file` 하나를 받아 webp 로 다시 저장하고 공개 주소 `{ url }` 를 돌려준다.
 *
 * 한 장 용량은 설정(comments.imageMaxMb), 하루 개수는 방문자(IP 해시)마다 COMMENT_IMAGE_DAILY_LIMIT 장.
 * 응답을 보낸 뒤 하루에 한 번, 댓글에 쓰이지 않은 지난 이미지를 지운다.
 */
export async function POST(request: Request) {
  const config = await getSiteConfig();
  if (config.comments?.provider === "giscus") return jsonError("Comment images are off", 403);

  const maxMb = resolveCommentImageMaxMb(config.comments?.imageMaxMb);
  const maxBytes = maxMb * 1024 * 1024;
  const tooLarge = (bytes: number) => jsonError("Image too large", 400, {
    code: "UPLOAD_TOO_LARGE",
    params: { size: (bytes / (1024 * 1024)).toFixed(1), max: maxMb },
  });

  /* 본문을 읽기 전에 선언한 크기로 먼저 거른다 — 큰 본문은 파싱부터 실패해 사유가 흐려진다 */
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes + FORM_OVERHEAD_BYTES) return tooLarge(declared);

  let file: File | null;
  try {
    file = (await request.formData()).get("file") as File | null;
  } catch {
    return jsonError("Unreadable upload", 400, { code: "UPLOAD_UNREADABLE" });
  }
  if (!file || typeof file === "string") return jsonError("No file provided", 400);
  if (file.size > maxBytes) return tooLarge(file.size);
  if (!(COMMENT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return jsonError("Only images", 400, { code: "UPLOAD_ONLY_IMAGE" });
  }

  try {
    const day = commentImageDay(new Date());
    const folder = commentImageFolder(day, commentImageIpHash(request, day));
    if ((await countCommentImages(folder)) >= COMMENT_IMAGE_DAILY_LIMIT) {
      return jsonError("Daily limit", 429, { code: "COMMENT_IMAGE_DAILY_LIMIT", params: { limit: COMMENT_IMAGE_DAILY_LIMIT } });
    }

    const image = await reencodeCommentImage(Buffer.from(await file.arrayBuffer()));
    if (!image) return jsonError("Unreadable image", 400, { code: "UPLOAD_UNREADABLE" });

    const url = await storeCommentImage(folder, image.buffer);
    /* 정리 실패는 이 업로드와 상관없다 — 서비스 호출 기록에 남고 다음 업로드가 다시 해 본다 */
    after(() => sweepCommentImages().catch(() => {}));
    return jsonOk({ url, width: image.width, height: image.height });
  } catch (err) {
    return jsonServerError(err, "POST /api/comments/images");
  }
}

export const dynamic = "force-dynamic";
