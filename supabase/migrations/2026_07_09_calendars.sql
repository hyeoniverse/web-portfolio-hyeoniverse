-- calendars — 본문 이벤트 달력 블록 (게시물 간 공유 원본)
--   블록은 calendar_id 만 저장(HTML data-calendar-id) → 여러 게시물이 같은 달력을 공유(연결형).
--   data(jsonb) = { month, events[], labels[] }
--   읽기: 공개 / 쓰기: admin(service_role, createAdminClient) 전용

CREATE TABLE IF NOT EXISTS calendars (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL DEFAULT '',
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

-- 누구나 달력 조회 가능 (리더 렌더)
DROP POLICY IF EXISTS "calendars_public_read" ON calendars;
CREATE POLICY "calendars_public_read"
  ON calendars FOR SELECT
  USING (true);

-- service_role 전체 접근 (편집은 admin client 로 처리)
DROP POLICY IF EXISTS "calendars_service_all" ON calendars;
CREATE POLICY "calendars_service_all"
  ON calendars FOR ALL
  USING (true)
  WITH CHECK (true);

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
