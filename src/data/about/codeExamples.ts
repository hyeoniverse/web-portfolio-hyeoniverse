import type { CodeExample } from "./types";
import { codeDemoFiles } from "./codeDemoFiles";

export const codeExamples: CodeExample[] = [
  {
    title: "3D Scroll Torus (Lissajous Curve)",
    description: {
      ko: "스크롤할 때마다 3D 토러스가 **화면 안에서 끝없이 떠다니는** 효과입니다. X와 Y 축에 **서로 다른 주파수의 사인파**를 적용하여 리사주 곡선을 그리며, 화면 밖으로 나가지 않으면서도 **반복되지 않는 유기적인 궤적**을 만듭니다. Lenis 무한 스크롤의 **누적 거리를 추적**하여 스크롤 방향에 관계없이 연속적으로 움직입니다.",
      en: "A 3D torus that **floats endlessly within the viewport** as you scroll. By applying **sine waves with different frequencies** to the X and Y axes, it traces a Lissajous curve — staying on-screen while creating an **organic, non-repeating trajectory**. It tracks **cumulative Lenis scroll distance** so the torus moves continuously regardless of scroll direction.",
    },
    language: "tsx",
    code: `// Lenis 누적 스크롤 추적 (무한 스크롤 래핑 감지)
const currentNorm = scroll / limit;
let delta = currentNorm - lastNorm;
if (delta > 0.5) delta -= 1;      // 뒤로 래핑
else if (delta < -0.5) delta += 1; // 앞으로 래핑
cumulativeRef.current += delta;

// 리사주 곡선: X·Y 주파수가 다르면 무한 궤도
const t = getCumulative();
const x = Math.sin(t * 0.7 * Math.PI * 2) * 3.5;
const y = Math.cos(t * 1.1 * Math.PI * 2) * 3.0;
const z = Math.sin(t * 0.4 * Math.PI * 2) * 1.5 - 2;

// 메탈릭 머티리얼 + 환경 반사
<Environment preset="city" />
<meshStandardMaterial
  metalness={1.0} roughness={0.08}
  envMapIntensity={1.5} />`,
    demoMode: "sandbox",
    demoFiles: codeDemoFiles.scrollTorus,
  },
  {
    title: "Scene Cut Transitions",
    description: {
      ko: "About 가로 스크롤에서 화면 폭을 채우는 패널은 **옆으로 밀리지 않고 화면에 고정**됩니다. 다음 패널이 그 위를 **와이프·아이리스·아래에서 걷히기** 중 하나로 덮으며 나타나고, 전환 진행도는 **스크롤 위치 그대로**라 멈추면 멈추고 되감으면 거꾸로 돌아갑니다. 위치는 화면 측정값이 아니라 **레이아웃 값(offsetLeft)** 으로 계산해, 여기서 건 transform 이 다음 프레임 측정에 섞이지 않게 합니다.",
      en: "In the About horizontal scroll, full-width panels **stay pinned instead of sliding sideways**. The next panel covers them with a **wipe, iris or rise**, and progress is **the scroll position itself**, so it pauses when you stop and reverses when you scroll back. Positions come from **layout values (offsetLeft)**, not measured rects, so the transform applied here never feeds back into the next frame.",
    },
    language: "typescript",
    code: `// 들어오는 패널 — 0 에 붙잡고, 남은 거리만큼 전환을 덜 진행한 상태
const left = trackX + panel.offsetLeft;
if (left > 0 && left < vw) {
  const t = left / vw;               // 1 → 0 으로 줄며 전환이 끝난다
  const kind = CUT_KINDS[i % 3];      // wipe · iris · rise
  s.transform = \`translateX(\${-left}px)\`;
  if (kind === "wipe") s.clipPath = \`inset(0 0 0 \${t * vw}px)\`;
  if (kind === "iris") s.clipPath = \`circle(\${(1 - t) * diag}px at 50% 50%)\`;
  if (kind === "rise") s.clipPath = \`inset(\${t * 100}% 0 0 0)\`;
}

// 휠을 멈추면 굴리던 방향으로 전환을 끝까지 마친다
const desired = lastDir > 0 ? (left < vw * 0.96 ? 0 : vw)
                            : (left > vw * 0.04 ? vw : 0);
state.targetScrollX = initialX + panel.offsetLeft - desired;`,
  },
  {
    title: "Authorization in the Database (RLS)",
    description: {
      ko: "글 수정 권한을 API 코드가 아니라 **데이터베이스 규칙(Row Level Security)** 으로 판정합니다. 판정 함수 하나(`can_edit_post`)가 **소유자·관리자·해당 글의 저자**만 통과시키고, UPDATE·DELETE 정책이 이 함수를 그대로 씁니다. 어느 경로로 쿼리가 들어오든 **DB 가 마지막 관문**이 되어, API 에서 검사를 빠뜨려도 다른 사람의 글은 바뀌지 않습니다.",
      en: "Edit permission is decided by **database rules (Row Level Security)**, not API code. One predicate (`can_edit_post`) lets through **only the owner, admins, or an author of that post**, and the UPDATE and DELETE policies call it directly. Whatever path a query takes, **the database is the last gate**, so a missing API check still can't change someone else's post.",
    },
    language: "sql",
    code: `-- 이 글을 수정할 수 있는가 — JWT 의 app_metadata 로 판정
CREATE OR REPLACE FUNCTION can_edit_post(target_author_ids text[])
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT is_owner()
      OR app_level() >= 2
      OR (app_role() = 'author'
          AND app_author_id() IS NOT NULL
          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));
$$;

CREATE POLICY "posts_admin_update" ON posts FOR UPDATE TO authenticated
  USING (can_edit_post(author_ids)) WITH CHECK (can_edit_post(author_ids));

CREATE POLICY "posts_admin_delete" ON posts FOR DELETE TO authenticated
  USING (can_edit_post(author_ids));`,
  },
  {
    title: "Optimistic Concurrency (409)",
    description: {
      ko: "두 사람이 같은 글을 동시에 고치면 나중 저장이 앞의 수정을 **조용히 덮어쓰는** 문제가 있습니다. 편집기는 불러올 때의 `version` 을 함께 보내고, 서버는 **버전이 그대로일 때만** 갱신하며 번호를 올립니다. 갱신된 행이 0개면 누군가 먼저 저장한 것이므로 **409 와 현재 버전**을 돌려주고, 편집기는 덮어쓸지 다시 불러올지 묻습니다. 잠금 없이 **충돌을 감지**하는 방식입니다.",
      en: "When two people edit the same post, the later save can **silently overwrite** the earlier one. The editor sends the `version` it loaded, and the server updates **only if that version is unchanged**, bumping the number. If zero rows change, someone saved first, so it returns **409 with the current version** and the editor asks whether to overwrite or reload. Conflicts are **detected, not locked**.",
    },
    language: "typescript",
    code: `const baseVersion = typeof body.baseVersion === "number" ? body.baseVersion : null;

if (baseVersion !== null) {
  const { data, error } = await supabase
    .from("posts")
    .update({ ...body, version: baseVersion + 1, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("version", baseVersion)   // 버전이 그대로일 때만
    .select()
    .single();

  // 0행 갱신 = 없거나 버전 불일치 → 현재 버전을 읽어 충돌/404 구분
  if (error?.code === "PGRST116") {
    const { data: cur } = await supabase.from("posts").select("version").eq("id", id).maybeSingle();
    if (cur) return NextResponse.json({ error: "version_conflict", currentVersion: cur.version }, { status: 409 });
  }
}`,
  },
  {
    title: "Scheduled Jobs that Report Their Own Failures",
    description: {
      ko: "예약 발행은 호스팅 cron 대신 **데이터베이스 안의 pg_cron** 이 매분 실행합니다. 작업 함수를 그대로 등록하지 않고 **`safe_` 래퍼**로 감싸, 예외가 나면 삼키지 않고 **관리자 알림 테이블에 오류 내용을 남깁니다**. 외부에 여는 주소도, 그 주소를 지키는 비밀키도 필요 없고, 실패는 관리자 화면에서 바로 보입니다.",
      en: "Scheduled publishing runs every minute in **pg_cron inside the database**, not a hosting cron. The job isn't registered directly but through a **`safe_` wrapper** that, on an exception, **writes the error to the admin notifications table** instead of swallowing it. No public endpoint or secret is needed, and failures show up in the admin screen.",
    },
    language: "sql",
    code: `CREATE OR REPLACE FUNCTION safe_publish_scheduled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM publish_scheduled();
EXCEPTION WHEN OTHERS THEN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'cron_error',
    '⚠️ publish_scheduled cron 에러',
    'publish_scheduled() 실행 중 예외 발생: ' || SQLERRM,
    jsonb_build_object('function', 'publish_scheduled', 'sqlstate', SQLSTATE, 'message', SQLERRM)
  );
END;
$$;

-- 매분 실행
SELECT cron.schedule('publish-scheduled', '* * * * *',
  $cron$ SELECT safe_publish_scheduled(); $cron$);`,
  },
];
