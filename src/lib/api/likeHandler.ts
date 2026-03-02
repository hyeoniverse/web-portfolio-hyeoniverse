import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/utils/commentValidation";
import { getIp } from "@/utils/getIp";
import { jsonOk, jsonError, jsonServerError } from "./response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface LikeHandlerOptions {
  targetType: "post" | "work";
  /** 좋아요 수를 동기화할 테이블 (e.g. "posts"). 없으면 동기화 안 함 */
  countSyncTable?: string;
}

export function createLikeHandlers({ targetType, countSyncTable }: LikeHandlerOptions) {
  async function GET(request: Request, context: RouteContext) {
    try {
      const { id } = await context.params;
      if (!isValidUUID(id)) return jsonError("Invalid id");

      const ip = getIp(request);
      const admin = createAdminClient();

      const [{ count }, { data: myLike }] = await Promise.all([
        admin
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("target_type", targetType)
          .eq("target_id", id),
        admin
          .from("likes")
          .select("id")
          .eq("target_type", targetType)
          .eq("target_id", id)
          .eq("ip", ip)
          .maybeSingle(),
      ]);

      return jsonOk({ count: count ?? 0, liked: !!myLike });
    } catch (error) {
      return jsonServerError(error);
    }
  }

  async function POST(request: Request, context: RouteContext) {
    try {
      const { id } = await context.params;
      if (!isValidUUID(id)) return jsonError("Invalid id");

      const ip = getIp(request);
      const admin = createAdminClient();

      const { data: existing } = await admin
        .from("likes")
        .select("id")
        .eq("target_type", targetType)
        .eq("target_id", id)
        .eq("ip", ip)
        .maybeSingle();

      if (existing) {
        await admin.from("likes").delete().eq("id", existing.id);
      } else {
        await admin.from("likes").insert({ target_type: targetType, target_id: id, ip });
      }

      const { count } = await admin
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("target_type", targetType)
        .eq("target_id", id);

      const newCount = count ?? 0;

      if (countSyncTable) {
        await admin.from(countSyncTable).update({ like_count: newCount }).eq("id", id);
      }

      return jsonOk({ count: newCount, liked: !existing });
    } catch (error) {
      return jsonServerError(error);
    }
  }

  return { GET, POST };
}
