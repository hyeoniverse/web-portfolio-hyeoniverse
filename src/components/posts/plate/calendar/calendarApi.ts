// ── 공유 달력 API 클라이언트 (연결형) ──
// 달력 원본은 서버(calendars 테이블)에 저장, 블록은 calendarId 로 참조.
import { type CalendarData, normalizeCalendar } from "./model";

export type CalendarListItem = {
  id: string;
  title: string;
  month: string;
  eventCount: number;
  updatedAt: string;
  /** 휴지통 항목일 때만 */
  deletedAt?: string | null;
  purgeAfter?: string | null;
};

/** 달력 데이터 로드 결과 — 정상 / 휴지통(삭제됨) / null(없음·에러) */
export type CalendarFetchResult = { title: string; data: CalendarData } | { deleted: true } | null;

/** 달력 데이터 로드 (공개). soft-delete 된 달력은 { deleted: true } 반환 → 블록이 "연결 끊김" 표시 */
export async function fetchCalendar(id: string): Promise<CalendarFetchResult> {
  try {
    const res = await fetch(`/api/calendars/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.deleted) return { deleted: true };
    return { title: json.title || "", data: normalizeCalendar(json.data) };
  } catch {
    return null;
  }
}

/** 달력 데이터 저장 (admin) */
export async function saveCalendar(id: string, data: CalendarData, title?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/calendars/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, ...(title != null ? { title } : {}) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 새 공유 달력 생성 (admin) → id */
export async function createCalendar(data: CalendarData, title = ""): Promise<string | null> {
  try {
    const res = await fetch(`/api/calendars`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, title }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.id as string) || null;
  } catch {
    return null;
  }
}

/** 달력 제목만 변경 (admin) — data 는 건드리지 않음 */
export async function renameCalendar(id: string, title: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/calendars/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 달력 삭제 (admin) — 휴지통으로 이동 (soft delete). 참조 블록은 "연결 끊김"으로 표시됨. */
export async function deleteCalendar(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/calendars/${encodeURIComponent(id)}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/** 휴지통에서 복구 (admin) — 복구 시 참조 블록도 자동 재연결됨 */
export async function restoreCalendar(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/calendars/${encodeURIComponent(id)}/restore`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

/** 영구 삭제 (admin) — 되돌릴 수 없음 */
export async function purgeCalendar(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/calendars/${encodeURIComponent(id)}/purge`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/** 공유 달력 목록 (admin). trash=true 면 휴지통(삭제된 것)만. */
export async function listCalendars(trash = false): Promise<CalendarListItem[]> {
  try {
    const res = await fetch(`/api/calendars${trash ? "?trash=true" : ""}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}
