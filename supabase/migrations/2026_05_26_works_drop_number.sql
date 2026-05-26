-- ============================================================
-- works.number 컬럼 제거
-- ------------------------------------------------------------
-- 표시 번호 (#01) 는 sort_order 에서 derive 하도록 변경 — single
-- source of truth. number 컬럼은 더 이상 사용되지 않음.
--
-- 기존 데이터 손실 없음 (number 가 sort_order 와 일치하는 한).
-- 일치하지 않던 경우 — derive 된 값으로 표시됨 (정렬 순서 = 번호).
-- ============================================================

ALTER TABLE works DROP COLUMN IF EXISTS number;

SELECT log_migration_applied(
  '2026_05_26_works_drop_number',
  'works.number 컬럼 제거 — 표시 번호는 sort_order 에서 derive'
);
