-- 작업물 편집 권한을 작성자(author_ids)로 — 팀원 목록(team_members) 대신 (작업물은 랜딩 하나로 1/2)
--
-- 작업물 상세를 랜딩으로만 그리면서 팀원 목록을 없앤다. 편집 권한은 글(posts.author_ids)과 같은 모양으로
-- works.author_ids 가 정한다. 팀원에 연결돼 있던 저자(author_id)를 author_ids 로 옮겨 지금 권한을 그대로 둔다.
--
-- 순서: 이 파일은 지금 코드에도 해가 없다(칸을 더하고 정책만 바꾼다) — 새 코드를 배포하기 전에 적용한다.
-- 옛 칸 삭제는 배포 뒤에 2026_10_24_c_works_drop_post_columns.sql 로.

-- 작성자 칸 + 팀원 연결 옮기기
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS author_ids text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'works' AND column_name = 'team_members') THEN
    UPDATE public.works w
       SET author_ids = sub.ids
      FROM (
        SELECT id, array_agg(DISTINCT m ->> 'author_id') AS ids
          FROM public.works, jsonb_array_elements(CASE jsonb_typeof(team_members) WHEN 'array' THEN team_members ELSE '[]'::jsonb END) AS m
         WHERE coalesce(m ->> 'author_id', '') <> ''
         GROUP BY id
      ) sub
     WHERE w.id = sub.id AND w.author_ids = '{}';
  END IF;
END $$;

-- 권한 함수 · 정책 — can_edit_post 와 같은 규칙(관리자는 전부, 그 밖에는 author_ids 에 자기 저자 프로필이 있을 때)
DROP POLICY IF EXISTS "works_admin_update" ON public.works;
DROP FUNCTION IF EXISTS public.can_edit_work(jsonb);

CREATE OR REPLACE FUNCTION public.can_edit_work(target_author_ids text[])
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT is_admin()
      OR (app_author_id() IS NOT NULL
          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));
$$;

CREATE POLICY "works_admin_update" ON public.works FOR UPDATE TO authenticated
  USING (can_edit_work(author_ids)) WITH CHECK (can_edit_work(author_ids));

SELECT log_migration_applied('2026_10_24_b_works_author_ids', 'works.author_ids — 작업물 편집 권한을 팀원 목록에서 작성자로(can_edit_work(author_ids))');

NOTIFY pgrst, 'reload schema';
