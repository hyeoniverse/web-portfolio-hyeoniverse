import { PAGE_VIEW_MIN_DURATION_MS, PAGE_VIEW_SESSION_MS, clampDuration, normalizePagePath } from "./pageViews";

/**
 * 페이지 조회 · 머문 시간을 재는 상태기계(#1399) — 브라우저 API 를 받아 쓰므로 테스트에서 가짜로 바꿀 수 있다.
 *
 *   view(path)  페이지가 바뀌었다 — 앞 페이지의 시간을 보내고(leave) 새 조회를 기록한다
 *   hide()      탭이 가려졌다 — 지금까지 보인 시간을 보낸다(모바일은 탭을 닫을 때 pagehide 가 안 올 수 있어 숨길 때마다 보낸다)
 *   show()      탭이 다시 보인다 — 다시 재기 시작한다
 *   leave()     페이지를 떠난다(pagehide) — 남은 시간을 보낸다
 *
 * 시간은 조회 id 가 와야 보낼 수 있다. 기록 응답이 오기 전에 떠나면 쌓아 두었다가 id 가 오면 보낸다.
 */
export interface PageViewTrackerDeps {
  /** 조회 기록 — 서버가 돌려준 조회 id(기록하지 않았으면 null) */
  record: (path: string, session: string) => Promise<string | null>;
  /** 머문 시간 보내기 — 페이지를 떠나는 중에도 가게 sendBeacon */
  beacon: (id: string, ms: number) => void;
  now: () => number;
  isVisible: () => boolean;
  /** 세션 id 저장소 — { id, at: 마지막 조회 시각 } */
  loadSession: () => { id: string; at: number } | null;
  saveSession: (s: { id: string; at: number }) => void;
  newId: () => string;
}

interface View {
  path: string;
  id: string | null;
  /** id 가 오기 전에 쌓인 시간 */
  pending: number;
  /** 지금 보이는 구간의 시작(가려져 있으면 null) */
  since: number | null;
}

export function createPageViewTracker(deps: PageViewTrackerDeps) {
  let current: View | null = null;

  /** 30분 넘게 아무것도 안 봤으면 새 방문 */
  const session = () => {
    const t = deps.now();
    const saved = deps.loadSession();
    const id = saved && t - saved.at < PAGE_VIEW_SESSION_MS ? saved.id : deps.newId();
    deps.saveSession({ id, at: t });
    return id;
  };

  const send = (v: View, ms: number) => {
    if (v.id) {
      const d = clampDuration(ms);
      if (d !== null) deps.beacon(v.id, d);
    } else {
      v.pending += ms;
    }
  };

  /** 지금 보이는 구간을 닫아 보낸다 */
  const flush = (v: View) => {
    if (v.since === null) return;
    send(v, deps.now() - v.since);
    v.since = null;
  };

  return {
    view(rawPath: string) {
      const path = normalizePagePath(rawPath);
      if (current && current.path === path) return;
      if (current) flush(current);
      if (!path) {
        current = null;
        return;
      }
      const v: View = { path, id: null, pending: 0, since: deps.isVisible() ? deps.now() : null };
      current = v;
      deps.record(path, session()).then((id) => {
        v.id = id;
        if (id && v.pending >= PAGE_VIEW_MIN_DURATION_MS) send(v, v.pending);
        v.pending = 0;
      }, () => { /* 기록 실패 — 시간도 버린다 */ });
    },
    hide() {
      if (current) flush(current);
    },
    show() {
      if (current && current.since === null) current.since = deps.now();
      /* 돌아온 것도 활동이다 — 방문이 이어진다 */
      const saved = deps.loadSession();
      if (saved && deps.now() - saved.at < PAGE_VIEW_SESSION_MS) deps.saveSession({ id: saved.id, at: deps.now() });
    },
    leave() {
      if (current) flush(current);
    },
  };
}
