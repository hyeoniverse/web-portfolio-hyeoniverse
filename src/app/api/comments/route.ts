import { createCommentHandlers } from "@/lib/api/commentHandler";

const SELECT = "id, post_id, parent_id, nickname, commenter_hash, content, is_admin, is_deleted, like_count, created_at, updated_at";
const SELECT_SAFE = "id, post_id, parent_id, nickname, commenter_hash, content, is_admin, is_deleted, created_at, updated_at";

export const { GET, POST, PATCH } = createCommentHandlers({
  table: "comments",
  foreignKey: "post_id",
  selectFields: SELECT,
  selectFieldsSafe: SELECT_SAFE,
  notifyLabel: "post",
  notifyUrl: () => "/posts",
  supportLegacyAuth: true,
});
