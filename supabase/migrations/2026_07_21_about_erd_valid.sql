-- site_settings.config 안 About ERD 의 필수값을 DB 에서도 막는다.
-- UI(ErdTableModal) · API(/api/admin/settings PATCH) 와 동일 규칙:
--   테이블 이름 필수 / 테이블 이름 중복 금지
--   테이블당 컬럼 1개 이상
--   컬럼 이름·타입 필수 / 컬럼 이름 중복 금지 (테이블 내)
-- ErdColumn.type 은 타입 정의상 optional 이 아니고 공개 About 패널이 그대로 그리는 값이라,
-- 비어 있으면 배포된 ERD 에 빈 칸이 남는다.
-- 3중 검증(UI·API·DB)은 이 저장소 관례 — 2026_07_13_posts_title_len.sql 참고.

-- config 는 { delta, savedDefaults } wrapper 구조.
-- 읽기 경로(src/lib/getSiteConfig.ts)가 `config.delta ?? config` 로 푸는 것과 동일하게 맞춘다.
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
    END LOOP;
  END LOOP;

  RETURN true;
END;
$fn$;

-- NOT VALID — 기존 행은 검사하지 않고 앞으로의 INSERT/UPDATE 에만 적용한다.
-- 이미 저장된 config 에 빈 타입이 있으면 즉시 ADD CONSTRAINT 가 실패해 배포가 막히기 때문.
-- 기존 행까지 확정하려면 아래를 먼저 확인하고 VALIDATE 한다:
--   SELECT id FROM site_settings WHERE NOT public.about_erd_valid(config);
--   ALTER TABLE site_settings VALIDATE CONSTRAINT site_settings_about_erd_valid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_about_erd_valid') THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_about_erd_valid
      CHECK (public.about_erd_valid(config)) NOT VALID;
  END IF;
END $$;

SELECT log_migration_applied('2026_07_21_about_erd_valid', 'site_settings.config About ERD 필수값 CHECK (테이블·컬럼 이름/타입)');
