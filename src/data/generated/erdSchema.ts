/* 자동 생성 — 손으로 고치지 마세요. 원본: supabase/setup.sql, 생성: npm run gen-erd (scripts/gen-erd.ts) */
import type { ErdTable, ErdRelation } from "@/data/about/types";

export const schemaTables: ErdTable[] = [
  {
    "name": "site_settings",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "pk": true,
        "required": true
      },
      {
        "name": "config",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "updated_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "series",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "slug",
        "type": "text",
        "required": true
      },
      {
        "name": "description",
        "type": "text",
        "required": true
      },
      {
        "name": "cover_image",
        "type": "text",
        "required": true
      },
      {
        "name": "category",
        "type": "text",
        "required": true
      },
      {
        "name": "published",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "sort_order",
        "type": "int",
        "required": true,
        "indexed": true,
        "defaultValue": "0"
      },
      {
        "name": "auto_cover_url",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "title_en",
        "type": "text",
        "required": true
      },
      {
        "name": "description_en",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "name": "posts",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "slug",
        "type": "text",
        "required": true,
        "indexed": true
      },
      {
        "name": "content",
        "type": "text",
        "required": true
      },
      {
        "name": "content_type",
        "type": "text",
        "required": true,
        "defaultValue": "'markdown'"
      },
      {
        "name": "excerpt",
        "type": "text",
        "required": true
      },
      {
        "name": "cover_image",
        "type": "text",
        "required": true
      },
      {
        "name": "cover_position",
        "type": "real",
        "required": true,
        "defaultValue": "50"
      },
      {
        "name": "cover_zoom",
        "type": "real",
        "required": true,
        "defaultValue": "1"
      },
      {
        "name": "icon",
        "type": "text",
        "required": true
      },
      {
        "name": "tags",
        "type": "text[]",
        "required": true
      },
      {
        "name": "tag_notes",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "category",
        "type": "text",
        "required": true
      },
      {
        "name": "is_pinned",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "published",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "language",
        "type": "text",
        "required": true,
        "defaultValue": "'ko'"
      },
      {
        "name": "source_lang",
        "type": "text"
      },
      {
        "name": "view_count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "like_count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "github_url",
        "type": "text"
      },
      {
        "name": "deleted_at",
        "type": "timestamptz"
      },
      {
        "name": "purge_after",
        "type": "timestamptz",
        "indexed": true
      },
      {
        "name": "summary_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "summary_en",
        "type": "text",
        "required": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "version",
        "type": "integer",
        "required": true,
        "defaultValue": "1"
      },
      {
        "name": "title_en",
        "type": "text",
        "required": true
      },
      {
        "name": "content_en",
        "type": "text",
        "required": true
      },
      {
        "name": "excerpt_en",
        "type": "text",
        "required": true
      },
      {
        "name": "auto_translation",
        "type": "jsonb"
      },
      {
        "name": "post_number",
        "type": "int",
        "required": true,
        "indexed": true,
        "unique": true,
        "defaultValue": "nextval('posts_post_number_seq')"
      },
      {
        "name": "series_id",
        "type": "uuid",
        "fk": "series.id",
        "indexed": true
      },
      {
        "name": "series_order",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "scheduled_at",
        "type": "timestamptz"
      },
      {
        "name": "author_ids",
        "type": "text[]",
        "required": true
      }
    ]
  },
  {
    "name": "comments",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "post_id",
        "type": "uuid",
        "required": true,
        "fk": "posts.id",
        "indexed": true
      },
      {
        "name": "parent_id",
        "type": "uuid",
        "fk": "comments.id"
      },
      {
        "name": "nickname",
        "type": "text",
        "required": true
      },
      {
        "name": "password_hash",
        "type": "text",
        "required": true
      },
      {
        "name": "commenter_hash",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "type": "text",
        "required": true
      },
      {
        "name": "is_admin",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "like_count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "notify_email",
        "type": "text"
      },
      {
        "name": "is_deleted",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "deleted_by",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz"
      }
    ]
  },
  {
    "name": "likes",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "target_type",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "target_id",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "ip",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "poll_votes",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "poll_id",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "option_id",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "ip",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "comment_reactions",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "comment_id",
        "type": "uuid",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "comment_type",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "emoji",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "reactor_hash",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "calendars",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "data",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "deleted_at",
        "type": "timestamptz"
      },
      {
        "name": "purge_after",
        "type": "timestamptz",
        "indexed": true
      }
    ]
  },
  {
    "name": "custom_emojis",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "name",
        "type": "text",
        "required": true
      },
      {
        "name": "src",
        "type": "text",
        "required": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "indexed": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "works",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "title_en",
        "type": "text",
        "required": true
      },
      {
        "name": "slug",
        "type": "text",
        "required": true,
        "indexed": true
      },
      {
        "name": "subtitle_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "subtitle_en",
        "type": "text",
        "required": true
      },
      {
        "name": "categories_ko",
        "type": "text[]",
        "required": true,
        "indexed": true
      },
      {
        "name": "categories_en",
        "type": "text[]",
        "required": true,
        "indexed": true
      },
      {
        "name": "nature_ko",
        "type": "text",
        "required": true,
        "indexed": true
      },
      {
        "name": "nature_en",
        "type": "text",
        "required": true
      },
      {
        "name": "year",
        "type": "text",
        "required": true
      },
      {
        "name": "description_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "description_en",
        "type": "text",
        "required": true
      },
      {
        "name": "role_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "role_en",
        "type": "text",
        "required": true
      },
      {
        "name": "tech",
        "type": "text[]",
        "required": true
      },
      {
        "name": "image",
        "type": "text",
        "required": true
      },
      {
        "name": "icon",
        "type": "text",
        "required": true
      },
      {
        "name": "cover_position",
        "type": "real",
        "required": true,
        "defaultValue": "50"
      },
      {
        "name": "cover_zoom",
        "type": "real",
        "required": true,
        "defaultValue": "1"
      },
      {
        "name": "content_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "content_en",
        "type": "text",
        "required": true
      },
      {
        "name": "auto_translation",
        "type": "jsonb"
      },
      {
        "name": "content_type",
        "type": "text",
        "required": true,
        "defaultValue": "'markdown'"
      },
      {
        "name": "overview_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "overview_en",
        "type": "text",
        "required": true
      },
      {
        "name": "overview_image",
        "type": "text",
        "required": true
      },
      {
        "name": "challenge_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "challenge_en",
        "type": "text",
        "required": true
      },
      {
        "name": "challenge_image",
        "type": "text",
        "required": true
      },
      {
        "name": "solution_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "solution_en",
        "type": "text",
        "required": true
      },
      {
        "name": "solution_image",
        "type": "text",
        "required": true
      },
      {
        "name": "team_members",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "contributions_ko",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "contributions_en",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "tech_notes",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "gallery",
        "type": "text[]",
        "required": true
      },
      {
        "name": "gallery_notes",
        "type": "jsonb",
        "required": true,
        "comment": "갤러리 장마다의 음성 — 그림 주소 → { script, audio, audioSource, audioScript }"
      },
      {
        "name": "live_url",
        "type": "text"
      },
      {
        "name": "github_url",
        "type": "text"
      },
      {
        "name": "published",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "sort_order",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "is_pinned",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "view_count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "like_count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "summary_ko",
        "type": "text",
        "required": true
      },
      {
        "name": "summary_en",
        "type": "text",
        "required": true
      },
      {
        "name": "source_lang",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "deleted_at",
        "type": "timestamptz"
      },
      {
        "name": "purge_after",
        "type": "timestamptz",
        "indexed": true
      },
      {
        "name": "scheduled_at",
        "type": "timestamptz"
      }
    ]
  },
  {
    "name": "page_views",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "path",
        "type": "text",
        "indexed": true
      },
      {
        "name": "ip",
        "type": "text",
        "indexed": true
      },
      {
        "name": "session_id",
        "type": "text",
        "indexed": true
      },
      {
        "name": "visitor_id",
        "type": "text"
      },
      {
        "name": "is_landing",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "viewed_at",
        "type": "timestamptz",
        "required": true,
        "indexed": true,
        "defaultValue": "now()"
      },
      {
        "name": "viewed_date",
        "type": "date",
        "indexed": true,
        "defaultValue": "(viewed_at AT TIME ZONE 'Asia/Seoul')::date"
      },
      {
        "name": "duration_ms",
        "type": "integer"
      },
      {
        "name": "device_kind",
        "type": "text"
      },
      {
        "name": "referrer",
        "type": "text"
      },
      {
        "name": "user_agent",
        "type": "text"
      },
      {
        "name": "os",
        "type": "text"
      },
      {
        "name": "browser",
        "type": "text"
      },
      {
        "name": "device_model",
        "type": "text"
      },
      {
        "name": "country",
        "type": "text"
      },
      {
        "name": "utm_source",
        "type": "text"
      },
      {
        "name": "utm_medium",
        "type": "text"
      },
      {
        "name": "utm_campaign",
        "type": "text"
      },
      {
        "name": "migrated_from",
        "type": "text"
      }
    ]
  },
  {
    "name": "traffic_excluded_ips",
    "columns": [
      {
        "name": "ip",
        "type": "text",
        "pk": true,
        "required": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "work_comments",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "work_id",
        "type": "uuid",
        "required": true,
        "fk": "works.id",
        "indexed": true
      },
      {
        "name": "parent_id",
        "type": "uuid",
        "fk": "work_comments.id"
      },
      {
        "name": "nickname",
        "type": "text",
        "required": true
      },
      {
        "name": "password_hash",
        "type": "text",
        "required": true
      },
      {
        "name": "commenter_hash",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "type": "text",
        "required": true
      },
      {
        "name": "is_admin",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "like_count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "notify_email",
        "type": "text"
      },
      {
        "name": "is_deleted",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "deleted_by",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz"
      }
    ]
  },
  {
    "name": "admin_notifications",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "type",
        "type": "text",
        "required": true,
        "defaultValue": "'comment'"
      },
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "message",
        "type": "text",
        "required": true
      },
      {
        "name": "metadata",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "read",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "indexed": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "author_invites",
    "columns": [
      {
        "name": "email",
        "type": "text",
        "pk": true,
        "required": true
      },
      {
        "name": "author_id",
        "type": "text",
        "required": true
      },
      {
        "name": "permission_level",
        "type": "int",
        "required": true,
        "defaultValue": "1"
      },
      {
        "name": "invited_by",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      },
      {
        "name": "consumed_at",
        "type": "timestamptz"
      }
    ]
  },
  {
    "name": "applied_migrations",
    "columns": [
      {
        "name": "name",
        "type": "text",
        "pk": true,
        "required": true
      },
      {
        "name": "description",
        "type": "text",
        "required": true
      },
      {
        "name": "applied_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "service_logs",
    "columns": [
      {
        "name": "id",
        "type": "bigint",
        "pk": true,
        "required": true,
        "defaultValue": "auto"
      },
      {
        "name": "at",
        "type": "timestamptz",
        "required": true,
        "indexed": true,
        "defaultValue": "now()"
      },
      {
        "name": "category",
        "type": "text",
        "required": true,
        "indexed": true
      },
      {
        "name": "provider",
        "type": "text",
        "required": true
      },
      {
        "name": "ok",
        "type": "boolean",
        "required": true
      },
      {
        "name": "kind",
        "type": "text"
      },
      {
        "name": "status",
        "type": "int"
      },
      {
        "name": "message",
        "type": "text"
      },
      {
        "name": "units",
        "type": "int"
      },
      {
        "name": "meta",
        "type": "jsonb"
      }
    ]
  },
  {
    "name": "content_translations",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "source_type",
        "type": "text",
        "required": true,
        "unique": true
      },
      {
        "name": "source_id",
        "type": "uuid",
        "required": true,
        "unique": true
      },
      {
        "name": "lang",
        "type": "text",
        "required": true,
        "unique": true
      },
      {
        "name": "fields",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "source_hash",
        "type": "text",
        "required": true
      },
      {
        "name": "provider",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "demo_usage",
    "columns": [
      {
        "name": "day",
        "type": "date",
        "required": true,
        "pk": true
      },
      {
        "name": "feature",
        "type": "text",
        "required": true,
        "pk": true
      },
      {
        "name": "ip_hash",
        "type": "text",
        "required": true,
        "pk": true
      },
      {
        "name": "count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      }
    ]
  },
  {
    "name": "comment_reports",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "comment_id",
        "type": "uuid",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "comment_type",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "reason",
        "type": "text",
        "required": true
      },
      {
        "name": "reporter_hash",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "status",
        "type": "text",
        "required": true,
        "indexed": true,
        "defaultValue": "'pending'"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "indexed": true,
        "defaultValue": "now()"
      },
      {
        "name": "resolved_at",
        "type": "timestamptz"
      }
    ]
  },
  {
    "name": "revisions",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "entity_type",
        "type": "text",
        "required": true,
        "indexed": true
      },
      {
        "name": "entity_id",
        "type": "text",
        "required": true,
        "indexed": true
      },
      {
        "name": "snapshot",
        "type": "jsonb",
        "required": true
      },
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "dismissed",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "indexed": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "post_work_relations",
    "columns": [
      {
        "name": "post_id",
        "type": "uuid",
        "required": true,
        "fk": "posts.id",
        "pk": true,
        "indexed": true
      },
      {
        "name": "work_id",
        "type": "uuid",
        "required": true,
        "fk": "works.id",
        "pk": true,
        "indexed": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "series_work_relations",
    "columns": [
      {
        "name": "series_id",
        "type": "uuid",
        "required": true,
        "fk": "series.id",
        "pk": true,
        "indexed": true
      },
      {
        "name": "work_id",
        "type": "uuid",
        "required": true,
        "fk": "works.id",
        "pk": true,
        "indexed": true
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "cover_image_history",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "user_id",
        "type": "uuid",
        "required": true,
        "fk": "users.id",
        "indexed": true,
        "unique": true
      },
      {
        "name": "url",
        "type": "text",
        "required": true,
        "indexed": true,
        "unique": true
      },
      {
        "name": "source",
        "type": "text",
        "required": true
      },
      {
        "name": "meta",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "indexed": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "admin_login_attempts",
    "columns": [
      {
        "name": "email",
        "type": "text",
        "pk": true,
        "required": true
      },
      {
        "name": "failed_count",
        "type": "int",
        "required": true,
        "defaultValue": "0"
      },
      {
        "name": "locked_until",
        "type": "timestamptz"
      },
      {
        "name": "last_attempt_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      },
      {
        "name": "updated_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      }
    ]
  },
  {
    "name": "admin_known_devices",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "pk": true,
        "required": true,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "user_id",
        "type": "uuid",
        "required": true,
        "unique": true
      },
      {
        "name": "fingerprint",
        "type": "text",
        "required": true,
        "unique": true
      },
      {
        "name": "user_agent",
        "type": "text",
        "required": true
      },
      {
        "name": "ip_address",
        "type": "text",
        "required": true
      },
      {
        "name": "approved",
        "type": "boolean",
        "required": true,
        "defaultValue": "false"
      },
      {
        "name": "approve_token",
        "type": "text",
        "indexed": true
      },
      {
        "name": "approve_token_expires_at",
        "type": "timestamptz"
      },
      {
        "name": "first_seen_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      },
      {
        "name": "last_seen_at",
        "type": "timestamptz",
        "required": true,
        "defaultValue": "now()"
      }
    ]
  }
];

export const schemaRelations: ErdRelation[] = [
  {
    "from": "posts",
    "fromField": "series_id",
    "to": "series",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "comments",
    "fromField": "post_id",
    "to": "posts",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "comments",
    "fromField": "parent_id",
    "to": "comments",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "work_comments",
    "fromField": "work_id",
    "to": "works",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "work_comments",
    "fromField": "parent_id",
    "to": "work_comments",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "post_work_relations",
    "fromField": "post_id",
    "to": "posts",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "post_work_relations",
    "fromField": "work_id",
    "to": "works",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "series_work_relations",
    "fromField": "series_id",
    "to": "series",
    "toField": "id",
    "label": "N:1"
  },
  {
    "from": "series_work_relations",
    "fromField": "work_id",
    "to": "works",
    "toField": "id",
    "label": "N:1"
  }
];
