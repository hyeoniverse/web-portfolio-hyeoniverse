-- ============================================================
-- 권한 클레임 파싱 강화 — 코드와 RLS 가 같은 값을 같게 읽도록
-- ============================================================
--
-- 무엇이 문제였나
--   app_level() 은 JWT 클레임을 그대로 캐스트했다.
--
--     SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'permission_level')::int, 0);
--
--   ->> 는 무슨 타입이든 텍스트로 꺼내고, ::int 는 정수 표기가 아니면 예외를 던진다.
--
--     1.5   → '1.5'::int → ERROR 22P02. 판정이 false 로 떨어지는 게 아니라
--                          그 statement 자체가 죽는다. 안전하게 실패하지 않는다.
--     2.0   → 같은 이유로 ERROR. 악의 없는 값도 마찬가지다.
--     "2"   → '2'::int = 2 → is_admin() 이 true.
--             같은 값을 TS 의 getUserRole 은 (typeof !== "number") 저자로 읽는다.
--             인가 판정이 코드와 정책에서 갈리고, 넓은 쪽이 정책이다.
--     999   → 999 >= 2 → 관리자. TS 는 이제 PERM 밖의 값을 저자로 떨어뜨리므로 역시 갈린다.
--
--   현재 이 값을 쓸 수 있는 것은 owner 뿐이라(두 라우트 모두 requireOwner) 지금 당장
--   도달 가능한 공격 경로는 아니다. 다만 2단계에서 인가 판정이 RLS 로 넘어가면
--   정책이 최종 판정자가 되므로, 넓은 쪽으로 벌어지는 차이를 남겨 둘 이유가 없다.
--
-- 어떻게 고쳤나
--   TS 는 PERM 에 정의된 값만 인정하고 나머지는 가장 좁은 권한으로 떨어뜨린다(toPermissionLevel).
--   SQL 도 같은 규칙을 쓴다 — JSON number 이고, 정수이고, 정의된 범위 안일 때만 인정한다.
--   그 밖의 값은 전부 0 이다. TS 는 1(저자), SQL 은 0 으로 다르지만 두 값 모두
--   실제로 검사하는 조건(>= 2)에서 같게 동작한다.
-- ============================================================

/** JWT 의 permission_level → 권한 레벨.
    JSON number · 정수 · 1..2 범위를 모두 만족할 때만 인정하고, 아니면 0. */
CREATE OR REPLACE FUNCTION app_level()
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT CASE jsonb_typeof(claim)
           WHEN 'number' THEN
             /* 여기까지 왔으면 숫자가 확실하다 — 중첩 CASE 라야 타입 가드가 먼저 평가된다.
                한 WHEN 안에서 AND 로 늘어놓으면 Postgres 가 순서를 바꿀 수 있고,
                그러면 문자열 클레임에 ::numeric 이 먼저 걸려 캐스트 에러가 난다. */
             CASE WHEN n = trunc(n) AND n BETWEEN 1 AND 2 THEN n::int ELSE 0 END
           ELSE 0
         END
  FROM (SELECT auth.jwt() -> 'app_metadata' -> 'permission_level' AS claim) s,
  LATERAL (SELECT CASE WHEN jsonb_typeof(claim) = 'number'
                       THEN (claim #>> '{}')::numeric END AS n) t;
$$;

/** JWT 의 author_id. 문자열일 때만 인정한다 — 숫자·배열이 텍스트로 눌려 비교에 끼지 않도록. */
CREATE OR REPLACE FUNCTION app_author_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE WHEN jsonb_typeof(claim) = 'string' THEN claim #>> '{}' END
  FROM (SELECT auth.jwt() -> 'app_metadata' -> 'author_id' AS claim) s;
$$;

-- app_role() 은 그대로 둔다. ->> 로 꺼낸 값을 문자열과 비교할 뿐이라
-- 타입이 어긋나면 자연히 불일치로 떨어진다(안전한 방향).

-- ── 확인 ─────────────────────────────────────────────────────
--   lvl 이 순서대로 0, 2, 0, 0, 0, 0, 0 이어야 한다 — 에러 없이.
--     SELECT j, (SELECT CASE jsonb_typeof(c) WHEN 'number' THEN
--                  CASE WHEN n = trunc(n) AND n BETWEEN 1 AND 2 THEN n::int ELSE 0 END
--                ELSE 0 END
--                FROM (SELECT j::jsonb AS c) x,
--                LATERAL (SELECT CASE WHEN jsonb_typeof(c)='number'
--                                     THEN (c #>> '{}')::numeric END AS n) y) AS lvl
--     FROM (VALUES ('1.5'), ('2.0'), ('"2"'), ('999'), ('null'), ('true'), ('"abc"')) v(j);
--
--   로그인한 세션에서:  SELECT app_role(), app_level(), app_author_id(), is_admin();

SELECT log_migration_applied(
  '2026_08_25_harden_permission_level',
  'app_level()/app_author_id() 클레임 파싱 강화 — 소수는 캐스트 에러로 statement 를 죽이고 문자열 "2"·999 는 코드보다 넓게 판정되던 문제. JSON 타입·정수·범위를 모두 확인하고 아니면 0'
);
