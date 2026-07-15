import { restoreFromTrash } from "@/lib/api/trashHandlers";

interface RouteContext {
  params: Promise<{ calendarId: string }>;
}

// POST /api/calendars/[calendarId]/restore — 휴지통에서 복구 (deleted_at null)
export async function POST(_request: Request, context: RouteContext) {
  const { calendarId } = await context.params;
  return restoreFromTrash("calendars", calendarId);
}
