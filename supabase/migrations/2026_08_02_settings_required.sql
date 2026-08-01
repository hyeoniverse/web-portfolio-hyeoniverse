-- site_settings.config 의 필수값을 DB 에서도 막는다.
-- UI(설정 화면 validationError·섹션 저장 가드) · API(/api/admin/settings PATCH, validateRequiredSettings) 와 동일 규칙:
--   사이트 제목 / 이름 / 테마 색상 5종 — 비울 수 없음
--   이메일 — 입력 시 형식 검사 (빈 값 허용)
--   댓글 provider 가 giscus 면 repo·repoId·category·categoryId 필수
--   멤버(authors) 각 항목 이름 필수
-- 3중 검증(UI·API·DB)은 이 저장소 관례 — 2026_07_21_about_erd_valid.sql 참고.

-- config 는 { delta, savedDefaults } wrapper 구조.
-- 값은 delta 안에 있고, 기본값(비어있지 않음)은 delta 에 없다 → "delta 에 있으면서 빈 값"이면 위반.
-- (giscus 는 기본값이 "" 라 실효값으로 검사 — provider=giscus 일 때 delta 값 또는 "" 가 비면 위반)
CREATE OR REPLACE FUNCTION public.settings_required_valid(cfg jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  provider text;
  email    text;
  authors  jsonb;
  a        jsonb;
  gpath    text;
  gval     text;
  tpath    text;
  tval     text;
BEGIN
  IF cfg IS NULL OR jsonb_typeof(cfg) <> 'object' THEN
    RETURN true;
  END IF;

  -- 필수 텍스트 — delta(우선) 또는 top 에 존재하면서 trim 후 빈 문자열이면 위반.
  -- (없으면 NULL → 기본값 유지 → 통과)
  FOREACH tpath IN ARRAY ARRAY[
    'metadata,title',
    'personal,name',
    'theme,accentColor',
    'theme,lightBg',
    'theme,lightText',
    'theme,darkBg',
    'theme,darkText'
  ] LOOP
    tval := COALESCE(
      cfg #>> ('{delta,' || tpath || '}')::text[],
      cfg #>> ('{' || tpath || '}')::text[]
    );
    IF tval IS NOT NULL AND btrim(tval) = '' THEN
      RETURN false;
    END IF;
  END LOOP;

  -- 이메일 — 입력했다면 형식이 맞아야 함 (빈 값은 허용)
  email := COALESCE(cfg #>> '{delta,contact,email}', cfg #>> '{contact,email}');
  IF email IS NOT NULL AND btrim(email) <> '' AND btrim(email) !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' THEN
    RETURN false;
  END IF;

  -- 댓글 provider 가 giscus 면 필수 필드 검사 (실효값 = delta 또는 top 또는 기본 '')
  provider := COALESCE(cfg #>> '{delta,comments,provider}', cfg #>> '{comments,provider}', 'system');
  IF provider = 'giscus' THEN
    FOREACH gpath IN ARRAY ARRAY[
      'comments,giscus,repo',
      'comments,giscus,repoId',
      'comments,giscus,category',
      'comments,giscus,categoryId'
    ] LOOP
      gval := COALESCE(
        cfg #>> ('{delta,' || gpath || '}')::text[],
        cfg #>> ('{' || gpath || '}')::text[],
        ''
      );
      IF btrim(gval) = '' THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  -- 멤버(authors) — delta 또는 top 에 배열이 있으면 각 이름 필수
  authors := COALESCE(cfg #> '{delta,authors}', cfg #> '{authors}');
  IF authors IS NOT NULL AND jsonb_typeof(authors) = 'array' THEN
    FOR a IN SELECT * FROM jsonb_array_elements(authors) LOOP
      IF jsonb_typeof(a) <> 'object' OR btrim(COALESCE(a ->> 'name', '')) = '' THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$fn$;

-- NOT VALID — 기존 행은 검사하지 않고 앞으로의 INSERT/UPDATE 에만 적용한다.
-- 이미 저장된 config 에 빈 필수값이 있으면 즉시 ADD CONSTRAINT 가 실패해 배포가 막히기 때문.
-- 기존 행까지 확정하려면 아래를 먼저 확인하고 VALIDATE 한다:
--   SELECT id FROM site_settings WHERE NOT public.settings_required_valid(config);
--   ALTER TABLE site_settings VALIDATE CONSTRAINT site_settings_required_valid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_required_valid') THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_required_valid
      CHECK (public.settings_required_valid(config)) NOT VALID;
  END IF;
END $$;

SELECT log_migration_applied('2026_08_02_settings_required', 'site_settings.config 필수값 CHECK (제목·이름·테마색·giscus·멤버이름)');
