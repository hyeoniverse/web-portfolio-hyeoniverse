-- ============================================================
-- 스토리지 직접 업로드 정책 제거 — 서버 검증 우회 차단
-- ============================================================
--
-- 무엇이 문제였나
--   posts · uploads 두 버킷에 이런 정책이 걸려 있었다.
--
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated')
--
--   로그인한 멤버라면 브라우저에서 supabase.storage.from('posts').upload(...) 를 직접 불러
--   임의의 파일을 올릴 수 있다는 뜻이다. 서버가 하는 검증을 전부 건너뛴다 —
--   /api/upload/signed-url 의 차단 확장자 목록과 허용 확장자 화이트리스트,
--   그리고 site config 의 크기 제한이 적용되지 않는다.
--   두 버킷 모두 public 이라 그렇게 올라간 파일은 공개 URL 로 접근된다.
--
-- 왜 지워도 되나
--   이 정책에 의존하는 코드가 없다.
--
--   브라우저에서 스토리지에 올리는 경로는 lib/directUpload.ts 하나뿐이고, 서버가 발급한
--   서명 URL 로 올린다(uploadToSignedUrl). @supabase/storage-js 의 해당 메서드 문서가
--   명시한다 — "RLS policy permissions required: buckets: none, objects: none".
--   토큰 자체가 인가하므로 정책을 보지 않는다.
--
--   서버 업로드 4개(api/upload · api/admin/upload · cover/ai-generate ·
--   cover/unsplash/download)는 service_role 로 붙는다. service_role 은 BYPASSRLS 다.
--
--   따라서 남는 경로는 "서명 URL 을 받아서 올리는" 정상 흐름뿐이고, 그 흐름은
--   /api/upload/signed-url 의 검증을 반드시 통과한다.
--
-- 조회 정책은 그대로 둔다
--   "Anyone can view uploads" / "Anyone can view posts" 는 공개 이미지 서빙에 쓰인다.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to posts" ON storage.objects;

-- ── 확인 ─────────────────────────────────────────────────────
-- 1) INSERT 정책이 남아 있지 않아야 한다 (SELECT 두 개만 남는다)
--   SELECT polname, polcmd, pg_get_expr(polwithcheck, polrelid) AS check_expr
--   FROM pg_policy WHERE polrelid = 'storage.objects'::regclass ORDER BY polname;
--
-- 2) 사이트에서 확인할 것
--    에디터에서 이미지 업로드 (본문 첨부 · 커버 이미지) — 서명 URL 경로라 그대로 동작해야 한다
--    기존에 올라간 이미지가 공개 페이지에서 보이는지

SELECT log_migration_applied(
  '2026_08_25_drop_storage_authenticated_insert',
  '스토리지 authenticated INSERT 정책 제거 — 로그인 멤버가 서버의 확장자·크기 검증을 건너뛰고 public 버킷에 임의 파일을 올릴 수 있던 경로 차단. 정상 흐름은 서명 URL(uploadToSignedUrl)이라 정책이 필요 없다'
);
