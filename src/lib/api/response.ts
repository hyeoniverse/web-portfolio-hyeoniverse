import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status: 400 | 401 | 403 | 404 | 500 = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonServerError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return NextResponse.json({ error: message }, { status: 500 });
}
