-- site_visits 트래픽 분석 메타 컬럼 (referrer / user_agent / device_kind / os / browser / device_model)
--
-- 이 컬럼들은 parseUserAgent 결과를 방문 기록 시점에 저장해 admin 대시보드의 유입경로·기기 분석에
-- 쓰인다. 과거에 setup.sql 에만 추가되고 **마이그레이션 파일이 없어서**, 예전에 만든 DB 에는
-- 컬럼이 없었다. 컬럼이 없으면 /api/visits 의 upsert 가 매번 42703(column does not exist)으로
-- 실패해 **방문이 하나도 기록되지 않고**(today 0), 대시보드 기기/유입 집계도 전부 비어 있었다.
--
-- 모두 additive + IF NOT EXISTS 라 안전하게 재실행 가능(이미 있는 DB 에는 no-op).

ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS referrer     text DEFAULT NULL;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS user_agent   text DEFAULT NULL;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS device_kind  text DEFAULT NULL;  -- desktop / mobile / tablet
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS os           text DEFAULT NULL;  -- macOS / Windows / iOS / Android / Linux / Other
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS browser      text DEFAULT NULL;  -- Chrome / Safari / Firefox / Edge / Other
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS device_model text DEFAULT NULL;  -- "iPhone" / "iPad" / "Mac" / "PC" 등

-- 집계용 인덱스 (setup.sql 과 동일)
CREATE INDEX IF NOT EXISTS idx_site_visits_device_kind ON site_visits (device_kind) WHERE device_kind IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_site_visits_referrer    ON site_visits (referrer)    WHERE referrer IS NOT NULL;

-- 마이그레이션 기록 (helper 가 있는 DB 에서만 — 옛 DB 는 이 함수 자체가 없을 수 있어 guard)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_migration_applied') THEN
    PERFORM log_migration_applied(
      '2026_08_03_site_visits_traffic_meta',
      'site_visits 트래픽 메타 컬럼(referrer/user_agent/device_kind/os/browser/device_model) + 인덱스 — 옛 DB 에 없어 방문 기록이 전부 실패하던 문제 수정'
    );
  END IF;
END $$;
