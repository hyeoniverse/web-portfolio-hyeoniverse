import { createCommentDeleteHandler } from "@/lib/api/commentDetailHandler";

export const { DELETE } = createCommentDeleteHandler({
  table: "comments",
});
