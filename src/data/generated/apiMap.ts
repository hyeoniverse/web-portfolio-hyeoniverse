/* 자동 생성 — 손으로 고치지 마세요. 원본: src/app/api · src/app/auth 의 route.ts, 생성: npm run gen-api-map (scripts/gen-api-map.ts) */
import type { ApiMap } from "@/lib/about/apiMap";

export const apiMap: ApiMap = {
  "total": 192,
  "routeFiles": 133,
  "access": {
    "public": 66,
    "signed-in": 58,
    "author": 27,
    "admin": 16,
    "owner": 23,
    "cron": 2
  },
  "tables": [
    "admin_known_devices",
    "admin_login_attempts",
    "admin_notifications",
    "author_invites",
    "calendars",
    "comment_reactions",
    "comment_reports",
    "comments",
    "content_translations",
    "cover_image_history",
    "custom_emojis",
    "likes",
    "poll_votes",
    "post_views",
    "post_work_relations",
    "posts",
    "revisions",
    "series",
    "series_work_relations",
    "site_settings",
    "site_visits",
    "traffic_excluded_ips",
    "work_comments",
    "works"
  ],
  "rpcs": [
    "daily_post_views",
    "publish_scheduled",
    "record_post_view",
    "record_work_view",
    "sum_post_views"
  ],
  "services": [
    "ai",
    "translate",
    "tts",
    "storage",
    "mail",
    "github",
    "photos",
    "weather",
    "fonts"
  ],
  "groups": [
    {
      "key": "works",
      "files": 17,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/works",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/works",
          "access": "admin"
        },
        {
          "method": "GET",
          "path": "/api/works/[id]",
          "access": "author"
        },
        {
          "method": "PATCH",
          "path": "/api/works/[id]",
          "access": "author"
        },
        {
          "method": "DELETE",
          "path": "/api/works/[id]",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/works/[id]/ai-summary",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/works/[id]/auto-translate",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/works/[id]/extend-retention",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/works/[id]/like",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/works/[id]/like",
          "access": "public"
        },
        {
          "method": "DELETE",
          "path": "/api/works/[id]/purge",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/works/[id]/related-posts",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/works/[id]/related-series",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/works/[id]/restore",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/works/[id]/view",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/works/export",
          "access": "admin"
        },
        {
          "method": "GET",
          "path": "/api/works/showcase",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/works/showcase/import",
          "access": "admin"
        },
        {
          "method": "POST",
          "path": "/api/works/tts",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/works/tts/lexicon",
          "access": "author"
        },
        {
          "method": "PUT",
          "path": "/api/works/tts/lexicon",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/works/tts/merge",
          "access": "author"
        }
      ],
      "tables": [
        "likes",
        "post_work_relations",
        "posts",
        "series",
        "series_work_relations",
        "site_settings",
        "works"
      ],
      "rpcs": [
        "record_work_view"
      ],
      "services": [
        "ai",
        "translate",
        "tts",
        "storage",
        "github"
      ],
      "access": {
        "public": 6,
        "signed-in": 1,
        "author": 12,
        "admin": 3,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "posts",
      "files": 16,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/posts",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/posts",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/posts/[id]",
          "access": "author"
        },
        {
          "method": "PATCH",
          "path": "/api/posts/[id]",
          "access": "author"
        },
        {
          "method": "DELETE",
          "path": "/api/posts/[id]",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/posts/[id]/adjacent",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/posts/[id]/ai-summary",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/posts/[id]/auto-translate",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/posts/[id]/extend-retention",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/posts/[id]/like",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/posts/[id]/like",
          "access": "public"
        },
        {
          "method": "DELETE",
          "path": "/api/posts/[id]/purge",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/posts/[id]/related",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/posts/[id]/related-works",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/posts/[id]/restore",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/posts/[id]/view",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/posts/auto-cover",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/posts/auto-cover",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/posts/export",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/posts/popular-ids",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/posts/reassign-category",
          "access": "signed-in"
        }
      ],
      "tables": [
        "likes",
        "post_work_relations",
        "posts",
        "site_settings",
        "works"
      ],
      "rpcs": [
        "record_post_view"
      ],
      "services": [
        "ai",
        "translate"
      ],
      "access": {
        "public": 8,
        "signed-in": 5,
        "author": 8,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "admin/authors",
      "files": 4,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/admin/authors/context",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/authors/github-profile",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/authors/invite",
          "access": "owner"
        },
        {
          "method": "POST",
          "path": "/api/admin/authors/invite",
          "access": "owner"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/authors/invite",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/authors/members",
          "access": "owner"
        },
        {
          "method": "PATCH",
          "path": "/api/admin/authors/members",
          "access": "owner"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/authors/members",
          "access": "owner"
        }
      ],
      "tables": [
        "author_invites",
        "site_settings"
      ],
      "rpcs": [],
      "services": [
        "mail",
        "github"
      ],
      "access": {
        "public": 0,
        "signed-in": 2,
        "author": 0,
        "admin": 0,
        "owner": 6,
        "cron": 0
      }
    },
    {
      "key": "demo",
      "files": 4,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/demo/cover",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/demo/cover",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/demo/speech",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/demo/speech",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/demo/summary",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/demo/summary",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/demo/translate",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/demo/translate",
          "access": "public"
        }
      ],
      "tables": [],
      "rpcs": [],
      "services": [
        "ai",
        "translate",
        "tts"
      ],
      "access": {
        "public": 8,
        "signed-in": 0,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "calendars",
      "files": 4,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/calendars",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/calendars",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/calendars/[calendarId]",
          "access": "public"
        },
        {
          "method": "PUT",
          "path": "/api/calendars/[calendarId]",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/calendars/[calendarId]",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/calendars/[calendarId]/purge",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/calendars/[calendarId]/restore",
          "access": "signed-in"
        }
      ],
      "tables": [
        "calendars",
        "posts",
        "works"
      ],
      "rpcs": [],
      "services": [],
      "access": {
        "public": 1,
        "signed-in": 6,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "comments",
      "files": 5,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/comments",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/comments",
          "access": "public"
        },
        {
          "method": "PATCH",
          "path": "/api/comments",
          "access": "public"
        },
        {
          "method": "DELETE",
          "path": "/api/comments/[id]",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/comments/[id]/report",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/comments/[id]/restore",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/comments/recent",
          "access": "public"
        }
      ],
      "tables": [
        "admin_notifications",
        "comment_reports",
        "comments",
        "posts",
        "site_settings"
      ],
      "rpcs": [],
      "services": [
        "mail"
      ],
      "access": {
        "public": 6,
        "signed-in": 1,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "revisions",
      "files": 2,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/revisions",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/revisions",
          "access": "signed-in"
        },
        {
          "method": "PATCH",
          "path": "/api/revisions",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/revisions",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/revisions/[id]",
          "access": "signed-in"
        },
        {
          "method": "PATCH",
          "path": "/api/revisions/[id]",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/revisions/[id]",
          "access": "signed-in"
        }
      ],
      "tables": [
        "revisions"
      ],
      "rpcs": [],
      "services": [],
      "access": {
        "public": 0,
        "signed-in": 7,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "work-comments",
      "files": 5,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/work-comments",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/work-comments",
          "access": "public"
        },
        {
          "method": "PATCH",
          "path": "/api/work-comments",
          "access": "public"
        },
        {
          "method": "DELETE",
          "path": "/api/work-comments/[id]",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/work-comments/[id]/report",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/work-comments/[id]/restore",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/work-comments/recent",
          "access": "public"
        }
      ],
      "tables": [
        "admin_notifications",
        "comment_reports",
        "site_settings",
        "work_comments",
        "works"
      ],
      "rpcs": [],
      "services": [
        "mail"
      ],
      "access": {
        "public": 6,
        "signed-in": 1,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "admin/auth",
      "files": 5,
      "endpoints": [
        {
          "method": "POST",
          "path": "/api/admin/auth",
          "access": "public"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/auth",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/admin/auth/approve-device",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/admin/auth/devices",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/auth/devices/[id]",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/admin/auth/logout-all",
          "access": "signed-in"
        }
      ],
      "tables": [
        "admin_known_devices",
        "admin_login_attempts",
        "admin_notifications",
        "site_settings"
      ],
      "rpcs": [],
      "services": [
        "mail"
      ],
      "access": {
        "public": 3,
        "signed-in": 3,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "admin/works",
      "files": 3,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/admin/works/[id]/related-posts",
          "access": "author"
        },
        {
          "method": "PUT",
          "path": "/api/admin/works/[id]/related-posts",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/admin/works/[id]/related-series",
          "access": "author"
        },
        {
          "method": "PUT",
          "path": "/api/admin/works/[id]/related-series",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/admin/works/[id]/request-access",
          "access": "signed-in"
        }
      ],
      "tables": [
        "admin_notifications",
        "post_work_relations",
        "posts",
        "series",
        "series_work_relations",
        "site_settings",
        "works"
      ],
      "rpcs": [],
      "services": [
        "mail"
      ],
      "access": {
        "public": 0,
        "signed-in": 1,
        "author": 4,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "cover",
      "files": 5,
      "endpoints": [
        {
          "method": "POST",
          "path": "/api/cover/ai-generate",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/cover/pexels",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/cover/pexels/videos",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/cover/unsplash",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/cover/unsplash/download",
          "access": "signed-in"
        }
      ],
      "tables": [
        "site_settings"
      ],
      "rpcs": [],
      "services": [
        "ai",
        "storage",
        "photos"
      ],
      "access": {
        "public": 0,
        "signed-in": 5,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "series",
      "files": 2,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/series",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/series",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/series/[id]",
          "access": "public"
        },
        {
          "method": "PATCH",
          "path": "/api/series/[id]",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/series/[id]",
          "access": "signed-in"
        }
      ],
      "tables": [
        "posts",
        "series",
        "site_settings"
      ],
      "rpcs": [],
      "services": [],
      "access": {
        "public": 2,
        "signed-in": 3,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "admin/account",
      "files": 1,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/admin/account",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/admin/account",
          "access": "signed-in"
        },
        {
          "method": "PATCH",
          "path": "/api/admin/account",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/account",
          "access": "signed-in"
        }
      ],
      "tables": [
        "site_settings"
      ],
      "rpcs": [],
      "services": [
        "mail"
      ],
      "access": {
        "public": 0,
        "signed-in": 4,
        "author": 0,
        "admin": 0,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "admin/notifications",
      "files": 2,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/admin/notifications",
          "access": "public"
        },
        {
          "method": "PATCH",
          "path": "/api/admin/notifications",
          "access": "admin"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/notifications",
          "access": "admin"
        },
        {
          "method": "POST",
          "path": "/api/admin/notifications/[id]/resolve",
          "access": "admin"
        }
      ],
      "tables": [
        "admin_notifications",
        "comment_reports",
        "posts",
        "site_settings",
        "works"
      ],
      "rpcs": [],
      "services": [],
      "access": {
        "public": 1,
        "signed-in": 0,
        "author": 0,
        "admin": 3,
        "owner": 0,
        "cron": 0
      }
    },
    {
      "key": "admin/secrets",
      "files": 1,
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/admin/secrets",
          "access": "owner"
        },
        {
          "method": "POST",
          "path": "/api/admin/secrets",
          "access": "owner"
        },
        {
          "method": "PUT",
          "path": "/api/admin/secrets",
          "access": "owner"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/secrets",
          "access": "owner"
        }
      ],
      "tables": [
        "site_settings"
      ],
      "rpcs": [],
      "services": [
        "ai"
      ],
      "access": {
        "public": 0,
        "signed-in": 0,
        "author": 0,
        "admin": 0,
        "owner": 4,
        "cron": 0
      }
    },
    {
      "key": "admin",
      "files": 31,
      "folded": [
        "admin/ai-health",
        "admin/ai-log",
        "admin/ai-models",
        "admin/categories",
        "admin/comments",
        "admin/cover",
        "admin/cover-history",
        "admin/dashboard",
        "admin/emoji-kitchen",
        "admin/giscus-repo",
        "admin/me",
        "admin/media",
        "admin/polls",
        "admin/posts",
        "admin/profile",
        "admin/project-images",
        "admin/reports",
        "admin/settings",
        "admin/tags",
        "admin/traffic",
        "admin/translate",
        "admin/upload",
        "admin/works-categories"
      ],
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/admin/ai-health",
          "access": "owner"
        },
        {
          "method": "POST",
          "path": "/api/admin/ai-health",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/ai-log",
          "access": "owner"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/ai-log",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/ai-models",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/categories",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/comments",
          "access": "admin"
        },
        {
          "method": "GET",
          "path": "/api/admin/cover",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/cover-history",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/admin/cover-history",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/cover-history",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/dashboard",
          "access": "admin"
        },
        {
          "method": "GET",
          "path": "/api/admin/dashboard/category",
          "access": "admin"
        },
        {
          "method": "GET",
          "path": "/api/admin/dashboard/day",
          "access": "admin"
        },
        {
          "method": "POST",
          "path": "/api/admin/emoji-kitchen",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/giscus-repo",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/me",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/media",
          "access": "owner"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/media",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/polls",
          "access": "owner"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/polls/[pollId]",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/posts/[id]/related-works",
          "access": "author"
        },
        {
          "method": "PUT",
          "path": "/api/admin/posts/[id]/related-works",
          "access": "author"
        },
        {
          "method": "POST",
          "path": "/api/admin/posts/[id]/request-access",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/profile",
          "access": "public"
        },
        {
          "method": "PATCH",
          "path": "/api/admin/profile",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/profile/github-repos",
          "access": "owner"
        },
        {
          "method": "GET",
          "path": "/api/admin/project-images",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/reports",
          "access": "admin"
        },
        {
          "method": "PATCH",
          "path": "/api/admin/reports/[id]",
          "access": "admin"
        },
        {
          "method": "GET",
          "path": "/api/admin/settings",
          "access": "public"
        },
        {
          "method": "PATCH",
          "path": "/api/admin/settings",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/tags",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/admin/tags/remove",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/traffic",
          "access": "admin"
        },
        {
          "method": "POST",
          "path": "/api/admin/traffic/excluded-ips",
          "access": "admin"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/traffic/excluded-ips",
          "access": "admin"
        },
        {
          "method": "POST",
          "path": "/api/admin/translate",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/admin/upload",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/admin/works-categories",
          "access": "admin"
        }
      ],
      "tables": [
        "admin_notifications",
        "comment_reports",
        "comments",
        "cover_image_history",
        "custom_emojis",
        "poll_votes",
        "post_views",
        "post_work_relations",
        "posts",
        "series",
        "site_settings",
        "site_visits",
        "traffic_excluded_ips",
        "work_comments",
        "works"
      ],
      "rpcs": [
        "daily_post_views",
        "sum_post_views"
      ],
      "services": [
        "ai",
        "translate",
        "tts",
        "storage",
        "mail",
        "github"
      ],
      "access": {
        "public": 2,
        "signed-in": 14,
        "author": 2,
        "admin": 10,
        "owner": 12,
        "cron": 0
      }
    },
    {
      "key": "etc",
      "files": 26,
      "folded": [
        "auth",
        "brand-symbol-font",
        "categories",
        "comment-reactions",
        "contact",
        "content-translate",
        "cron",
        "custom-emojis",
        "favicon",
        "fonts",
        "highlight",
        "polls",
        "service-status",
        "site-translate",
        "translate",
        "upload",
        "visits",
        "weather",
        "works-categories"
      ],
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/brand-symbol-font",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/categories",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/comment-reactions",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/comment-reactions",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/contact/attachment",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/contact/attachment",
          "access": "public"
        },
        {
          "method": "DELETE",
          "path": "/api/contact/attachment",
          "access": "owner"
        },
        {
          "method": "POST",
          "path": "/api/content-translate",
          "access": "author"
        },
        {
          "method": "GET",
          "path": "/api/cron/publish-scheduled",
          "access": "cron"
        },
        {
          "method": "GET",
          "path": "/api/cron/purge-trash",
          "access": "cron"
        },
        {
          "method": "GET",
          "path": "/api/custom-emojis",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/custom-emojis",
          "access": "signed-in"
        },
        {
          "method": "DELETE",
          "path": "/api/custom-emojis/[id]",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/favicon",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/favicon/[file]",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/favicon/v/[ver]/[file]",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/fonts/search",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/highlight",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/polls/[pollId]",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/polls/[pollId]",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/service-status",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/site-translate/content",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/site-translate/items",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/site-translate/ui",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/translate",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/upload",
          "access": "signed-in"
        },
        {
          "method": "POST",
          "path": "/api/upload/signed-url",
          "access": "signed-in"
        },
        {
          "method": "GET",
          "path": "/api/visits",
          "access": "public"
        },
        {
          "method": "POST",
          "path": "/api/visits",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/weather",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/api/works-categories",
          "access": "public"
        },
        {
          "method": "GET",
          "path": "/auth/callback",
          "access": "public"
        }
      ],
      "tables": [
        "admin_notifications",
        "author_invites",
        "calendars",
        "comment_reactions",
        "content_translations",
        "custom_emojis",
        "poll_votes",
        "posts",
        "series",
        "site_settings",
        "site_visits",
        "traffic_excluded_ips",
        "works"
      ],
      "rpcs": [
        "publish_scheduled"
      ],
      "services": [
        "translate",
        "tts",
        "storage",
        "github",
        "weather",
        "fonts"
      ],
      "access": {
        "public": 23,
        "signed-in": 5,
        "author": 1,
        "admin": 0,
        "owner": 1,
        "cron": 2
      }
    }
  ]
};
