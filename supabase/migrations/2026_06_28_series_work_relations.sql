-- ────────────────────────────────────────────────────────────
-- series_work_relations — series ↔ works 다대다 연결
-- 프로젝트(work)에 관련 시리즈를 연결. post_work_relations 와 동일 패턴.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_work_relations (
  series_id  uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  work_id    uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (series_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_series_work_relations_series ON series_work_relations (series_id);
CREATE INDEX IF NOT EXISTS idx_series_work_relations_work ON series_work_relations (work_id);

ALTER TABLE series_work_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "series_work_relations_public_read" ON series_work_relations;
CREATE POLICY "series_work_relations_public_read"
  ON series_work_relations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "series_work_relations_service_all" ON series_work_relations;
CREATE POLICY "series_work_relations_service_all"
  ON series_work_relations FOR ALL
  USING (true)
  WITH CHECK (true);
