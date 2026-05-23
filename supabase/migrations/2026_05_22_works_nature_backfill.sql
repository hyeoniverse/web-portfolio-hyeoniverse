-- works.nature_ko / nature_en backfill — 빈 값은 preset 첫 항목 (토이 프로젝트) 로 채움.
-- 이후 nature 는 admin editor 에서 필수 입력으로 강제됨.

UPDATE works
SET nature_ko = '토이 프로젝트',
    nature_en = 'Toy Project'
WHERE COALESCE(nature_ko, '') = ''
   OR COALESCE(nature_en, '') = '';
