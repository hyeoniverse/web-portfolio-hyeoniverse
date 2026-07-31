-- 2026_07_23_about_erd_fields
-- about_erd_valid 확장 — 2026_07_21_about_erd_valid 의 기본 검증(테이블·컬럼 이름/타입)에
-- 컬럼 선택 필드 제약(pk/required/unique/indexed/fk/defaultValue/comment/enumValues)과
-- 테이블 kind('view' 한정) 검증을 추가한다.
-- CREATE OR REPLACE 라 setup.sql(확장판 내장) 과 replay 결과가 동일해진다.

CREATE OR REPLACE FUNCTION public.about_erd_valid(cfg jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  tables jsonb;
  t      jsonb;
  c      jsonb;
  tname  text;
  cname  text;
  ctype  text;
  tnames text[] := '{}';
  cnames text[];
  bkey   text;
  skey   text;
BEGIN
  IF cfg IS NULL OR jsonb_typeof(cfg) <> 'object' THEN
    RETURN true;
  END IF;

  tables := COALESCE(cfg #> '{delta,about,erdTables}', cfg #> '{about,erdTables}');

  -- ERD 를 건드리지 않는 저장(대부분의 설정 변경)은 그대로 통과
  IF tables IS NULL OR jsonb_typeof(tables) = 'null' THEN
    RETURN true;
  END IF;
  IF jsonb_typeof(tables) <> 'array' THEN
    RETURN false;
  END IF;

  FOR t IN SELECT * FROM jsonb_array_elements(tables) LOOP
    IF jsonb_typeof(t) <> 'object' THEN
      RETURN false;
    END IF;

    tname := lower(btrim(COALESCE(t ->> 'name', '')));
    IF tname = '' OR tname = ANY(tnames) THEN
      RETURN false;
    END IF;
    tnames := tnames || tname;

    IF jsonb_typeof(t -> 'columns') <> 'array' OR jsonb_array_length(t -> 'columns') = 0 THEN
      RETURN false;
    END IF;

    cnames := '{}';
    FOR c IN SELECT * FROM jsonb_array_elements(t -> 'columns') LOOP
      IF jsonb_typeof(c) <> 'object' THEN
        RETURN false;
      END IF;
      cname := lower(btrim(COALESCE(c ->> 'name', '')));
      ctype := btrim(COALESCE(c ->> 'type', ''));
      IF cname = '' OR ctype = '' OR cname = ANY(cnames) THEN
        RETURN false;
      END IF;
      cnames := cnames || cname;

      -- 선택 필드 — 없으면 통과, 있으면 타입이 맞아야 한다
      FOREACH bkey IN ARRAY ARRAY['pk', 'required', 'unique', 'indexed'] LOOP
        IF c ? bkey AND jsonb_typeof(c -> bkey) NOT IN ('boolean', 'null') THEN
          RETURN false;
        END IF;
      END LOOP;
      FOREACH skey IN ARRAY ARRAY['fk', 'defaultValue', 'comment'] LOOP
        IF c ? skey AND jsonb_typeof(c -> skey) NOT IN ('string', 'null') THEN
          RETURN false;
        END IF;
      END LOOP;
      IF c ? 'enumValues' AND jsonb_typeof(c -> 'enumValues') NOT IN ('array', 'null') THEN
        RETURN false;
      END IF;
      IF jsonb_typeof(c -> 'enumValues') = 'array' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c -> 'enumValues') v
        WHERE jsonb_typeof(v) <> 'string'
      ) THEN
        RETURN false;
      END IF;
    END LOOP;

    -- 테이블 선택 필드 — kind 는 뷰 표시에만 쓰이므로 'view' 외 값을 받지 않는다
    IF t ? 'kind' AND COALESCE(t ->> 'kind', 'view') <> 'view' THEN
      RETURN false;
    END IF;
    IF t ? 'comment' AND jsonb_typeof(t -> 'comment') NOT IN ('string', 'null') THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$fn$;

-- 제약은 2026_07_21 에서 이미 추가됨(NOT VALID). 여기선 함수 정의만 갱신.
SELECT public.log_migration_applied(
  '2026_07_23_about_erd_fields',
  'about_erd_valid 확장 — 컬럼 제약(required/unique/indexed/defaultValue/comment/enumValues)·테이블 kind 타입 검증'
);
