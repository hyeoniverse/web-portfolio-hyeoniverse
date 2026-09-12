import type { TFunction } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { fillTemplate } from "@/utils/format";
import { CodedError, errorFromResponse, errorText } from "@/lib/apiError";

/**
 * 사용자가 누른 쓰기 동작(삭제·복구·순서 바꾸기 등)의 요청을 보내고, 실패하면 오류 알림을 띄운다(#868).
 *
 * 예전에는 응답을 확인하지 않아 서버가 거절하거나 요청이 끊겨도 아무 표시가 없었다. 알림 문구는
 * `errorText` 로 정한다. 서버가 코드를 보내면 그 사유(권한 없음 등), 아니면 그 동작의 대체 문구(`fallback`)다.
 * 실패한 응답의 본문은 여기서 읽는다. 성공한 응답은 읽지 않은 채 돌려준다.
 */

export type ActionRequest = { input: string; init?: RequestInit };

async function attempt({ input, init }: ActionRequest): Promise<Response | CodedError> {
  try {
    const res = await fetch(input, init);
    return res.ok ? res : await errorFromResponse(res);
  } catch (err) {
    return new CodedError(err instanceof Error ? err.message : "Network error");
  }
}

/** 요청 하나. 성공하면 응답을, 실패하면 알림을 띄우고 null 을 돌려준다 */
export async function sendAction(input: string, init: RequestInit | undefined, t: TFunction, fallback: string): Promise<Response | null> {
  const result = await attempt({ input, init });
  if (result instanceof Response) return result;
  showToast(errorText(result, t, fallback), "error");
  return null;
}

/**
 * 여러 대상 가운데 실패한 것을 알림 하나로 알린다. 모두 실패하면 첫 실패의 사유(없으면 `fallback`)를,
 * 일부만 실패하면 "N개 중 M개를 처리하지 못했습니다." 뒤에 첫 실패의 사유를 붙인다.
 */
export function notifyFailures(failures: CodedError[], total: number, t: TFunction, fallback: string): void {
  if (failures.length === 0) return;
  if (failures.length === total) {
    showToast(errorText(failures[0], t, fallback), "error");
    return;
  }
  const count = fillTemplate(t("common.partialFailed"), { failed: failures.length, total });
  const reason = errorText(failures[0], t, "");
  showToast(reason ? `${count} ${reason}` : count, "error");
}

/**
 * 같은 동작을 여러 대상에 보낸다. 실패가 있으면 `notifyFailures` 로 알림 하나를 띄운다.
 * 성공한 수를 돌려준다. `sequential` 이면 하나씩 차례로 보낸다. 작업물 만들기처럼 서버가 지금 최댓값 + 1 로
 * 순서를 매기는 요청은 한꺼번에 보내면 값이 겹친다.
 */
export async function sendActions(
  requests: ActionRequest[],
  t: TFunction,
  fallback: string,
  { sequential = false }: { sequential?: boolean } = {},
): Promise<number> {
  const results: (Response | CodedError)[] = [];
  if (sequential) {
    for (const r of requests) results.push(await attempt(r));
  } else {
    results.push(...(await Promise.all(requests.map(attempt))));
  }
  const failures = results.filter((r): r is CodedError => r instanceof CodedError);
  notifyFailures(failures, results.length, t, fallback);
  return results.length - failures.length;
}
