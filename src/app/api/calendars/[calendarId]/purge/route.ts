import { purgeForever } from "@/lib/api/trashHandlers";

interface RouteContext {
  params: Promise<{ calendarId: string }>;
}

// DELETE /api/calendars/[calendarId]/purge — 영구 삭제 (hard delete)
export async function DELETE(_request: Request, context: RouteContext) {
  const { calendarId } = await context.params;
  return purgeForever("calendars", calendarId);
}
