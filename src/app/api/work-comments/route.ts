import { createCommentHandlers } from "@/lib/api/commentHandler";

const SELECT = "id, work_id, parent_id, nickname, commenter_hash, content, is_admin, is_deleted, deleted_by, like_count, created_at, updated_at";
const SELECT_SAFE = "id, work_id, parent_id, nickname, commenter_hash, content, is_admin, is_deleted, deleted_by, created_at, updated_at";

export const { GET, POST, PATCH } = createCommentHandlers({
  table: "work_comments",
  foreignKey: "work_id",
  selectFields: SELECT,
  selectFieldsSafe: SELECT_SAFE,
  notifyLabel: "work",
  notifyUrl: (workId) => `/works/${workId}`,
});
