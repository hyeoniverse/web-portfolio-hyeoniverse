import { describe, it, expect } from "vitest";
import { parseSqlErd } from "@/app/admin/(dashboard)/settings/_components/about/parseSqlErd";

/* SQL → ERD 파서.
 *
 * 이 파서는 admin 에서 붙여넣은 스키마를 그대로 공개 About ERD 로 바꾼다.
 * 잘못 읽으면 잘못된 다이어그램이 배포되므로, 실제로 붙여넣을 법한 형태를 고정해 둔다.
 * (특히 ALTER 는 앞선 CREATE 위에서 순서대로 적용돼야 한다) */

const t = (r: ReturnType<typeof parseSqlErd>, name: string) =>
  r.tables.find((x) => x.name === name);

describe("parseSqlErd — CREATE TABLE", () => {
  it("컬럼·PK·인라인 REFERENCES 를 읽는다", () => {
    const r = parseSqlErd(`
      create table series (id uuid primary key, title text);
      create table posts (
        id uuid primary key,
        series_id uuid references series(id),
        title text not null
      );
    `);
    expect(r.tables.map((x) => x.name)).toEqual(["series", "posts"]);
    expect(t(r, "posts")!.columns.map((c) => c.name)).toEqual(["id", "series_id", "title"]);
    expect(t(r, "posts")!.columns[0].pk).toBe(true);
    expect(t(r, "posts")!.columns[1].fk).toBe("series.id");
    expect(r.relations).toEqual([
      { from: "posts", fromField: "series_id", to: "series", toField: "id", label: "N:1" },
    ]);
  });

  it("스키마 접두사·따옴표·IF NOT EXISTS 를 벗겨낸다", () => {
    const r = parseSqlErd(`create table if not exists public."works" ("id" uuid primary key);`);
    expect(r.tables[0].name).toBe("works");
    expect(r.tables[0].columns[0].name).toBe("id");
  });

  it("테이블 레벨 PRIMARY KEY / FOREIGN KEY 제약을 반영한다", () => {
    const r = parseSqlErd(`
      create table a (id uuid);
      create table b (
        a_id uuid,
        primary key (a_id),
        foreign key (a_id) references a (id)
      );
    `);
    expect(t(r, "b")!.columns[0].pk).toBe(true);
    expect(t(r, "b")!.columns[0].fk).toBe("a.id");
    expect(r.relations).toHaveLength(1);
  });

  it("괄호 안 콤마가 있는 타입을 쪼개지 않는다", () => {
    const r = parseSqlErd(`create table m (id uuid primary key, amount numeric(10,2), tags text[]);`);
    expect(t(r, "m")!.columns.map((c) => c.type.toLowerCase())).toEqual(["uuid", "numeric(10,2)", "text[]"]);
  });
});

describe("parseSqlErd — ALTER TABLE", () => {
  it("ADD COLUMN 이 앞선 CREATE 결과에 더해진다", () => {
    const r = parseSqlErd(`
      create table posts (id uuid primary key);
      alter table posts add column title text;
      alter table posts add if not exists view_count int;
    `);
    expect(t(r, "posts")!.columns.map((c) => c.name)).toEqual(["id", "title", "view_count"]);
    expect(r.skipped).toBe(0);
  });

  it("ADD CONSTRAINT … FOREIGN KEY 가 관계를 만든다", () => {
    const r = parseSqlErd(`
      create table series (id uuid primary key);
      create table posts (id uuid primary key, series_id uuid);
      alter table posts add constraint posts_series_fk foreign key (series_id) references series(id);
    `);
    expect(r.relations).toEqual([
      { from: "posts", fromField: "series_id", to: "series", toField: "id", label: "N:1" },
    ]);
    expect(t(r, "posts")!.columns[1].fk).toBe("series.id");
  });

  it("ADD PRIMARY KEY / ALTER COLUMN TYPE / DROP COLUMN 을 적용한다", () => {
    const r = parseSqlErd(`
      create table x (id uuid, note text, tmp int);
      alter table x add primary key (id);
      alter table x alter column note type varchar(200);
      alter table x drop column tmp;
    `);
    expect(t(r, "x")!.columns.find((c) => c.name === "id")!.pk).toBe(true);
    expect(t(r, "x")!.columns.find((c) => c.name === "note")!.type.toLowerCase()).toBe("varchar(200)");
    expect(t(r, "x")!.columns.map((c) => c.name)).not.toContain("tmp");
  });

  it("RENAME TO 가 테이블명과 그 관계 양끝을 함께 옮긴다", () => {
    const r = parseSqlErd(`
      create table old_name (id uuid primary key);
      create table child (id uuid primary key, p uuid references old_name(id));
      alter table old_name rename to new_name;
    `);
    expect(r.tables.map((x) => x.name).sort()).toEqual(["child", "new_name"]);
    expect(r.relations[0].to).toBe("new_name");
    expect(t(r, "child")!.columns[1].fk).toBe("new_name.id");
  });

  it("RENAME COLUMN 이 컬럼명과 관계 필드를 함께 옮긴다", () => {
    const r = parseSqlErd(`
      create table a (id uuid primary key);
      create table b (id uuid primary key, a_id uuid references a(id));
      alter table b rename column a_id to owner_id;
    `);
    expect(t(r, "b")!.columns.map((c) => c.name)).toContain("owner_id");
    expect(r.relations[0].fromField).toBe("owner_id");
  });

  it("한 문장에 여러 동작이 콤마로 이어져도 각각 적용한다", () => {
    const r = parseSqlErd(`
      create table a (id uuid primary key);
      alter table a add column c1 text, add column c2 int, drop column c1;
    `);
    expect(t(r, "a")!.columns.map((c) => c.name)).toEqual(["id", "c2"]);
    expect(r.skipped).toBe(0);
  });
});

describe("parseSqlErd — DROP TABLE", () => {
  it("테이블과 그에 걸린 관계를 함께 지운다", () => {
    const r = parseSqlErd(`
      create table a (id uuid primary key);
      create table b (id uuid primary key, a_id uuid references a(id));
      drop table b;
    `);
    expect(r.tables.map((x) => x.name)).toEqual(["a"]);
    expect(r.relations).toHaveLength(0);
  });
});

describe("parseSqlErd — 무관한 구문", () => {
  it("인덱스·정책·GRANT·INSERT 는 건너뜀으로 세지 않는다", () => {
    const r = parseSqlErd(`
      create table a (id uuid primary key);
      create index a_idx on a (id);
      create unique index a_uniq on a (id);
      alter table a enable row level security;
      create policy "p" on a for select using (true);
      grant select on a to anon;
      insert into a (id) values (gen_random_uuid());
      comment on table a is 'hi';
    `);
    expect(r.tables).toHaveLength(1);
    expect(r.skipped).toBe(0);
  });

  it("달러인용 함수 본문 안의 세미콜론이 문장을 조각내지 않는다", () => {
    /* setup.sql 이 이 형태다 — 처리 못 하면 본문 조각이 전부 건너뜀으로 잡힌다 */
    const r = parseSqlErd(`
      create table a (id uuid primary key);
      create or replace function f() returns boolean language plpgsql as $fn$
      begin
        if 1 = 1 then return true; end if;
        return false;
      end;
      $fn$;
      do $$ begin perform 1; end $$;
      create table b (id uuid primary key);
    `);
    expect(r.tables.map((x) => x.name)).toEqual(["a", "b"]);
    expect(r.skipped).toBe(0);
  });
});

describe("parseSqlErd — 정합성", () => {
  it("존재하지 않는 테이블을 가리키는 관계는 버린다", () => {
    const r = parseSqlErd(`create table a (id uuid primary key, b_id uuid references nowhere(id));`);
    expect(r.tables).toHaveLength(1);
    expect(r.relations).toHaveLength(0);
  });

  it("CREATE 도 없고 기존 ERD 에도 없는 테이블의 ALTER 는 적용 대상이 없다", () => {
    const r = parseSqlErd(`alter table ghost add column x text;`);
    expect(r.tables).toHaveLength(0);
    /* 문법은 멀쩡하다 — skipped(문법 오류) 가 아니라 unresolved(대상 없음) 로 구분한다 */
    expect(r.skipped).toBe(0);
    expect(r.unresolved).toEqual(["ghost"]);
  });
});

/* ALTER 는 기존 테이블 위에서만 의미가 있다 — base 를 넘겨 대상을 찾게 한다.
   base 없이 파싱하면 ALTER 만 붙여넣은 SQL 이 영영 아무것도 만들지 못했다. */
describe("parseSqlErd — 기존 테이블 위의 ALTER", () => {
  const base = [{ name: "posts", columns: [{ name: "id", type: "uuid", pk: true }] }];

  it("ALTER 만 있어도 기존 테이블에 컬럼이 붙는다", () => {
    const r = parseSqlErd("ALTER TABLE posts ADD COLUMN subtitle text;", base);
    expect(r.tables).toHaveLength(1);
    expect(r.tables[0].columns.map((c) => c.name)).toEqual(["id", "subtitle"]);
  });

  it("건드리지 않은 기존 테이블은 결과에 담지 않는다 (전부 '갱신됨' 으로 보이지 않게)", () => {
    const two = [...base, { name: "series", columns: [{ name: "id", type: "uuid" }] }];
    const r = parseSqlErd("ALTER TABLE posts ADD COLUMN x text;", two);
    expect(r.tables.map((t) => t.name)).toEqual(["posts"]);
  });

  it("base 를 훼손하지 않는다", () => {
    const mine = [{ name: "posts", columns: [{ name: "id", type: "uuid" }] }];
    parseSqlErd("ALTER TABLE posts ADD COLUMN x text; DROP TABLE posts;", mine);
    expect(mine[0].columns).toHaveLength(1);
  });

  it("ERD 에 없는 테이블을 ALTER 하면 unresolved 로 알린다 (문법 오류가 아니다)", () => {
    const r = parseSqlErd("ALTER TABLE ghost ADD COLUMN x text;", base);
    expect(r.unresolved).toEqual(["ghost"]);
    expect(r.skipped).toBe(0);
  });

  it("기존 테이블을 가리키는 FK 관계는 살아남는다", () => {
    const r = parseSqlErd(
      "CREATE TABLE comments (id uuid PRIMARY KEY, post_id uuid REFERENCES posts(id));",
      base,
    );
    expect(r.tables.map((t) => t.name)).toEqual(["comments"]);
    expect(r.relations).toEqual([
      { from: "comments", fromField: "post_id", to: "posts", toField: "id", label: "N:1" },
    ]);
  });
});

/* 함수·DO 블록·SELECT 만 있는 마이그레이션 — 그릴 게 없는 게 정답이지만,
   "읽긴 읽었다" 는 걸 알려줘야 안내 문구가 문법을 탓하지 않는다. */
describe("parseSqlErd — 그릴 게 없는 마이그레이션", () => {
  const migration = `
CREATE OR REPLACE FUNCTION public.about_erd_valid(cfg jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $fn$
BEGIN
  IF cfg IS NULL THEN RETURN true; END IF;
  RETURN true;
END;
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'c') THEN
    ALTER TABLE site_settings ADD CONSTRAINT c CHECK (public.about_erd_valid(config)) NOT VALID;
  END IF;
END $$;

SELECT log_migration_applied('2026_07_21', '설명');
`;

  it("테이블은 없지만 문장은 온전히 읽고, 문법 오류로 세지 않는다", () => {
    const r = parseSqlErd(migration, [{ name: "site_settings", columns: [{ name: "config", type: "jsonb" }] }]);
    expect(r.tables).toHaveLength(0);
    expect(r.skipped).toBe(0);
    /* DO 블록 안의 ALTER 는 읽었지만 CHECK 제약이라 ERD 에 옮길 게 없다 —
       "못 읽었다" 가 아니라 "그릴 게 없다" 로 구분돼야 안내가 정확해진다 */
    expect(r.noEffect).toEqual(["site_settings"]);
  });
});

/* DO $$ … $$ 는 "이미 있으면 건너뛰기" 를 위해 마이그레이션이 DDL 을 감싸는 흔한 형태다.
   블록 안이라고 넘기면 그런 파일에선 아무것도 읽지 못한다. */
describe("parseSqlErd — DO 블록 안의 DDL", () => {
  it("DO 블록 안의 CREATE TABLE 을 읽는다", () => {
    const r = parseSqlErd(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tags') THEN
    CREATE TABLE tags (id uuid PRIMARY KEY, name text NOT NULL);
  END IF;
END $$;`);
    expect(r.tables).toHaveLength(1);
    expect(r.tables[0].name).toBe("tags");
    expect(r.tables[0].columns.map((c) => c.name)).toEqual(["id", "name"]);
  });

  it("DO 블록 안의 ALTER 로 컬럼과 관계가 붙는다", () => {
    const base = [
      { name: "posts", columns: [{ name: "id", type: "uuid", pk: true }] },
      { name: "series", columns: [{ name: "id", type: "uuid", pk: true }] },
    ];
    const r = parseSqlErd(`
DO $$
BEGIN
  ALTER TABLE posts ADD COLUMN series_id uuid REFERENCES series(id);
END $$;`, base);
    expect(r.tables.map((t) => t.name)).toEqual(["posts"]);
    expect(r.tables[0].columns.at(-1)).toEqual({ name: "series_id", type: "uuid", fk: "series.id" });
    expect(r.relations).toHaveLength(1);
  });

  it("여러 DDL 이 든 블록을 순서대로 적용한다", () => {
    const r = parseSqlErd(`
DO $$
BEGIN
  CREATE TABLE a (id uuid PRIMARY KEY);
  ALTER TABLE a ADD COLUMN memo text;
  ALTER TABLE a RENAME TO b;
END $$;`);
    expect(r.tables.map((t) => t.name)).toEqual(["b"]);
    expect(r.tables[0].columns.map((c) => c.name)).toEqual(["id", "memo"]);
  });

  it("ERD 에 그릴 게 없는 ALTER 만 있으면 테이블을 갱신됨으로 잡지 않는다", () => {
    const base = [{ name: "t", columns: [{ name: "id", type: "uuid" }] }];
    const r = parseSqlErd(`ALTER TABLE t ADD CONSTRAINT c CHECK (id IS NOT NULL) NOT VALID;`, base);
    expect(r.tables).toHaveLength(0);
    expect(r.noEffect).toEqual(["t"]);
    expect(r.skipped).toBe(0);
  });

  it("같은 테이블을 실제로 바꾸는 ALTER 가 함께 있으면 변화 없음으로 치지 않는다", () => {
    const base = [{ name: "t", columns: [{ name: "id", type: "uuid" }] }];
    const r = parseSqlErd(
      `ALTER TABLE t ADD CONSTRAINT c CHECK (id IS NOT NULL); ALTER TABLE t ADD COLUMN x text;`,
      base,
    );
    expect(r.tables.map((t) => t.name)).toEqual(["t"]);
    expect(r.noEffect).toEqual([]);
  });
});

/* 진단 위치 — 밑줄이 엉뚱한 곳에 그어지면 없느니만 못하다.
   특히 주석은 "지우기" 가 아니라 "같은 길이 공백으로 덮기" 여야 뒤쪽 위치가 안 밀린다. */
describe("parseSqlErd — 진단 위치", () => {
  const at = (sql: string, i: { from: number; to: number }) => sql.slice(i.from, i.to);

  it("괄호가 닫히지 않은 CREATE 를 짚는다", () => {
    const sql = `create table a (id uuid primary key;`;
    const r = parseSqlErd(sql);
    const u = r.issues.find((i) => i.kind === "unbalanced")!;
    /* 괄호가 안 닫히면 세미콜론도 문장 끝으로 인정되지 않는다 — 끝까지가 한 문장이다 */
    expect(at(sql, u)).toBe("create table a (id uuid primary key;");
  });

  it("읽지 못한 컬럼 조각만 짚는다 (문장 전체가 아니라)", () => {
    const sql = `create table a (id uuid primary key, ???, name text);`;
    const r = parseSqlErd(sql);
    const c = r.issues.find((i) => i.kind === "bad-column")!;
    expect(at(sql, c)).toBe("???");
  });

  it("ALTER 대상 이름에만 밑줄을 긋는다", () => {
    const sql = `alter table ghost add column x text;`;
    const r = parseSqlErd(sql);
    const u = r.issues.find((i) => i.kind === "unresolved")!;
    expect(at(sql, u)).toBe("ghost");
    expect(u.name).toBe("ghost");
  });

  it("대상 없는 REFERENCES 는 관계가 버려지므로 경고로 알린다", () => {
    const sql = `create table b (id uuid, ref uuid references nowhere(id));`;
    const r = parseSqlErd(sql);
    const w = r.issues.find((i) => i.kind === "unknown-ref")!;
    /* 컬럼 조각 전체를 가리킨다 — 조각 안 상대 위치는 공백 축약 때문에 원본과 어긋난다 */
    expect(at(sql, w)).toBe("ref uuid references nowhere(id)");
    expect(w.name).toBe("nowhere");
    expect(r.relations).toHaveLength(0);
  });

  it("주석이 앞에 있어도 뒤쪽 위치가 밀리지 않는다", () => {
    const sql = `-- 아주 긴 한국어 주석이 앞줄에 있습니다\n/* 블록\n주석 */\nalter table ghost add column x text;`;
    const r = parseSqlErd(sql);
    const u = r.issues.find((i) => i.kind === "unresolved")!;
    expect(at(sql, u)).toBe("ghost");
  });

  it("알아볼 수 없는 문장은 그 문장만 짚는다", () => {
    const sql = `create table a (id uuid);\nblah blah blah;`;
    const r = parseSqlErd(sql);
    const u = r.issues.find((i) => i.kind === "unreadable")!;
    expect(at(sql, u)).toBe("blah blah blah");
  });

  it("DO 블록 안에서 난 문제도 블록 안 실제 위치를 가리킨다", () => {
    const sql = `do $$\nbegin\n  alter table ghost add column x text;\nend $$;`;
    const r = parseSqlErd(sql);
    const u = r.issues.find((i) => i.kind === "unresolved")!;
    expect(at(sql, u)).toBe("ghost");
  });

  it("문제가 없으면 아무것도 표시하지 않는다", () => {
    const r = parseSqlErd(`create table a (id uuid primary key);\ncreate index i on a (id);`);
    expect(r.issues).toEqual([]);
  });
});

/* 삭제는 결과 목록에서 빠지는 것만으로 표현되지 않는다 — 명시적으로 알려야
   병합 쪽이 "언급 안 함(유지)" 과 구별할 수 있다. */
describe("parseSqlErd — 삭제 보고", () => {
  const base = [
    { name: "posts", columns: [{ name: "id", type: "uuid", pk: true }, { name: "legacy", type: "text" }] },
    { name: "junk", columns: [{ name: "id", type: "uuid" }] },
  ];

  it("DROP TABLE 을 알린다", () => {
    const r = parseSqlErd("DROP TABLE junk;", base);
    expect(r.removedTables).toEqual(["junk"]);
  });

  it("DROP COLUMN 을 알린다", () => {
    const r = parseSqlErd("ALTER TABLE posts DROP COLUMN legacy;", base);
    expect(r.removedColumns).toEqual([{ table: "posts", column: "legacy" }]);
  });

  it("RENAME TO 는 옛 이름을 삭제로 알린다 (둘 다 남지 않게)", () => {
    const r = parseSqlErd("ALTER TABLE junk RENAME TO trash;", base);
    expect(r.tables.map((t) => t.name)).toEqual(["trash"]);
    expect(r.removedTables).toEqual(["junk"]);
  });

  it("RENAME COLUMN 은 옛 컬럼명을 삭제로 알린다", () => {
    const r = parseSqlErd("ALTER TABLE posts RENAME COLUMN legacy TO memo;", base);
    expect(r.removedColumns).toEqual([{ table: "posts", column: "legacy" }]);
  });

  it("지웠다가 다시 만들면 삭제가 아니다", () => {
    const r = parseSqlErd("DROP TABLE junk; CREATE TABLE junk (id uuid primary key);", base);
    expect(r.removedTables).toEqual([]);
    expect(r.tables.map((t) => t.name)).toEqual(["junk"]);
  });

  it("컬럼을 지웠다가 다시 더하면 삭제가 아니다", () => {
    const r = parseSqlErd("ALTER TABLE posts DROP COLUMN legacy, ADD COLUMN legacy varchar(10);", base);
    expect(r.removedColumns).toEqual([]);
    expect(r.tables[0].columns.map((c) => c.name)).toContain("legacy");
  });

  it("테이블째 지우면 그 컬럼은 따로 보고하지 않는다", () => {
    const r = parseSqlErd("ALTER TABLE junk DROP COLUMN id; DROP TABLE junk;", base);
    expect(r.removedTables).toEqual(["junk"]);
    expect(r.removedColumns).toEqual([]);
  });
});

/* 모델 확장분 — SQL 이 들고 있는 스키마 정보를 ERD 로 최대한 옮긴다.
   전부 optional 필드라 기존에 저장된 ERD 는 그대로 유효하다. */
describe("parseSqlErd — 컬럼 제약", () => {
  it("NOT NULL · UNIQUE · DEFAULT 를 읽는다", () => {
    const r = parseSqlErd(`create table a (
      id uuid primary key,
      slug text not null unique,
      status text default 'draft',
      created_at timestamptz default now() not null
    );`);
    const c = (n: string) => t(r, "a")!.columns.find((x) => x.name === n)!;
    expect(c("slug").required).toBe(true);
    expect(c("slug").unique).toBe(true);
    expect(c("status").defaultValue).toBe("'draft'");
    /* DEFAULT 뒤에서 멈추지 않으면 not null 까지 기본값으로 삼킨다 */
    expect(c("created_at").defaultValue).toBe("now()");
    expect(c("created_at").required).toBe(true);
  });

  it("PK 는 적혀 있지 않아도 NOT NULL 이다", () => {
    const r = parseSqlErd(`create table a (id uuid primary key);`);
    expect(t(r, "a")!.columns[0].required).toBe(true);
  });

  it("serial 과 IDENTITY 는 기본값이 자동 증가다", () => {
    const r = parseSqlErd(`create table a (id bigserial primary key, n int generated always as identity);`);
    expect(t(r, "a")!.columns.every((c) => c.defaultValue === "auto")).toBe(true);
  });

  it("테이블 레벨 UNIQUE 를 해당 컬럼에 표시한다", () => {
    const r = parseSqlErd(`create table a (x text, y text, unique (x, y));`);
    expect(t(r, "a")!.columns.every((c) => c.unique)).toBe(true);
  });

  it("복합 FK 는 짝마다 관계를 만든다 (첫 컬럼만 읽으면 선이 사라진다)", () => {
    const r = parseSqlErd(`
      create table p (a uuid, b uuid, primary key (a, b));
      create table c (x uuid, y uuid, foreign key (x, y) references p (a, b));
    `);
    expect(r.relations).toHaveLength(2);
    expect(r.relations.map((x) => `${x.fromField}->${x.toField}`)).toEqual(["x->a", "y->b"]);
  });

  it("LIKE 와 INHERITS 가 부모 컬럼을 물려받는다", () => {
    const r = parseSqlErd(`
      create table base (id uuid primary key, created_at timestamptz);
      create table copy (like base);
      create table child (extra text) inherits (base);
    `);
    expect(t(r, "copy")!.columns.map((c) => c.name)).toEqual(["id", "created_at"]);
    expect(t(r, "child")!.columns.map((c) => c.name)).toEqual(["extra", "id", "created_at"]);
  });
});

describe("parseSqlErd — 인덱스·주석·ENUM·뷰", () => {
  it("CREATE INDEX 는 조회 경로를, UNIQUE INDEX 는 고유까지 표시한다", () => {
    const r = parseSqlErd(`
      create table a (id uuid primary key, status text, slug text);
      create index a_status on a (status);
      create unique index a_slug on a (slug);
    `);
    const c = (n: string) => t(r, "a")!.columns.find((x) => x.name === n)!;
    expect(c("status").indexed).toBe(true);
    expect(c("status").unique).toBeUndefined();
    expect(c("slug").unique).toBe(true);
  });

  it("COMMENT ON 이 테이블·컬럼 설명이 된다", () => {
    const r = parseSqlErd(`
      create table a (id uuid primary key, slug text);
      comment on table a is '글';
      comment on column a.slug is 'URL 조각';
    `);
    expect(t(r, "a")!.comment).toBe("글");
    expect(t(r, "a")!.columns[1].comment).toBe("URL 조각");
  });

  it("ENUM 값이 컬럼에 붙는다 — 타입 이름만으로는 알 수 없다", () => {
    const r = parseSqlErd(`
      create type post_status as enum ('draft', 'published');
      create table a (id uuid primary key, status post_status);
      alter type post_status add value 'archived';
    `);
    expect(t(r, "a")!.columns[1].enumValues).toEqual(["draft", "published", "archived"]);
  });

  it("CREATE VIEW 는 뷰로 표시되고 SELECT 목록에서 컬럼을 읽는다", () => {
    const r = parseSqlErd(`
      create table posts (id uuid primary key, title text, draft boolean);
      create view published as select id, title as heading from posts where not draft;
    `);
    expect(t(r, "published")!.kind).toBe("view");
    expect(t(r, "published")!.columns.map((c) => c.name)).toEqual(["id", "heading"]);
    /* 원본에서 타입을 가져온다 */
    expect(t(r, "published")!.columns[0].type).toBe("uuid");
  });

  it("SELECT * 는 원본 테이블이 알려져 있을 때만 펼친다", () => {
    const r = parseSqlErd(`
      create table posts (id uuid primary key, title text);
      create view v as select * from posts;
      create view unknown_v as select * from somewhere_else;
    `);
    expect(t(r, "v")!.columns.map((c) => c.name)).toEqual(["id", "title"]);
    expect(t(r, "unknown_v")).toBeUndefined();
  });

  it("CREATE TABLE AS SELECT 도 컬럼을 읽는다", () => {
    const r = parseSqlErd(`
      create table posts (id uuid primary key, title text);
      create table snapshot as select id, title from posts;
    `);
    expect(t(r, "snapshot")!.columns.map((c) => c.name)).toEqual(["id", "title"]);
    expect(t(r, "snapshot")!.kind).toBeUndefined();
  });

  it("DROP VIEW 도 노드를 지운다", () => {
    const r = parseSqlErd(`
      create table a (id uuid primary key);
      create view v as select id from a;
      drop view v;
    `);
    expect(r.tables.map((x) => x.name)).toEqual(["a"]);
  });
});

describe("parseSqlErd — ALTER 나머지 동작", () => {
  const base = [{ name: "a", columns: [{ name: "x", type: "text" }, { name: "y", type: "text" }] }];

  it("SET/DROP NOT NULL 을 반영한다", () => {
    expect(parseSqlErd("alter table a alter column x set not null;", base).tables[0].columns[0].required).toBe(true);
    const on = [{ name: "a", columns: [{ name: "x", type: "text", required: true }] }];
    expect(parseSqlErd("alter table a alter column x drop not null;", on).tables[0].columns[0].required).toBeUndefined();
  });

  it("SET/DROP DEFAULT 를 반영한다", () => {
    expect(parseSqlErd("alter table a alter column x set default 'hi';", base).tables[0].columns[0].defaultValue).toBe("'hi'");
    const withDef = [{ name: "a", columns: [{ name: "x", type: "text", defaultValue: "'hi'" }] }];
    expect(parseSqlErd("alter table a alter column x drop default;", withDef).tables[0].columns[0].defaultValue).toBeUndefined();
  });

  it("ADD CONSTRAINT … UNIQUE 를 컬럼에 표시한다", () => {
    const r = parseSqlErd("alter table a add constraint a_uq unique (x, y);", base);
    expect(r.tables[0].columns.every((c) => c.unique)).toBe(true);
  });

  it("CHECK 제약은 여전히 ERD 에 그릴 게 없다", () => {
    const r = parseSqlErd("alter table a add constraint c check (x <> '');", base);
    expect(r.tables).toHaveLength(0);
    expect(r.noEffect).toEqual(["a"]);
  });
});
