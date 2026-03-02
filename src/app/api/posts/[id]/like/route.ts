import { createLikeHandlers } from "@/lib/api/likeHandler";

export const { GET, POST } = createLikeHandlers({
  targetType: "post",
  countSyncTable: "posts",
});
