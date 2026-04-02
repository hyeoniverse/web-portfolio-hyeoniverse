import { restoreFromTrash } from "@/lib/api/trashHandlers";

interface RouteContext { params: Promise<{ id: string }>; }

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return restoreFromTrash("posts", id);
}
