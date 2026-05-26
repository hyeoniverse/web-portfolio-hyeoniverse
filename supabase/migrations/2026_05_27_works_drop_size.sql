-- ============================================================
-- works.size 컬럼 제거
-- ------------------------------------------------------------
-- Flow 레이아웃 카드 사이즈 (large/small/medium/tall/wide) 는
-- sort_order 에서 cycle derive 하도록 변경 — single source of truth.
-- size 컬럼은 더 이상 사용되지 않음.
--
-- 기존 데이터 손실 없음 (size 가 sort_order cycle 과 일치하던 한).
-- 일치하지 않던 경우 — derive 된 값으로 표시됨 (정렬 순서 = 카드 사이즈).
-- 5종 cycle: [large, small, medium, tall, wide][(sort_order - 1) % 5]
-- ============================================================

ALTER TABLE works DROP COLUMN IF EXISTS size;

SELECT log_migration_applied(
  '2026_05_27_works_drop_size',
  'works.size 컬럼 제거 — 카드 사이즈는 sort_order cycle 에서 derive'
);
