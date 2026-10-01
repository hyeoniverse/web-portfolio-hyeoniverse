/* 응답의 Server-Timing 헤더 — 브라우저 개발자 도구(Network › Timing)에서 서버 안 단계별 시간을 본다.
   "느리다"를 실제 배포에서 나눠 보려고 둔다(인증·조회·사용처 계산 중 어디인지). */
export function serverTimer() {
  let last = performance.now();
  const parts: string[] = [];
  return {
    /** 앞 표시부터 지금까지를 name 으로 남긴다 */
    mark(name: string) {
      const now = performance.now();
      parts.push(`${name};dur=${(now - last).toFixed(1)}`);
      last = now;
    },
    apply<R extends { headers: Headers }>(res: R): R {
      if (parts.length) res.headers.set("Server-Timing", parts.join(", "));
      return res;
    },
  };
}
