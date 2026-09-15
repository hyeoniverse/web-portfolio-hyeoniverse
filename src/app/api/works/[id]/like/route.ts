import { createLikeHandlers } from "@/lib/api/likeHandler";

export const { GET, POST } = createLikeHandlers({
  targetType: "work",
  // works.like_count 로 sync — 홈 Selected Works 인기 정렬(score)에 쓰인다(posts 와 동일).
  countSyncTable: "works",
});
