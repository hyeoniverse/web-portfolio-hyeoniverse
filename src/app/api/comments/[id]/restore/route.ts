import { createCommentRestoreHandler } from "@/lib/api/commentDetailHandler";

export const { POST } = createCommentRestoreHandler({
  table: "comments",
});
