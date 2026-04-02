import { purgeForever } from "@/lib/api/trashHandlers";

interface RouteContext { params: Promise<{ id: string }>; }

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return purgeForever("works", id);
}
