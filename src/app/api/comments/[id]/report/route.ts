import { createCommentReportHandler } from "@/lib/api/commentReportHandler";

export const { POST } = createCommentReportHandler({
  table: "comments",
  contentRoute: "posts",
});
