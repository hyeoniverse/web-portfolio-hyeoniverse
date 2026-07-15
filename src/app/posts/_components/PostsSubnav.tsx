"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PostsSubnav.module.css";

/* /posts 계열 브라우즈 축 — All(전체) / Series / Tags / History.
   개별 글(/posts/[slug]) 에선 렌더하지 않음(브라우즈 페이지에서만). */
const ITEMS = [
  { href: "/posts", label: "All" },
  { href: "/posts/series", label: "Series" },
  { href: "/posts/tags", label: "Tags" },
  { href: "/posts/history", label: "History" },
];

const BROWSE_PREFIXES = ["/posts/series", "/posts/tags", "/posts/history", "/posts/categories"];

export default function PostsSubnav() {
  const pathname = usePathname() ?? "";
  const show =
    pathname === "/posts" ||
    BROWSE_PREFIXES.some((b) => pathname === b || pathname.startsWith(b + "/"));
  if (!show) return null;

  return (
    <nav className={styles.subnav} aria-label="Posts 브라우즈">
      {ITEMS.map((it) => {
        const active =
          it.href === "/posts"
            ? pathname === "/posts"
            : pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`${styles.item} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
            data-clickable="true"
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
