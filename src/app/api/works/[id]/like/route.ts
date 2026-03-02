import { createLikeHandlers } from "@/lib/api/likeHandler";

export const { GET, POST } = createLikeHandlers({
  targetType: "work",
});
