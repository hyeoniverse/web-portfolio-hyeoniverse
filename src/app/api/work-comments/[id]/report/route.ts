import { createCommentReportHandler } from "@/lib/api/commentReportHandler";

export const { POST } = createCommentReportHandler({
  table: "work_comments",
  contentRoute: "works",
});
