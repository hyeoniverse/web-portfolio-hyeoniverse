/**
 * 사이트 설정의 delta 저장 형식과 그걸 다루는 순수 헬퍼.
 *
 * `site_settings` 는 한 행짜리 jsonb 다. 그 안에 config 전체를 통째로 넣지 않고
 * **기본값(siteConfig)과 다른 부분만** `{ delta, savedDefaults }` 로 저장한다.
 * savedDefaults 는 저장 시점의 기본값 스냅샷이라, 나중에 코드의 기본값이 바뀌면
 * 어느 키가 어긋났는지 짚을 수 있다(DiffResolver).
 *
 * 원래 이 함수들은 설정 화면 폴더(`settings/_data/settingsConstants`) 안에 있었다.
 * 한 행에 쓰는 주체가 설정 화면 하나뿐일 때는 그 자리가 맞았지만, 콘텐츠 동기화
 * 스크립트(`scripts/sync-about.ts`)가 같은 행에 쓰기 시작하면서 셋이 공유해야 한다.
 * **쓰는 쪽이 저마다 다른 방식으로 config 를 조립하면 서로의 설정을 지운다** —
 * 스크립트가 config 를 통째로 갈아끼우면 About 과 무관한 설정까지 날아간다.
 * 그래서 조립 규칙을 여기 한 곳에 둔다.
 *
 * 설정 화면은 `settingsConstants` 를 통해 그대로 쓴다(재수출).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** 키 순서 무관 deep 비교 (JSON.stringify 는 키 순서에 의존하므로 대체) */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object") {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every((k) =>
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  }
  return false;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** dot-notation path 로 nested 값 읽기 ("personal.name", "about.troubleshooting") */
export function getByPath(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** dot-notation path 로 nested 값 설정 (immutable copy 반환) */
export function setByPath<T>(obj: T, path: string, value: unknown): T {
  const parts = path.split(".");
  const next: any = Array.isArray(obj) ? [...(obj as any[])] : { ...(obj as any) };
  let cur = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cur[k] = cur[k] != null && typeof cur[k] === "object" ? (Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] }) : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return next as T;
}

export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>
): T {
  const result = { ...target } as any;
  for (const key of Object.keys(source)) {
    const val = (source as any)[key];
    if (val === undefined || val === null) continue;
    if (
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/** siteConfig 기본값과 현재 config 를 비교해 달라진 키만 추출 (delta) */
export function computeDelta(current: any, defaults: any): any {
  const delta: any = {};
  for (const key of Object.keys(current)) {
    if (!(key in (defaults ?? {}))) continue; // siteConfig 에서 사라진 키는 버린다
    const cur = current[key];
    const def = defaults[key];
    if (
      cur !== null &&
      typeof cur === "object" &&
      !Array.isArray(cur) &&
      def !== null &&
      typeof def === "object" &&
      !Array.isArray(def)
    ) {
      const sub = computeDelta(cur, def);
      if (Object.keys(sub).length > 0) delta[key] = sub;
    } else if (!deepEqual(cur, def)) {
      delta[key] = cur;
    }
  }
  return delta;
}

/**
 * DB 에서 불러온 delta 에서 현재 siteConfig 에 없는 키를 제거.
 *
 * 기본값에 키가 있는지로 판단하므로, **키를 사용자가 만드는 자유 맵**은 걸러 내면 안 된다.
 * `about.panelTitles`(패널 key → 제목) · `about.contentSource`(패널 key → 원본) 처럼
 * 기본값이 `{}` 인 것들이 그렇다. 빈 객체로 내려가면 아는 키가 하나도 없어 통째로 비워진다.
 * 실제로 패널 제목 override 가 저장은 되는데 새로고침하면 사라지고 있었다.
 *
 * 그래서 기본값이 빈 객체면 그 아래는 들여다보지 않고 값을 그대로 둔다. 아는 키가 없는
 * 기준으로 거르면 결과가 항상 `{}` 라, 거를 수 있는 정보가 없다는 뜻이기도 하다.
 */
export function filterOrphanedKeys(delta: any, defaults: any): any {
  if (!delta || typeof delta !== "object" || Array.isArray(delta)) return delta;
  const filtered: any = {};
  for (const key of Object.keys(delta)) {
    if (!(key in (defaults ?? {}))) continue;
    const val = delta[key];
    const def = defaults[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val) &&
        def !== null && typeof def === "object" && !Array.isArray(def)) {
      filtered[key] = Object.keys(def).length === 0 ? val : filterOrphanedKeys(val, def);
    } else {
      filtered[key] = val;
    }
  }
  return filtered;
}

/** delta 키에 대해 siteConfig 기본값의 스냅샷 추출 */
export function extractDefaults(delta: any, defaults: any): any {
  const snapshot: any = {};
  for (const key of Object.keys(delta)) {
    const d = delta[key];
    const def = defaults[key];
    if (
      d !== null &&
      typeof d === "object" &&
      !Array.isArray(d) &&
      def !== null &&
      typeof def === "object" &&
      !Array.isArray(def)
    ) {
      snapshot[key] = extractDefaults(d, def);
    } else {
      snapshot[key] = def;
    }
  }
  return snapshot;
}

/** DB config 가 새 delta 형식인지 확인 */
export function isDeltaFormat(config: any): config is { delta: any; savedDefaults: any } {
  return config && typeof config.delta === "object" && config.delta !== null;
}

/** 저장된 config 에서 delta 만 꺼낸다 — 구 형식(통째 저장)은 그 자체가 delta 다. */
export function unwrapDelta(config: any): Record<string, unknown> {
  if (!config || typeof config !== "object") return {};
  return isDeltaFormat(config) ? config.delta : config;
}

/**
 * 이미 저장된 delta 위에 **지정한 경로만** 덮어 새 저장 페이로드를 만든다.
 *
 * 설정 화면의 섹션 저장과 콘텐츠 동기화가 공유하는 조립 규칙이다. 전체를 다시 계산하지
 * 않는 것이 핵심 — 그러면 지금 화면(혹은 스크립트)이 모르는 다른 설정까지 같이 써 버린다.
 * 값이 기본값과 같아지면 그 경로를 delta 에서 뺀다(undefined 로 두고 JSON 왕복으로 제거).
 */
export function buildDeltaPayload(
  storedDelta: Record<string, unknown>,
  fullConfig: any,
  defaults: any,
  paths: string[],
): { delta: Record<string, unknown>; savedDefaults: any } {
  let delta = structuredClone(storedDelta);
  for (const path of paths) {
    const value = getByPath(fullConfig, path);
    const def = getByPath(defaults, path);
    delta = setByPath(delta, path, deepEqual(value, def) ? undefined : value) as Record<string, unknown>;
  }
  delta = JSON.parse(JSON.stringify(delta));
  return { delta, savedDefaults: extractDefaults(delta, defaults) };
}
