-- 시리즈 제목(ko/en) 최대 길이 80자 CHECK 제약 — 최종 방어선.
-- UI 입력/폼 검사/API 를 모두 우회한 직접 DB·PostgREST 쓰기까지 차단.
-- (앱 상수 SERIES_TITLE_MAX = 80 과 반드시 동일하게 유지)
--
-- NOT VALID: 기존 행은 스캔·검증하지 않고(초과 데이터가 있어도 에러 없이) 이후 INSERT/UPDATE 만 강제.
--            기존 초과 행 정리 후 `ALTER TABLE series VALIDATE CONSTRAINT ...` 로 전수 검증 가능.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'series_title_maxlen') THEN
    ALTER TABLE series
      ADD CONSTRAINT series_title_maxlen CHECK (char_length(title) <= 80) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'series_title_en_maxlen') THEN
    ALTER TABLE series
      ADD CONSTRAINT series_title_en_maxlen CHECK (char_length(title_en) <= 80) NOT VALID;
  END IF;
END $$;
